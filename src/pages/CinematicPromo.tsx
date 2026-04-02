import { useState, useEffect } from 'react';
import { RhythmEmphasisPlayer } from '../components/RhythmEmphasisPlayer';
import { AccelerationPlayer } from '../components/AccelerationPlayer';
import { TargetModePlayer } from '../components/TargetModePlayer';

export default function CinematicPromo() {
    const [phase, setPhase] = useState<'rhythm1' | 'accel' | 'rhythm2' | 'target'>('rhythm1');

    const sections = {
        rhythm1: "Reading has not disappeared. But the conditions for reading have changed. Digital text now lives inside environments designed for interruption.",
        accel: "Notifications. Feeds. Movement.",
        rhythm2: "Endless visual competition. Language, once surrounded by quiet, now competes for attention. Traditional reading carries a hidden cognitive load. Pages. Position. Progress. The constant need to navigate. A subtle anxiety forms in the background. Page fright. KiN-TXT removes this entirely. No pages. No scanning ahead. No visual clutter competing with the words. Text unfolds in time.",
        target: "Sentences arrive as moments. With pause. With rhythm. With emphasis. Attention remains with the unfolding language. Remove distraction. Regain focus. KiN-TXT"
    };

    return (
        <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
            {/* 9:16 aspect ratio framing container for viewport recording */}
            <div className="w-[390px] h-[844px] bg-black rounded-3xl overflow-hidden border border-zinc-800 relative shadow-2xl flex items-center justify-center">
                <div className="w-[85%] h-[280px]"> {/* Container sizing matching the landing pages example */}
                    {phase === 'rhythm1' && (
                        <RhythmEmphasisPlayer 
                            text={sections.rhythm1} 
                            isActive={true} 
                            onComplete={() => setPhase('accel')} 
                        />
                    )}
                    {phase === 'accel' && (
                        <AccelerationPlayer 
                            text={sections.accel} 
                            startWpm={300} 
                            endWpm={600} 
                            resetInterval={999} 
                            isActive={true} 
                            onComplete={() => setPhase('rhythm2')} 
                        />
                    )}
                    {phase === 'rhythm2' && (
                        <RhythmEmphasisPlayer 
                            text={sections.rhythm2} 
                            isActive={true} 
                            onComplete={() => setPhase('target')} 
                        />
                    )}
                    {phase === 'target' && (
                        <TargetModePlayer 
                            text={sections.target} 
                            mode="rhythm" 
                            targetColor="#10b981" 
                            isActive={true} 
                            onComplete={() => { document.title = "FINISHED"; }} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
