import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { RhythmEmphasisPlayer } from './RhythmEmphasisPlayer';

export const RhythmEmphasisSection = () => {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { amount: 0.3 });
    const [inputText, setInputText] = useState('');
    const [activeText, setActiveText] = useState(
        "WELCOME to KIN-TXT. Where reading becomes a VISUAL EXPERIENCE. Reading shifts closer to other time-based visual experiences, like WATCHING A SCENE UNFOLD, LISTENING TO SPOKEN LANGUAGE, OBSERVING MOVEMENT. Sentences arrive as MOMENTS. With PAUSE. With RHYTHM. With EMPHASIS. Sometimes that means the LOUD FIREWORK that goes BANG BANG BANG And sometimes it’s the (tiny), (quiet), (mouse) that goes (whisper) (whisper) (whisper) Because the text is not just read. It is EXPERIENCED. Memory begins to form around EVENTS IN TIME, not blocks of text on a page. Moments land. Beats stay with you. The narrative lingers. Unlike static reading, which is SPATIAL, kinetic reading is TEMPORAL. The text comes to YOU. Your FOCUS changes. It becomes CONTINUOUS, rather than FRAG MENTED. There is no page fright - A hidden cognitive load which traditional reading carries with it… Pages. Position. Progress. Constant navigation. KIN-TXT removes page fright entirely. No scanning ahead. No managing where you are. No visual clutter competing with you and the TEXT. Attention stays with the UNFOLDING LANGUAGE. This is RHYTHM MODE. Reading, PERFORMED in time."
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            setActiveText(inputText);
            setInputText('');
        }
    };

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
                        RHYTHM &<br />EMPHASIS
                    </h3>
                    <p className="text-xl text-zinc-400 font-light leading-relaxed">
                        Immersive, time-based reading that moves at the speed of thought.
                    </p>
                </div>

                <div className="space-y-6 text-zinc-300 leading-relaxed font-light">
                    <p>
                        Rhythm Mode turns reading into a time-based experience, with text arriving through pace, pause, and emphasis.
                        Focus becomes continuous, page friction disappears, and language unfolds as the writer intended.
                    </p>
                    <p>
                        Our Ai analyses any text in seconds, instantly highlighting emphasis, rhythm, and writing style —
                        whether it’s news, books, reports, or text you upload or paste.
                    </p>
                </div>

                <div className="pt-4 flex flex-wrap gap-4">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-default">
                        Adaptive Pace
                    </div>
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-default">
                        Ai Emphasis
                    </div>
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-default">
                        Continuous Focus
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
                <div className="aspect-[16/10] w-full relative">
                    <RhythmEmphasisPlayer text={activeText} isActive={isInView} />
                </div>

                {/* Input Box */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="relative group">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type or Paste your own TXT here..."
                            className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 transition-all resize-none font-light leading-relaxed"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black"
                    >
                        Submit To Reader
                    </button>

                    <p className="text-center text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        Experience your own text with KiN-TXT logic
                    </p>
                </form>
            </motion.div>
        </section>
    );
};
