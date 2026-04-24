import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { parseTextContent, getWordDelay } from '@/lib/textParser';
import { useNavigate } from 'react-router-dom';

function preprocessDemoText(raw: string): { text: string; whisperedWords: Set<string> } {
  const whisperedWords = new Set<string>();
  const text = raw.replace(/\(([^)]+)\)/g, (_, inner) => {
    inner.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/).forEach((w: string) => { if (w) whisperedWords.add(w); });
    return inner.replace(/[.,!?;:'"]/g, '');
  });
  return { text, whisperedWords };
}

const DEMO_RAW = `WELCOME to KINETIC reading!

Where reading shifts closer to other time-based VISUAL experiences, like WATCHING a scene UNFOLD or observing MOVEMENT.
Sentences arrive as MOMENTS.
With pause.
With rhythm.
With EMPHASIS. 

Sometimes that means the LOUD FIREWORK that goes
BANG
BANG
BANG
And sometimes it's the (tiny), (quiet), (mouse) that goes
(whisper)
(whisper)
(whisper)
Because the text is not just read.
It is EXPERIENCED.
Memory begins to form around EVENTS IN TIME, not blocks of text on a page.
Moments land.
Beats stay with you.
The narrative lingers.

Unlike static reading, which is SPATIAL, kinetic reading is TEMPORAL.
The text comes to YOU.
Your FOCUS changes.
It becomes CONTINUOUS, rather than FRAG MENTED.

There is no page fright - A hidden cognitive load which traditional reading carries with it…

Pages…

Position…

Progress…

CONSTANT navigation!

Our kinetic text removes page fright entirely.
No scanning ahead.
No managing where you are.
No visual clutter competing with you and the TEXT.
Attention stays with the UNFOLDING LANGUAGE.

This is KINETIC reading.

Reading, PERFORMED in time.`;

interface WordSpeed { word: string; speed: number; }

