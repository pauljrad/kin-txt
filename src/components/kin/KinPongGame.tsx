import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface KinPongGameProps {
    onGameEnd: () => void;
    sessionId: string;
    isHost: boolean; // TRUE if I sent the challenge, FALSE if I accepted it
    opponentId: string;
}

const BALL_SIZE = 16;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 8;
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;

// Physics constants
const GRAVITY = 0.0005; // Reduced gravity for easier rally
const BOUNCE_DAMPING = 1.05; // Speed up slightly on bounce

export const KinPongGame = forwardRef<HTMLDivElement, KinPongGameProps>(
    ({ onGameEnd, sessionId, isHost, opponentId }, ref) => {
        const { user } = useAuth();
        const [gameState, setGameState] = useState<'waiting' | 'playing' | 'ended'>('waiting');
        const [score, setScore] = useState({ me: 0, opponent: 0 });

        // My Paddle (bottom for me)
        const [myPaddleX, setMyPaddleX] = useState(window.innerWidth / 2 - PADDLE_WIDTH / 2);

        // Opponent Paddle (top for me - but technically their bottom on their screen)
        // We render opponent's paddle at the TOP of our screen.
        const [opponentPaddleX, setOpponentPaddleX] = useState(window.innerWidth / 2 - PADDLE_WIDTH / 2);

        // Ball state (Host authority)
        const [ball, setBall] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 });
        const [isGameOver, setIsGameOver] = useState(false);
        const [winner, setWinner] = useState<string | null>(null);

        const channelRef = useRef<any>(null);
        const animationRef = useRef<number | null>(null);
        const audioRef = useRef<HTMLAudioElement | null>(null);

        // Subscribe to Realtime
        useEffect(() => {
            channelRef.current = supabase.channel(`pong_${sessionId}`)
                .on('broadcast', { event: 'paddle_update' }, ({ payload }) => {
                    if (payload.userId !== user?.id) {
                        // Receive opponent paddle pos
                        // We need to mirror/scale if screen sizes differ, but for MVP assume similar width or just map %.
                        // Better: send normalized position (0 to 1)
                        const normalizedX = payload.x;
                        setOpponentPaddleX(normalizedX * window.innerWidth);
                    }
                })
                .on('broadcast', { event: 'ball_update' }, ({ payload }) => {
                    if (!isHost) {
                        // Client receives ball updates
                        // Opponent sees ball y flipped (0 is their bottom?? No, let's keep coordinate system standard)
                        // Standard: 0 is top.
                        // Host: plays at Bottom. Opponent is Top.
                        // Client: plays at Bottom. Opponent is Top.
                        // So Host sends ball {x, y}.
                        // Client receives. 
                        // IF Host says ball y=100 (near top). Client sees ball y=100 (near top).
                        // IF Host says ball y=900 (near bottom/host paddle). Client sees ball y=900 (near client's paddle?).
                        // WAIT. If both play at bottom, we need to invert coordinates for the client.

                        // Let's decide: Host is Bottom Player. Client is Top Player?
                        // Or both see themselves at bottom? -> Preferred.
                        // If both see themselves at bottom:
                        // Host y=0 is TOP (Client's paddle). Host y=MAX is BOTTOM (Host's paddle).
                        // Client y=0 is TOP (Host's paddle). Client y=MAX is BOTTOM (Client's paddle).

                        // So when Host sends y, Client renders at (MAX - y).
                        // And Host sends x, Client renders at (MAX - x) (mirror horizontal or not? usually yes for intuitive feel).

                        setBall({
                            x: payload.x, // Maybe invert X too? standard pong mirrors.
                            y: window.innerHeight - payload.y,
                            vx: payload.vx,
                            vy: payload.vy
                        });

                        // Sync score
                        if (payload.score) {
                            setScore({ me: payload.score.opponent, opponent: payload.score.me });
                        }
                    }
                })
                .on('broadcast', { event: 'game_end' }, () => {
                    setGameState('ended');
                    setTimeout(onGameEnd, 2000);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        setGameState('playing');
                        // Start ball if host
                        if (isHost) {
                            setBall(b => ({ ...b, vx: 0.2, vy: 0.2 }));
                        }
                    }
                });

            return () => {
                channelRef.current?.unsubscribe();
            };
        }, [sessionId, isHost, user?.id, onGameEnd]);

        // Input Handling
        useEffect(() => {
            const handleMove = (e: MouseEvent | TouchEvent) => {
                const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                const newX = Math.max(0, Math.min(window.innerWidth - PADDLE_WIDTH, clientX - PADDLE_WIDTH / 2));
                setMyPaddleX(newX);

                // Broadcast normalized position
                const normalizedX = newX / window.innerWidth;
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'paddle_update',
                    payload: { userId: user?.id, x: normalizedX }
                });
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove);
            return () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('touchmove', handleMove);
            };
        }, [user?.id]);

        // Game Loop (Host Only)
        useEffect(() => {
            if (!isHost || gameState !== 'playing') return;

            const loop = () => {
                setBall(prev => {
                    let { x, y, vx, vy } = prev;

                    x += vx * 16; // primitive delta
                    y += vy * 16;

                    // Wall bounces
                    if (x <= 0 || x >= window.innerWidth - BALL_SIZE) vx = -vx;

                    // Paddle Collisions
                    // Host Paddle (Bottom)
                    if (y >= window.innerHeight - 30 - PADDLE_HEIGHT && y <= window.innerHeight - 10) {
                        if (x + BALL_SIZE >= myPaddleX && x <= myPaddleX + PADDLE_WIDTH) {
                            vy = -Math.abs(vy) * 1.05; // Bounce up
                            // Add English
                            vx += (Math.random() - 0.5) * 0.1;
                        }
                    }

                    // Opponent Paddle (Top)
                    // We receive opponent normalized X.
                    // opponents paddle is at Y ~ 30
                    if (y <= 30 + PADDLE_HEIGHT && y >= 10) {
                        // Check collision against opponentPaddleX
                        // Note: opponentPaddleX is what we see.
                        if (x + BALL_SIZE >= opponentPaddleX && x <= opponentPaddleX + PADDLE_WIDTH) {
                            vy = Math.abs(vy) * 1.05; // Bounce down
                        }
                    }

                    // Scoring
                    if (y > window.innerHeight) {
                        // Host lost point
                        setScore(s => ({ ...s, opponent: s.opponent + 1 }));
                        // Reset
                        x = window.innerWidth / 2;
                        y = window.innerHeight / 2;
                        vy = -0.2;
                    } else if (y < 0) {
                        // Host won point
                        setScore(s => ({ ...s, me: s.me + 1 }));
                        // Reset
                        x = window.innerWidth / 2;
                        y = window.innerHeight / 2;
                        vy = 0.2;
                    }

                    // Broadcast State
                    const normalizedX = x; // send raw for now, ideally normalized
                    channelRef.current?.send({
                        type: 'broadcast',
                        event: 'ball_update',
                        payload: { x, y, vx, vy, score: { me: score.me, opponent: score.opponent } } // Send current score too
                    });

                    return { x, y, vx, vy };
                });

                animationRef.current = requestAnimationFrame(loop);
            };

            animationRef.current = requestAnimationFrame(loop);
            return () => cancelAnimationFrame(animationRef.current!);
        }, [isHost, gameState, myPaddleX, opponentPaddleX, score]); // simplistic deps

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[200] bg-black text-white font-mono"
                ref={ref}
            >
                {/* Score */}
                <div className="absolute top-1/2 left-4 -translate-y-1/2 transform -rotate-90 origin-left text-gray-500 text-xs">
                    YOU: {score.me} | THEM: {score.opponent}
                </div>

                {/* My Paddle (Bottom) */}
                <div
                    className="absolute bottom-8 bg-white rounded-full"
                    style={{ left: myPaddleX, width: PADDLE_WIDTH, height: PADDLE_HEIGHT }}
                />

                {/* Opponent Paddle (Top) */}
                <div
                    className="absolute top-8 bg-red-500 rounded-full"
                    style={{ left: opponentPaddleX, width: PADDLE_WIDTH, height: PADDLE_HEIGHT }}
                />

                {/* Ball */}
                <div
                    className="absolute bg-white rounded-full mix-blend-difference"
                    style={{
                        left: ball.x,
                        top: ball.y,
                        width: BALL_SIZE,
                        height: BALL_SIZE
                    }}
                />

                <button
                    onClick={onGameEnd}
                    className="absolute top-4 right-4 text-xs text-white/50 hover:text-white border border-white/20 px-2 py-1 rounded"
                >
                    EXIT
                </button>
            </motion.div>
        );
    });

KinPongGame.displayName = 'KinPongGame';
