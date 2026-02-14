import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TargetModePlayer } from './TargetModePlayer';

export const TargetModeSection = () => {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { amount: 0.3 });
    const [mode, setMode] = useState<'static' | 'rhythm' | 'acceleration'>('acceleration');
    const [targetColor, setTargetColor] = useState('#FFD600');
    const [startWpm, setStartWpm] = useState(200);
    const [endWpm, setEndWpm] = useState(400);
    const [rhythmPreset, setRhythmPreset] = useState<'slower' | 'normal' | 'faster'>('normal');

    const [inputText, setInputText] = useState('');
    const [activeText, setActiveText] = useState(
        "Target Mode anchors your eyes to a central coloured letter with guiding lines, keeping your focus steady and reducing eye movement. Toggle it with Rhythm, Acceleration, or Static modes for sharper, more controlled reading."
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            setActiveText(inputText);
            setInputText('');
        }
    };

    const colors = [
        { name: 'Yellow', value: '#FFD600' },
        { name: 'Pink', value: '#ff007f' },
        { name: 'Blue', value: '#0000cd' }
    ];

    return (
        <section ref={sectionRef} className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row items-start justify-center p-8 lg:p-24 lg:pt-32 gap-16 overflow-hidden border-t border-white/10">
            {/* Left Column: Description */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 max-w-xl space-y-8"
            >
                <div>
                    <h2 className="text-sm uppercase tracking-[0.4em] text-red-500 font-bold mb-4">Reading Modes</h2>
                    <h3 className="text-5xl lg:text-7xl font-display leading-[0.9] tracking-tighter mb-6">
                        LOCKED IN<br />TARGET MODE
                    </h3>
                    <p className="text-xl text-zinc-400 font-light leading-relaxed">
                        Surgical precision for your eyes. Focusing on the Optimal Recognition Point (ORP) of every word.
                    </p>
                </div>

                <div className="space-y-6 text-zinc-300 leading-relaxed font-light">
                    <p>
                        Target Mode anchors your eyes to a central coloured letter with guiding lines, keeping your focus steady and reducing eye movement.
                    </p>
                    <p>
                        Replicating the KiN-TXT hardware experience, this mode combines the focus of our vertical eye-anchors with the adaptive engine of your choice.
                    </p>
                </div>

                <div className="pt-4 flex flex-wrap gap-4">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-default">
                        ORP Alignment
                    </div>
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-default">
                        Saccade Reduction
                    </div>
                </div>
            </motion.div>

            {/* Right Column: Player & Interaction */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="flex-1 w-full max-w-2xl flex flex-col gap-6"
            >
                {/* Visual Reader Box */}
                <div className="aspect-[16/10] w-full relative">
                    <TargetModePlayer
                        text={activeText}
                        mode={mode}
                        wpm={startWpm}
                        endWpm={endWpm}
                        rhythmPreset={rhythmPreset}
                        targetColor={targetColor}
                        isActive={isInView}
                    />
                </div>

                {/* Interaction Box */}
                <div className="grid gap-6 p-6 bg-zinc-900/50 border border-white/10 rounded-2xl">
                    {/* Settings Toggles */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Mode Toggle */}
                        <div className="space-y-3">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Engine Mode</span>
                            <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                                {(['rhythm', 'acceleration', 'static'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-lg transition-all ${mode === m ? 'bg-white text-black font-bold' : 'text-zinc-500 hover:text-white'
                                            }`}
                                    >
                                        {m === 'acceleration' ? 'Accel' : m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div className="space-y-3">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Target Colour</span>
                            <div className="flex justify-between items-center bg-black/40 p-1 rounded-xl border border-white/5 px-3 h-[42px]">
                                {colors.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => setTargetColor(c.value)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${targetColor === c.value ? 'border-white scale-110' : 'border-transparent opacity-40'
                                            }`}
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Adaptive Controls */}
                    <div className="space-y-4 pt-2 border-t border-white/5">
                        {mode === 'rhythm' && (
                            <div className="space-y-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Rhythm Preset</span>
                                <div className="flex gap-2">
                                    {(['slower', 'normal', 'faster'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setRhythmPreset(p)}
                                            className={`flex-1 py-2 text-[10px] uppercase tracking-widest border border-white/5 rounded-lg transition-all ${rhythmPreset === p ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500 hover:bg-white/5'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mode === 'acceleration' && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                        <span>Start WPM</span>
                                        <span style={{ color: targetColor }} className="font-mono">{startWpm}</span>
                                    </div>
                                    <input type="range" min="100" max="600" step="10" value={startWpm} onChange={(e) => setStartWpm(parseInt(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" style={{ accentColor: targetColor }} />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                        <span>End WPM</span>
                                        <span style={{ color: targetColor }} className="font-mono">{endWpm}</span>
                                    </div>
                                    <input type="range" min="200" max="1000" step="10" value={endWpm} onChange={(e) => setEndWpm(parseInt(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" style={{ accentColor: targetColor }} />
                                </div>
                            </div>
                        )}

                        {mode === 'static' && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                    <span>Reading Speed</span>
                                    <span style={{ color: targetColor }} className="font-mono">{startWpm} WPM</span>
                                </div>
                                <input type="range" min="100" max="1000" step="10" value={startWpm} onChange={(e) => setStartWpm(parseInt(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" style={{ accentColor: targetColor }} />
                            </div>
                        )}
                    </div>

                    {/* Text Input */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-4 border-t border-white/5">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type or Paste your own TXT here..."
                            className="w-full h-20 bg-zinc-950/50 border border-white/5 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all resize-none text-xs font-light leading-relaxed"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
                        >
                            Submit To Reader
                        </button>
                    </form>
                </div>
            </motion.div>
        </section>
    );
};
