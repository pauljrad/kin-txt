import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useAnimationFrame } from 'framer-motion';
import { BookOpen, Loader2, LayoutGrid, GalleryHorizontal } from 'lucide-react';
import { parseFile, ParsedText } from '@/lib/textParser';

export interface Ebook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  filePath: string;
}

export const AVAILABLE_EBOOKS: Ebook[] = [
  {
    id: 'jekyll-hyde',
    title: 'Strange Case of Dr Jekyll and Mr Hyde',
    author: 'Robert Louis Stevenson',
    filePath: '/ebooks/jekyll-and-hyde.epub',
  },
  {
    id: 'war-of-worlds',
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    filePath: '/ebooks/war-of-the-worlds.epub',
  },
  {
    id: 'wuthering-heights',
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    filePath: '/ebooks/wuthering-heights.epub',
  },
  {
    id: 'dracula',
    title: 'Dracula',
    author: 'Bram Stoker',
    filePath: '/ebooks/dracula.epub',
  },
  {
    id: 'dorian-gray',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    filePath: '/ebooks/dorian-gray.epub',
  },
  {
    id: 'siddhartha',
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    filePath: '/ebooks/siddhartha.epub',
  },
  {
    id: 'dubliners',
    title: 'Dubliners',
    author: 'James Joyce',
    filePath: '/ebooks/dubliners.epub',
  },
  {
    id: 'notes-underground',
    title: 'Notes from the Underground',
    author: 'Fyodor Dostoevsky',
    filePath: '/ebooks/notes-underground.epub',
  },
  {
    id: 'room-view',
    title: 'A Room with a View',
    author: 'E. M. Forster',
    filePath: '/ebooks/a-room-with-a-view.epub',
  },
  {
    id: 'tale-two-cities',
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    filePath: '/ebooks/a-tale-of-two-cities.epub',
  },
  {
    id: 'metamorphosis',
    title: 'Metamorphosis',
    author: 'Franz Kafka',
    filePath: '/ebooks/metamorphosis.epub',
  },
  {
    id: 'sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    filePath: '/ebooks/sherlock-holmes.epub',
  },
  {
    id: 'jungle-book',
    title: 'The Jungle Book',
    author: 'Rudyard Kipling',
    filePath: '/ebooks/the-jungle-book.epub',
  },
  {
    id: 'treasure-island',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    filePath: '/ebooks/treasure-island.epub',
  },
  {
    id: 'call-wild',
    title: 'The Call of the Wild',
    author: 'Jack London',
    filePath: '/ebooks/call-of-the-wild.epub',
  },
];

