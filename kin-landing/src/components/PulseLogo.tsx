import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface PulseLogoProps {
    trigger: boolean;
}

export const PulseLogo = ({ trigger }: PulseLogoProps) => {
    const dotControls = useAnimation();
    const stemControls = useAnimation();
    const hyphenControls = useAnimation();
    const lettersControls = useAnimation();

    useEffect(() => {
        if (trigger) {
            const sequence = async () => {
                // 0. Reset
                dotControls.set({ opacity: 0, scale: 0 });
                stemControls.set({ opacity: 0, scaleY: 0 });
                hyphenControls.set({ opacity: 0, x: 0 });
                lettersControls.set({ opacity: 0 });

                // 1. Single Pulse of the Dot (The "Heartbeat")
                await dotControls.start({
                    opacity: 1,
                    scale: [0, 1.5, 1], // Pulse
                    transition: { duration: 0.4, times: [0, 0.6, 1], ease: "easeOut" }
                });

                // 2. Logo Assembly (Fast)
                // Stem grows up
                stemControls.start({
                    opacity: 1,
                    scaleY: 1,
                    transition: { duration: 0.3, ease: "easeOut" }
                });

                // Dot settles
                dotControls.start({
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.3 }
                });

                // Letters Reveal
                lettersControls.start({
                    opacity: 1,
                    transition: { duration: 0.5, delay: 0.1, ease: "easeOut" }
                });

                // Hyphen slides in
                hyphenControls.start({
                    opacity: 1,
                    x: [10, 0],
                    transition: { duration: 0.4, delay: 0.1, ease: "easeOut" }
                });
            };
            sequence();
        } else {
            // Reset state when not triggered
            dotControls.set({ opacity: 0 });
            stemControls.set({ opacity: 0 });
            hyphenControls.set({ opacity: 0 });
            lettersControls.set({ opacity: 0 });
        }
    }, [trigger, dotControls, stemControls, hyphenControls, lettersControls]);

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 mix-blend-difference">
            <h1 className="text-7xl sm:text-8xl font-display text-white tracking-wide flex items-baseline justify-center leading-none">
                <motion.span animate={lettersControls}>K</motion.span>
                <span className="relative inline-flex flex-col items-center mx-[0.05em]" style={{ width: "0.36em" }}>
                    <motion.span
                        animate={dotControls}
                        className="absolute block rounded-full bg-white"
                        style={{
                            width: "0.11em", height: "0.11em", top: "0.05em",
                            transformOrigin: "center"
                        }}
                    />
                    <motion.span
                        animate={stemControls}
                        className="block bg-white rounded-sm"
                        style={{ width: "0.11em", height: "0.55em", marginTop: "0.38em", transformOrigin: "bottom" }}
                    />
                </span>
                <motion.span animate={lettersControls}>n</motion.span>
                <motion.span animate={hyphenControls} className="inline-block text-white mx-[0.05em]">-</motion.span>
                <motion.span animate={lettersControls}>TXT</motion.span>
            </h1>
        </div>
    );
};
