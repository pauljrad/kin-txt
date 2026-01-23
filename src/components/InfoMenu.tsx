
import { useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Music, Smartphone, Layout, BookOpen, Newspaper, Upload, MousePointer2, Settings, Type } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

// Import videos
import accelerationVideo from '@/assets/videos/acceleration-mode.mov';
import rhythmVideo from '@/assets/videos/rhythm-and-emphasis-mode.mov';

// Trigger deployment
interface InfoMenuProps {
    onClose: () => void;
}

export const InfoMenu = forwardRef<HTMLDivElement, InfoMenuProps>(function InfoMenu({
    onClose
}, ref) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        // Only close if clicking the backdrop itself (not the panel)
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
        // Toggle fullscreen properly for mobile + desktop
        if (video.requestFullscreen) {
            if (!document.fullscreenElement) {
                video.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
            // @ts-ignore - Handle iOS webkit fallback
        } else if (video.webkitEnterFullscreen) {
            // @ts-ignore
            video.webkitEnterFullscreen();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            {/* Panel */}
            <motion.div
                ref={ref}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl border-l border-border"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Added pt-safe for mobile */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]">
                    <div className="flex items-center justify-between p-4 sm:p-5 mt-2">
                        <div className="flex items-center gap-3">
                            {/* Logo "i" Style Icon */}
                            <div className="relative flex flex-col items-center justify-center w-8 h-8">
                                <span className="w-1.5 h-1.5 rounded-full bg-foreground mb-1" />
                                <span className="w-1.5 h-4 bg-foreground rounded-sm" />
                            </div>
                            <h2 className="text-xl font-medium font-display tracking-tight">Information & Instructions</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div
                    ref={containerRef}
                    className="overflow-y-auto px-4 sm:px-6 py-6"
                    style={{ height: 'calc(100vh - 80px - env(safe-area-inset-top))' }}
                >
                    <div className="space-y-8">

                        {/* Introduction */}
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                            <p className="text-sm sm:text-base text-foreground/90 m-0 leading-relaxed">
                                Welcome to <span className="font-semibold text-foreground">KiN-TXT</span>.
                                This guide covers everything you need to know about our kinetic text reader,
                                reading modes, ebook library, live news, AI-powered features, and focus tools.
                            </p>
                        </div>

                        <Accordion type="single" collapsible className="w-full">

                            {/* Reading Modes */}
                            <AccordionItem value="reading-modes">
                                <AccordionTrigger className="text-lg font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Play className="w-5 h-5 text-primary" />
                                        Reading Modes
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-8 pt-4">

                                    {/* Rhythm Mode (Moved to Top) */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
                                            Rhythm Mode
                                        </h4>
                                        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                                            Rhythm Mode turns reading into a time-based experience, with text arriving through pace,
                                            pause, and emphasis. Focus becomes continuous, page friction disappears, and language
                                            unfolds as the writer intended. Great for immersive reading and maintaining focus across
                                            long texts or books.
                                        </p>
                                        {/* Video */}
                                        <div className="aspect-video w-full bg-black/5 rounded-lg border border-border flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-sm">
                                            <video
                                                src={rhythmVideo}
                                                className="w-full h-full object-cover"
                                                controls={false}
                                                onClick={handleVideoClick}
                                                playsInline // Crucial for iOS
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded pointer-events-none backdrop-blur-sm">
                                                Tap to expand
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acceleration Mode */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
                                            Acceleration Mode
                                        </h4>
                                        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                                            Acceleration Mode gradually increases the pace as your brain adapts, helping you absorb
                                            information faster than you expect. You may miss the odd word, but comprehension keeps
                                            up as your mind naturally fills the gaps. Ideal for short, information-dense texts like
                                            news articles and non-fiction, where efficient understanding matters most.
                                        </p>
                                        {/* Video */}
                                        <div className="aspect-video w-full bg-black/5 rounded-lg border border-border flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-sm">
                                            <video
                                                src={accelerationVideo}
                                                className="w-full h-full object-cover"
                                                controls={false}
                                                onClick={handleVideoClick}
                                                playsInline
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded pointer-events-none backdrop-blur-sm">
                                                Tap to expand
                                            </div>
                                        </div>
                                    </div>

                                    {/* Target Mode */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
                                            Target Mode
                                        </h4>
                                        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                                            Target Mode anchors your eyes to a central coloured letter with guiding lines, keeping
                                            your focus steady and reducing eye movement. Toggle it with Rhythm, Acceleration, or
                                            Static modes for sharper, more controlled reading.
                                        </p>
                                    </div>

                                    {/* Static Mode */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
                                            Static Mode
                                        </h4>
                                        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                                            Static Mode keeps text moving at a steady, fixed pace, chosen by you. No acceleration,
                                            no rhythm shifts - just consistent, controlled reading for calm, predictable focus.
                                        </p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Content & Libraries */}
                            <AccordionItem value="content">
                                <AccordionTrigger className="text-lg font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                        Content & Libraries
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    {/* Overarching Statement */}
                                    <p className="text-sm sm:text-base text-foreground/90 leading-relaxed italic border-l-2 border-primary/50 pl-4">
                                        Our AI analyses any text in seconds, instantly highlighting emphasis, rhythm, and writing
                                        style — whether it’s news, books, reports, or text you upload or paste.
                                    </p>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* News */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <Newspaper className="w-4 h-4 text-primary" /> News
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                Check out the News tab to explore live headlines from top sources and absorb the key
                                                points faster than ever.
                                            </p>
                                        </div>
                                        {/* Ebooks */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <BookOpen className="w-4 h-4 text-primary" /> Ebooks
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                Explore our collection of free classic Ebooks and experience the text with emphasis
                                                and rhythm, instantly applied by our AI.
                                            </p>
                                        </div>
                                        {/* My TXTs */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm sm:col-span-2">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <Upload className="w-4 h-4 text-primary" /> My TXTs
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                Under the My TXTs tab, upload files or paste text, and keep track of every book,
                                                article, and document you’ve read on KiN-TXT.
                                            </p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Reader Interface */}
                            <AccordionItem value="interface">
                                <AccordionTrigger className="text-lg font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Layout className="w-5 h-5 text-primary" />
                                        Reader Interface
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* Full Text */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <Type className="w-4 h-4 text-primary" /> Full Text
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                Click the Full TXT button to see the entire document at once. Tap any word to jump
                                                the reader to that exact spot.
                                            </p>
                                        </div>

                                        {/* Navigation Bar */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <MousePointer2 className="w-4 h-4 text-primary" /> Navigation
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                Click the Navigation Bar to jump between sections or chapters. The active section fills
                                                with a Progress Gradient, showing exactly how far you are through the current chapter.
                                            </p>
                                        </div>

                                        {/* Settings */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm sm:col-span-2">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <Settings className="w-4 h-4 text-primary" /> Settings
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                Tap the Settings Button in the toolbar to switch reading modes, adjust the pace, and
                                                change text size - all in one place for a fully personalised reading experience.
                                            </p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Focus & Audio */}
                            <AccordionItem value="focus">
                                <AccordionTrigger className="text-lg font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-primary" />
                                        Focus & Audio
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* Focus Mode */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <Smartphone className="w-4 h-4 text-primary" /> Focus Mode
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                When using the installed mobile app, enabling Focus Mode will automatically turn off
                                                phone notifications, allowing you to immerse completely in the text.
                                            </p>
                                        </div>

                                        {/* Music */}
                                        <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground text-sm">
                                                <Music className="w-4 h-4 text-primary" /> Music
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                Click the Music Button to choose from curated tracks and ambient sounds, crafted to
                                                boost focus without distracting you.
                                            </p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
});
