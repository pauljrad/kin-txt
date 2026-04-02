import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X, ChevronRight } from 'lucide-react';
import { Chapter } from '@/lib/chapterParser';

interface ChapterNavigationProps {
  chapters: Chapter[];
  currentWordIndex: number;
  totalWords: number;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (wordIndex: number) => void;
  /** When false, the component will not render its floating toggle button. */
  showToggle?: boolean;
}

export const ChapterNavigation = forwardRef<HTMLDivElement, ChapterNavigationProps>(function ChapterNavigation({
  chapters,
  currentWordIndex,
  totalWords,
  isOpen,
  onToggle,
  onNavigate,
  showToggle = true,
}, ref) {
  // Find current chapter
  const currentChapterIndex = chapters.reduce((acc, chapter, index) => {
    if (chapter.startWordIndex <= currentWordIndex) return index;
    return acc;
  }, 0);

  const handleNavigate = (wordIndex: number) => {
    onNavigate(wordIndex);
    onToggle(); // Close after navigation
  };

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close if clicking outside the panel
    onToggle();
  };

  return (
    <>
      {/* Toggle Button - Optional (some screens provide their own toolbar button) */}
      {showToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="fixed top-4 left-28 sm:left-36 p-3 sm:p-4 bg-card/90 backdrop-blur-md border border-border rounded-xl shadow-lg hover:bg-card transition-colors z-50"
          title="Chapter Navigation"
        >
          {isOpen ? (
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <List className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>
      )}

      {/* Navigation Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for click-outside-to-close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={handleBackdropClick}
            />
            
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-card/95 backdrop-blur-xl border-l border-border z-[100] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="p-4 pr-14 border-b border-border flex items-center justify-between"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
              >
                <h3 className="font-display text-lg">Navigation</h3>
                <button 
                  onClick={onToggle}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chapter List */}
              <div className="flex-1 overflow-y-auto p-2">
                {chapters.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No chapters detected
                  </div>
                ) : (
                  <div className="space-y-1">
                    {chapters.map((chapter, index) => {
                      const isActive = index === currentChapterIndex;
                      const nextChapter = chapters[index + 1];
                      const chapterEndWord = nextChapter 
                        ? nextChapter.startWordIndex 
                        : totalWords;
                      const chapterProgress = currentWordIndex >= chapter.startWordIndex && currentWordIndex < chapterEndWord
                        ? ((currentWordIndex - chapter.startWordIndex) / (chapterEndWord - chapter.startWordIndex)) * 100
                        : currentWordIndex >= chapterEndWord ? 100 : 0;

                      return (
                        <button
                          key={index}
                          onClick={() => handleNavigate(chapter.startWordIndex)}
                          className={`w-full text-left p-3 rounded-lg transition-all relative overflow-hidden group ${
                            isActive 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          {/* Progress bar background */}
                          <div 
                            className="absolute inset-0 bg-primary/5 transition-all"
                            style={{ width: `${chapterProgress}%` }}
                          />
                          
                          <div className="relative flex items-start gap-3">
                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                              isActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium truncate ${
                                isActive ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {chapter.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Word {chapter.startWordIndex + 1}
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                              isActive ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer with progress */}
              <div className="p-4 border-t border-border">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Overall Progress</span>
                  <span>{Math.round((currentWordIndex / totalWords) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(currentWordIndex / totalWords) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
