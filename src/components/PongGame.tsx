import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PongGameProps {
  onGameEnd: () => void;
  initialBallPos: { x: number; y: number };
  initialPaddlePos: { x: number; y: number };
  ballSize: number;
  paddleWidth: number;
  paddleFontSize: number;
  paddleFontFamily?: string;
}

const PADDLE_SCALE = 2.5;

export const PongGame = forwardRef<HTMLDivElement, PongGameProps>(
  (
    {
      onGameEnd,
      initialBallPos,
      initialPaddlePos,
      ballSize,
      paddleWidth: initialPaddleWidth,
      paddleFontSize,
      paddleFontFamily,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const endTimeoutRef = useRef<number | null>(null);

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [gameState, setGameState] = useState<'waiting' | 'firstDrop' | 'playing' | 'ending'>('waiting');

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
      const saved = localStorage.getItem('pong-high-score');
      return saved ? parseInt(saved, 10) : 0;
    });
    const [showNewHighScore, setShowNewHighScore] = useState(false);

    // Enlarged paddle width for gameplay
    const paddleWidth = initialPaddleWidth * PADDLE_SCALE;
    const paddleY = initialPaddlePos.y;

    // Ball state
    const ballRef = useRef({
      x: initialBallPos.x,
      y: initialBallPos.y,
      vx: 0,
      vy: 0,
    });
    const [ballPos, setBallPos] = useState(initialBallPos);

    // Paddle state with smooth interpolation
    const initialPaddleX = initialPaddlePos.x - (paddleWidth - initialPaddleWidth) / 2;
    const paddleTargetRef = useRef({ x: initialPaddleX });
    const paddleCurrentRef = useRef({ x: initialPaddleX });
    const [paddleX, setPaddleX] = useState(initialPaddleX);

    const paddleHitHeight = Math.max(8, Math.round(paddleFontSize * 0.4));

    // Measure viewport
    useEffect(() => {
      const update = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, []);

    // Cleanup any pending end-game timeout on unmount
    useEffect(() => {
      return () => {
        if (endTimeoutRef.current) {
          window.clearTimeout(endTimeoutRef.current);
          endTimeoutRef.current = null;
        }
      };
    }, []);
    // Smooth paddle interpolation loop
    useEffect(() => {
      if (gameState !== 'playing' && gameState !== 'firstDrop') return;

      let animFrame: number;
      const smoothing = 0.35; // Higher = more responsive

      const interpolate = () => {
        const target = paddleTargetRef.current.x;
        const current = paddleCurrentRef.current.x;
        const diff = target - current;
        
        // Faster interpolation with threshold for snappy feel
        if (Math.abs(diff) < 1) {
          paddleCurrentRef.current.x = target;
        } else {
          paddleCurrentRef.current.x = current + diff * smoothing;
        }
        setPaddleX(paddleCurrentRef.current.x);
        
        animFrame = requestAnimationFrame(interpolate);
      };

      animFrame = requestAnimationFrame(interpolate);
      return () => cancelAnimationFrame(animFrame);
    }, [gameState]);

    // Paddle input handling (updates target, not position directly)
    useEffect(() => {
      if (gameState !== 'playing' && gameState !== 'firstDrop') return;

      const handleMove = (clientX: number) => {
        const x = clientX - paddleWidth / 2;
        const clampedX = Math.max(0, Math.min(dimensions.width - paddleWidth, x));
        paddleTargetRef.current.x = clampedX;
      };

      const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) handleMove(e.touches[0].clientX);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onTouchMove);
      };
    }, [gameState, dimensions.width, paddleWidth]);

    const endGame = useCallback(() => {
      if (gameState === 'ending') return;
      setGameState('ending');

      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pong-high-score', score.toString());
        setShowNewHighScore(true);
      }

      try {
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      } catch {
        /* ignore */
      }

      // Ensure we never leave a pending timeout that can fire after unmount
      if (endTimeoutRef.current) {
        window.clearTimeout(endTimeoutRef.current);
      }
      endTimeoutRef.current = window.setTimeout(() => onGameEnd(), 1200);
    }, [gameState, score, highScore, onGameEnd]);

    // Wait for ball to arrive at initial position, then start first slow drop
    useEffect(() => {
      if (gameState !== 'waiting') return;

      // Small delay to let the dot animation from AnimatedTitle finish
      const timer = setTimeout(() => {
        const ball = ballRef.current;
        ball.x = initialBallPos.x;
        ball.y = initialBallPos.y;
        ball.vx = 0;
        ball.vy = 0;
        setBallPos({ x: ball.x, y: ball.y });
        setGameState('firstDrop');
      }, 100);

      return () => clearTimeout(timer);
    }, [gameState, initialBallPos.x, initialBallPos.y]);

    // First drop - slow and gentle
    useEffect(() => {
      if (gameState !== 'firstDrop' || dimensions.width === 0) return;

      const ball = ballRef.current;
      let lastTime = performance.now();
      const slowGravity = 0.0004; // Very slow gravity for first drop

      const loop = (currentTime: number) => {
        const deltaTime = Math.min(currentTime - lastTime, 32);
        lastTime = currentTime;

        // Apply slow gravity
        ball.vy += slowGravity * deltaTime;

        // Cap max falling speed (slower for first drop)
        if (ball.vy > 0.25) ball.vy = 0.25;

        // Update position
        ball.y += ball.vy * deltaTime;

        // Paddle collision - triggers transition to normal play
        const paddleTop = paddleY;
        const paddleBottom = paddleY + paddleHitHeight;
        const currentPaddleX = paddleCurrentRef.current.x;

        if (ball.vy > 0) {
          const ballBottom = ball.y + ballSize;
          const withinX = ball.x + ballSize >= currentPaddleX && ball.x <= currentPaddleX + paddleWidth;
          
          if (withinX && ballBottom >= paddleTop && ball.y <= paddleBottom) {
            ball.y = paddleTop - ballSize;
            
            // Normal bounce for first hit
            ball.vy = -0.35;
            
            // Gentle angle based on hit position
            const hitPos = (ball.x + ballSize / 2 - currentPaddleX) / paddleWidth;
            const angle = (hitPos - 0.5) * 2;
            ball.vx = angle * 0.15;

            setScore(1);
            setGameState('playing'); // Switch to normal speed

            try {
              if ('vibrate' in navigator) navigator.vibrate(10);
            } catch { /* ignore */ }

            setBallPos({ x: ball.x, y: ball.y });
            return;
          }
        }

        // GAME OVER: ball hits bottom of screen
        if (ball.y >= dimensions.height) {
          endGame();
          return;
        }

        setBallPos({ x: ball.x, y: ball.y });
        animationRef.current = requestAnimationFrame(loop);
      };

      lastTime = performance.now();
      animationRef.current = requestAnimationFrame(loop);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, [gameState, dimensions, ballSize, paddleWidth, paddleY, paddleHitHeight, endGame]);

    // Main game loop - smooth delta-time based physics
    useEffect(() => {
      if (gameState !== 'playing' || dimensions.width === 0) return;

      const ball = ballRef.current;
      let lastTime = performance.now();
      const gravity = 0.001; // slightly less gravity for higher bounces

      const loop = (currentTime: number) => {
        const deltaTime = Math.min(currentTime - lastTime, 32);
        lastTime = currentTime;

        // Apply smooth gravity
        ball.vy += gravity * deltaTime;

        // Cap max falling speed
        if (ball.vy > 0.5) ball.vy = 0.5;

        // Update position smoothly
        ball.x += ball.vx * deltaTime;
        ball.y += ball.vy * deltaTime;

        // Left/right wall bounce with smooth damping
        if (ball.x <= 0) {
          ball.x = 0;
          ball.vx = Math.abs(ball.vx) * 0.9;
        } else if (ball.x >= dimensions.width - ballSize) {
          ball.x = dimensions.width - ballSize;
          ball.vx = -Math.abs(ball.vx) * 0.9;
        }

        // Paddle collision - use interpolated paddle position
        const paddleTop = paddleY;
        const paddleBottom = paddleY + paddleHitHeight;
        const currentPaddleX = paddleCurrentRef.current.x;

        if (ball.vy > 0) {
          const ballBottom = ball.y + ballSize;
          const withinX = ball.x + ballSize >= currentPaddleX && ball.x <= currentPaddleX + paddleWidth;
          
          if (withinX && ballBottom >= paddleTop && ball.y <= paddleBottom) {
            ball.y = paddleTop - ballSize;
            
            // Higher bounce - increased multiplier
            ball.vy = -Math.abs(ball.vy) * 1.1;
            if (ball.vy < -0.45) ball.vy = -0.45; // higher cap for bouncier feel

            // Gentle angle based on hit position
            const hitPos = (ball.x + ballSize / 2 - currentPaddleX) / paddleWidth;
            const angle = (hitPos - 0.5) * 2;
            ball.vx = angle * 0.18;

            setScore((s) => s + 1);

            try {
              if ('vibrate' in navigator) navigator.vibrate(10);
            } catch { /* ignore */ }
          }
        }

        // GAME OVER: ball hits bottom of screen
        if (ball.y >= dimensions.height) {
          endGame();
          return;
        }

        // Ceiling bounce - gentle
        if (ball.y <= 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy) * 0.85;
        }

        setBallPos({ x: ball.x, y: ball.y });
        animationRef.current = requestAnimationFrame(loop);
      };

      lastTime = performance.now();
      animationRef.current = requestAnimationFrame(loop);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, [gameState, dimensions, ballSize, paddleWidth, paddleY, paddleHitHeight, endGame]);

    return (
      <motion.div
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Background */}
        <motion.div
          className="absolute inset-0 bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        />


        {/* Score */}
        <motion.div
          className="absolute top-8 left-0 right-0 flex justify-center gap-8 text-foreground"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: gameState === 'ending' ? 0 : 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.25 }}
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Score</div>
            <div className="text-3xl font-display">{score}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">High</div>
            <div className="text-3xl font-display">{Math.max(score, highScore)}</div>
          </div>
        </motion.div>

        {/* Ball */}
        <motion.div
          className="absolute rounded-full bg-yellow-500"
          style={{
            width: ballSize,
            height: ballSize,
            left: ballPos.x,
            top: ballPos.y,
          }}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: gameState === 'ending' || gameState === 'waiting' ? 0 : 1 
          }}
          transition={{ duration: 0.2 }}
        />

        {/* Paddle (enlarged hyphen) */}
        <motion.div
          className="absolute text-yellow-500 flex items-center justify-center"
          initial={{ 
            left: initialPaddlePos.x, 
            width: initialPaddleWidth,
            opacity: 0,
          }}
          animate={{ 
            left: paddleX, 
            width: paddleWidth,
            opacity: gameState === 'waiting' ? 0 : 1,
          }}
          transition={{ 
            left: { type: 'tween', duration: 0, ease: 'linear' },
            width: { duration: 0.15, ease: 'easeOut' },
            opacity: { duration: 0.1 },
          }}
          style={{
            top: paddleY,
            height: paddleFontSize,
            fontSize: paddleFontSize,
            lineHeight: 1,
            fontFamily: paddleFontFamily,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          <span style={{ transform: `scaleX(${PADDLE_SCALE})` }}>-</span>
        </motion.div>

        {/* Game Over - centered on screen (robust on mobile) */}
        <AnimatePresence>
          {gameState === 'ending' && (
            <motion.div
              className="fixed inset-0 z-[150] grid place-items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.98 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {showNewHighScore ? (
                  <>
                    <div className="text-3xl md:text-4xl font-display text-primary mb-4">New High Score!</div>
                    <div className="text-6xl md:text-8xl font-display text-foreground">{score}</div>
                    <div className="mt-3 text-sm text-muted-foreground">High: {Math.max(score, highScore)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl md:text-3xl text-muted-foreground mb-4">Dropped.</div>
                    <div className="text-6xl md:text-8xl font-display text-foreground">{score}</div>
                    <div className="mt-3 text-sm text-muted-foreground">High: {Math.max(score, highScore)}</div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

PongGame.displayName = 'PongGame';
