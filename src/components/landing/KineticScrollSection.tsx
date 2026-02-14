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
    const [isVisible, setIsVisible] = useState(false);

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

            setProgress(p);

            const inView = rect.top <= viewportHeight && rect.bottom >= 0;
            if (inView !== isVisible) {
                setIsVisible(inView);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isVisible]);

    const getStyles = (globalProgress: number, index: number, total: number, type: AnimationType) => {
        const sequenceProgress = globalProgress * total;
        let localProgress = sequenceProgress - index;
        const isLastWord = index === total - 1;

        const OFFSET_START = -1.0;
        const OFFSET_END = 1.0;

        // --- CRISP TEXT STRATEGY ---
        // We use double the font size (50vw) and half the scale.
        // This ensures vectors are rendered at high resolution.
        // Old Start: 0.35 -> New: 0.175
        // Old Peak: 1.0 -> New: 0.5
        // Old End: 4.0 -> New: 2.0

        const SCALE_START = 0.175;
        const SCALE_PEAK = 0.5;
        const SCALE_END = 2.0;

        // Default values
        let opacity = 0;
        let transform = 'translate3d(0,0,0) scale(0.5)'; // Default peak scale
        let display = 'none';

        if (localProgress > OFFSET_START) {
            if (!isLastWord && localProgress > OFFSET_END) {
                display = 'none';
            } else {
                display = 'flex';
            }

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
            // Zoom: linear interp from START to END (adjusted for phase)
            // Enter phase: OFFSET_START -> 0 maps to SCALE_START -> SCALE_PEAK
            // Exit phase: 0 -> OFFSET_END maps to SCALE_PEAK -> SCALE_END

            if (type === 'zoom') {
                let s = SCALE_PEAK;
                if (localProgress < 0) {
                    // -1 -> 0
                    const t = (localProgress - OFFSET_START) / (0 - OFFSET_START);
                    s = SCALE_START + (SCALE_PEAK - SCALE_START) * t;
                } else {
                    // 0 -> 1 (and beyond for last word)
                    const t = (localProgress - 0) / (OFFSET_END - 0);
                    s = SCALE_PEAK + (SCALE_END - SCALE_PEAK) * t;
                }
                transform = `scale(${s})`;
            }

            // For Slides/Rotate, we also reduce scale base to 0.5
            // Slide magnitude stays same in vw/vh because that's translation not scale?
            // Actually, if we scale down the container, we scale down the translation too?
            // No, translate comes before scale in CSS usually or depends on matrix order.
            // string: `translate() scale()` -> Translate is in parent coords? No local.
            // If Text is 50vw wide.
            // Scale 0.5 makes it appear 25vw wide.
            // Translate 50vw moves it 50vw.
            // So translation units should be same as before.

            else if (type === 'slideLeft') {
                const x = -localProgress * 80;
                // Scale logic: grows from 0.25 to 0.75?
                // Old: 0.5 to 1.5. New: 0.25 to 0.75.
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
                // Old: 0.8 -> 1.0. New: 0.4 -> 0.5
                const s = 0.4 + 0.1 * (1 - Math.abs(localProgress));
                transform = `translate3d(0, ${y}vh, 0) scale(${s})`;
            }

            else if (type === 'rotate') {
                const rot = localProgress * 45;
                const s = localProgress < 0
                    ? 0.25 + 0.25 * ((localProgress - OFFSET_START) / (0 - OFFSET_START))
                    : 0.5 + 0.5 * localProgress; // Grows past 0.5
                transform = `rotate(${rot}deg) scale(${s})`;
            }
        }

        if (opacity < 0) opacity = 0;
        if (opacity > 1) opacity = 1;

        return {
            opacity,
            transform,
            display,
            zIndex: index,
            position: 'absolute' as const,
            top: '0',
            left: '0',
            width: '100%',
            height: '100vh',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none' as const,
            // REMOVING will-change TO PREVENT BLURRINESS
            // willChange: 'transform, opacity' 
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
                        {/* INCREASED FONT SIZE to 50vw for Sharpness */}
                        <h2 className="font-display text-[50vw] leading-none tracking-tighter whitespace-nowrap text-black antialiased">
                            {item.text}
                        </h2>
                    </div>
                ))}
            </div>
        </section>
    );
};
