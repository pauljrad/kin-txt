import { motion } from 'framer-motion';

export const SplashScreen = ({ onComplete }: { onComplete?: () => void }) => {
    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onAnimationComplete={() => onComplete?.()}
        >
            <div className="select-none">
                {/* Massive KiN-TXT Logo - 3x bigger than usual */}
                <h1 className="text-[15svh] sm:text-[20svh] font-display text-foreground tracking-wide flex items-baseline justify-center leading-none">
                    <span>K</span>

                    {/* Animated "i" */}
                    <span className="relative inline-flex flex-col items-center mx-[0.05em]" style={{ width: "0.52em" }}>
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
                                width: "0.22em",
                                height: "0.22em",
                                top: "0.05em",
                            }}
                        />
                        {/* Stem */}
                        <span
                            className="block bg-foreground rounded-sm"
                            style={{
                                width: "0.22em",
                                height: "0.55em",
                                marginTop: "0.38em",
                            }}
                        />
                    </span>

                    <span>n</span>

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

                    <span>TXT</span>
                </h1>
            </div>
        </motion.div>
    );
};
