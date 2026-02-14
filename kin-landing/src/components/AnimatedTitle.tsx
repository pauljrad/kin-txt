import { useEffect, useState, useCallback, forwardRef, useRef } from "react";
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
};

export const AnimatedTitle = forwardRef<HTMLDivElement, AnimatedTitleProps>(
    ({ className, onGameStateChange, onChallenge, ...props }, ref) => {
        const dragY = useMotionValue(0);
        const stemControls = useAnimation();
        const dotControls = useAnimation();
        const hyphenControls = useAnimation();
        const lettersControls = useAnimation();
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

        const runBounce = useCallback(
            async (triggerPong: boolean = false) => {
                setIsBouncing(true);
                dragY.set(0);

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
                        pongTriggerRef.current = false;
                        setIsBouncing(false);
                        onChallenge();
                        await dotControls.start({
                            y: [0, -30, 0],
                            transition: { duration: 0.3 }
                        });
                        return;
                    }

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
            },
            [
                dragY,
                dotControls,
                stemControls,
                lettersControls,
                onGameStateChange,
                onChallenge,
            ]
        );

        const runHyphenBounce = useCallback(
            async (direction: "left" | "right") => {
                if (isHyphenBouncing) return;
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
            [hyphenControls, isHyphenBouncing]
        );

        useEffect(() => {
            let startX = 0;
            let startY = 0;
            const onTouchStart = (e: TouchEvent) => {
                if (e.touches.length !== 1) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            };
            const onTouchEnd = (e: TouchEvent) => {
                if (e.changedTouches.length !== 1) return;
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                    runHyphenBounce(deltaX > 0 ? "right" : "left");
                }
            };
            window.addEventListener("touchstart", onTouchStart, { passive: true });
            window.addEventListener("touchend", onTouchEnd, { passive: true });
            return () => {
                window.removeEventListener("touchstart", onTouchStart);
                window.removeEventListener("touchend", onTouchEnd);
            };
        }, [runHyphenBounce]);

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
                    runBounce(true);
                } else {
                    holdTimerRef.current = requestAnimationFrame(updateHoldProgress);
                }
            };
            const onPull = (e: Event) => {
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
        }, [dragY, runBounce, isBouncing, isTransitioningToGame, showPongGame, clearHoldTimer]);

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

        useEffect(() => {
            dragY.set(0);
            stemControls.set({ scaleY: 1, opacity: 1 });
            dotControls.set({ y: 0 });
            hyphenControls.set({ x: 0 });
            lettersControls.set({ opacity: 1, y: 0, filter: "blur(0px)" });
        }, [dragY, stemControls, dotControls, hyphenControls, lettersControls]);

        return (
            <>
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
                    className={className ?? "select-none"}
                    aria-label="Kin-TXT animated title"
                    {...props}
                >
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display text-foreground tracking-wide mb-3 sm:mb-4 flex items-baseline justify-center">
                        <motion.span animate={lettersControls}>K</motion.span>
                        <span
                            className="relative inline-flex flex-col items-center"
                            style={{ width: "0.52em" }}
                        >
                            <motion.span
                                ref={dotRef}
                                animate={dotControls}
                                className="absolute block rounded-full bg-foreground transition-[filter] duration-150"
                                style={{
                                    width: "0.12em",
                                    height: "0.12em",
                                    top: "0.02em",
                                    willChange: "filter, transform",
                                    transform: "translateZ(0)",
                                    filter: holdProgress > 0
                                        ? `drop-shadow(0 0 ${18 + holdProgress * 0.16}px hsl(var(--focus-glow))) drop-shadow(0 0 ${10 + holdProgress * 0.10}px hsl(var(--focus-glow))) drop-shadow(0 0 ${6 + holdProgress * 0.06}px hsl(var(--focus-glow)))`
                                        : pullProgress > 0
                                            ? `drop-shadow(0 0 ${Math.min(22, 8 + pullProgress * 0.18)}px hsl(var(--focus-glow))) drop-shadow(0 0 ${Math.min(14, 4 + pullProgress * 0.10)}px hsl(var(--focus-glow)))`
                                            : "none",
                                    WebkitFilter: holdProgress > 0
                                        ? `drop-shadow(0 0 ${18 + holdProgress * 0.16}px hsl(var(--focus-glow))) drop-shadow(0 0 ${10 + holdProgress * 0.10}px hsl(var(--focus-glow))) drop-shadow(0 0 ${6 + holdProgress * 0.06}px hsl(var(--focus-glow)))`
                                        : pullProgress > 0
                                            ? `drop-shadow(0 0 ${Math.min(22, 8 + pullProgress * 0.18)}px hsl(var(--focus-glow))) drop-shadow(0 0 ${Math.min(14, 4 + pullProgress * 0.10)}px hsl(var(--focus-glow)))`
                                            : "none",
                                    ...(isBouncing ? {} : { y: dotY }),
                                }}
                            />
                            <motion.span
                                animate={stemControls}
                                className="block bg-foreground rounded-sm"
                                style={{
                                    width: "0.12em",
                                    height: "0.52em",
                                    marginTop: "0.18em",
                                    scaleY: stemScaleY,
                                    transformOrigin: "bottom",
                                }}
                            />
                        </span>
                        <motion.span animate={lettersControls}>n</motion.span>
                        <motion.span
                            ref={hyphenRef}
                            animate={hyphenControls}
                            className="inline-block text-foreground"
                            style={{ display: "inline-block" }}
                        >
                            -
                        </motion.span>
                        <motion.span animate={lettersControls}>TXT</motion.span>
                    </h1>
                </div>
            </>
        );
    }
);

AnimatedTitle.displayName = "AnimatedTitle";
