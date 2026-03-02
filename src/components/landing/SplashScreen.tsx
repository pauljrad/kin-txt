import { useEffect, useState, useCallback, forwardRef, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
    motion,
    useMotionValue,
    useTransform,
    useAnimation,
} from "framer-motion";
import { PongGame } from "./PongGame";

type AnimatedTitleProps = React.HTMLAttributes<HTMLDivElement> & {
    onGameStateChange?: (isPlaying: boolean) => void;
    onChallenge?: () => void;
    onComplete?: () => void;
};

export const InteractiveSplashScreen = forwardRef<HTMLDivElement, AnimatedTitleProps>(
    ({ className, onGameStateChange, onChallenge, onComplete, ...props }, ref) => {
        const navigate = useNavigate();
        // Phase control: 'intro' -> 'interactive'
        const [isIntro, setIsIntro] = useState(true);

        const dragY = useMotionValue(0);
        const stemControls = useAnimation();
        const dotControls = useAnimation();
        const hyphenControls = useAnimation();
        const lettersControls = useAnimation();

        // Interactive states
        const [isBouncing, setIsBouncing] = useState(false);
        const [isHyphenBouncing, setIsHyphenBouncing] = useState(false);
        const [showPongGame, setShowPongGame] = useState(false);
        const [isTransitioningToGame, setIsTransitioningToGame] = useState(false);
        const [pullProgress, setPullProgress] = useState(0);
        const [holdProgress, setHoldProgress] = useState(0);

        const dotRef = useRef<HTMLSpanElement>(null);
        const hyphenRef = useRef<HTMLSpanElement>(null);
        const holdTimerRef = useRef<number | null>(null);
        const holdStartRef = useRef<number | null>(null);
        const pongTriggerRef = useRef(false);

        const [gameInitialPos, setGameInitialPos] = useState({
            ball: { x: 0, y: 0 },
            paddle: { x: 0, y: 0 },
            ballSize: 8,
            paddleWidth: 20,
            paddleHeight: 4,
            paddleFontSize: 24,
            paddleFontFamily: undefined as string | undefined,
        });

        const stemScaleY = useTransform(dragY, [0, 80], [1, 0.3]);
        const dotY = useTransform(dragY, [0, 80], [0, 12]);

        const vibrate = (pattern: number | number[]) => {
            try {
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                    navigator.vibrate(pattern);
                }
            } catch { /* ignore */ }
        };

        // --- INTRO SEQUENCE ---
        useEffect(() => {
            const sequence = async () => {
                // 1. Initial State: i and hyphen are visible and moving immediately
                // Letters (K, N, TXT) and other UI start transparent
                lettersControls.set({ opacity: 0 });

                // Start i dot bounce immediately
                dotControls.start({
                    y: [0, -40, 0],
                    transition: {
                        duration: 0.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatType: "reverse"
                    }
                });

                // Start hyphen bounce immediately
                hyphenControls.start({
                    x: [-15, 15, -15],
                    transition: {
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }
                });

                // 2. Wait 1.125 seconds
                await new Promise(resolve => setTimeout(resolve, 1125));

                // 3. Reveal letters (K, N, TXT) over 1.1 seconds
                await lettersControls.start({
                    opacity: 1,
                    transition: { duration: 1.1, ease: "easeInOut" }
                });

                // 4. Smooth Stop - Allow them to settle nicely
                const stopDot = dotControls.start({
                    y: 0,
                    transition: { type: "spring", stiffness: 200, damping: 20 }
                });
                const stopHyphen = hyphenControls.start({
                    x: 0,
                    transition: { type: "spring", stiffness: 200, damping: 20 }
                });

                await Promise.all([stopDot, stopHyphen]);

                // 5. Intro Complete - Enable Interactive Mode
                setIsIntro(false);
                onComplete?.();
            };

            sequence();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []); // Run once on mount


        // --- INTERACTIVE LOGIC (Adapted from AnimatedTitle) ---
        // Only active when !isIntro

        const runBounce = useCallback(
            async (triggerPong: boolean = false) => {
                if (isIntro) return; // Guard logic

                setIsBouncing(true);
                dragY.set(0);

                // Stem stretches up
                await stemControls.start({
                    scaleY: 1.6,
                    transition: { duration: 0.1, ease: "easeOut" },
                });

                if (triggerPong) {
                    if (pongTriggerRef.current) {
                        setIsBouncing(false);
                        return;
                    }
                    pongTriggerRef.current = true;

                    if (onChallenge) {
                        // ... external challenge logic ...
                    }

                    // Capture positions for Pong
                    const dotEl = dotRef.current;
                    const hyphenEl = hyphenRef.current;

                    if (dotEl && hyphenEl) {
                        const dotRect = dotEl.getBoundingClientRect();
                        const hyphenRect = hyphenEl.getBoundingClientRect();
                        const hyphenStyle = window.getComputedStyle(hyphenEl);
                        const hyphenFontSize = Number.parseFloat(hyphenStyle.fontSize || "24");
                        const hyphenFontFamily = hyphenStyle.fontFamily || undefined;

                        setGameInitialPos({
                            ball: { x: dotRect.left, y: dotRect.top - 80 },
                            paddle: { x: hyphenRect.left, y: hyphenRect.top },
                            ballSize: dotRect.width,
                            paddleWidth: hyphenRect.width,
                            paddleHeight: hyphenRect.height,
                            paddleFontSize: hyphenFontSize,
                            paddleFontFamily: hyphenFontFamily,
                        });
                    }

                    setIsTransitioningToGame(true);
                    onGameStateChange?.(true);

                    // Game Transitions
                    lettersControls.start({
                        opacity: 0,
                        y: -10,
                        filter: "blur(6px)",
                        transition: { duration: 0.45, ease: "easeOut" },
                    });

                    stemControls.start({
                        opacity: 0,
                        transition: { duration: 0.35, ease: "easeOut" },
                    });

                    await dotControls.start({
                        y: -80,
                        transition: { duration: 0.7, ease: "easeOut" },
                    });

                    setShowPongGame(true);
                    setIsBouncing(false);
                    return;
                }

                // Normal bounce
                await dotControls.start({
                    y: [0, -30, -8, -18, 0],
                    transition: {
                        duration: 0.55,
                        times: [0, 0.2, 0.4, 0.65, 1],
                        ease: "easeOut",
                    },
                });

                vibrate([10, 25, 10]);

                await stemControls.start({
                    scaleY: 1,
                    transition: { duration: 0.15, ease: "easeInOut" },
                });

                setIsBouncing(false);
                // eslint-disable-next-line react-hooks/exhaustive-deps
            },
            [isIntro, dragY, dotControls, stemControls, lettersControls, onGameStateChange]
        );

        const runHyphenBounce = useCallback(
            async (direction: "left" | "right") => {
                if (isIntro || isHyphenBouncing) return;
                setIsHyphenBouncing(true);
                vibrate(10);

                const moveDistance = direction === "right" ? 8 : -8;
                await hyphenControls.start({
                    x: [0, moveDistance, -moveDistance * 0.6, moveDistance * 0.3, -moveDistance * 0.15, 0],
                    transition: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeOut" },
                });

                vibrate([10, 25, 10]);
                setIsHyphenBouncing(false);
            },
            [isIntro, hyphenControls, isHyphenBouncing]
        );

        // Horizontal Swipe Listener - Scoped to the title area
        useEffect(() => {
            const element = ref && 'current' in ref ? ref.current : null;
            if (!element) return;

            let startX = 0;
            let startY = 0;

            const onTouchStart = (e: TouchEvent) => {
                if (isIntro) return; // Ignore during intro
                if (e.touches.length !== 1) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            };

            const onTouchEnd = (e: TouchEvent) => {
                if (isIntro) return;
                if (e.changedTouches.length !== 1) return;
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const deltaX = endX - startX;
                const deltaY = endY - startY;

                if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                    runHyphenBounce(deltaX > 0 ? "right" : "left");
                }
            };

            // Attach to the specific element (the title container)
            element.addEventListener("touchstart", onTouchStart, { passive: true });
            element.addEventListener("touchend", onTouchEnd, { passive: true });

            return () => {
                element.removeEventListener("touchstart", onTouchStart);
                element.removeEventListener("touchend", onTouchEnd);
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isIntro, runHyphenBounce, ref]);

        // Pull Gesture Listeners (Custom Events from usePullGesture)
        const clearHoldTimer = useCallback(() => {
            if (holdTimerRef.current) {
                cancelAnimationFrame(holdTimerRef.current);
                holdTimerRef.current = null;
            }
            holdStartRef.current = null;
            setHoldProgress(0);
        }, []);

        useEffect(() => {
            const HOLD_DURATION = 2000;
            const updateHoldProgress = () => {
                if (!holdStartRef.current) return;
                const elapsed = performance.now() - holdStartRef.current;
                const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
                setHoldProgress(progress);
                if (progress >= 100) {
                    clearHoldTimer();
                    setPullProgress(0);
                    runBounce(true); // Trigger Pong
                } else {
                    holdTimerRef.current = requestAnimationFrame(updateHoldProgress);
                }
            };

            const onPull = (e: Event) => {
                if (isIntro) return; // Ignore drag during intro
                const ce = e as CustomEvent<{ y?: number }>;
                const y = Math.max(0, Math.min(80, Number(ce.detail?.y ?? 0)));

                if (!isBouncing && !isTransitioningToGame && !pongTriggerRef.current) {
                    dragY.set(y);
                    setPullProgress(y);
                    if (y >= 70) {
                        if (!holdStartRef.current) {
                            holdStartRef.current = performance.now();
                            vibrate(15);
                            holdTimerRef.current = requestAnimationFrame(updateHoldProgress);
                        }
                    } else {
                        clearHoldTimer();
                    }
                }
            };

            const onRelease = async (e: Event) => {
                if (isIntro) return;
                if (isTransitioningToGame || pongTriggerRef.current || showPongGame) {
                    clearHoldTimer();
                    setPullProgress(0);
                    return;
                }

                const ce = e as CustomEvent<{ y?: number }>;
                const y = Math.max(0, Math.min(80, Number(ce.detail?.y ?? 0)));
                clearHoldTimer();
                setPullProgress(0);

                if (y > 15) {
                    await runBounce(false);
                } else {
                    dragY.set(0);
                }
            };

            window.addEventListener("kinxt-pull", onPull as EventListener);
            window.addEventListener("kinxt-release", onRelease as EventListener);
            return () => {
                window.removeEventListener("kinxt-pull", onPull as EventListener);
                window.removeEventListener("kinxt-release", onRelease as EventListener);
                clearHoldTimer();
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isIntro, dragY, runBounce, isBouncing, isTransitioningToGame, showPongGame, clearHoldTimer]);

        useEffect(() => {
            return () => {
                if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
            };
        }, []);

        const handleGameEnd = useCallback(() => {
            setShowPongGame(false);
            setIsTransitioningToGame(false);
            pongTriggerRef.current = false;
            onGameStateChange?.(false);
            dragY.set(0);
            stemControls.set({ scaleY: 1, opacity: 1 });
            dotControls.set({ y: 0 });
            hyphenControls.set({ x: 0 });
            lettersControls.set({ opacity: 1, y: 0, filter: "blur(0px)" });
        }, [dragY, stemControls, dotControls, hyphenControls, lettersControls, onGameStateChange]);


        // Scroll tracking for fade-out logic
        const [scrollY, setScrollY] = useState(0);
        const [viewportHeight, setViewportHeight] = useState(0);

        useEffect(() => {
            if (typeof window === "undefined") return;

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setViewportHeight(window.innerHeight);
            const handleScroll = () => setScrollY(window.scrollY);
            const handleResize = () => setViewportHeight(window.innerHeight);

            window.addEventListener("scroll", handleScroll, { passive: true });
            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("scroll", handleScroll);
                window.removeEventListener("resize", handleResize);
            };
        }, []);

        const isInteracting = isIntro || pullProgress > 0 || isBouncing || isHyphenBouncing || showPongGame || isTransitioningToGame;

        return (
            <>
                {/* Pong Game Overlay */}
                {showPongGame && typeof document !== "undefined"
                    ? createPortal(
                        <PongGame
                            key="pong-game"
                            onGameEnd={handleGameEnd}
                            initialBallPos={gameInitialPos.ball}
                            initialPaddlePos={gameInitialPos.paddle}
                            ballSize={gameInitialPos.ballSize}
                            paddleWidth={gameInitialPos.paddleWidth}
                            paddleFontSize={gameInitialPos.paddleFontSize}
                            paddleFontFamily={gameInitialPos.paddleFontFamily}
                        />,
                        document.body
                    )
                    : null}

                <div
                    ref={ref}
                    className={`${className ?? ""} fixed inset-0 flex items-center justify-center pointer-events-none z-[100]`}
                    aria-label="Kin-TXT animated title"
                    style={{
                        display: scrollY > viewportHeight * 0.6 ? 'none' : 'flex'
                    }}
                    {...props}
                >
                    <h1 className="select-none kinxt-pull-trigger pointer-events-auto cursor-grab touch-none text-7xl sm:text-8xl font-display text-white tracking-wide flex items-baseline justify-center leading-none mix-blend-difference">
                        <motion.span animate={lettersControls}>K</motion.span>
                        <span className="relative inline-flex flex-col items-center mx-[0.05em]" style={{ width: "0.36em" }}>
                            <motion.span
                                ref={dotRef}
                                animate={dotControls}
                                className="absolute block rounded-full bg-white transition-[filter] duration-150"
                                style={{
                                    width: "0.11em", height: "0.11em", top: "0.05em", willChange: "filter, transform", transform: "translateZ(0)",
                                    filter: holdProgress > 0
                                        ? `drop-shadow(0 0 ${18 + holdProgress * 0.16}px hsl(var(--focus-glow))) drop-shadow(0 0 ${10 + holdProgress * 0.10}px hsl(var(--focus-glow))) drop-shadow(0 0 ${6 + holdProgress * 0.06}px hsl(var(--focus-glow)))`
                                        : pullProgress > 0
                                            ? `drop-shadow(0 0 ${Math.min(22, 8 + pullProgress * 0.18)}px hsl(var(--focus-glow))) drop-shadow(0 0 ${Math.min(14, 4 + pullProgress * 0.10)}px hsl(var(--focus-glow)))`
                                            : "none",
                                    ...((isIntro || isBouncing || showPongGame) ? {} : { y: dotY }),
                                }}
                            />
                            <motion.span
                                animate={stemControls}
                                className="block bg-white rounded-sm"
                                style={{ width: "0.11em", height: "0.55em", marginTop: "0.38em", scaleY: stemScaleY, transformOrigin: "bottom" }}
                            />
                        </span>
                        <motion.span animate={lettersControls}>n</motion.span>
                        <motion.span ref={hyphenRef} animate={hyphenControls} className="inline-block text-white mx-[0.05em]" style={{ display: "inline-block" }}>-</motion.span>
                        <motion.span animate={lettersControls}>TXT</motion.span>
                    </h1>

                    <div className="absolute top-[60%] left-0 w-full flex flex-col items-center justify-center pointer-events-auto">
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={!isIntro ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            onClick={() => navigate('/login')}
                            className="mb-12 px-6 py-2 border border-white/30 text-white text-xs tracking-[0.2em] hover:bg-white hover:text-black transition-colors uppercase font-medium"
                        >
                            Login
                        </motion.button>
                    </div>

                    <div className="absolute top-[85%] left-0 w-full flex flex-col items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={!isIntro ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                            className="flex flex-col items-center gap-2"
                        >
                            <span className="text-[10px] font-mono tracking-[0.3em] text-white/50 mb-1">SCROLL</span>
                            <div className="relative flex flex-col items-center">
                                <motion.span
                                    animate={{ y: [0, 8, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-[2px] h-8 bg-white/20 rounded-full"
                                ></motion.span>
                                <motion.span
                                    animate={{ y: [0, 16, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.1 }}
                                    className="absolute top-0 w-[4px] h-[4px] bg-white rounded-full shadow-[0_0_12px_white]"
                                ></motion.span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </>
        );
    }
);

InteractiveSplashScreen.displayName = "InteractiveSplashScreen";
