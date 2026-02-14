import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AccelerationPlayer } from './AccelerationPlayer';

export const AccelerationSection = () => {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { amount: 0.3 });
    const [startWpm, setStartWpm] = useState(200);
    const [endWpm, setEndWpm] = useState(400);
    const [resetInterval, setResetInterval] = useState(999);
    const [inputText, setInputText] = useState('');
    const [activeText, setActiveText] = useState(
        "If you’re reading something factual, a news article, non-fiction, an essay - sometimes you’re not looking for immersion. You just want to digest the information. With Kin-TXT, you can begin at a pace that feels familiar. Comfortable. Unforced. Then you switch on Acceleration Mode. The text starts to move faster… gradually, and deliberately. Something interesting happens. Your brain doesn’t panic. It adapts. You stop reading one word at a time. You begin recognising meaning in motion. Patterns. Structure. Intent. You realise how much processing power your brain actually has when it’s pushed — how much it can take in without effort. You might miss the occasional word. That’s fine. Your brain fills the gaps automatically. Comprehension keeps up. Sometimes it even improves. You’re no longer keeping pace with the text. The text is keeping pace with you. This isn’t skimming. It isn’t speed-reading. It’s letting information move at the speed your mind is capable of. Kin-TXT Acceleration Mode Adjust the pace. Be surprised by how fast you can really think."
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            setActiveText(inputText);
            setInputText('');
        }
    };

    return (
        <section ref={sectionRef} className="min-h-screen w-full bg-white text-black flex flex-col lg:flex-row items-start justify-center p-8 lg:p-24 lg:pt-32 gap-16 overflow-hidden border-t border-zinc-100">
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
                        DYNAMIC<br />ACCELERATION
                    </h3>
                    <p className="text-xl text-zinc-500 font-light leading-relaxed">
                        Push your boundaries by training your brain to process language at increasing speeds.
                    </p>
                </div>

                <div className="space-y-6 text-zinc-600 leading-relaxed font-light">
                    <p>
                        Acceleration Mode gradually increases the pace as your brain adapts, helping you absorb
                        information faster than you expect. It relies on the brain's natural ability to fill in gaps.
                    </p>
                    <p>
                        Ideal for short, information-dense texts where efficiency matters. Customise your
                        starting and finishing speeds, and choose how often the pace resets to manageable levels.
                    </p>
                </div>

                <div className="pt-4 flex flex-wrap gap-4">
                    <div className="px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-full text-xs uppercase tracking-widest text-zinc-500 hover:text-black transition-colors cursor-default">
                        Speed Ramping
                    </div>
                    <div className="px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-full text-xs uppercase tracking-widest text-zinc-500 hover:text-black transition-colors cursor-default">
                        Adaptive Reset
                    </div>
                    <div className="px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-full text-xs uppercase tracking-widest text-zinc-500 hover:text-black transition-colors cursor-default">
                        Neural Training
                    </div>
                </div>
            </motion.div>

            {/* Right Column: Player & Controls */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="flex-1 w-full max-w-2xl flex flex-col gap-8"
            >
                {/* Visual Reader Box */}
                <div className="aspect-[16/10] w-full relative">
                    <AccelerationPlayer
                        text={activeText}
                        startWpm={startWpm}
                        endWpm={endWpm}
                        resetInterval={resetInterval}
                        isActive={isInView}
                    />
                </div>

                {/* Controls UI */}
                <div className="grid gap-6 p-6 bg-zinc-50 border border-zinc-200 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Speed */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold text-zinc-400">
                                <span>Start WPM</span>
                                <span className="text-black">{startWpm}</span>
                            </div>
                            <input
                                type="range"
                                min="100"
                                max="600"
                                step="10"
                                value={startWpm}
                                onChange={(e) => setStartWpm(parseInt(e.target.value))}
                                className="w-full accent-red-500"
                            />
                        </div>

                        {/* End Speed */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold text-zinc-400">
                                <span>Finish WPM</span>
                                <span className="text-black">{endWpm}</span>
                            </div>
                            <input
                                type="range"
                                min="200"
                                max="1000"
                                step="10"
                                value={endWpm}
                                onChange={(e) => setEndWpm(parseInt(e.target.value))}
                                className="w-full accent-red-500"
                            />
                        </div>
                    </div>
                    {/* Reset options */}
                    <div className="space-y-3">
                        <div className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-400">
                            Reset pace after:
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[2, 3, 4, 999].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setResetInterval(num)}
                                    className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all border ${resetInterval === num
                                        ? 'bg-black text-white border-black'
                                        : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                                        }`}
                                >
                                    {num === 999 ? 'End of TXT' : `${num} Sentences`}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Text Input */}
                    <form onSubmit={handleSubmit} className="space-y-3 border-t border-zinc-200 pt-6">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type or Paste your own TXT here..."
                            className="w-full h-24 bg-white border border-zinc-200 rounded-xl p-4 text-black placeholder:text-zinc-400 focus:outline-none focus:border-red-500 transition-all resize-none text-sm font-light leading-relaxed"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="w-full py-4 bg-red-500 text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-all disabled:opacity-50"
                        >
                            Submit To Reader
                        </button>
                    </form>
                </div>
            </motion.div>
        </section>
    );
};