function generateLocalRhythm(words: string[]): WordSpeed[] {
  const quick = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','it','as','be','was','were','been','are','have','has','had','do','does','did','will','would','could','should','may','might','must','shall','can','that','this','these','those','i','you','he','she','we','they','my','your','his','her','its','our','their','me','him','us','them','so','if','then','than','just','not','no','yes','all','any','some','each','every','into','onto','from','about','through']);
  const slow = new Set(['however','therefore','nevertheless','furthermore','consequently','meanwhile','although','because','suddenly','immediately','finally','always','never','perhaps','probably']);
  let prevSentEnd = false, prevComma = false;
  return words.map((word, i) => {
    const c = word.toLowerCase().replace(/[.,!?;:'"—–\-()[\]]/g, '');
    let s = 1.0;
    if (prevSentEnd) { s = 0.75; prevSentEnd = false; prevComma = false; }
    else if (prevComma) { s = 0.9; prevComma = false; }
    if (quick.has(c) && c.length <= 4) s = Math.min(s + 0.12, 1.25);
    else if (quick.has(c)) s = Math.min(s + 0.08, 1.18);
    if (slow.has(c)) s = 0.8;
    if (c.length >= 10) s -= 0.25; else if (c.length >= 7) s -= 0.1;
    if (i === 0) s = 0.85;
    if (word[0] && word[0] === word[0].toUpperCase() && i > 0 && !prevSentEnd) s -= 0.08;
    if (/[.!?]$/.test(word)) { s -= 0.15; prevSentEnd = true; }
    else if (/[,;:]$/.test(word)) { s -= 0.08; prevComma = true; }
    else if (/[—–\-]$/.test(word)) { s -= 0.12; prevComma = true; }
    if (/!$/.test(word)) s -= 0.1;
    return { word, speed: Math.max(0.6, Math.min(1.45, s)) };
  });
}

function getORPIndex(word: string): number {
  const l = word.length;
  if (l <= 1) return 0; if (l <= 5) return 1; if (l <= 9) return 2; if (l <= 13) return 3; return 4;
}

const TARGET_COLORS = [
  { name: 'Yellow', color: '#FFD600' },
  { name: 'Pink', color: '#ff007f' },
  { name: 'Blue', color: '#0000cd' },
];

type DemoMode = 'rhythm' | 'acceleration';
type DemoPhase = 'playing' | 'complete';

interface DemoPlayerProps { onClose: () => void; }

export function DemoPlayer({ onClose }: DemoPlayerProps) {
  const navigate = useNavigate();

  const { text: processedText, whisperedWords } = useMemo(() => preprocessDemoText(DEMO_RAW), []);
  const parsedText = useMemo(() => parseTextContent(processedText), [processedText]);
  const allWords = useMemo(() => parsedText.paragraphs.flat(), [parsedText]);
  const totalWords = allWords.length;

  const rhythmSpeeds = useMemo(() => generateLocalRhythm(allWords), [allWords]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [wordIndex, setWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<DemoPhase>('playing');
  const [retryCount, setRetryCount] = useState(0);
  const [mode, setMode] = useState<DemoMode>('rhythm');
  const [targetMode, setTargetMode] = useState(false);
  const [rhythmPreset, setRhythmPreset] = useState<'slower' | 'normal' | 'faster'>('normal');
  const [targetColor, setTargetColor] = useState('#FFD600');
  const [wpm, setWpm] = useState(240); // This is the base/target WPM (Baseline = 240)
  const [showControls, setShowControls] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(false);

  // Refs
  const wordIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userHasInteractedRef = useRef(false);

  useEffect(() => { wordIndexRef.current = wordIndex; }, [wordIndex]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ── Current word props ─────────────────────────────────────────────────────
  const currentWord = allWords[wordIndex] ?? '';
  const cleanLookup = currentWord.toLowerCase().replace(/[.,!?;:'"()[\]…]/g, '');
  const wordNoPunct = currentWord.replace(/[.,!?;:'"()[\]…]/g, '');
  const isAllCaps = wordNoPunct.length >= 3 && wordNoPunct === wordNoPunct.toUpperCase() && /[A-Z]/.test(wordNoPunct);
  const isWhispered = whisperedWords.has(cleanLookup);
  const isEmphasis = !isWhispered && !targetMode && isAllCaps;

  // ── Speed Calculation (Super Accurate) ───────────────────────────────────
  // getWordDelay(word, speed) uses delay = 250 / speed.
  // 250ms delay = 4 words/sec = 240 words/min.
  // So speed = TargetWPM / 240.

  const currentPaceWpm = useMemo(() => {
    if (mode === 'rhythm') {
      const pm = rhythmPreset === 'slower' ? 0.667 : rhythmPreset === 'faster' ? 1.5 : 1.0;
      return Math.round(240 * pm);
    }
    const progress = totalWords > 1 ? wordIndex / (totalWords - 1) : 0;
    const startWpm = wpm * 0.5;
    const endWpm = wpm;
    return Math.round(startWpm + (endWpm - startWpm) * progress);
  }, [mode, wordIndex, totalWords, wpm, rhythmPreset]);

  const getCurrentDelay = useCallback((idx: number): number => {
    const word = allWords[idx] ?? '';
    let speed: number;
    if (mode === 'rhythm') {
      const rs = rhythmSpeeds[idx];
      const pm = rhythmPreset === 'slower' ? 0.667 : rhythmPreset === 'faster' ? 1.5 : 1.0;
      // Scale based on target wpm (240 is baseline where speed=1.0)
      speed = (rs?.speed ?? 1.0) * pm;
    } else {
      const progress = totalWords > 1 ? idx / (totalWords - 1) : 0;
      const startWpm = wpm * 0.5;
      const endWpm = wpm;
      const targetWpm = startWpm + (endWpm - startWpm) * progress;
      speed = targetWpm / 240;
    }
    return Math.max(60, Math.min(2000, getWordDelay(word, speed, mode === 'rhythm' ? 'rhythm' : 'normal')));
  }, [allWords, mode, rhythmPreset, rhythmSpeeds, totalWords, wpm]);

  // ── Advance loop ───────────────────────────────────────────────────────────
  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!isPlayingRef.current) return;
    const idx = wordIndexRef.current;
    if (idx >= allWords.length - 1) { 
      setIsPlaying(false); 
      isPlayingRef.current = false; 
      setTimeout(() => {
        setPhase('complete'); 
      }, 1000);
      return; 
    }
    timeoutRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      const next = wordIndexRef.current + 1;
      wordIndexRef.current = next;
      setWordIndex(next);
      scheduleNext();
    }, getCurrentDelay(idx));
  }, [allWords.length, getCurrentDelay]);

  useEffect(() => {
    if (isPlaying && phase === 'playing') {
      isPlayingRef.current = true;
      scheduleNext();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, phase, scheduleNext]);

  // ── Auto-start ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { 
      isPlayingRef.current = true; 
      setIsPlaying(true); 
    }, 300);
    return () => { clearTimeout(t); if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timeline: hints 10s ────────────────────────────────────────────────────
  useEffect(() => {
    const h = setTimeout(() => { setShowControls(true); setTimeout(() => setHintsVisible(true), 100); }, 10_000);
    return () => { clearTimeout(h); };
  }, []);

  // ── Tap to play/pause ──────────────────────────────────────────────────────
  const handleScreenTap = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.demo-controls') || target.closest('.demo-completion') || target.closest('.demo-close')) return;
    if (phase === 'complete') return;
    setIsPlaying(prev => {
      const next = !prev;
      isPlayingRef.current = next;
      return next;
    });
  }, [phase]);

  // ── Retry ──────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    const next = retryCount + 1;
    setRetryCount(next);
    
    // reset state first
    wordIndexRef.current = 0;
    setWordIndex(0);
    setPhase('playing');
    setShowControls(false);
    setHintsVisible(false);
    userHasInteractedRef.current = false;
    
    // suggest different state on retry
    setMode(next % 2 === 1 ? 'acceleration' : 'rhythm');
    setTargetMode(next % 2 === 1);

    // ensure playing starts fresh
    setTimeout(() => { 
      isPlayingRef.current = true; 
      setIsPlaying(true); 
      setTimeout(() => setShowControls(true), 3000); 
    }, 150);
  }, [retryCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const progress = totalWords > 0 ? (wordIndex / totalWords) * 100 : 0;

  // ── Word renderer ──────────────────────────────────────────────────────────
  const renderWord = () => {
    if (targetMode) {
      const orp = getORPIndex(currentWord);
      return (
        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-baseline">
          <span className="text-right whitespace-pre text-white">{currentWord.substring(0, orp)}</span>
          <span className="font-bold min-w-[1ch] text-center" style={{ color: targetColor }}>{currentWord[orp] || ''}</span>
          <span className="text-left whitespace-pre text-white">{currentWord.substring(orp + 1)}</span>
        </div>
      );
    }
    return <span>{currentWord}</span>;
  };

  const wordFontSize = targetMode ? '2.6rem' : isEmphasis ? '5.4rem' : isWhispered ? '2.0rem' : '2.6rem';
  const wordColor = isWhispered ? 'rgba(255,255,255,0.4)' : 'white';
  const wordStyle = isWhispered ? 'italic' : 'normal';

  const markInteracted = () => { userHasInteractedRef.current = true; };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden"
      onClick={handleScreenTap}
    >
      {targetMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[64px] w-0.5 h-10 opacity-90" style={{ backgroundColor: targetColor }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[24px] w-0.5 h-10 opacity-90" style={{ backgroundColor: targetColor }} />
        </div>
      )}

      <button onClick={onClose} className="demo-close absolute top-4 right-4 z-30 p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all" aria-label="Close demo">
        <X className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {hintsVisible && phase === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
            className="absolute left-1/2 -translate-x-1/2 flex gap-3 text-[10px] tracking-[0.2em] uppercase text-white/30 pointer-events-none whitespace-nowrap"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)' }}
          >
            <span>Tap to pause</span><span className="text-white/15">·</span>
            <span>Adjust speeds and modes below</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex items-center justify-center px-6 sm:px-12 w-full h-[30vh] min-h-[180px]">
        <AnimatePresence mode="wait">
          {phase === 'playing' && (
            <motion.div
              key={`${wordIndex}-${targetMode}-${targetColor}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="select-none w-full flex items-center justify-center font-display"
              style={{ fontSize: wordFontSize, color: wordColor, fontStyle: wordStyle }}
            >
              {renderWord()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <motion.div className="h-full bg-white/40" animate={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
      </div>

      <AnimatePresence>
        {showControls && phase === 'playing' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.6 }}
            className="demo-controls absolute bottom-8 left-4 right-4 flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              {(['rhythm', 'acceleration'] as DemoMode[]).map(m => (
                <button key={m}
                  onClick={() => { setMode(m); markInteracted(); }}
                  className={`px-3 py-1.5 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium transition-all ${mode === m ? 'bg-white text-black' : 'border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'}`}
                >
                  {m === 'acceleration' ? 'Accel' : 'Rhythm'}
                </button>
              ))}
              <div className="w-px h-4 bg-white/15" />
              <button
                onClick={() => { setTargetMode(t => !t); markInteracted(); }}
                className={`px-3 py-1.5 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium transition-all ${targetMode ? 'bg-white text-black' : 'border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'}`}
              >
                Target
              </button>
            </div>

            {mode === 'rhythm' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                {(['slower', 'normal', 'faster'] as const).map(p => (
                  <button key={p}
                    onClick={() => { setRhythmPreset(p); markInteracted(); }}
                    className={`px-3 py-1 rounded-full text-[9px] tracking-[0.15em] uppercase font-medium transition-all ${rhythmPreset === p ? 'bg-white/20 text-white' : 'text-white/30 hover:text-white/60'}`}
                  >{p}</button>
                ))}
              </motion.div>
            )}

            {mode === 'acceleration' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 w-full max-w-xs">
                <span className="text-[9px] tracking-widest text-white/30 uppercase">Start</span>
                <input
                  type="range" min={100} max={500} step={10} value={wpm}
                  onChange={e => { setWpm(parseInt(e.target.value)); markInteracted(); }}
                  className="flex-1 h-0.5 appearance-none bg-white/20 rounded-full outline-none cursor-pointer"
                  style={{ accentColor: 'white' }}
                />
                <span className="text-[9px] tracking-widest text-white/30 uppercase whitespace-nowrap">End Pace</span>
              </motion.div>
            )}

            <div className="text-[10px] text-white/40 tabular-nums min-w-[44px] flex items-center gap-1.5">
              <span>{currentPaceWpm} WPM</span>
              {mode === 'acceleration' && <span className="text-[8px] opacity-50 uppercase tracking-tighter">(Current)</span>}
            </div>

            {targetMode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <span className="text-[9px] tracking-widest text-white/30 uppercase">Colour</span>
                {TARGET_COLORS.map(c => (
                  <button key={c.color}
                    onClick={() => { setTargetColor(c.color); markInteracted(); }}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${targetColor === c.color ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="demo-completion absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-8"
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-center gap-5 max-w-xs w-full text-center"
            >
              <div className="text-[10px] tracking-[0.4em] mb-1 flex items-center justify-center font-sans text-white/20 uppercase">
                KiN-TXT
              </div>

              <button
                onClick={() => navigate('/pricing')}
                className="w-full py-4 rounded-full bg-white text-black text-sm font-semibold tracking-wide hover:bg-white/90 transition-all flex flex-col items-center gap-1"
              >
                <span>Start free 7-day trial</span>
                <span className="text-[10px] font-normal text-black/50 tracking-wide">Full library · All modes · Speed controls & more</span>
              </button>

              <button
                onClick={async () => {
                  const shareData = {
                    title: 'KiN-TXT',
                    text: "I just tried KiN-TXT, a kinetic reading engine that completely removed my 'page fright' and let me focus.",
                    url: 'https://kin-txt.com'
                  };
                  
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                      setTimeout(() => navigate('/register?plan=trial_30'), 500);
                    } else {
                      await navigator.clipboard.writeText(`${shareData.text} Try the 30s demo here: ${shareData.url}`);
                      alert("Link copied to clipboard! Share it with your friends.");
                      setTimeout(() => navigate('/register?plan=trial_30'), 500);
                    }
                  } catch (err) {
                    console.log('Error sharing:', err);
                  }
                }}
                className="w-full py-3 rounded-full border border-white/20 text-white text-sm font-semibold tracking-wide hover:bg-white/10 hover:border-white/40 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                <span>Share for 30-Day Trial</span>
              </button>

              <button
                onClick={handleRetry}
                className="flex items-center gap-2 text-white/40 text-xs tracking-widest uppercase hover:text-white/70 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Try again
              </button>

              <button onClick={onClose} className="text-white/20 text-[10px] tracking-[0.25em] uppercase hover:text-white/40 transition-colors mt-1">
                Return to site
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
