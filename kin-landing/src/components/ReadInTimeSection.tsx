import { useEffect, useRef } from 'react';

// --- CONFIGURATION ---
const SCROLL_HEIGHT = 14000; // Reduced height for faster pacing
const PARTICLE_COUNT = 800;
const PARTICLE_RADIUS = 2.5;
const MOUSE_RADIUS = 200;
const MOUSE_FORCE = 2.0;

// --- MATH HELPERS ---
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// Smoothstep for transitions
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
    originalTargetX: number; // Base Lattice X
    originalTargetY: number; // Base Lattice Y
};

export const ReadInTimeSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const distractionRef = useRef<HTMLDivElement>(null);
    const focusRef = useRef<HTMLDivElement>(null);

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

            // Lattice Params
            const spacing = PARTICLE_RADIUS * 2.2;
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                // Calculate Target (Crystal Position)
                const r = spacing * 1.0 * Math.sqrt(i);
                const theta = i * goldenAngle;

                const tx = Math.cos(theta) * r;
                const ty = Math.sin(theta) * r;

                // Initial State: Dispersed Chaos (Gas)
                const px = Math.random() * width;
                const py = Math.random() * height;

                particles.push({
                    x: px,
                    y: py,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
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
        window.addEventListener('scroll', () => targetScrollY = window.scrollY);
        window.addEventListener('mousemove', handleMouseMove);

        let rafId: number;

        const render = () => {
            scrollY += (targetScrollY - scrollY) * 0.1;
            const progress = Math.min(1, Math.max(0, scrollY / (SCROLL_HEIGHT - height)));

            ctx.clearRect(0, 0, width, height);

            // ===============================================
            // ZERO DEAD SPACE TIMING
            // ===============================================

            // Start blackout VERY late: 98%
            // This ensures user is practically at the bottom when it goes black.
            // When they scroll past 100%, the sticky container follows natural scroll up.

            if (progress > 0.99) {
                const fade = (progress - 0.99) / 0.01; // 0 -> 1
                const c = Math.floor(lerp(255, 0, fade));
                canvas.style.backgroundColor = `rgb(${c}, ${c}, ${c})`;
            } else {
                canvas.style.backgroundColor = 'white';
            }

            // ... (Physics Code)

            // ===============================================
            // PHYSICS: PHASE CHANGE + CRT FINALE
            // ===============================================

            const centerX = width / 2;
            const centerY = height / 2;

            // Global Params
            const temp = 1 - smoothstep(0, 0.6, progress);
            const magnetism = smoothstep(0.2, 0.7, progress);
            const damping = lerp(0.99, 0.85, progress);
            const mousePower = lerp(MOUSE_FORCE, 0, progress);

            // --- FINALE LOGIC (CRT EFFECT) ---
            let scaleX = 1.0;
            let scaleY = 1.0;
            let finalOpacity = 1.0;

            if (progress > 0.7) {
                // 1. GLOBAL SHRINK (70% -> 99%)
                const shrinkProgress = clamp((progress - 0.7) / 0.29, 0, 1);
                const s = lerp(1.0, 0.05, shrinkProgress);
                scaleX = s;
                scaleY = s;

                // 2. CRT SQUASH (99% -> 100%)
                if (progress > 0.99) {
                    const crtProgress = (progress - 0.99) / 0.01;

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

            // TEXT OVERLAY LOGIC --------------------------------
            if (distractionRef.current) {
                // Fade out from 0 to 0.25 (Ends as magnetism begins)
                const opacity = 1 - smoothstep(0, 0.25, progress);
                distractionRef.current.style.opacity = opacity.toFixed(3);
            }

            if (focusRef.current) {
                // Fade in from 0.25 (As magnetism/order starts) to 0.5
                // Fade out from 0.95 to 0.99 (before blackout)
                const fadeIn = smoothstep(0.25, 0.5, progress);
                const fadeOut = 1 - smoothstep(0.95, 0.99, progress);
                const opacity = fadeIn * fadeOut;
                focusRef.current.style.opacity = opacity.toFixed(3);
            }
            // --------------------------------------------------

            particles.forEach((p) => {
                // 1. THERMAL NOISE
                if (temp > 0.01) {
                    const noise = temp * 0.5;
                    p.vx += (Math.random() - 0.5) * noise;
                    p.vy += (Math.random() - 0.5) * noise;
                }

                // 2. MAGNETISM (Forces towards Order)
                if (magnetism > 0.01) {
                    // Update Target based on CRT Scale
                    const tx = centerX + (p.originalTargetX * scaleX);
                    const ty = centerY + (p.originalTargetY * scaleY);

                    const dx = tx - p.x;
                    const dy = ty - p.y;

                    // Very Strong Spring at end to ensure snap
                    const springK = 0.005 + (magnetism * 0.1);
                    p.vx += dx * springK;
                    p.vy += dy * springK;
                }

                // 3. MOUSE INTERACTION
                // Disable mouse completely in shrink phase
                if (mousePower > 0.01 && progress < 0.7) {
                    const dx = p.x - mouseX;
                    const dy = p.y - mouseY;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < MOUSE_RADIUS * MOUSE_RADIUS) {
                        const d = Math.sqrt(d2);
                        const force = (1 - d / MOUSE_RADIUS) * mousePower;
                        const angle = Math.atan2(dy, dx);
                        p.vx += Math.cos(angle) * force;
                        p.vy += Math.sin(angle) * force;
                    }
                }

                // 4. INTEGRATION
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= damping;
                p.vy *= damping;

                // 5. BOUNDARY
                if (progress < 0.98) {
                    // Standard bounce logic
                    if (p.x < 0) { p.x = 0; p.vx *= -1; }
                    if (p.x > width) { p.x = width; p.vx *= -1; }
                }

                ctx.beginPath();
                // Scale particle radius too during CRT FX?
                const r = PARTICLE_RADIUS * Math.min(1, scaleX * 10); // Keep visible
                ctx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2);

                // INVERT COLOR FOR CRT GLOW (White on Black background)
                if (progress > 0.99) {
                    ctx.fillStyle = "#FFF";
                } else {
                    ctx.fillStyle = "#000";
                }
                ctx.fill();
            });

            ctx.globalAlpha = 1.0;
            rafId = requestAnimationFrame(render);
        };
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <section ref={containerRef} className="relative w-full" style={{ height: SCROLL_HEIGHT }}>
            <div className="sticky top-0 h-screen w-full overflow-hidden bg-white">
                <canvas ref={canvasRef} className="block w-full h-full" />

                {/* Text 1: Remove Distraction (Centered, Top 15%) */}
                <div
                    ref={distractionRef}
                    className="absolute top-[15%] left-0 w-full text-center pointer-events-none transition-opacity duration-300 z-10"
                    style={{ opacity: 1 }}
                >
                    <span className="text-lg sm:text-2xl text-black font-light tracking-widest uppercase">
                        remove distraction
                    </span>
                </div>

                {/* Text 2: Regain Focus (Centered, Bottom 15%) */}
                <div
                    ref={focusRef}
                    className="absolute bottom-[15%] left-0 w-full text-center pointer-events-none transition-opacity duration-300 z-10"
                    style={{ opacity: 0 }}
                >
                    <span className="text-lg sm:text-2xl text-gray-800 font-light tracking-widest uppercase">
                        regain focus
                    </span>
                </div>
            </div>
        </section>
    );
};
