import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  playbackEnabled: boolean;
  glassVisible: boolean;
  emphasis: boolean;
  currentEmphasized: boolean;
  currentWhispered: boolean;
  onInteract: () => void;
  onPause: () => void;
  onPlay: () => void;
  onDismissMenus: () => void;
  onNavigate: (index: number) => void;
}

// Keep the book's DOM stable while the playback cursor advances. Only the two
// affected words are updated below, rather than reconciling an entire novel.
const BookText = memo(function BookText({ parsedText, offsets }: { parsedText: ParsedText; offsets: number[] }) {
  return <>{parsedText.paragraphs.map((paragraph, p) => (
    <p key={p}>{paragraph.map((word, w) => (
      <Fragment key={w}><span data-reader-word={offsets[p] + w}>{word}</span>{' '}</Fragment>
    ))}</p>
  ))}</>;
});

export function PageReader({ parsedText, paragraphOffsets, currentWordIndex, isPlaying, layout, controlsVisible,
  playbackEnabled, glassVisible, emphasis, currentEmphasized, currentWhispered, onInteract, onPause, onPlay, onDismissMenus, onNavigate }: Props) {
  const { textSize } = useTextSize();
  const [page, setPage] = useState(0);
  const [pageStarts, setPageStarts] = useState<number[]>([0]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLElement[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const pageDrag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startedAt: number;
    page: number;
    dragging: boolean;
  } | null>(null);
  const swipePageTarget = useRef<number | null>(null);

  const lastReadIndex = useRef(0);
  const wasPlayingOnPress = useRef(false);
  const followedLineTop = useRef<number | null>(null);
  const manualScroll = useRef(false);
  const scrollProgressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isPlaying || glassVisible) {
      manualScroll.current = false;
      if (scrollProgressTimeout.current) clearTimeout(scrollProgressTimeout.current);
    }
    return () => { if (scrollProgressTimeout.current) clearTimeout(scrollProgressTimeout.current); };
  }, [isPlaying, glassVisible]);

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

  // Pages snap only on actual page boundaries. Continuous reading follows one
  // line at a time with a native smooth scroll; there are no artificial page resets.
  // Both modes share the KineticPlayer rhythm timer with no added timing delays.
  useLayoutEffect(() => {
    const frame = viewport.current;
    const word = words.current[currentWordIndex];
    if (!frame || !word) return;
    if (layout === 'pages') {
      followedLineTop.current = null;
      const stride = frame.clientWidth + 40;
      const nextPage = Math.floor((word.offsetLeft + 1) / stride);
      const left = nextPage * stride;
      if (Math.abs(frame.scrollLeft - left) > 1) {
        if (swipePageTarget.current === nextPage) {
          // When a page was turned by dragging, glide from the finger's
          // release position instead of jumping to the next column.
          frame.scrollTo({
            left,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          });
        } else {
          frame.scrollLeft = left;
        }
      }
      swipePageTarget.current = null;
      if (frame.scrollTop !== 0) frame.scrollTop = 0;
      setPage(previous => previous === nextPage ? previous : nextPage);
      return;
    }

    const lineTop = word.offsetTop;
    if (isPlaying) {
      // Move by one line only when the highlight enters another line, aiming
      // for the comfortable upper-middle of the viewport. Native smooth
      // scrolling avoids the abrupt large jumps of the old threshold logic.
      if (followedLineTop.current !== lineTop) {
        const top = Math.max(0, Math.min(
          frame.scrollHeight - frame.clientHeight,
          lineTop - frame.clientHeight * 0.42,
        ));
        if (Math.abs(frame.scrollTop - top) > 3) {
          frame.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
        followedLineTop.current = lineTop;
      }
    } else {
      followedLineTop.current = null;
      // Manual reading remains fully scrollable. Only a deliberate seek,
      // resize or layout change reveals a cursor that is outside the viewport.
      const bounds = frame.getBoundingClientRect();
      const rect = word.getBoundingClientRect();
      if (rect.top < bounds.top + 20 || rect.bottom > bounds.bottom - 30) {
        frame.scrollTo({
          top: frame.scrollTop + rect.top - bounds.top - frame.clientHeight * 0.4,
          behavior: 'auto',
        });
      }
    }
  }, [currentWordIndex, layout, layoutVersion, isPlaying]);

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

  // Static continuous reading is a real ebook: remember where the reader has
  // manually scrolled, so reopening the TXT or pressing Play uses that position.
  const rememberScrollPosition = useCallback(() => {
    if (!manualScroll.current || isPlaying || glassVisible || layout !== 'scroll') return;
    if (scrollProgressTimeout.current) clearTimeout(scrollProgressTimeout.current);
    scrollProgressTimeout.current = setTimeout(() => {
      const frame = viewport.current;
      const items = words.current;
      if (!frame || !items.length || !manualScroll.current) return;
      const y = frame.scrollTop + Math.min(frame.clientHeight * 0.24, 120);
      // Words are laid out in reading order. Binary search keeps this cheap.
      let low = 0;
      let high = items.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (items[mid].offsetTop < y) low = mid + 1;
        else high = mid;
      }
      const index = Math.max(0, Math.min(items.length - 1, low - 1));
      manualScroll.current = false;
      if (index !== currentWordIndex) onNavigate(index);
    }, 300);
  }, [layout, isPlaying, glassVisible, currentWordIndex, onNavigate]);

  const turnPage = useCallback((direction: number) => {
    const next = page + direction;
    if (next < 0 || next >= pageStarts.length || glassVisible) return;
    if (isPlaying) { onPause(); return; }
    onNavigate(pageStarts[next]);
    // Turning an ordinary ebook page must never summon the player controls.
    if (playbackEnabled && controlsVisible) onInteract();
  }, [page, pageStarts, onNavigate, onPause, onInteract, isPlaying, glassVisible, playbackEnabled, controlsVisible]);

  return (
    <section className={`page-reader absolute inset-0 z-10 bg-background text-foreground cursor-auto ${!playbackEnabled ? 'page-reader-static' : ''}`}
      aria-label="Page reader"
      onPointerDownCapture={e => {
        // Pause on initial contact, not after pointerup/click (which can be delayed
        // or skipped by touch scrolling on iOS). Leave actual controls alone.
        const target = e.target as HTMLElement;
        if (target.closest('.controls-panel, button, [role="button"]')) {
          wasPlayingOnPress.current = false;
          return;
        }
        wasPlayingOnPress.current = isPlaying;
        if (glassVisible) return; // Settings surface is non-navigable.
        if (!playbackEnabled) return; // Static book taps do not start playback.
        if (!isPlaying && layout === 'scroll') manualScroll.current = true;
        if (isPlaying) onPause();
      }}
      onPointerUp={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation();
        // The contact that paused playback must never also seek to a word.
        if (wasPlayingOnPress.current) {
          wasPlayingOnPress.current = false;
          suppressClick.current = false;
          return;
        }
        // A gesture is never a tap and must never start playback.
        if (suppressClick.current) { suppressClick.current = false; return; }
        // In normal ebook mode, taps are inert. Following words is an option.
        if (!playbackEnabled) return;
        // When Play Mode is enabled, one tap pauses or resumes, never seeks.
        manualScroll.current = false;
        if (isPlaying) onPause();
        else onPlay();
      }}>
      <div className={`page-reader-content ${glassVisible ? 'page-reader-content-glass' : ''}`}>
        <div ref={viewport} className={`page-reader-viewport page-reader-${layout}`} tabIndex={0}
          role="region" aria-label={layout === 'pages' ? 'Book pages. Use left and right arrows to turn pages.' : 'Continuous text'}
          onScroll={rememberScrollPosition}
          onWheel={() => { if (layout === 'scroll' && !isPlaying && !glassVisible) manualScroll.current = true; }}
          onPointerDown={e => {
            if (layout !== 'pages' || glassVisible || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
            const frame = e.currentTarget;
            const stride = frame.clientWidth + 40;
            pageDrag.current = {
              pointerId: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              startedAt: e.timeStamp,
              page: Math.round(frame.scrollLeft / stride),
              dragging: false,
            };
            // Keep receiving movement and release events if the finger
            // leaves the text area; a long press must not select text.
            frame.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            const drag = pageDrag.current;
            if (!drag || drag.pointerId !== e.pointerId || layout !== 'pages') return;
            const dx = e.clientX - drag.x;
            const dy = e.clientY - drag.y;
            if (!drag.dragging) {
              // A vertical gesture belongs to the browser, not page turning.
              if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) return;
              if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
              drag.dragging = true;
              suppressClick.current = true;
            }
            if (e.cancelable) e.preventDefault();
            const frame = e.currentTarget;
            const stride = frame.clientWidth + 40;
            const rightEdge = Math.max(0, (pageStarts.length - 1) * stride);
            // The adjacent page follows the finger in either direction.
            frame.scrollLeft = Math.max(0, Math.min(rightEdge, drag.page * stride - dx));
          }}
          onPointerUp={e => {
            const drag = pageDrag.current;
            if (!drag || drag.pointerId !== e.pointerId) return;
            pageDrag.current = null;
            if (!drag.dragging || layout !== 'pages') return;
            suppressClick.current = true;
            e.stopPropagation();
            const dx = e.clientX - drag.x;
            const dt = Math.max(1, e.timeStamp - drag.startedAt);
            const frame = e.currentTarget;
            const stride = frame.clientWidth + 40;
            // Accept either a deliberate drag or a shorter, quick flick.
            const distance = Math.min(90, frame.clientWidth * 0.2);
            const flick = Math.abs(dx) > 35 && Math.abs(dx) / dt > 0.4;
            const direction = Math.abs(dx) >= distance || flick ? (dx < 0 ? 1 : -1) : 0;
            const next = Math.max(0, Math.min(pageStarts.length - 1, drag.page + direction));
            if (next !== drag.page) {
              swipePageTarget.current = next;
              // Advance the saved reading position and let the layout effect
              // finish the turn smoothly. This also works if playback was on.
              onNavigate(pageStarts[next]);
            } else {
              // Incomplete drags settle back to the original page.
              frame.scrollTo({
                left: drag.page * stride,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
              });
            }
          }}
          onPointerCancel={e => {
            const drag = pageDrag.current;
            if (!drag || drag.pointerId !== e.pointerId) return;
            pageDrag.current = null;
            if (drag.dragging) {
              suppressClick.current = true;
              const stride = e.currentTarget.clientWidth + 40;
              e.currentTarget.scrollTo({ left: drag.page * stride, behavior: 'auto' });
            }
          }}
          onKeyDown={e => {
            if (layout === 'scroll' && !isPlaying && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp')) manualScroll.current = true;
            if (playbackEnabled && (e.key === ' ' || e.key === 'Enter')) {
              e.preventDefault();
              if (isPlaying) onPause(); else onPlay();
              return;
            }
            if (glassVisible) {
              if (e.key === 'Escape') { e.preventDefault(); onDismissMenus(); }
              return;
            }
            if (layout === 'pages' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
              e.preventDefault(); turnPage(e.key === 'ArrowRight' ? 1 : -1);
            }
          }}
          onTouchStart={e => {
            suppressClick.current = false;
            if (layout === 'scroll' && !isPlaying && !glassVisible) manualScroll.current = true;
            touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={e => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start) return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (Math.hypot(dx, dy) < 18) return;
            // Swiping on glass removes the player/settings overlay rather than
            // selecting a word or turning a page.
            suppressClick.current = true;
            if (glassVisible) {
              manualScroll.current = false;
              if (Math.hypot(dx, dy) >= 55) onDismissMenus();
              return;
            }
            // Horizontal page turning is handled by pointer drag above.
            // Touch end only suppresses the follow-up click and keeps
            // Continuous mode's native scrolling intact.
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
            disabled={glassVisible || page === 0} onClick={() => turnPage(-1)}><ChevronLeft size={16} /></button>
          <span className="glass-panel px-3 py-2 text-xs text-muted-foreground">Page {page + 1} of {pageStarts.length}</span>
          <button className="toolbar-button" aria-label="Next page" tabIndex={controlsVisible ? 0 : -1}
            disabled={glassVisible || page >= pageStarts.length - 1} onClick={() => turnPage(1)}><ChevronRight size={16} /></button>
        </nav>
      )}
    </section>
  );
}
