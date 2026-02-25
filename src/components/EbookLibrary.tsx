import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2 } from 'lucide-react';
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
];

const BookCover = ({ title, index }: { title: string; index: number }) => {
  const isDark = index % 2 === 0;
  const bgColor = isDark ? 'bg-[#000000]' : 'bg-[#ffffff]';
  const textColor = isDark ? 'text-white' : 'text-black';
  const logoColor = isDark ? 'bg-white' : 'bg-black';

  return (
    <div className={`aspect-[2/3] mb-2 rounded-md ${bgColor} flex flex-col items-center justify-between p-2 sm:p-4 relative border border-border/10 shadow-inner group-hover:shadow-lg transition-all duration-500 overflow-hidden`}>
      {/* Centered KiN-TXT "i -" Logo */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="relative flex flex-col items-center justify-center w-3 h-5 sm:w-6 sm:h-10">
            <span className={`w-1 h-1 sm:w-2 sm:h-2 rounded-full ${logoColor} mb-0.5 sm:mb-1`} />
            <span className={`w-1 h-2.5 sm:w-2 sm:h-5 ${logoColor} rounded-sm`} />
          </div>
          <div className={`w-2.5 h-0.5 sm:w-5 sm:h-1 ${logoColor} rounded-full opacity-80`} />
        </div>
      </div>

      {/* Title at the bottom */}
      <div className="w-full">
        <h4 className={`text-center font-display font-medium text-[6px] sm:text-[10px] leading-tight uppercase tracking-widest ${textColor} line-clamp-3`}>
          {title}
        </h4>
      </div>
    </div>
  );
};

interface EbookLibraryProps {
  onSelectEbook: (parsed: ParsedText, title: string, initialProgress?: { paragraph: number; word: number }) => void;
}

export function EbookLibrary({ onSelectEbook }: EbookLibraryProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-3"
    >
      <div className="grid grid-cols-3 gap-4">
        {AVAILABLE_EBOOKS.map((ebook) => (
          <motion.button
            key={ebook.id}
            onClick={() => handleSelectEbook(ebook)}
            disabled={loadingId !== null}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative glass-panel p-3 text-left transition-all duration-300 hover:ring-2 hover:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Book cover */}
            <BookCover title={ebook.title} index={AVAILABLE_EBOOKS.indexOf(ebook)} />

            {/* Book info */}
            <h3 className="font-medium text-xs text-foreground mb-0.5 line-clamp-2 group-hover:text-primary transition-colors">
              {ebook.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {ebook.author}
            </p>

            {/* Loading overlay */}
            {loadingId === ebook.id && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>

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
    </motion.div>
  );
}
