import { motion } from 'framer-motion';
import { Newspaper, ExternalLink } from 'lucide-react';

const MOCK_NEWS = [
    {
        id: '1',
        title: "Voices from the Amazon: Protecting indigenous lands through collaborative mapping",
        author: "Fernanda Ferreira",
        source: "Global Voices",
        time: "2h ago"
    },
    {
        id: '2',
        title: "Digital rights in Southeast Asia: The growing challenge of online censorship",
        author: "Serey Rath",
        source: "Global Voices",
        time: "5h ago"
    },
    {
        id: '3',
        title: "Grassroots movements in Nairobi: Transforming urban spaces with community gardens",
        author: "Kendi Mutura",
        source: "Global Voices",
        time: "8h ago"
    }
];

export const NewsSection = () => {
    return (
        <section className="min-h-screen w-full bg-white text-black flex flex-col lg:flex-row items-start justify-center p-8 lg:p-24 lg:pt-32 gap-16 overflow-hidden border-t border-zinc-100">
            {/* Left Column: Description */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 max-w-xl space-y-8"
            >
                <div>
                    <h2 className="text-sm uppercase tracking-[0.4em] text-red-500 font-bold mb-4">Live Integration</h2>
                    <h3 className="text-5xl lg:text-7xl font-display leading-[0.9] tracking-tighter mb-6">
                        PULSE OF THE<br />WORLD
                    </h3>
                    <p className="text-xl text-zinc-500 font-light leading-relaxed">
                        Stay informed with real-time news from leading sources, optimised for high-speed absorption.
                    </p>
                </div>

                <div className="space-y-6 text-zinc-600 leading-relaxed font-light">
                    <p>
                        KiN-TXT integrates directly with <span className="font-medium text-black italic">Global Voices</span>,
                        bringing you deep-dive analysis and global perspectives instantly.
                    </p>
                    <p>
                        Our Ai applies rhythm logic to live articles as they break,
                        allowing you to stay ahead of the curve without the friction of traditional browsing.
                    </p>
                </div>

            </motion.div>

            {/* Right Column: News Showcase */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="flex-1 w-full max-w-2xl flex flex-col gap-6"
            >
                <div className="grid gap-4">
                    {MOCK_NEWS.map((article, index) => (
                        <motion.div
                            key={article.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="p-8 bg-zinc-50 border border-zinc-200 rounded-2xl group cursor-pointer hover:border-red-500/50 transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{article.source}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400">{article.time}</span>
                            </div>

                            <h4 className="text-2xl font-display font-medium leading-tight mb-4 group-hover:text-red-500 transition-colors">
                                {article.title}
                            </h4>

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-zinc-500">By <span className="text-black font-medium">{article.author}</span></p>
                                <div className="p-2 rounded-lg bg-white border border-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink className="w-4 h-4 text-zinc-400" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white">
                        <Newspaper className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-red-900 uppercase tracking-wider">Ai Analysis Active</p>
                        <p className="text-xs text-red-700 font-light">Headlines are automatically parsed for optimal reading speed.</p>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};
