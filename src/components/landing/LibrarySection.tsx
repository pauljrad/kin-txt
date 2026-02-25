import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BOOKS = [
    {
        id: 'jekyll-hyde',
        title: 'Strange Case of Dr Jekyll and Mr Hyde',
        author: 'Robert Louis Stevenson',
        isDark: true
    },
    {
        id: 'war-of-worlds',
        title: 'The War of the Worlds',
        author: 'H. G. Wells',
        isDark: false
    },
    {
        id: 'wuthering-heights',
        title: 'Wuthering Heights',
        author: 'Emily Brontë',
        isDark: true
    },
    {
        id: 'dracula',
        title: 'Dracula',
        author: 'Bram Stoker',
        isDark: false
    },
    {
        id: 'dorian-gray',
        title: 'The Picture of Dorian Gray',
        author: 'Oscar Wilde',
        isDark: true
    },
    {
        id: 'siddhartha',
        title: 'Siddhartha',
        author: 'Hermann Hesse',
        isDark: false
    },
    {
        id: 'great-gatsby',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isDark: true
    },
    {
        id: 'dubliners',
        title: 'Dubliners',
        author: 'James Joyce',
        isDark: false
    },
    {
        id: 'notes-underground',
        title: 'Notes from the Underground',
        author: 'Fyodor Dostoevsky',
        isDark: true
    },
    {
        id: 'room-view',
        title: 'A Room with a View',
        author: 'E. M. Forster',
        isDark: false
    },
    {
        id: 'tale-two-cities',
        title: 'A Tale of Two Cities',
        author: 'Charles Dickens',
        isDark: true
    },
    {
        id: 'metamorphosis',
        title: 'Metamorphosis',
        author: 'Franz Kafka',
        isDark: false
    },
    {
        id: 'sherlock-holmes',
        title: 'The Adventures of Sherlock Holmes',
        author: 'Arthur Conan Doyle',
        isDark: true
    }
];

const BookCover = ({ title, isDark, isActive }: { title: string; isDark: boolean; isActive: boolean }) => {
    const bgColor = isDark ? 'bg-zinc-950' : 'bg-white';
    const textColor = isDark ? 'text-white' : 'text-black';
    const logoColor = isDark ? 'bg-white' : 'bg-black';

    return (
        <div className={`w-64 h-96 rounded-xl ${bgColor} flex flex-col items-center justify-between p-8 shadow-2xl border border-white/10 relative overflow-hidden transition-all duration-500 ${isActive ? 'ring-2 ring-red-500' : ''}`}>
            {/* Decorative Spine */}
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/10 shadow-inner" />

            {/* Centered KiN-TXT Logo */}
            <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-4">
                    <div className="relative flex flex-col items-center justify-center w-8 h-12">
                        <span className={`w-2 h-2 rounded-full ${logoColor} mb-1.5`} />
                        <span className={`w-2 h-6 ${logoColor} rounded-sm`} />
                    </div>
                    <div className={`w-6 h-1.5 ${logoColor} rounded-full opacity-80`} />
                </div>
            </div>

            {/* Title at the bottom */}
            <div className="w-full text-center">
                <h4 className={`font-display font-medium text-xs leading-tight uppercase tracking-[0.2em] ${textColor} line-clamp-3 mb-2`}>
                    {title}
                </h4>
                <div className={`w-8 h-0.5 mx-auto ${logoColor} opacity-20`} />
            </div>
        </div>
    );
};

export const LibrarySection = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    const nextBook = () => setActiveIndex((prev) => (prev + 1) % BOOKS.length);
    const prevBook = () => setActiveIndex((prev) => (prev - 1 + BOOKS.length) % BOOKS.length);

    return (
        <section className="min-h-screen w-full bg-zinc-900 text-white flex flex-col items-center justify-center py-24 overflow-hidden border-t border-white/5 relative">
            <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center space-y-4 z-10">
                <h2 className="text-sm uppercase tracking-[0.4em] text-red-500 font-bold">Content Library</h2>
                <h3 className="text-5xl lg:text-7xl font-display leading-[0.9] tracking-tighter">
                    EBOOK ARCHIVE
                </h3>
                <p className="max-w-xl mx-auto text-zinc-400 font-light text-lg">
                    Explore our curated collection of free classic Ebooks, instantly analyzed by KiN-Ai for rhythm and emphasis.
                </p>
            </div>

            <motion.div
                className="relative w-full h-[600px] flex items-center justify-center mt-48 lg:mt-24 cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                    if (info.offset.x > 100) {
                        prevBook();
                    } else if (info.offset.x < -100) {
                        nextBook();
                    }
                }}
            >
                <AnimatePresence mode="popLayout">
                    {BOOKS.map((book, index) => {
                        const offset = index - activeIndex;
                        // Handle wrap around for better feeling
                        let normalizedOffset = offset;
                        if (offset > Math.floor(BOOKS.length / 2)) normalizedOffset -= BOOKS.length;
                        if (offset < -Math.floor(BOOKS.length / 2)) normalizedOffset += BOOKS.length;

                        const isCenter = normalizedOffset === 0;
                        const isVisible = Math.abs(normalizedOffset) <= 2;

                        if (!isVisible && !isCenter) return null;

                        return (
                            <motion.div
                                key={book.id}
                                initial={false}
                                animate={{
                                    x: normalizedOffset * 220,
                                    scale: isCenter ? 1 : 0.7,
                                    rotateY: normalizedOffset * -45,
                                    zIndex: 10 - Math.abs(normalizedOffset),
                                    opacity: 1 - Math.abs(normalizedOffset) * 0.3,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30
                                }}
                                className="absolute pointer-events-none"
                            >
                                <BookCover
                                    title={book.title}
                                    isDark={book.isDark}
                                    isActive={isCenter}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* Subtext info for active book - moved outside the carousel for cleaner layout */}
            <div className="h-16 mt-0 text-center flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                    >
                        <h4 className="text-xl lg:text-2xl font-display font-medium uppercase tracking-widest text-white leading-none">
                            {BOOKS[activeIndex].title}
                        </h4>
                        <div className="w-8 h-0.5 bg-red-500 mx-auto" />
                        <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-[0.4em] font-light">
                            {BOOKS[activeIndex].author}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Carousel Controls - Restored for Desktop only */}
            <div className="mt-4 hidden lg:flex items-center gap-16 z-20">
                <button
                    onClick={prevBook}
                    className="p-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
                >
                    <ChevronLeft className="w-10 h-10" />
                </button>
                <button
                    onClick={nextBook}
                    className="p-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
                >
                    <ChevronRight className="w-10 h-10" />
                </button>
            </div>
        </section>
    );
};
