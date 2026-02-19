import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const KineticScrollSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const TOTAL = 15;
    const STEP = 1 / TOTAL;

    const getRanges = (i: number) => {
        const start = i * STEP;
        const width = STEP;

        // Use exclusive ranges to prevent overlap
        const fadeInStart = start;
        const fadeInEnd = start + width * 0.25;
        const fadeOutStart = start + width * 0.75;
        const fadeOutEnd = start + width;

        return {
            opacityInput: [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd],
            opacityOutput: [0, 1, 1, 0],
            scaleInput: [fadeInStart, fadeOutEnd],
            scaleOutput: [0.9, 1.1]
        };
    }

    // --- 1. READ ---
    const r0 = getRanges(0);
    const op0 = useTransform(scrollYProgress, r0.opacityInput, r0.opacityOutput);
    const sc0 = useTransform(scrollYProgress, r0.scaleInput, r0.scaleOutput);
    const d0 = useTransform(op0, (v) => v > 0 ? "block" : "none");

    // --- 2. IN ---
    const r1 = getRanges(1);
    const op1 = useTransform(scrollYProgress, r1.opacityInput, r1.opacityOutput);
    const sc1 = useTransform(scrollYProgress, r1.scaleInput, r1.scaleOutput);
    const d1 = useTransform(op1, (v) => v > 0 ? "block" : "none");

    // --- 3. TIME ---
    const r2 = getRanges(2);
    const op2 = useTransform(scrollYProgress, r2.opacityInput, r2.opacityOutput);
    const sc2 = useTransform(scrollYProgress, r2.scaleInput, r2.scaleOutput);
    const d2 = useTransform(op2, (v) => v > 0 ? "block" : "none");

    // --- 4. READ ---
    const r3 = getRanges(3);
    const op3 = useTransform(scrollYProgress, r3.opacityInput, r3.opacityOutput);
    const sc3 = useTransform(scrollYProgress, r3.scaleInput, r3.scaleOutput);
    const d3 = useTransform(op3, (v) => v > 0 ? "block" : "none");

    // --- 5. WITH ---
    const r4 = getRanges(4);
    const op4 = useTransform(scrollYProgress, r4.opacityInput, r4.opacityOutput);
    const sc4 = useTransform(scrollYProgress, r4.scaleInput, r4.scaleOutput);
    const d4 = useTransform(op4, (v) => v > 0 ? "block" : "none");

    // --- 6. RHYTHM ---
    const r5 = getRanges(5);
    const op5 = useTransform(scrollYProgress, r5.opacityInput, r5.opacityOutput);
    const sc5 = useTransform(scrollYProgress, r5.scaleInput, r5.scaleOutput);
    const d5 = useTransform(op5, (v) => v > 0 ? "block" : "none");

    // --- 7. READ ---
    const r6 = getRanges(6);
    const op6 = useTransform(scrollYProgress, r6.opacityInput, r6.opacityOutput);
    const sc6 = useTransform(scrollYProgress, r6.scaleInput, r6.scaleOutput);
    const d6 = useTransform(op6, (v) => v > 0 ? "block" : "none");

    // --- 8. WITH ---
    const r7 = getRanges(7);
    const op7 = useTransform(scrollYProgress, r7.opacityInput, r7.opacityOutput);
    const sc7 = useTransform(scrollYProgress, r7.scaleInput, r7.scaleOutput);
    const d7 = useTransform(op7, (v) => v > 0 ? "block" : "none");

    // --- 9. EMPHASIS ---
    const r8 = getRanges(8);
    const op8 = useTransform(scrollYProgress, r8.opacityInput, r8.opacityOutput);
    const sc8 = useTransform(scrollYProgress, r8.scaleInput, r8.scaleOutput);
    const d8 = useTransform(op8, (v) => v > 0 ? "block" : "none");

    // --- 10. READ ---
    const r9 = getRanges(9);
    const op9 = useTransform(scrollYProgress, r9.opacityInput, r9.opacityOutput);
    const sc9 = useTransform(scrollYProgress, r9.scaleInput, r9.scaleOutput);
    const d9 = useTransform(op9, (v) => v > 0 ? "block" : "none");

    // --- 11. WITH ---
    const r10 = getRanges(10);
    const op10 = useTransform(scrollYProgress, r10.opacityInput, r10.opacityOutput);
    const sc10 = useTransform(scrollYProgress, r10.scaleInput, r10.scaleOutput);
    const d10 = useTransform(op10, (v) => v > 0 ? "block" : "none");

    // --- 12. SPEED ---
    const r11 = getRanges(11);
    const op11 = useTransform(scrollYProgress, r11.opacityInput, r11.opacityOutput);
    const sc11 = useTransform(scrollYProgress, r11.scaleInput, r11.scaleOutput);
    const d11 = useTransform(op11, (v) => v > 0 ? "block" : "none");

    // --- 13. READ ---
    const r12 = getRanges(12);
    const op12 = useTransform(scrollYProgress, r12.opacityInput, r12.opacityOutput);
    const sc12 = useTransform(scrollYProgress, r12.scaleInput, r12.scaleOutput);
    const d12 = useTransform(op12, (v) => v > 0 ? "block" : "none");

    // --- 14. WITH ---
    const r13 = getRanges(13);
    const op13 = useTransform(scrollYProgress, r13.opacityInput, r13.opacityOutput);
    const sc13 = useTransform(scrollYProgress, r13.scaleInput, r13.scaleOutput);
    const d13 = useTransform(op13, (v) => v > 0 ? "block" : "none");

    // --- 15. FOCUS ---
    const r14 = getRanges(14);
    const op14 = useTransform(scrollYProgress, r14.opacityInput, r14.opacityOutput);
    const sc14 = useTransform(scrollYProgress, r14.scaleInput, r14.scaleOutput);
    const d14 = useTransform(op14, (v) => v > 0 ? "block" : "none");

    return (
        <section ref={containerRef} className="relative h-[1200vh] bg-white text-black" style={{ backgroundColor: 'white' }}>
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden bg-white" style={{ backgroundColor: 'white' }}>

                {/* 1. READ */}
                <motion.h2 style={{ opacity: op0, scale: sc0, display: d0, zIndex: 10 }}
                    className="absolute font-display text-[25vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    READ
                </motion.h2>

                {/* 2. IN */}
                <motion.h2 style={{ opacity: op1, scale: sc1, display: d1, zIndex: 11 }}
                    className="absolute font-display text-[28vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    IN
                </motion.h2>

                {/* 3. TIME */}
                <motion.h2 style={{ opacity: op2, scale: sc2, display: d2, zIndex: 12 }}
                    className="absolute font-display text-[32vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    TIME
                </motion.h2>

                {/* 4. READ */}
                <motion.h2 style={{ opacity: op3, scale: sc3, display: d3, zIndex: 13 }}
                    className="absolute font-display text-[25vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    READ
                </motion.h2>

                {/* 5. WITH */}
                <motion.h2 style={{ opacity: op4, scale: sc4, display: d4, zIndex: 14 }}
                    className="absolute font-display text-[28vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    WITH
                </motion.h2>

                {/* 6. RHYTHM */}
                <motion.h2 style={{ opacity: op5, scale: sc5, display: d5, zIndex: 15 }}
                    className="absolute font-display text-[32vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    RHYTHM
                </motion.h2>

                {/* 7. READ */}
                <motion.h2 style={{ opacity: op6, scale: sc6, display: d6, zIndex: 16 }}
                    className="absolute font-display text-[25vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    READ
                </motion.h2>

                {/* 8. WITH */}
                <motion.h2 style={{ opacity: op7, scale: sc7, display: d7, zIndex: 17 }}
                    className="absolute font-display text-[28vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    WITH
                </motion.h2>

                {/* 9. EMPHASIS */}
                <motion.h2 style={{ opacity: op8, scale: sc8, display: d8, zIndex: 18 }}
                    className="absolute font-display text-[35vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    EMPHASIS
                </motion.h2>

                {/* 10. READ */}
                <motion.h2 style={{ opacity: op9, scale: sc9, display: d9, zIndex: 19 }}
                    className="absolute font-display text-[25vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    READ
                </motion.h2>

                {/* 11. WITH */}
                <motion.h2 style={{ opacity: op10, scale: sc10, display: d10, zIndex: 20 }}
                    className="absolute font-display text-[28vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    WITH
                </motion.h2>

                {/* 12. SPEED */}
                <motion.h2 style={{ opacity: op11, scale: sc11, display: d11, zIndex: 21 }}
                    className="absolute font-display text-[45vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    SPEED
                </motion.h2>

                {/* 13. READ */}
                <motion.h2 style={{ opacity: op12, scale: sc12, display: d12, zIndex: 22 }}
                    className="absolute font-display text-[25vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    READ
                </motion.h2>

                {/* 14. WITH */}
                <motion.h2 style={{ opacity: op13, scale: sc13, display: d13, zIndex: 23 }}
                    className="absolute font-display text-[28vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    WITH
                </motion.h2>

                {/* 15. FOCUS */}
                <motion.h2 style={{ opacity: op14, scale: sc14, display: d14, zIndex: 24 }}
                    className="absolute font-display text-[45vw] leading-none tracking-tighter select-none whitespace-nowrap will-change-transform">
                    FOCUS
                </motion.h2>

            </div>
        </section>
    );
};
