
import { useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Music, Smartphone, Layout, BookOpen, Newspaper, Upload } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

// Import videos
import accelerationVideo from '@/assets/videos/acceleration-mode.mov';
import rhythmVideo from '@/assets/videos/rhythm-and-emphasis-mode.mov';

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
        // Toggle fullscreen
        if (!document.fullscreenElement) {
            video.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
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
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
                    <div className="flex items-center justify-between p-4 sm:p-5">
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
                    style={{ height: 'calc(100vh - 80px)' }}
                >
                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

                        {/* Introduction */}
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                            <p className="text-base text-muted-foreground m-0">
                                Welcome to <span className="font-semibold text-foreground">Kin-TXT</span>.
                                This guide covers everything you need to know about our moving text reader,
                                ebook libraries, and focus tools.
                            </p>
                        </div>

                        <Accordion type="single" collapsible className="w-full">

                            {/* Reading Modes */}
                            <AccordionItem value="reading-modes">
                                <AccordionTrigger className="text-lg font-medium">
                                    <div className="flex items-center gap-2">
                                        <Play className="w-5 h-5 text-primary" />
                                        Reading Modes
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4 text-base">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                                            acceleration Mode
                                        </h4>
                                        <p>
                                            Start slow and gradually build up speed. Perfect for warming up or pushing
                                            your reading limits comfortably.
                                        </p>
                                        {/* Video */}
                                        <div className="aspect-video w-full bg-black/5 rounded-lg border border-border flex items-center justify-center relative overflow-hidden group cursor-pointer">
                                            <video
                                                src={accelerationVideo}
                                                className="w-full h-full object-cover"
                                                controls={false}
                                                onClick={handleVideoClick}
                                                playsInline
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                                Tap to expand
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                                            Rhythm Mode
                                        </h4>
                                        <p>
                                            A steady, rhythmic pace that guides your eyes. Great for maintaining
                                            consistent focus over long texts.
                                        </p>
                                        {/* Video */}
                                        <div className="aspect-video w-full bg-black/5 rounded-lg border border-border flex items-center justify-center relative overflow-hidden group cursor-pointer">
                                            <video
                                                src={rhythmVideo}
                                                className="w-full h-full object-cover"
                                                controls={false}
                                                onClick={handleVideoClick}
                                                playsInline
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                                Tap to expand
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                                            Static Mode
                                        </h4>
                                        <p>
                                            Traditional scrolling text with our enhanced typography and emphasis highlighting.
                                            Best for detailed study or when you need to control the pace manually.
                                        </p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Libraries & News */}
                            <AccordionItem value="content">
                                <AccordionTrigger className="text-lg font-medium">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                        Content & Libraries
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4 text-base">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="p-4 rounded-lg bg-card border border-border">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground">
                                                <Newspaper className="w-4 h-4" /> News
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Browse the latest headlines. We process articles to highlight key information
                                                so you can ingest news faster.
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-card border border-border">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground">
                                                <BookOpen className="w-4 h-4" /> Ebooks
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Access your personal library. Upload EPUB files to read your favorite books
                                                with kinetic typography.
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-card border border-border sm:col-span-2">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-foreground">
                                                <Upload className="w-4 h-4" /> My TXTs
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Paste any text or upload .txt files directly. Our AI analyzes the content
                                                to separate whispers from emphasis, giving you a rich reading experience instantly.
                                            </p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Interface Guide */}
                            <AccordionItem value="interface">
                                <AccordionTrigger className="text-lg font-medium">
                                    <div className="flex items-center gap-2">
                                        <Layout className="w-5 h-5 text-primary" />
                                        Reader Interface
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4 text-base">
                                    <ul className="space-y-3 list-disc pl-5 text-muted-foreground">
                                        <li>
                                            <strong className="text-foreground">Full Text View:</strong> Click the expand button to see the entire document at once.
                                            Tap any word to jump the reader to that exact spot.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Navigation Bars:</strong> The bottom bars represent sections or chapters.
                                            Hover to see previews, click to jump.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Progress Gradient:</strong> The active section bar fills with a gradient
                                            indicating exactly how far through the current chapter you are.
                                        </li>
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Focus & Audio */}
                            <AccordionItem value="focus">
                                <AccordionTrigger className="text-lg font-medium">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-primary" />
                                        Focus & Audio
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4 text-base">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                                                <Smartphone className="w-4 h-4" /> Focus Mode (Mobile App)
                                            </h4>
                                            <p className="text-muted-foreground">
                                                When using the installed mobile app, enabling Focus Mode will automatically
                                                turn off phone notifications, allowing you to immerse completely in the text.
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                                                <Music className="w-4 h-4" /> Music & Atmosphere
                                            </h4>
                                            <p className="text-muted-foreground">
                                                Toggle the music button to play a curated jazz track ("Paris 1920s")
                                                designed to aid concentration without distraction.
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
