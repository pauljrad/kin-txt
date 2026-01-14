import { useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ParsedText } from '@/lib/textParser';

interface FullTextViewProps {
  parsedText: ParsedText;
  currentWordIndex: number;
  onClose: () => void;
  onNavigate: (wordIndex: number) => void;
}

export const FullTextView = forwardRef<HTMLDivElement, FullTextViewProps>(function FullTextView({ 
  parsedText, 
  currentWordIndex, 
  onClose,
  onNavigate 
}, ref) {
  const currentWordRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to current word on mount
  useEffect(() => {
    if (currentWordRef.current) {
      currentWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  // Handle click outside to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Calculate word index for each word in the text
  const getWordIndex = (paragraphIndex: number, wordIndex: number): number => {
    let index = 0;
    for (let i = 0; i < paragraphIndex; i++) {
      index += parsedText.paragraphs[i].length;
    }
    return index + wordIndex;
  };

  const handleWordClick = (paragraphIndex: number, wordIndex: number) => {
    const index = getWordIndex(paragraphIndex, wordIndex);
    onNavigate(index);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Panel */}
      <motion.div
        ref={panelRef}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-medium">Full Text View</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground px-4 pb-3">
            Tap any word to continue reading from there
          </p>
        </div>

        {/* Text Content */}
        <div 
          ref={containerRef}
          className="overflow-y-auto px-4 sm:px-6 py-6"
          style={{ height: 'calc(100vh - 100px)' }}
        >
          <div className="prose prose-lg dark:prose-invert max-w-none" style={{ fontSize: 'calc(1.125rem * var(--text-size-multiplier, 1))' }}>
            {parsedText.paragraphs.map((paragraph, pIndex) => (
              <p key={pIndex} className="mb-4 leading-relaxed">
                {paragraph.map((word, wIndex) => {
                  const wordIdx = getWordIndex(pIndex, wIndex);
                  const isCurrent = wordIdx === currentWordIndex;
                  const isPast = wordIdx < currentWordIndex;
                  
                  return (
                    <span
                      key={wIndex}
                      ref={isCurrent ? currentWordRef : null}
                      onClick={() => handleWordClick(pIndex, wIndex)}
                      className={`
                        cursor-pointer transition-all duration-200 rounded px-0.5
                        ${isCurrent 
                          ? 'bg-primary text-primary-foreground font-semibold scale-105 inline-block' 
                          : isPast 
                            ? 'text-muted-foreground hover:text-foreground hover:bg-muted' 
                            : 'hover:bg-muted'
                        }
                      `}
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              </p>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
