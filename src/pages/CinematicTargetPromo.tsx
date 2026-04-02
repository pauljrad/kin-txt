import { useState } from 'react';
import { TargetModePlayer } from '../components/TargetModePlayer';

interface TimelineItem {
    text: string;
    mode: 'static' | 'rhythm' | 'acceleration';
    wpm: number;
    endWpm?: number;
    rhythmPreset?: 'slower' | 'normal' | 'faster';
    emphasisWords?: string[];
}

const TIMELINE: TimelineItem[] = [
    { text: "Keep your eyes here.", mode: 'static', wpm: 220 },
    { text: "Don’t move them.", mode: 'static', wpm: 200 },
    { text: "You’re used to scanning. Searching. Jumping ahead.", mode: 'rhythm', wpm: 300, rhythmPreset: 'faster' },
    { text: "Something begins to stabilise.", mode: 'static', wpm: 210 },
    { text: "Your eyes stop moving. Your attention stops drifting.", mode: 'static', wpm: 310, emphasisWords: ['stop', 'drifting'] },
    { text: "Now increase the pace.", mode: 'acceleration', wpm: 300, endWpm: 450 },
    { text: "Slightly.", mode: 'acceleration', wpm: 450, endWpm: 500 },
    { text: "Then again.", mode: 'acceleration', wpm: 500, endWpm: 620 },
    { text: "You expect to lose control.", mode: 'acceleration', wpm: 600, endWpm: 660 },
    { text: "You don’t.", mode: 'static', wpm: 280, emphasisWords: ['don’t'] }, // emphasis rest beats
    { text: "Focus holds. The centre remains fixed.", mode: 'acceleration', wpm: 600, endWpm: 720 },
    { text: "The text accelerates. Your eyes stay still. Your mind keeps up.", mode: 'acceleration', wpm: 700, endWpm: 920 },
    { text: "You’re no longer chasing the words.", mode: 'acceleration', wpm: 900, endWpm: 980 },
    { text: "You’re receiving them.", mode: 'static', wpm: 320, emphasisWords: ['receiving'] },
    { text: "Directly. Continuously. Without interruption.", mode: 'static', wpm: 480 },
    { text: "Speed doesn’t break focus. It sharpens it.", mode: 'static', wpm: 440 },
    { text: "This is Target Mode.", mode: 'static', wpm: 250 },
    { text: "Fix your gaze. Let the text move.", mode: 'static', wpm: 210 }
];

export default function CinematicTargetPromo() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const currentItem = TIMELINE[currentIndex];

    const handleComplete = () => {
        if (currentIndex < TIMELINE.length - 1) {
            // Settle interval for phrasing
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 400); // 400ms pause between text segments for punctuation weight
        } else {
            setIsPlaying(false);
            // reset loop after segment
            setTimeout(() => {
                 setCurrentIndex(0);
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
            {!isPlaying ? (
                <div className="text-center space-y-4">
                    <h1 className="text-xl font-display uppercase tracking-[0.3em] text-red-500 font-bold">Target Mode</h1>
                    <p className="text-zinc-500 text-sm font-light max-w-sm">Dynamic centering speed ramps template.</p>
                    <button 
                        onClick={() => setIsPlaying(true)}
                        className="px-8 py-3 bg-red-500 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                    >
                        Start Playback
                    </button>
                </div>
            ) : (
                <div className="w-full h-full max-w-xl aspect-[9/16] relative flex items-center justify-center">
                    <TargetModePlayer 
                        key={currentIndex}
                        text={currentItem.text}
                        mode={currentItem.mode}
                        wpm={currentItem.wpm}
                        endWpm={currentItem.endWpm}
                        rhythmPreset={currentItem.rhythmPreset}
                        targetColor="#ef4444" // red-500 matching landing theme
                        emphasisWords={currentItem.emphasisWords}
                        isActive={isPlaying}
                        onComplete={handleComplete}
                    />
                </div>
            )}
        </div>
    );
}
