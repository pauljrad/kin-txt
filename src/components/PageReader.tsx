import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ParsedText } from '@/lib/textParser';
import { useTextSize } from '@/hooks/useTextSize';
import './PageReader.css';

type Layout = 'pages' | 'scroll';
interface Props {
  parsedText: ParsedText;
  paragraphOffsets: number[];
  currentWordIndex: number;
  isPlaying: boolean;
  layout: Layout;
  controlsVisible: boolean;
  emphasis: boolean;
  currentEmphasized: boolean;
  currentWhispered: boolean;
  onInteract: () => void;
  onPause: () => void;
  onNavigate: (index: number) => void;
}

// Keep the book's DOM stable while the playback cursor advances. Only the two
// affected words are updated below, rather than reconciling an entire novel.
const BookText = memo(function BookText({ parsedText, offsets }: { parsedText: ParsedText; offsets: number[] }) {
  return <>{parsedText.paragraphs.map((paragraph, p) => (
    <p key={p}>{paragraph.map((word, w) => (
      <span key={w}><span data-reader-word={offsets[p] + w}>{word}</span>{' '}</span>
    ))}</p>
  ))}</>;
});

export function PageReader({ parsedText, paragraphOffsets, currentWordIndex, isPlaying, layout, controlsVisible,
  emphasis, currentEmphasized, currentWhispered, onInteract, onPause, onNavigate }: Props) {
  const { textSize } = useTextSize();
  const [page, setPage] = useState(0);
  const [pageStarts, setPageStarts] = useState<number[]>([0]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLElement[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const lastReadIndex = useRef(0);
  const wasPlayingOnPress = useRef(false);

  useLayoutEffect(() => {
    const frame = viewport.current;
    const content = book.current;
    if (!frame || !content) return;
    words.current = Array.from(content.querySelectorAll<HTMLElement>('[data-reader-word]'));
    let cancelled = false;
    const measure = () => {
      if (cancelled || !frame.clientWidth) return;
      const starts: number[] = [0];
      if (layout === 'pages') {
        // offsetLeft is unaffected by the emphasis transform, so animation never
        // changes pagination. Column gap gives the enlarged word room to breathe.
        const stride = frame.clientWidth + 40;
        words.current.forEach((word, index) => {
          const column = Math.floor((word.offsetLeft + 1) / stride);
          if (starts[column] === undefined) starts[column] = index;
        });
      }
      setPageStarts(starts);
      setLayoutVersion(v => v + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    void document.fonts.ready.then(measure);
    return () => { cancelled = true; observer.disconnect(); };
  }, [layout, textSize, parsedText]);

  // Follow the current word on playback, seek, resizing and layout changes.
  useLayoutEffect(() => {
    const frame = viewport.current;
    const word = words.current[currentWordIndex];
    if (!frame || !word) return;
    if (layout === 'pages') {
      const stride = frame.clientWidth + 40;
      const nextPage = Math.floor((word.offsetLeft + 1) / stride);
      frame.scrollLeft = nextPage * stride;
      frame.scrollTop = 0;
      setPage(nextPage);
    } else {
      frame.scrollLeft = 0;
      const bounds = frame.getBoundingClientRect();
      const rect = word.getBoundingClientRect();
      if (rect.top < bounds.top + 24 || rect.bottom > bounds.bottom - 48) {
        frame.scrollTo({ top: frame.scrollTop + rect.top - bounds.top - frame.clientHeight * 0.35, behavior: 'auto' });
      }
    }
  }, [currentWordIndex, layout, layoutVersion]);

  // Update only the words crossed by this seek/playback step. Backward seeks
  // restore unread styling without rebuilding the entire book on each tick.
  useLayoutEffect(() => {
    const previous = lastReadIndex.current;
    for (let index = Math.min(previous, currentWordIndex); index < Math.max(previous, currentWordIndex); index++) {
      words.current[index]?.classList.toggle('page-word-past', index < currentWordIndex);
    }
    lastReadIndex.current = currentWordIndex;
  }, [currentWordIndex, parsedText]);

  useLayoutEffect(() => {
    const word = words.current[currentWordIndex];
    if (!word) return;
    word.setAttribute('aria-current', 'true');
    word.classList.add('page-word-current');
    if (emphasis && currentEmphasized) word.classList.add('page-word-emphasis');
    if (emphasis && currentWhispered) word.classList.add('page-word-whisper');
    return () => {
      word.removeAttribute('aria-current');
      word.classList.remove('page-word-current', 'page-word-emphasis', 'page-word-whisper');
    };
  }, [currentWordIndex, emphasis, currentEmphasized, currentWhispered, parsedText]);

  const turnPage = useCallback((direction: number) => {
    const next = page + direction;
    if (next < 0 || next >= pageStarts.length) return;
    if (isPlaying) { onPause(); return; }
    onNavigate(pageStarts[next]);
    // Seeking clears the player's controls timeout; re-arm it afterwards.
    onInteract();
  }, [page, pageStarts, onNavigate, onPause, onInteract, isPlaying]);

  return (
    <section className="page-reader absolute inset-0 z-10 bg-background text-foreground cursor-auto"
      aria-label="Page reader" onPointerUp={e => e.stopPropagation()}
      onPointerDown={() => { wasPlayingOnPress.current = isPlaying; }}
      onClick={e => {
        e.stopPropagation();
        if (suppressClick.current) { suppressClick.current = false; onInteract(); return; }
        if (isPlaying || wasPlayingOnPress.current) { onPause(); return; }
        const word = (e.target as HTMLElement).closest<HTMLElement>('[data-reader-word]');
        if (word) onNavigate(Number(word.dataset.readerWord));
        // Tap and seek both reveal controls; restart auto-hide after navigation.
        onInteract();
      }}>
      <div className="page-reader-content">
        <div ref={viewport} className={`page-reader-viewport page-reader-${layout}`} tabIndex={0}
          role="region" aria-label={layout === 'pages' ? 'Book pages. Use left and right arrows to turn pages.' : 'Continuous text'}
          onKeyDown={e => {
            if (layout === 'pages' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
              e.preventDefault(); turnPage(e.key === 'ArrowRight' ? 1 : -1);
            } else if (e.key === ' ') { e.preventDefault(); onPause(); onInteract(); }
          }}
          onTouchStart={e => { suppressClick.current = false; touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={e => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start || layout !== 'pages') return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              suppressClick.current = true; turnPage(dx < 0 ? 1 : -1);
            }
          }}>
          <div ref={book} className="page-reader-book">
            <BookText parsedText={parsedText} offsets={paragraphOffsets} />
          </div>
        </div>
      </div>
      {layout === 'pages' && (
        <nav aria-label="Page navigation"
          className={`page-reader-navigation controls-panel absolute inset-x-0 flex items-center justify-center gap-3 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={!controlsVisible}
          onClick={e => e.stopPropagation()}>
          <button className="toolbar-button" aria-label="Previous page" tabIndex={controlsVisible ? 0 : -1}
            disabled={page === 0} onClick={() => turnPage(-1)}><ChevronLeft size={16} /></button>
          <span className="glass-panel px-3 py-2 text-xs text-muted-foreground">Page {page + 1} of {pageStarts.length}</span>
          <button className="toolbar-button" aria-label="Next page" tabIndex={controlsVisible ? 0 : -1}
            disabled={page >= pageStarts.length - 1} onClick={() => turnPage(1)}><ChevronRight size={16} /></button>
        </nav>
      )}
    </section>
  );
}
