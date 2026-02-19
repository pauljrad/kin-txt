import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PulseLogo } from './PulseLogo';

// --- CONFIGURATION ---
const SCROLL_HEIGHT = 6000;
const PARTICLE_COUNT = 800;
const PARTICLE_RADIUS = 2.5;
const MOUSE_RADIUS = 200;
const MOUSE_FORCE = 2.0;

// --- MATH HELPERS ---
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
};

// Physics Entity
type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    z: number; // 0.0 (far/slow) to 1.0 (near/fast)
    originalTargetX: number;
    originalTargetY: number;
};

export const KineticScrollSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const distractionRef = useRef<HTMLDivElement>(null);
    const focusRef = useRef<HTMLDivElement>(null);
    const scrollIndicatorRef = useRef<HTMLDivElement>(null);

    const [showPulse, setShowPulse] = useState(false);
    const showPulseRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let scrollY = 0;
        let targetScrollY = 0;

        let mouseX = -1000;
        let mouseY = -1000;

        let particles: Particle[] = [];
        const initSwarm = () => {
            particles = [];
            const spacing = PARTICLE_RADIUS * 2.2;
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const r = spacing * 1.0 * Math.sqrt(i);
                const theta = i * goldenAngle;
                const tx = Math.cos(theta) * r;
                const ty = Math.sin(theta) * r;

                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    z: Math.random(), // Random depth
                    originalTargetX: tx,
                    originalTargetY: ty
                });
            }
        };

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `100%`;
            canvas.style.height = `100%`;
            initSwarm();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        const onScroll = () => {
            if (!container) return;
            const rect = container.getBoundingClientRect();
            targetScrollY = -rect.top;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', handleMouseMove);

        let rafId: number;
        const render = () => {
            scrollY += (targetScrollY - scrollY) * 0.1;
            const progress = Math.min(1, Math.max(0, scrollY / (SCROLL_HEIGHT - height)));

            ctx.clearRect(0, 0, width, height);

            // ZERO DEAD SPACE TIMING
            // ===============================================

            // Start blackout Earlier: 0.90 -> 0.95
            // This ensures screen is black BEFORE the pulse (at 0.96)
            if (progress > 0.90) {
                const fade = clamp((progress - 0.90) / 0.05, 0, 1); // 0 -> 1 over 5%
                const c = Math.floor(lerp(255, 0, fade));
                canvas.style.backgroundColor = `rgb(${c}, ${c}, ${c})`;
            } else {
                canvas.style.backgroundColor = 'white';
            }

            const rect = canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height * 0.4; // Raised to clear bottom UI
            // Capture the shorter dimension to ensure a perfect circle on all screens
            const minDim = Math.min(rect.width, rect.height);

            // STAR FORMATION PULSE
            const pulse = (Math.sin(Date.now() * 0.004) + 1) * 0.5; // undulates 0-1

            // STAR CYCLE MAPPING (Accelerated)
            // Gas: 0-0.15, Madness: 0.15-0.35, Snap: 0.35-0.5, Calm: 0.5-0.8
            const suctionTrigger = smoothstep(0.1, 0.3, progress) * (1 - smoothstep(0.4, 0.5, progress));
            const suctionPower = suctionTrigger * (0.005 + pulse * 0.02);

            // CALM WINDOW: strictly 0 jitter from 0.5 to 0.75
            const isCalm = progress > 0.5 && progress < 0.75;
            const tempTrigger = isCalm ? 0 : (1 - smoothstep(0.35, 0.5, progress));
            // Increased agitation for 3D chaos effect
            const temp = tempTrigger * (2.0 + pulse * 4.0);

            const magnetism = smoothstep(0.25, 0.5, progress);
            const damping = isCalm ? 0.8 : lerp(0.99, 0.88, progress);
            const mousePower = lerp(MOUSE_FORCE * (1 - smoothstep(0.1, 0.3, progress)), 0, progress);

            let scaleX = 1.0;
            let scaleY = 1.0;
            let finalOpacity = 1.0;

            // Final Snappy Finish from 0.75
            if (progress > 0.75) {
                const shrinkProgress = clamp((progress - 0.75) / 0.1, 0, 1);
                const s = lerp(1.0, 0.05, shrinkProgress);
                scaleX = s;
                scaleY = s;

                // 2. CRT SQUASH (90% -> 95%)
                if (progress > 0.90) {
                    const crtProgress = (progress - 0.90) / 0.05;

                    // A. Vertical Collapse
                    const vSquash = clamp(crtProgress / 0.5, 0, 1);
                    scaleY = lerp(0.05, 0.002, vSquash);
                    scaleX = lerp(0.05, 0.6, vSquash);

                    if (crtProgress > 0.5) {
                        // B. Horizontal Collapse
                        const hSquash = clamp((crtProgress - 0.5) / 0.4, 0, 1);
                        scaleX = lerp(0.6, 0.0, hSquash);
                        scaleY = 0.002;

                        if (crtProgress > 0.9) {
                            finalOpacity = 0;
                        }
                    }
                }
            }

            if (finalOpacity <= 0.01) return rafId = requestAnimationFrame(render);
            ctx.globalAlpha = finalOpacity;

            // UI Overlay Timing
            if (distractionRef.current) {
                // Fade out from 0 to 0.25 (Ends as magnetism begins)
                const opacity = 1 - smoothstep(0, 0.25, progress);
                distractionRef.current.style.opacity = opacity.toFixed(3);
            }
            if (focusRef.current) {
                // Fade in from 0.25 (As magnetism/order starts) to 0.5
                // Fade out from 0.90 to 0.95 (Disappear INTO the blackout)
                const fadeIn = smoothstep(0.25, 0.5, progress);
                const fadeOut = 1 - smoothstep(0.90, 0.95, progress);
                const opacity = fadeIn * fadeOut;
                focusRef.current.style.opacity = opacity.toFixed(3);
                // Ensure text is white when background gets dark? 
                // Currently it's gray-800/black. We might need to invert it or keep it dark to invisible.
                // Actually, if bg goes black, black text will vanish naturally. 
                // Let's keep it as is, it effectively fades out by losing contrast + opacity.
            }
            if (scrollIndicatorRef.current) {
                const opacity = 1 - smoothstep(0.4, 0.6, progress);
                scrollIndicatorRef.current.style.opacity = opacity.toFixed(3);
            }

            // DEPTH INFLUENCE FOR SIZE
            // 3D chaos (0-0.4) -> Uniform 2D (0.6+)
            const depthInfluence = 1 - smoothstep(0.4, 0.6, progress);

            particles.forEach((p) => {
                // RANDOM AGITATION (Bounce like mad)
                if (temp > 0.01) {
                    const noise = temp * 0.5;
                    p.vx += (Math.random() - 0.5) * noise;
                    p.vy += (Math.random() - 0.5) * noise;
                }

                // STAR SUCTION (Gravity towards center)
                if (suctionPower > 0.0001) {
                    const dx = centerX - p.x;
                    const dy = centerY - p.y;
                    p.vx += dx * suctionPower;
                    p.vy += dy * suctionPower;
                }

                if (magnetism > 0.01) {
                    // Normalize target mapping to maintain perfect sphere regardless of aspect ratio
                    // originalTargetX/Y are generated on a 1:1 spiral, we scale them by minDim
                    const baseScale = (minDim / 650);
                    const tx = centerX + (p.originalTargetX * baseScale * scaleX);
                    const ty = centerY + (p.originalTargetY * baseScale * scaleY);

                    const isMobile = width < 768;
                    const springK = (0.005 + (magnetism * 0.1)) * (isMobile ? 1.8 : 1.0);

                    p.vx += (tx - p.x) * springK;
                    p.vy += (ty - p.y) * springK;
                }
                if (mousePower > 0.01 && progress < 0.7) {
                    const dx = p.x - mouseX;
                    const dy = p.y - mouseY;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < MOUSE_RADIUS * MOUSE_RADIUS) {
                        const d = Math.sqrt(d2);
                        const force = (1 - d / MOUSE_RADIUS) * mousePower * (1 + p.z); // Closer = bigger reaction
                        const angle = Math.atan2(dy, dx);
                        p.vx += Math.cos(angle) * force;
                        p.vy += Math.sin(angle) * force;
                    }
                }
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= damping;
                p.vy *= damping;
                if (progress < 0.98) {
                    if (p.x < 0) { p.x = 0; p.vx *= -1; }
                    if (p.x > width) { p.x = width; p.vx *= -1; }
                }
                ctx.beginPath();
                const baseR = PARTICLE_RADIUS;

                // Map Z (0-1) to size multiplier (0.5x - 2.5x)
                // Apply depthInfluence to smoothly transition to uniform size (1.0x)
                const zScale = 1.0 + ((0.5 + p.z * 2.0) - 1.0) * depthInfluence;

                const r = baseR * zScale * Math.min(1, scaleX * 10);
                ctx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2);
                // INVERT COLOR FOR CRT GLOW (White on Black background)
                if (progress > 0.90) {
                    ctx.fillStyle = "#FFF";
                } else {
                    ctx.fillStyle = "#000";
                }
                ctx.fill();
            });

            // PULSE LOGO TRIGGER
            // Trigger AFTER blackout is complete (0.96)
            if (progress > 0.96) {
                if (!showPulseRef.current) {
                    showPulseRef.current = true;
                    setShowPulse(true);
                }
            } else if (progress < 0.90) {
                if (showPulseRef.current) {
                    showPulseRef.current = false;
                    setShowPulse(false);
                }
            }

            // Restore global alpha for other draws? (though we clear rect)
            ctx.globalAlpha = 1.0;

            rafId = requestAnimationFrame(render);
        };
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <section ref={containerRef} className="relative w-full" style={{ height: SCROLL_HEIGHT }}>
            <div className="sticky top-0 h-screen w-full overflow-hidden bg-white">
                <canvas ref={canvasRef} className="block w-full h-full" />

                <PulseLogo trigger={showPulse} />

                <div ref={distractionRef} className="absolute top-[15%] left-0 w-full text-center pointer-events-none transition-opacity duration-300 z-10">
                    <span className="text-lg sm:text-2xl text-black font-light tracking-widest uppercase">
                        remove distraction
                    </span>
                </div>

                <div ref={focusRef} className="absolute bottom-[20%] left-0 w-full text-center pointer-events-none transition-opacity duration-300 z-10" style={{ opacity: 0 }}>
                    <span className="text-lg sm:text-2xl text-black font-light tracking-widest uppercase">
                        regain focus
                    </span>
                </div>

                {/* Scroll Indicator (Black version for white background) */}
                <div ref={scrollIndicatorRef} className="absolute bottom-[5%] left-0 w-full flex flex-col items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono tracking-[0.3em] text-black/30 mb-1">SCROLL</span>
                        <div className="relative flex flex-col items-center">
                            <motion.span
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="w-[2px] h-8 bg-black/10 rounded-full"
                            ></motion.span>
                            <motion.span
                                animate={{ y: [0, 16, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.1 }}
                                className="absolute top-0 w-[4px] h-[4px] bg-black rounded-full shadow-[0_0_12px_rgba(0,0,0,0.2)]"
                            ></motion.span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
