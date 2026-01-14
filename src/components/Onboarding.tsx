import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Zap, Hand, BookOpen, Sliders } from 'lucide-react';

interface OnboardingProps {
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

// Animated word reveal demo
const KineticDemo = () => {
  const words = ['Words', 'come', 'to', 'you'];
  return (
    <div className="flex justify-center items-center h-16 my-4">
      <div className="flex gap-2">
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="text-lg font-medium text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.5, duration: 0.4 }}
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

// Simple comparison visual
const ComparisonVisual = () => (
  <div className="flex justify-center gap-8 my-6">
    <div className="text-center">
      <div className="w-16 h-20 mx-auto mb-2 rounded-lg border border-border/50 bg-muted/20 p-1.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-1 bg-muted-foreground/20 rounded-full mb-1" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">You scan text</span>
    </div>
    <div className="text-center">
      <div className="w-16 h-20 mx-auto mb-2 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-center">
        <motion.span 
          className="text-sm font-medium text-primary"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          flow
        </motion.span>
      </div>
      <span className="text-xs text-muted-foreground">Text finds you</span>
    </div>
  </div>
);

const steps = [
  {
    icon: Zap,
    title: 'Welcome to Kin-TXT',
    description: 'Experience reading differently. Instead of scanning pages, words flow to you—one at a time, at your pace.',
    visual: ComparisonVisual,
  },
  {
    icon: Hand,
    title: 'Tap to Control',
    description: 'Tap anywhere to pause or resume. Swipe left/right to skip sentences. It\'s that simple.',
    visual: KineticDemo,
  },
  {
    icon: Sliders,
    title: 'Set Your Speed',
    description: 'Use the slider at the bottom to find your perfect reading pace. Start slow, speed up as you get comfortable.',
  },
  {
    icon: BookOpen,
    title: 'Add Your Content',
    description: 'Paste text, upload files (PDF, EPUB, DOCX), browse our ebook library, or import news articles. Your reading, your way.',
  },
];

export function Onboarding({ currentStep, onNext, onPrev, onComplete, onSkip }: OnboardingProps) {
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const Icon = step.icon;
  const Visual = 'visual' in step ? step.visual : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
      >
        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
          <X className="w-5 h-5" />
        </button>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative max-w-sm mx-4 p-8 rounded-2xl bg-card border border-border shadow-2xl"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-12 h-12 mx-auto mb-5 rounded-xl bg-primary/10 flex items-center justify-center"
          >
            <Icon className="w-6 h-6 text-primary" />
          </motion.div>

          {/* Content */}
          <h2 className="text-xl font-bold text-center mb-3 text-foreground">
            {step.title}
          </h2>
          <p className="text-muted-foreground text-center text-sm leading-relaxed">
            {step.description}
          </p>

          {/* Visual (if present) */}
          {Visual && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Visual />
            </motion.div>
          )}

          {/* Spacer for steps without visuals */}
          {!Visual && <div className="h-8" />}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6 mt-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                    ? 'w-1.5 bg-primary/50'
                    : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-200 active:scale-[0.98]"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={isLastStep ? onComplete : onNext}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
            >
              {isLastStep ? "Start Reading" : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
