import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

export const SplashScreen = () => {
    const [phase, setPhase] = useState<'animating' | 'revealing' | 'complete'>('animating');

    const dotControls = useAnimation();
    const hyphenControls = useAnimation();
    const lettersControls = useAnimation();

    useEffect(() => {
        const runSequence = async () => {
            // Hide letters initially
            lettersControls.set({ opacity: 0 });

            // Phase 1 & 2 combined: Bounce for 6 seconds total (while letters fade in during last 3 seconds)
            const startTime = Date.now();
            const totalDuration = 6000; // 6 seconds total
            const letterRevealStart = 3000; // Start revealing at 3 seconds

            const bounce = async () => {
                if (Date.now() - startTime < totalDuration) {
                    // Dot bounce
                    dotControls.start({
                        y: [0, -30, -8, -18, 0],
                        transition: { duration: 0.55, ease: 'easeOut' },
                    });

                    // Hyphen bounce
                    setTimeout(() => {
                        hyphenControls.start({
                            x: [0, 8, -4.8, 2.4, -1.2, 0],
                            transition: { duration: 0.4, ease: 'easeOut' },
                        });
                    }, 100);

                    setTimeout(bounce, 750);
                }
            };

            bounce();

            // Wait 3 seconds, then start revealing letters while bouncing continues
            await new Promise(resolve => setTimeout(resolve, letterRevealStart));

            setPhase('revealing');
            lettersControls.start({
                opacity: 1,
                transition: { duration: 3, ease: 'easeInOut' }
            });

            // Wait for remaining 3 seconds
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Phase 3: Stop all animations
            setPhase('complete');
        };

        runSequence();
    }, []);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
        }}>
            <div className="select-none">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display text-foreground tracking-wide mb-3 sm:mb-4 flex items-baseline justify-center">
                    <motion.span animate={lettersControls}>K</motion.span>
                    <span className="relative inline-flex flex-col items-center" style={{ width: "0.52em" }}>
                        <motion.span
                            animate={phase === 'complete' ? { y: 0 } : dotControls}
                            className="absolute block rounded-full bg-foreground"
                            style={{ width: "0.12em", height: "0.12em", top: "0.02em" }}
                        />
                        <span className="block bg-foreground rounded-sm" style={{ width: "0.12em", height: "0.52em", marginTop: "0.18em" }} />
                    </span>
                    <motion.span animate={lettersControls}>N</motion.span>
                    <motion.span
                        animate={phase === 'complete' ? { x: 0 } : hyphenControls}
                        className="inline-block text-foreground"
                    >
                        -
                    </motion.span>
                    <motion.span animate={lettersControls}>TXT</motion.span>
                </h1>
            </div>
        </div>
    );
};
