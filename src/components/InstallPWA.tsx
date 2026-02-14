import React, { useEffect, useState } from 'react';
import { Share, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Detect iOS
        const ua = window.navigator.userAgent;
        const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
        setIsIOS(isIOSDevice);

        // Check if already in standalone mode
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
                || (window.navigator as any).standalone
                || document.referrer.includes('android-app://');
            setIsStandalone(isStandaloneMode);

            // On iOS, if not standalone, we should show the "Add to Home Screen" button
            if (isIOSDevice && !isStandaloneMode) {
                setIsVisible(true);
            }
        };

        checkStandalone();

        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('visibilitychange', checkStandalone);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('visibilitychange', checkStandalone);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleConfirmYes = () => {
        setShowConfirmation(false);
        handleInstallClick();
    };

    if (isStandalone || !isVisible) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed z-[60] flex items-center"
                style={{
                    top: showConfirmation || showIOSInstructions ? 'calc(5rem + env(safe-area-inset-top, 0px))' : 'calc(1rem + env(safe-area-inset-top, 0px))',
                    left: showConfirmation || showIOSInstructions ? 'calc(1rem + env(safe-area-inset-left, 0px))' : 'calc(4.5rem + env(safe-area-inset-left, 0px))'
                }}
            >
                {!showConfirmation && !showIOSInstructions ? (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setShowConfirmation(true)}
                        className="toolbar-button bg-foreground text-background dark:bg-white dark:text-black border-transparent hover:bg-foreground/90 transition-all shadow-xl"
                        title="Add to Home Screen"
                    >
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-card border border-border rounded-xl p-2 shadow-2xl flex items-center gap-3 min-w-[200px]"
                    >
                        {!showIOSInstructions ? (
                            <>
                                <span className="text-[10px] sm:text-xs font-bold tracking-tight text-foreground ml-2">ADD TO HOME SCREEN?</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={handleConfirmYes}
                                        className="px-3 py-1 bg-foreground text-background dark:bg-white dark:text-black rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-colors"
                                    >
                                        YES
                                    </button>
                                    <button
                                        onClick={() => setShowConfirmation(false)}
                                        className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-colors"
                                    >
                                        NO
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-1 p-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] sm:text-xs font-bold text-foreground">INSTALL KiN-TXT</span>
                                    <button onClick={() => setShowIOSInstructions(false)} className="text-muted-foreground hover:text-foreground">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-[10px] leading-tight text-foreground/70">
                                    Tap <Share className="w-3 h-3 inline mx-0.5" /> then "Add to Home Screen"
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </AnimatePresence>
    );
};
