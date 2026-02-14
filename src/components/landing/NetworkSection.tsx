import { motion } from 'framer-motion';
import { Users, Trophy, Target, Share2 } from 'lucide-react';

const MOCK_FRIENDS = [
    { id: 1, name: 'Alice', initial: 'A', color: 'bg-red-500', progress: 85 },
    { id: 2, name: 'Bob', initial: 'B', color: 'bg-blue-500', progress: 62 },
    { id: 3, name: 'Charlie', initial: 'C', color: 'bg-yellow-500', progress: 91 },
    { id: 4, name: 'Diana', initial: 'D', color: 'bg-pink-500', progress: 44 },
];

export const NetworkSection = () => {
    return (
        <section className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row items-start justify-center p-8 lg:p-24 lg:pt-32 gap-16 overflow-hidden border-t border-white/10">
            {/* Left Column: Description */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 max-w-xl space-y-8"
            >
                <div>
                    <h2 className="text-sm uppercase tracking-[0.4em] text-red-500 font-bold mb-4">Community</h2>
                    <h3 className="text-5xl lg:text-7xl font-display leading-[0.9] tracking-tighter mb-6">
                        READING IS<br />SOCIAL
                    </h3>
                    <p className="text-xl text-zinc-400 font-light leading-relaxed">
                        Connect with friends, join clubs, and experience the journey of a book together.
                    </p>
                </div>

                <div className="space-y-6 text-zinc-300 leading-relaxed font-light">
                    <p>
                        <span className="text-white font-medium tracking-wider">KiN-Network</span> lets you find and connect with fellow readers.
                        Share what you're currently reading and see how your friends are progressing through their libraries.
                    </p>
                    <p>
                        <span className="text-white font-medium tracking-wider">KiN-Clubs</span> take it further — create private reading groups,
                        suggest books, and track everyone's live progress. No more spoilers, just shared speed-reading journeys.
                    </p>
                </div>

            </motion.div>

            {/* Right Column: Social UI Mockup */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="flex-1 w-full max-w-2xl flex flex-col gap-6"
            >
                {/* Live Club Progress Card */}
                <div className="p-8 bg-zinc-900 border border-white/10 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 translate-x-4 -translate-y-4">
                        <Trophy className="w-32 h-32 text-red-500 rotate-12" />
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-red-500 rounded-2xl">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold uppercase tracking-widest">Modern Classics Club</h4>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">Active: Wuthering Heights</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {MOCK_FRIENDS.map((friend) => (
                            <div key={friend.id} className="space-y-2">
                                <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full ${friend.color} flex items-center justify-center text-white text-[10px]`}>
                                            {friend.initial}
                                        </div>
                                        <span>{friend.name}</span>
                                    </div>
                                    <span className="text-zinc-500">{friend.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${friend.progress}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className={`h-full ${friend.color}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col gap-4 hover:border-red-500/30 transition-colors cursor-default">
                        <Share2 className="w-6 h-6 text-red-500 opacity-50" />
                        <h5 className="text-xs font-bold uppercase tracking-widest">Share Speed</h5>
                        <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-widest">Post your reading records to the network.</p>
                    </div>
                    <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col gap-4 hover:border-red-500/30 transition-colors cursor-default">
                        <Target className="w-6 h-6 text-red-500 opacity-50" />
                        <h5 className="text-xs font-bold uppercase tracking-widest">Club Goals</h5>
                        <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-widest">Set daily target word counts for your group.</p>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};
