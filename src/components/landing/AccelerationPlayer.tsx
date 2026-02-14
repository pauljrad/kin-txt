import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';



interface AccelerationPlayerProps {
    text: string;
    startWpm: number;
    endWpm: number;
    resetInterval: number; // sentences
    isActive?: boolean;
    onComplete?: () => void;
}

export function AccelerationPlayer({
    text,
    startWpm,
    endWpm,
    resetInterval,
    isActive = true,
    onComplete
}: AccelerationPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wordInChunk, setWordInChunk] = useState(0);
    const [sentenceCount, setSentenceCount] = useState(0);
    const [chunkLength, setChunkLength] = useState(0);
    const [words, setWords] = useState<string[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    // 1. Sentence Detection Logic
    const isSentenceEnd = (word: string) => /[.!?]$/.test(word.trim());

    // 2. Calculate Chunk Length
    const calculateChunkLength = useCallback((startIndex: number, wordList: string[]) => {
        if (resetInterval >= 999) return wordList.length - startIndex;

        let count = 0;
        let sentences = 0;
        for (let i = startIndex; i < wordList.length; i++) {
            count++;
            if (isSentenceEnd(wordList[i])) {
                sentences++;
                if (sentences >= resetInterval) break;
            }
        }
        return count;
    }, [resetInterval]);

    // Initialize on text change
    useEffect(() => {
        const splitWords = text.split(/\s+/).filter(w => w.length > 0);
        setWords(splitWords);
        setCurrentIndex(0);
        setWordInChunk(0);
        setSentenceCount(0);
        setChunkLength(calculateChunkLength(0, splitWords));
    }, [text, calculateChunkLength]);

    // 3. Acceleration logic
    const getCurrentDelay = useCallback(() => {
        const startDelay = 60000 / startWpm;
        const endDelay = 60000 / endWpm;

        if (chunkLength <= 1) return startDelay;

        const progressInChunk = wordInChunk / Math.max(1, chunkLength - 1);
        // Linear interpolation between start and end delay
        const delay = startDelay + (endDelay - startDelay) * progressInChunk;

        return delay;
    }, [startWpm, endWpm, wordInChunk, chunkLength]);

    // Playback loop
    useEffect(() => {
        if (!isActive || words.length === 0) return;

        if (currentIndex >= words.length) {
            if (onComplete) onComplete();
            const restartTimer = setTimeout(() => {
                setCurrentIndex(0);
                setWordInChunk(0);
                setSentenceCount(0);
                setChunkLength(calculateChunkLength(0, words));
            }, 2000);
            return () => clearTimeout(restartTimer);
        }

        const delay = getCurrentDelay();
        timeoutRef.current = setTimeout(() => {
            const word = words[currentIndex];
            let nextSentenceCount = sentenceCount;
            if (isSentenceEnd(word)) {
                nextSentenceCount++;
            }

            if (resetInterval < 999 && nextSentenceCount >= resetInterval && isSentenceEnd(word)) {
                // Reset chunk
                setSentenceCount(0);
                setWordInChunk(0);
                setChunkLength(calculateChunkLength(currentIndex + 1, words));
            } else {
                setSentenceCount(nextSentenceCount);
                setWordInChunk(prev => prev + 1);
            }

            setCurrentIndex(prev => prev + 1);
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentIndex, isActive, words, getCurrentDelay, calculateChunkLength, resetInterval, sentenceCount]);

    // Reset when becoming inactive to ensure it starts from the beginning next time
    useEffect(() => {
        if (!isActive) {
            setCurrentIndex(0);
            setWordInChunk(0);
            setSentenceCount(0);
        }
    }, [isActive]);

    const currentWord = words[currentIndex];
    if (!currentWord) return null;

    const cleanWord = currentWord.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '');
    const isKiN = cleanWord === 'kin-txt' || cleanWord.includes('kin-txt');
    const isAllCaps = currentWord.length >= 3 && currentWord === currentWord.toUpperCase() && /[A-Z]/.test(currentWord);
    const isEmphasis = isAllCaps || currentWord.includes('!');

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white rounded-2xl border border-zinc-200">
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${text.slice(0, 10)}-${currentIndex}`}
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.05 } }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="font-display text-black text-center flex items-center justify-center p-8"
                    style={{
                        fontSize: isEmphasis && !isKiN ? 'min(8vw, 6rem)' : 'min(6vw, 4rem)',
                        fontWeight: isEmphasis && !isKiN ? 800 : 400
                    }}
                >
                    {isKiN ? currentWord.replace(/kin-txt/gi, 'KiN-TXT') : currentWord}
                </motion.div>
            </AnimatePresence>

            {/* Current WPM Indicator */}
            <div className="absolute top-4 right-6 text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-medium font-mono">
                {Math.round(60000 / getCurrentDelay())} WPM
            </div>

        </div>
    );
}
