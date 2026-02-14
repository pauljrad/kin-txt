import { useEffect, useState, useMemo } from 'react';

interface DemoReaderProps {
    text: string;
    speed?: number; // WPM
    className?: string;
    isPlaying?: boolean;
}

export function DemoReader({ text, speed = 250, className = "", isPlaying = true }: DemoReaderProps) {
    const words = useMemo(() => text.split(/\s+/), [text]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!isPlaying) return;

        // milliseconds per word

        const msPerWord = 60000 / speed;

        if (currentIndex >= words.length) {
            // Reset loop
            const timer = setTimeout(() => setCurrentIndex(0), 1000);
            return () => clearTimeout(timer);
        }

        const timer = setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
        }, msPerWord);

        return () => clearTimeout(timer);
    }, [currentIndex, isPlaying, speed, words.length]);

    const currentWord = words[currentIndex] || "";

    // Highlight "center" character roughly
    const centerIndex = Math.floor(currentWord.length / 2);
    const leftPart = currentWord.slice(0, centerIndex);
    const centerChar = currentWord[centerIndex] || "";
    const rightPart = currentWord.slice(centerIndex + 1);

    return (
        <div className={`font-display text-4xl sm:text-5xl flex items-center justify-center h-48 bg-muted/10 rounded-xl ${className}`}>
            {currentWord && (
                <div className="flex items-baseline">
                    <span>{leftPart}</span>
                    <span className="text-red-500 mx-[1px]">{centerChar}</span>
                    <span>{rightPart}</span>
                </div>
            )}
            {!currentWord && currentIndex >= words.length && (
                <span className="text-base text-muted-foreground animate-pulse">Restarting...</span>
            )}
        </div>
    );
}
