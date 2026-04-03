import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export const SonarLogo = () => {
    const [cycleStep, setCycleStep] = useState(0); // 0, 1, 2 (third is persistent)
    const [rotation, setRotation] = useState(0);

    // Constant rotation of the needle
    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(prev => {
                const next = (prev + 1.2) % 360;
                if (next < prev) {
                    setCycleStep(s => (s + 1) % 3);
                }
                return next;
            });
        }, 16);
        return () => clearInterval(interval);
    }, []);

    // Visibility logic for 'So' and 'Nah'
    // 'So' is at Top-Left diagonal (225 degrees)
    // 'Nah' is at Bottom-Right diagonal (45 degrees)
    const isSoVisible = (rotation >= 215 && rotation <= 245) || cycleStep === 2;
    const isNahVisible = (rotation >= 35 && rotation <= 65) || cycleStep === 2;

    // Background fade on 3rd cycle
    const radarOpacity = cycleStep === 2 ? 0.4 : 1;

    return (
        <a 
            href="https://www.so-nah.uk" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-6 hover:opacity-90 transition-opacity cursor-pointer group"
        >
            <div className="mb-4 text-center">
                <span className="text-[10px] tracking-[0.3em] text-zinc-500 block mb-2 font-mono">KiN-TXT is brought to you by</span>
                <span className="text-xs font-bold tracking-[0.4em] text-white">So-Nah Creations</span>
            </div>
            <div className="relative w-[85px] h-[85px] mb-4">
                {/* Radar Background */}
                <motion.svg
                    animate={{ opacity: radarOpacity }}
                    viewBox="0 0 100 100"
                    className="w-full h-full text-white"
                >
                    {/* Concentric Circles */}
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
                    <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />

                    {/* Crosshairs */}
                    <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
                    <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />

                    {/* The Center Dot */}
                    <circle cx="50" cy="50" r="2.5" fill="currentColor" />
                </motion.svg>

                {/* Radar Needle */}
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className="w-[45%] h-[2px] bg-white origin-left translate-x-1/2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                </div>

                {/* 'So' Text */}
                <div className="absolute top-[35%] left-[35%] -translate-x-1/2 -translate-y-1/2">
                    <AnimatePresence>
                        {isSoVisible && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.05 }}
                                animate={{ opacity: 1, scale: 0.06 }}
                                exit={{ opacity: 0, scale: 0.055 }}
                                className="font-sans text-lg font-bold select-none text-white drop-shadow-lg"
                            >
                                So
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* 'Nah' Text */}
                <div className="absolute bottom-[35%] right-[35%] translate-x-1/2 translate-y-1/2">
                    <AnimatePresence>
                        {isNahVisible && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.05 }}
                                animate={{ opacity: 1, scale: 0.06 }}
                                exit={{ opacity: 0, scale: 0.055 }}
                                className="font-sans text-lg font-bold select-none text-white drop-shadow-lg"
                            >
                                Nah
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

        </a>
    );
};
