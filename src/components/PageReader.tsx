import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { ParsedText } from '@/lib/textParser';
import { useTextSize } from '@/hooks/useTextSize';
import './PageReader.css';

type Layout = 'pages' | 'scroll';
type RhythmPreset = 'slower' | 'normal' | 'faster';
interface Props {
  parsedText: ParsedText;
  paragraphOffsets: number[];
  currentWordIndex: number;
  isPlaying: boolean;
  isComplete: boolean;
  emphasis: boolean;
  currentEmphasized: boolean;
  currentWhispered: boolean;
  rhythmPreset: RhythmPreset;
  onRhythmPreset: (value: RhythmPreset) => void;
  onEmphasis: (value: boolean) => void;
  onPlayPause: () => void;
  onPause: () => void;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onBack: () => void;
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

export function PageReader({ parsedText, paragraphOffsets, currentWordIndex, isPlaying, isComplete,
  emphasis, currentEmphasized, currentWhispered, rhythmPreset, onRhythmPreset, onEmphasis,
  onPlayPause, onPause, onNavigate, onClose, onBack }: Props) {
  const { textSize, setTextSize } = useTextSize();
  const [layout, setLayout] = useState<Layout>(() => {
    try { return localStorage.getItem('kin_page_layout') === 'scroll' ? 'scroll' : 'pages'; }
    catch { return 'pages'; }
  });
  const [page, setPage] = useState(0);
  const [pageStarts, setPageStarts] = useState<number[]>([0]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLElement[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => { try { localStorage.setItem('kin_page_layout', layout); } catch { /* private browsing */ } }, [layout]);

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
    onPause();
    onNavigate(pageStarts[next]);
  }, [page, pageStarts, onNavigate, onPause]);

  const button = 'rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-30';
  return (
    <section className="page-reader absolute inset-0 z-40 flex flex-col bg-background text-foreground cursor-auto"
      aria-label="Page reader" onPointerUp={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <header className="shrink-0 border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-2 pr-14">
          <button className={button} onClick={onBack} aria-label="Back to library"><ArrowLeft size={16} /></button>
          <h2 className="text-sm font-medium tracking-wide">Page reading</h2>
          <button className={button} onClick={onClose}>Kinetic view</button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Page layout">
            {(['pages', 'scroll'] as const).map(value => <button key={value} aria-pressed={layout === value}
              className={`${button} ${layout === value ? 'bg-foreground text-background hover:bg-foreground' : ''}`}
              onClick={() => setLayout(value)}>{value === 'pages' ? 'Pages' : 'Scroll'}</button>)}
          </div>
          <label className="sr-only" htmlFor="page-reader-size">Text size</label>
          <select id="page-reader-size" className={`${button} bg-background`} value={textSize}
            onChange={e => setTextSize(e.target.value as typeof textSize)}>
            <option value="small">Small text</option><option value="medium">Medium text</option><option value="large">Large text</option>
          </select>
          <button className={button} role="switch" aria-checked={emphasis} aria-label="Emphasis Mode"
            onClick={() => onEmphasis(!emphasis)}>Emphasis {emphasis ? 'on' : 'off'}</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 w-full max-w-3xl mx-auto px-5 sm:px-10 py-5">
        <div ref={viewport} className={`page-reader-viewport page-reader-${layout}`} tabIndex={0}
          role="region" aria-label={layout === 'pages' ? 'Book pages. Use left and right arrows to turn pages.' : 'Continuous text'}
          onKeyDown={e => {
            if (layout === 'pages' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
              e.preventDefault(); turnPage(e.key === 'ArrowRight' ? 1 : -1);
            } else if (e.key === ' ') { e.preventDefault(); onPlayPause(); }
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
          }}
          onClick={e => {
            if (suppressClick.current) { suppressClick.current = false; return; }
            const word = (e.target as HTMLElement).closest<HTMLElement>('[data-reader-word]');
            if (word) { onPause(); onNavigate(Number(word.dataset.readerWord)); }
          }}>
          <div ref={book} className="page-reader-book" style={{ fontSize: { small: 16, medium: 20, large: 25 }[textSize] }}>
            <BookText parsedText={parsedText} offsets={paragraphOffsets} />
          </div>
        </div>
      </div>
      <footer className="shrink-0 border-t border-border px-4 py-3 space-y-2">
        <div className="flex items-center justify-center gap-3">
          {layout === 'pages' && <button className={button} aria-label="Previous page" disabled={page === 0} onClick={() => turnPage(-1)}><ChevronLeft size={18} /></button>}
          <button className={`${button} flex items-center gap-2`} onClick={onPlayPause}>
            {isComplete ? <RotateCcw size={16} /> : isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isComplete ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
          </button>
          <label className="sr-only" htmlFor="page-reader-rhythm">Rhythm speed</label>
          <select id="page-reader-rhythm" className={`${button} bg-background`} value={rhythmPreset}
            onChange={e => onRhythmPreset(e.target.value as RhythmPreset)}>
            <option value="slower">Slower rhythm</option><option value="normal">Normal rhythm</option><option value="faster">Faster rhythm</option>
          </select>
          {layout === 'pages' && <button className={button} aria-label="Next page" disabled={page >= pageStarts.length - 1} onClick={() => turnPage(1)}><ChevronRight size={18} /></button>}
        </div>
        <p className="text-center text-xs text-muted-foreground" aria-live="off">
          {isComplete ? 'Finished · ' : ''}{layout === 'pages' ? `Page ${page + 1} of ${pageStarts.length} · ` : ''}Tap a word to read from there
        </p>
      </footer>
    </section>
  );
}
