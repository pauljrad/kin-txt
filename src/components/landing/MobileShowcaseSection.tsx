import { useRef } from 'react';
import { motion } from 'framer-motion';
import iphoneDemo from '../../assets/iphone-demo.mp4';

export function MobileShowcaseSection() {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <section
            ref={containerRef}
            className="relative min-h-screen w-full bg-white text-black flex items-center justify-center p-8 lg:p-24 overflow-hidden"
        >
            <div className="max-w-5xl w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 relative z-10">

                {/* Left Column: Content */}
                <div className="flex-1 w-full max-w-lg space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-sm uppercase tracking-[0.4em] text-red-600 font-bold mb-6">Mobile App</h2>
                        <h3 className="text-6xl md:text-7xl lg:text-8xl font-display leading-[0.85] tracking-tighter text-black mb-8">
                            READ<br />EVERYWHERE
                        </h3>
                        <p className="text-xl md:text-2xl text-zinc-600 font-light leading-relaxed max-w-md">
                            Your library in your pocket. Syncs instantly.
                            Optimised for focus, speed, and total immersion on the go.
                        </p>
                    </motion.div>

                    {/* Feature List */}
                    <div className="space-y-10">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex gap-6"
                        >
                            <div className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-full flex-shrink-0 text-black">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold uppercase tracking-wider mb-2">Seamless Continuity</h4>
                                <p className="text-zinc-500 font-light leading-relaxed">
                                    Start reading on desktop, continue on mobile. Your progress is saved to the word.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex gap-6"
                        >
                            <div className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-full flex-shrink-0 text-black">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold uppercase tracking-wider mb-2">Absolute Focus</h4>
                                <p className="text-zinc-500 font-light leading-relaxed">
                                    Notifications are blocked. The interface fades away. It's just you and the rhythm of the text.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="flex gap-6"
                        >
                            <div className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-full flex-shrink-0 text-black">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M12 2v20" /></svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold uppercase tracking-wider mb-2">Pocket Library</h4>
                                <p className="text-zinc-500 font-light leading-relaxed">
                                    Carry your entire collection with you. Access any text, anytime, anywhere.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Column: Phone Mockup */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex-1 w-full flex justify-center lg:justify-start"
                >
                    <div className="relative w-[340px] h-[700px] bg-black rounded-[3.5rem] border-[6px] border-zinc-800 shadow-2xl overflow-hidden ring-1 ring-black/5 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-700 ease-out">
                        {/* Dynamic Island */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-8 bg-black rounded-b-2xl z-20"></div>

                        {/* Screen Content */}
                        <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
                            <video
                                src={iphoneDemo}
                                className="w-full h-full object-cover opacity-90"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                            {/* Vignette Overlay */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
