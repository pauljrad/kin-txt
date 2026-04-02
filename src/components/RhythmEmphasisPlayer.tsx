import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordSpeed {
    word: string;
    speed: number;
}

interface RhythmEmphasisPlayerProps {
    text: string;
    isActive?: boolean;
    onComplete?: () => void;
}

export function RhythmEmphasisPlayer({ text, isActive = true, onComplete }: RhythmEmphasisPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wordsRead, setWordsRead] = useState(0);
    const [prevText, setPrevText] = useState(text);
    const [prevIsActive, setPrevIsActive] = useState(isActive);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mirroring state in render to avoid effect-based setState
    if (text !== prevText) {
        setPrevText(text);
        setCurrentIndex(0);
        setWordsRead(0);
    }

    if (isActive !== prevIsActive) {
        setPrevIsActive(isActive);
        if (!isActive) {
            setCurrentIndex(0);
            setWordsRead(0);
        }
    }

    // 1. Core Logic: Stop Words & Emphasis Sets
    const AUTO_WHISPER_WORDS = useMemo(() => new Set([
        'whisper', 'whispers', 'mouse', 'mice', 'tiny', 'quiet', 'quietly', 'silence', 'silent', 'soft', 'softly'
    ]), []);

    // 2. Rhythm Engine
    const generateRhythm = useCallback((words: string[]): WordSpeed[] => {
        const results: WordSpeed[] = [];
        let prevEndedSentence = false;
        let prevHadComma = false;
        const quickWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'by', 'is', 'it', 'as', 'be']);

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const cleanWord = word.toLowerCase().replace(/[.,!?;:'"—–()[\]-]/g, '');
            let speed = 1.0;

            if (prevEndedSentence) {
                speed = 0.75;
                prevEndedSentence = false;
            } else if (prevHadComma) {
                speed = 0.9;
                prevHadComma = false;
            }

            if (quickWords.has(cleanWord) && cleanWord.length <= 4) speed += 0.12;
            if (cleanWord.length >= 10) speed -= 0.25;
            else if (cleanWord.length >= 7) speed -= 0.1;

            if (/[.!?]$/.test(word)) {
                speed -= 0.15;
                prevEndedSentence = true;
            } else if (/[,;:]$/.test(word)) {
                speed -= 0.08;
                prevHadComma = true;
            }

            speed = Math.max(0.60, Math.min(1.45, speed));
            results.push({ word, speed });
        }
        return results;
    }, []);

    const rhythmSpeeds = useMemo(() => {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        return generateRhythm(words);
    }, [text, generateRhythm]);

    // 3. Timing Engine
    const getDelay = useCallback((wordIdx: number) => {
        const rhythmSpeed = rhythmSpeeds[wordIdx]?.speed || 1.0;
        const progress = Math.min(1, wordsRead / 120);
        const easeOut = 1 - Math.pow(1 - progress, 2);
        const adaptiveMultiplier = 0.75 + (0.25 * easeOut);
        const baseSpeed = rhythmSpeed * adaptiveMultiplier;
        const baseDelay = 230 / baseSpeed;
        const word = rhythmSpeeds[wordIdx]?.word || "";
        const lastChar = word.slice(-1);

        if (['.', '!', '?'].includes(lastChar)) return baseDelay * 1.5;
        if ([',', ';', ':'].includes(lastChar)) return baseDelay * 1.2;
        return baseDelay;
    }, [rhythmSpeeds, wordsRead]);

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

        const delay = getDelay(currentIndex);
        timeoutRef.current = setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setWordsRead(prev => prev + 1);
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentIndex, isActive, rhythmSpeeds, getDelay, onComplete]);

    const currentWordData = rhythmSpeeds[currentIndex];
    if (!currentWordData) return null;

    const currentWord = currentWordData.word;
    const cleanWord = currentWord.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '');
    const isWhispered = currentWord.includes('(') || AUTO_WHISPER_WORDS.has(cleanWord);
    const wordNoPunct = currentWord.replace(/[.,!?;:'"()[\]…—–-]/g, '');
    const isAllCaps = wordNoPunct.length >= 2 && wordNoPunct === wordNoPunct.toUpperCase() && /[A-Z]/.test(wordNoPunct);
    const isEmphasis = !isWhispered && isAllCaps;
    const isKiN = cleanWord === 'kin-txt' || cleanWord.includes('kin-txt');

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950/50 rounded-2xl border border-white/5 backdrop-blur-sm">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(8px)' }}
                    animate={{
                        opacity: isWhispered ? 0.5 : 1,
                        scale: 1,
                        y: 0,
                        filter: 'blur(0px)'
                    }}
                    exit={{ opacity: 0, scale: 1.1, y: -10, filter: 'blur(4px)', transition: { duration: 0.05 } }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`font-display text-center flex items-center justify-center p-8 whitespace-nowrap ${isKiN ? 'text-white' : isWhispered ? 'text-zinc-500 italic' : 'text-white'}`}
                    style={{
                        fontSize: isEmphasis && !isKiN ? 'min(10vw, 7.5rem)' : isWhispered ? 'min(4vw, 2.5rem)' : 'min(6.5vw, 4.5rem)',
                        fontWeight: (isKiN || isEmphasis) && !isKiN ? 800 : 400,
                        letterSpacing: isKiN ? '0.02em' : 'normal'
                    }}
                >
                    {isKiN ? currentWord.replace(/kin-txt/gi, 'KiN-TXT').replace(/[()]/g, '') : currentWord.replace(/[()]/g, '')}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
