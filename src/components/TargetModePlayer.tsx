import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordSpeed {
    word: string;
    speed: number;
}

interface TargetModePlayerProps {
    text: string;
    mode: 'static' | 'rhythm' | 'acceleration';
    wpm?: number; // For static/acceleration
    endWpm?: number; // For acceleration
    rhythmPreset?: 'slower' | 'normal' | 'faster';
    targetColor: string;
    emphasisWords?: string[];
    isActive?: boolean;
    onComplete?: () => void;
}

export function TargetModePlayer({
    text,
    mode,
    wpm = 300,
    endWpm = 600,
    rhythmPreset = 'normal',
    targetColor,
    emphasisWords = [],
    isActive = true,
    onComplete
}: TargetModePlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wordsRead, setWordsRead] = useState(0);
    const [rhythmSpeeds, setRhythmSpeeds] = useState<WordSpeed[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1. Rhythm Engine (matches RhythmEmphasisPlayer/KineticPlayer)
    const generateRhythm = useCallback((words: string[]): WordSpeed[] => {
        const results: WordSpeed[] = [];
        let prevEndedSentence = false;
        let prevHadComma = false;
        const quickWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'by', 'is', 'it', 'as', 'be']);

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const cleanWord = word.toLowerCase().replace(/[.,!?;:'"—–\-()[\]]/g, '');
            let speed = 1.0;

            if (prevEndedSentence) { speed = 0.75; prevEndedSentence = false; }
            else if (prevHadComma) { speed = 0.9; prevHadComma = false; }

            if (quickWords.has(cleanWord) && cleanWord.length <= 4) speed += 0.12;
            if (cleanWord.length >= 10) speed -= 0.25;
            else if (cleanWord.length >= 7) speed -= 0.1;

            if (/[.!?]$/.test(word)) { speed -= 0.15; prevEndedSentence = true; }
            else if (/[,;:]$/.test(word)) { speed -= 0.08; prevHadComma = true; }

            speed = Math.max(0.60, Math.min(1.45, speed));
            results.push({ word, speed });
        }
        return results;
    }, []);

    // 2. Timing logic based on mode
    const getDelay = useCallback(() => {
        if (mode === 'static') {
            return 60000 / wpm;
        }

        if (mode === 'acceleration') {
            const totalWords = rhythmSpeeds.length || 1;
            const progress = currentIndex / totalWords;
            const currentWpm = wpm + (endWpm - wpm) * progress;
            return 60000 / currentWpm;
        }

        // Rhythm mode
        const wordIdx = currentIndex;
        const rhythmSpeed = rhythmSpeeds[wordIdx]?.speed || 1.0;

        // Rhythm Multiplier based on preset
        let baseMultiplier: number;
        switch (rhythmPreset) {
            case 'slower': baseMultiplier = 0.825; break;
            case 'faster': baseMultiplier = 1.15; break;
            default: baseMultiplier = 1.0;
        }

        const progress = Math.min(1, wordsRead / 120);
        const easeOut = 1 - Math.pow(1 - progress, 2);
        const adaptiveMultiplier = 0.75 + (0.25 * easeOut);

        const speed = rhythmSpeed * baseMultiplier * adaptiveMultiplier;
        const baseDelay = (60000 / 250) / speed; // Matching main app's 250ms baseline at 1.0x

        const word = rhythmSpeeds[wordIdx]?.word || "";
        const lastChar = word.slice(-1);
        if (['.', '!', '?'].includes(lastChar)) return baseDelay * 1.7;
        if ([',', ';', ':'].includes(lastChar)) return baseDelay * 1.3;

        return baseDelay;
    }, [mode, wpm, endWpm, rhythmPreset, rhythmSpeeds, currentIndex, wordsRead]);

    // Initialize on mode/text change
    useEffect(() => {
        const splitText = text.split(/\s+/).filter(w => w.length > 0);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRhythmSpeeds(generateRhythm(splitText));
        setCurrentIndex(0);
        setWordsRead(0);
    }, [text, generateRhythm]);

    // Playback loop
    useEffect(() => {
        if (!isActive || rhythmSpeeds.length === 0) return;

        if (currentIndex >= rhythmSpeeds.length) {
            if (onComplete) onComplete();
            const restartTimer = setTimeout(() => {
                setCurrentIndex(0);
                setWordsRead(0);
            }, 2000);
            return () => clearTimeout(restartTimer);
        }

        const delay = getDelay();
        timeoutRef.current = setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setWordsRead(prev => prev + 1);
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentIndex, isActive, rhythmSpeeds, getDelay, onComplete]);

    // Reset when becoming inactive
    useEffect(() => {
        if (!isActive) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentIndex(0);
            setWordsRead(0);
        }
    }, [isActive]);

    const currentWord = rhythmSpeeds[currentIndex]?.word || "";
    const cleanWord = currentWord.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '');
    const isEmphasisWord = emphasisWords.map(w => w.toLowerCase()).includes(cleanWord);

    // ORP Calculation (Optimal Recognition Point)
    const getOrpIndex = (word: string) => {
        const safeWord = word.replace(/[.,!?;:'"()[\]]/g, '');
        const length = safeWord.length;
        if (length === 0) return 0;
        if (length === 1) return 0;
        if (length <= 5) return 1;
        if (length <= 9) return 2;
        if (length <= 13) return 3;
        return 4;
    };


    const orpIndex = getOrpIndex(currentWord);
    const prefix = currentWord.slice(0, orpIndex);
    const focalChar = currentWord[orpIndex] || "";
    const suffix = currentWord.slice(orpIndex + 1);

    const isKiN = currentWord.toLowerCase().includes('kin-txt');

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950 rounded-2xl border border-white/5">
            {/* Vertical Guides - Exact specs from main app */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Top Anchor - Adjusted for better sight alignment (-64px) */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[64px] w-0.5 h-10 opacity-90 transition-colors duration-300"
                    style={{ backgroundColor: targetColor, boxShadow: `0 0 8px ${targetColor}80` }}
                />
                {/* Bottom Anchor - Adjusted for better sight alignment (+24px) */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[24px] w-0.5 h-10 opacity-90 transition-colors duration-300"
                    style={{ backgroundColor: targetColor, boxShadow: `0 0 8px ${targetColor}80` }}
                />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={`${text.slice(0, 10)}-${currentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                    transition={{ duration: 0.05 }}
                    className="font-display text-white text-4xl sm:text-5xl flex items-center justify-center select-none w-full"
                    style={{ 
                        fontWeight: 400,
                        transform: isEmphasisWord ? 'scale(1.28)' : 'none',
                        color: isEmphasisWord ? '#ffffff' : 'inherit',
                        transition: 'transform 0.1s ease-out'
                    }}
                >
                    {isKiN ? (
                        <div className="flex w-full items-center justify-center h-full">
                            {currentWord.replace(/kin-txt/gi, 'KiN-TXT')}
                        </div>
                    ) : (
                        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-baseline">
                            <span className="text-right whitespace-pre opacity-100">{prefix}</span>
                            <span className="text-center font-bold min-w-[1ch] transition-colors duration-300" style={{ color: targetColor }}>{focalChar}</span>
                            <span className="text-left whitespace-pre opacity-100">{suffix}</span>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Mode & WPM Indicator */}
            <div className="absolute bottom-4 left-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium font-mono flex items-center gap-2">
                <span className="opacity-50">Locked In</span>
                <span className="w-1 h-3 bg-zinc-800" />
                <span className="text-zinc-400">
                    {mode === 'rhythm' ? `Rhythm (${rhythmPreset})` : mode === 'acceleration' ? 'Accelerating' : 'Static'}
                </span>
            </div>

        </div>
    );
}
