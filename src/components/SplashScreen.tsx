import { motion } from 'framer-motion';

export const SplashScreen = ({ onComplete }: { onComplete?: () => void }) => {
    return (
        <motion.div
            className="fixed inset-0 bg-background flex items-center justify-center overflow-hidden touch-none !z-[9999] !opacity-100"
            style={{ zIndex: 9999 }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onAnimationComplete={() => onComplete?.()}
        >
            <div className="select-none">
                {/* Massive KiN-TXT Logo - using standard text classes for maximum stability */}
                <h1 className="text-8xl sm:text-9xl font-display text-foreground tracking-wide flex items-baseline justify-center leading-none">
                    <span className="opacity-0">K</span>

                    {/* Animated "i" */}
                    <span className="relative inline-flex flex-col items-center mx-[0.05em]" style={{ width: "0.36em" }}>
                        {/* Bouncing Dot */}
                        <motion.span
                            animate={{ y: [0, -40, 0] }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                ease: "easeInOut",
                                repeatType: "reverse"
                            }}
                            className="absolute block rounded-full bg-foreground"
                            style={{
                                width: "0.11em",
                                height: "0.11em",
                                top: "0.05em",
                            }}
                        />
                        {/* Stem */}
                        <span
                            className="block bg-foreground rounded-sm"
                            style={{
                                width: "0.11em",
                                height: "0.55em",
                                marginTop: "0.38em",
                            }}
                        />
                    </span>

                    <span className="opacity-0">n</span>

                    {/* Bouncing Hyphen */}
                    <motion.span
                        animate={{ x: [-15, 15, -15] }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="inline-block text-foreground mx-[0.05em]"
                    >
                        -
                    </motion.span>

                    <span className="opacity-0">TXT</span>
                </h1>
            </div>
        </motion.div>
    );
};
