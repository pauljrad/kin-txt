import { motion } from 'framer-motion';

export const TickerBanner = () => {
    const tickerText = "BETA Testing: Feb 20 – Mar 20. Limited spaces available. Sign up now for early access. • ";
    const repeatedText = Array(10).fill(tickerText).join("");

    return (
        <div className="w-full bg-transparent overflow-hidden py-2 relative z-20">
            <motion.div
                animate={{
                    x: [0, -1000],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="whitespace-nowrap flex items-center"
            >
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-red-600 flex gap-6">
                    {repeatedText}
                </span>
            </motion.div>

            {/* LED Dot Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                    backgroundSize: '4px 4px'
                }}
            />
        </div>
    );
};