const CarouselItem = ({ 
  ebook, 
  index, 
  x, 
  totalCount, 
  velocityRef, 
  onSelect 
}: { 
  ebook: Ebook; 
  index: number; 
  x: any; 
  totalCount: number; 
  velocityRef: React.RefObject<number>;
  onSelect: (ebook: Ebook) => void;
}) => {
  const itemX = useTransform(x, (val: number) => {
    // Calculate raw offset
    let offset = (index * 250) + val;
    
    // Infinite loop logic
    const totalWidth = totalCount * 250;
    const halfWidth = totalWidth / 2;
    
    // Wrap the offset
    offset = ((offset + halfWidth) % totalWidth + totalWidth) % totalWidth - halfWidth;
    
    return offset;
  });

  const scale = useTransform(itemX, [-500, 0, 500], [0.6, 1.2, 0.6]);
  const rotateY = useTransform(itemX, [-500, 0, 500], [45, 0, -45]);
  const opacity = useTransform(itemX, [-600, -300, 0, 300, 600], [0, 0.5, 1, 0.5, 0]);
  const zIndex = useTransform(itemX, [-100, 0, 100], [0, 10, 0]);
  const blur = useTransform(itemX, [-300, 0, 300], ["blur(4px)", "blur(0px)", "blur(4px)"]);

  return (
    <motion.div
      style={{
        x: itemX,
        scale,
        rotateY,
        opacity,
        zIndex,
        filter: blur,
        position: 'absolute'
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-48 sm:w-64"
    >
      <div 
        className="group cursor-pointer select-none"
        onClick={() => {
          // Only select if it's the centered book or if we're not moving fast
          if (velocityRef.current !== undefined && Math.abs(velocityRef.current) < 2) {
            onSelect(ebook);
          }
        }}
      >
        <BookCover title={ebook.title} index={index} />
        <div className="mt-4 text-center">
          <motion.h3 className="font-display font-medium text-xs sm:text-sm uppercase tracking-widest text-foreground line-clamp-1">
            {ebook.title}
          </motion.h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] mt-1">
            {ebook.author}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

interface EbookLibraryProps {
  onSelectEbook: (parsed: ParsedText, title: string, initialProgress?: { paragraph: number; word: number }) => void;
}

export function EbookLibrary({ onSelectEbook }: EbookLibraryProps) {
  const [viewType, setViewType] = useState<'grid' | 'carousel'>('grid');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Motion values for carousel momentum
  const x = useMotionValue(0);
  const cursorX = useMotionValue(0);
  
  // Custom momentum state
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);

  const springX = useSpring(x, {
    stiffness: 150,
    damping: 25,
    mass: 0.5
  });

  // Effect to update the visible carousel index based on springX
  useEffect(() => {
    return springX.on("change", (v) => {
      if (viewType !== 'carousel') return;
      const index = Math.round(-v / 250);
      const normalizedIndex = ((index % AVAILABLE_EBOOKS.length) + AVAILABLE_EBOOKS.length) % AVAILABLE_EBOOKS.length;
      setCarouselIndex(normalizedIndex);
    });
  }, [springX, viewType]);

  // Handle "spinning freely" momentum
  useAnimationFrame((time, delta) => {
    if (viewType !== 'carousel' || isDraggingRef.current) return;
    
    if (Math.abs(velocityRef.current) > 0.1) {
      // Apply friction
      velocityRef.current *= 0.95;
      x.set(x.get() + velocityRef.current);
    } else {
      velocityRef.current = 0;
      // Snap to nearest item if not already centered
      const targetX = Math.round(x.get() / 250) * 250;
      if (Math.abs(x.get() - targetX) > 0.1) {
        x.set(x.get() + (targetX - x.get()) * 0.1);
      }
    }
  });

  const handleSelectEbook = useCallback(async (ebook: Ebook) => {
    setLoadingId(ebook.id);
    setError(null);

    try {
      // Fetch the epub file
      const response = await fetch(ebook.filePath);
      if (!response.ok) throw new Error('Failed to load ebook');

      const blob = await response.blob();
      const file = new File([blob], `${ebook.title}.epub`, { type: 'application/epub+zip' });

      const parsed = await parseFile(file);

      // Start from the beginning
      onSelectEbook(parsed, ebook.title, { paragraph: 0, word: 0 });
    } catch (err) {
      console.error('Error loading ebook:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ebook');
    } finally {
      setLoadingId(null);
    }
  }, [onSelectEbook]);

  return (
    <div className="w-full max-w-5xl mx-auto mt-3">
      {/* View Toggle */}
      <div className="flex justify-end mb-6 gap-2 px-4">
        <button
          onClick={() => setViewType('grid')}
          className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-foreground text-background shadow-lg' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewType('carousel')}
          className={`p-2 rounded-lg transition-all ${viewType === 'carousel' ? 'bg-foreground text-background shadow-lg' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
        >
          <GalleryHorizontal className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewType === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-3 gap-4 px-4"
          >
            {AVAILABLE_EBOOKS.map((ebook, idx) => (
              <motion.button
                key={ebook.id}
                onClick={() => handleSelectEbook(ebook)}
                disabled={loadingId !== null}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative glass-panel p-3 text-left transition-all duration-300 hover:ring-1 hover:ring-primary/30 disabled:opacity-50"
              >
                <BookCover title={ebook.title} index={idx} />
                <h3 className="font-medium text-[10px] leading-tight text-foreground mb-0.5 line-clamp-2 group-hover:text-primary">
                  {ebook.title}
                </h3>
                <p className="text-[8px] text-muted-foreground truncate uppercase tracking-widest">
                  {ebook.author}
                </p>

                {loadingId === ebook.id && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-[450px] flex items-center justify-center overflow-hidden"
          >
            {/* Drag Capture Overlay */}
            <motion.div
              drag="x"
              style={{ x: cursorX }}
              onDragStart={() => {
                isDraggingRef.current = true;
                velocityRef.current = 0;
              }}
              onDrag={(e, info) => {
                x.set(x.get() + info.delta.x);
                velocityRef.current = info.delta.x;
              }}
              onDragEnd={() => {
                isDraggingRef.current = false;
                cursorX.set(0);
              }}
              className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
            />

            <div className="relative w-full h-full flex items-center justify-center perspective-[1000px]">
              {AVAILABLE_EBOOKS.map((ebook, index) => (
                <CarouselItem
                  key={ebook.id}
                  ebook={ebook}
                  index={index}
                  x={x}
                  totalCount={AVAILABLE_EBOOKS.length}
                  velocityRef={velocityRef}
                  onSelect={handleSelectEbook}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center text-destructive text-sm"
        >
          {error}
        </motion.p>
      )}

      {AVAILABLE_EBOOKS.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No ebooks available yet</p>
        </div>
      )}
    </div>
  );
}
