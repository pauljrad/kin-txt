import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TikTokVideo() {
    const timeline = [
        { text: "Reading has not disappeared.", delay: 1200 },
        { text: "But the conditions for reading have changed.", delay: 1400 },
        { text: "Digital text now lives inside environments designed for interruption.", delay: 1700 },
        
        // Acceleration section
        { text: "Notifications.", delay: 500, mode: 'accelerate' },
        { text: "Feeds.", delay: 350, mode: 'accelerate' },
        { text: "Movement.", delay: 250, mode: 'accelerate' },
        
        { text: "Endless visual competition.", delay: 1300 },
        { text: "Language, once surrounded by quiet, now competes for attention.", delay: 2000, type: 'emphasis' },
        { text: "Traditional reading carries a hidden cognitive load.", delay: 1300 },
        { text: "Pages.", delay: 900 },
        { text: "Position.", delay: 900 },
        { text: "Progress.", delay: 900 },
        { text: "The constant need to navigate.", delay: 1300 },
        { text: "A subtle anxiety forms in the background.", delay: 1200 },
        { text: "Page fright.", delay: 1800, type: 'emphasis' },
        { text: "KiN-TXT removes this entirely.", delay: 1400 },
        { text: "No pages.", delay: 1000 },
        { text: "No scanning ahead.", delay: 1000 },
        { text: "No visual clutter competing with the words.", delay: 1400 },
        
        // Dramatic slowdown
        { text: "Text unfolds in time.", delay: 2200, type: 'emphasis' },
        
        // Target Mode Section
        { text: "Sentences arrive as moments.", delay: 1300, target: true },
        { text: "With pause.", delay: 1300, target: true },
        { text: "With rhythm.", delay: 1300, target: true },
        { text: "With emphasis.", delay: 1500, target: true },
        { text: "Attention remains with the unfolding language.", delay: 1400 },
        { text: "Remove distraction.", delay: 1200 },
        { text: "Regain focus.", delay: 1200 },
        { text: "KiN-TXT", delay: 2500, branding: true }
    ];

    const [step, setStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        // Auto-start after a delay to allow subagent setup
        const startTimer = setTimeout(() => {
            setIsPlaying(true);
        }, 1500);

        return () => clearTimeout(startTimer);
    }, []);

    useEffect(() => {
        if (!isPlaying || step >= timeline.length) return;

        const timer = setTimeout(() => {
            if (step === timeline.length - 1) {
                document.title = "FINISHED"; // Signal for subagent
            }
            setStep(prev => prev + 1);
        }, timeline[step].delay);

        return () => clearTimeout(timer);
    }, [step, isPlaying]);

    const item = timeline[step] || { text: "", delay: 1000 };

    const getORPIndex = (word: string) => {
        const clean = word.replace(/[.,!?;:'"()[\]]/g, '');
        const length = clean.length;
        if (length === 0) return 0;
        if (length === 1) return 0;
        if (length <= 5) return 1;
        if (length <= 9) return 2;
        if (length <= 13) return 3;
        return 4;
    };

    const renderWord = () => {
        const text = item.text;
        if (item.target) {
            const words = text.split(/\s+/);
            const midIndex = Math.floor(words.length / 2);
            const centerWord = words[midIndex];
            const orpIdx = getORPIndex(centerWord);
            
            const prefix = centerWord.substring(0, orpIdx);
            const focal = centerWord[orpIdx] || '';
            const suffix = centerWord.substring(orpIdx + 1);

            const finalPrefix = words.slice(0, midIndex).join(" ") + (midIndex > 0 ? " " : "") + prefix;
            const finalSuffix = suffix + (midIndex < words.length - 1 ? " " + words.slice(midIndex+1).join(" ") : "");

            return (
                <div className="w-full grid grid-cols-[1fr_auto_1fr] items-baseline font-display uppercase tracking-wide">
                    <span className="text-right whitespace-pre">{finalPrefix}</span>
                    <span className="text-center font-bold min-w-[1ch] text-[#FFD600]" style={{ textShadow: "0 0 16px rgba(255,214,0,0.4)" }}>{focal}</span>
                    <span className="text-left whitespace-pre">{finalSuffix}</span>
                </div>
            );
        }

        if (item.branding || text.toLowerCase() === 'kin-txt') {
            return (
                <div className="flex w-full items-center justify-center font-display uppercase text-6xl">
                    <div className="flex-1 text-right">K</div>
                    <div className="text-red-500 shrink-0 px-[4px]">i</div>
                    <div className="flex-1 text-left">N-TXT</div>
                </div>
            );
        }

        return <span className={item.type === 'emphasis' ? 'text-7xl font-bold' : 'text-5xl'}>{text}</span>;
    };

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
            <div 
                className="relative bg-[#080808] flex items-center justify-center overflow-hidden"
                style={{
                    width: '1080px',
                    height: '1920px',
                    transform: 'scale(calc(min(100vw / 1080, 100vh / 1920)))',
                    transformOrigin: 'center'
                }}
            >
                {/* Ambient Blur */}
                <div className="absolute inset-0 focus-mode-bg opacity-30"></div>

                {/* Target Mode Anchors */}
                <AnimatePresence>
                    {item.target && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80px] w-1.5 h-12 bg-[#FFD600] rounded-full shadow-lg" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[32px] w-1.5 h-12 bg-[#FFD600] rounded-full shadow-lg" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Word Display */}
                <div className="relative z-10 w-full flex items-center justify-center px-12 text-center text-[#fafafa] select-none font-display uppercase">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, scale: item.target ? 1 : 0.9, y: item.target ? 0 : 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            className="w-full flex justify-center items-center"
                        >
                            {renderWord()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
