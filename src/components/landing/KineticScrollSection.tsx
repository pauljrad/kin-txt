import { useRef, useState, useEffect } from 'react';

// Configuration for each word's animation style
type AnimationType = 'zoom' | 'slideLeft' | 'slideRight' | 'slideUp' | 'rotate';

interface PhraseConfig {
    text: string;
    type: AnimationType;
}

const PHRASES: PhraseConfig[] = [
    { text: "READ", type: "zoom" },
    { text: "IN", type: "slideLeft" },
    { text: "TIME", type: "slideUp" },
    { text: "READ", type: "zoom" },
    { text: "WITH", type: "rotate" },
    { text: "RHYTHM", type: "slideRight" },
    { text: "READ", type: "zoom" },
    { text: "WITH", type: "slideUp" },
    { text: "EMPHASIS", type: "zoom" },
    { text: "READ", type: "zoom" },
    { text: "WITH", type: "slideLeft" },
    { text: "SPEED", type: "rotate" },
    { text: "READ", type: "zoom" },
    { text: "WITH", type: "slideUp" },
    { text: "FOCUS", type: "zoom" }
];

export const KineticScrollSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    // Removed isVisible state to avoid unmounting thrashing

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const elementHeight = rect.height;

            const scrollDistance = -rect.top;
            const totalDistance = elementHeight - viewportHeight;

            let p = scrollDistance / totalDistance;

            if (p < 0) p = 0;
            if (p > 1) p = 1;

            // Optimization: Only update React state if p changes significantly or requestAnimationFrame?
            // React batching in 18/19 usually handles this well.
            setProgress(p);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    const getStyles = (globalProgress: number, index: number, total: number, type: AnimationType) => {
        const sequenceProgress = globalProgress * total;
        let localProgress = sequenceProgress - index;
        const isLastWord = index === total - 1;

        const OFFSET_START = -1.0;
        const OFFSET_END = 1.0;

        // --- CRISP TEXT STRATEGY ---
        const SCALE_START = 0.175;
        const SCALE_PEAK = 0.5;
        const SCALE_END = 2.0;

        let opacity = 0;
        let transform = 'translate3d(0,0,0) scale(0.5)';

        // --- MOBILE FIX: ALWAYS RENDER (Avoid Display: None thrashing) ---
        // Just use Opacity 0.
        // Also check range purely for opacity calculation

        const inWindow = localProgress > OFFSET_START && (isLastWord || localProgress < OFFSET_END);

        if (inWindow) {
            // OPACITY LOGIC (80/20)
            if (localProgress < 0) {
                // Entering
                if (localProgress > -0.4) {
                    opacity = (localProgress - (-0.4)) / 0.4;
                } else {
                    opacity = 0;
                }
            } else {
                // Exiting
                if (isLastWord) {
                    opacity = 1;
                } else {
                    if (localProgress < 0.6) {
                        opacity = 1;
                    } else {
                        opacity = 1 - (localProgress - 0.6) / 0.4;
                    }
                }
            }

            // TRANSFORM LOGIC
            if (type === 'zoom') {
                let s = SCALE_PEAK;
                if (localProgress < 0) {
                    const t = (localProgress - OFFSET_START) / (0 - OFFSET_START);
                    s = SCALE_START + (SCALE_PEAK - SCALE_START) * t;
                } else {
                    const t = (localProgress - 0) / (OFFSET_END - 0);
                    s = SCALE_PEAK + (SCALE_END - SCALE_PEAK) * t;
                }
                transform = `scale(${s})`;
            }
            else if (type === 'slideLeft') {
                const x = -localProgress * 80;
                const s = 0.25 + 0.25 * (1 + localProgress);
                transform = `translate3d(${x}vw, 0, 0) scale(${Math.min(s, 0.75)})`;
            }
            else if (type === 'slideRight') {
                const x = localProgress * 80;
                const s = 0.25 + 0.25 * (1 + localProgress);
                transform = `translate3d(${x}vw, 0, 0) scale(${Math.min(s, 0.75)})`;
            }
            else if (type === 'slideUp') {
                const y = -localProgress * 80;
                const s = 0.4 + 0.1 * (1 - Math.abs(localProgress));
                transform = `translate3d(0, ${y}vh, 0) scale(${s})`;
            }
            else if (type === 'rotate') {
                const rot = localProgress * 45;
                const s = localProgress < 0
                    ? 0.25 + 0.25 * ((localProgress - OFFSET_START) / (0 - OFFSET_START))
                    : 0.5 + 0.5 * localProgress;
                transform = `rotate(${rot}deg) scale(${s})`;
            }
        }

        if (opacity < 0) opacity = 0;
        if (opacity > 1) opacity = 1;

        return {
            opacity,
            transform,
            display: 'flex', // ALWAYS FLEX to prevent layout thrashing
            zIndex: index,
            position: 'absolute' as const,
            top: '0',
            left: '0',
            width: '100%',
            height: '100vh',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none' as const,
            // MOBILE HARDWARE ACCELERATION
            backfaceVisibility: 'hidden' as const,
            WebkitBackfaceVisibility: 'hidden' as const,
            perspective: '1000px',
            willChange: 'transform, opacity' // Re-adding carefully for mobile smoothness? Or is it the cause?
            // Usually opacity is distinct layer. transform is distinct.
            // If flashing, it might be running out of VRAM.
            // Let's TRY without will-change first, but with backface-visibility.
        };
    };

    return (
        <section ref={containerRef} className="relative w-full" style={{ height: '2000vh', backgroundColor: 'white' }}>
            <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center bg-white w-full perspective-1000">
                {PHRASES.map((item, i) => (
                    <div
                        key={i}
                        style={getStyles(progress, i, PHRASES.length, item.type)}
                    >
                        {/* REDUCED FONT SIZE ON MOBILE (25vw), HUGE DESKTOP (50vw) */}
                        <h2 className="font-display text-[25vw] md:text-[50vw] leading-none tracking-tighter whitespace-nowrap text-black antialiased translate-z-0">
                            {item.text}
                        </h2>
                    </div>
                ))}
            </div>
        </section>
    );
};
