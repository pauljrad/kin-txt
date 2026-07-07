import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePullGesture } from '@/hooks/usePullGesture';
import { InteractiveSplashScreen } from './landing/SplashScreen';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  BookOpen,
  Sliders,
  Activity,
  Gauge,
  AlignLeft,
  Newspaper,
  Link2,
  Crown,
  Target,
  List,
  Flame,
  Medal,
  Bookmark,
  Library,
  Users,
  Share2,
  Trophy,
  ClipboardPaste,
  Upload,
} from 'lucide-react';

// App's default focal/target colour (matches InfoMenu) and target-line palette
const FOCUS_YELLOW = '#FFD600';
const TARGET_COLORS = [
  { name: 'Yellow', value: '#FFD600' },
  { name: 'Pink', value: '#ff007f' },
  { name: 'Blue', value: '#0000cd' },
];

// ORP (Optimal Recognition Point) — identical to KineticPlayer / TargetModePlayer
const getOrpIndex = (word: string) => {
  const safe = word.replace(/[.,!?;:'"()[\]]/g, '');
  const len = safe.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
};

interface OnboardingProps {
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  onSkip: () => void;
  /** True when re-opened via the "i" button (vs first-launch). When re-opened,
   *  exiting/finishing closes straight to the app; first-launch goes via the splash. */
  reopened?: boolean;
}

// Faithful single-word kinetic player — one word at a time, ORP focal letter
// coloured, emphasis words scaled, optional Target-Mode vertical guide lines.
// Mirrors KineticPlayer / TargetModePlayer rendering exactly.
interface WordFlowProps {
  sentence: string;
  emphasis?: string[];
  focalColor?: string;
  guideColor?: string;
  showGuides?: boolean;
  accelerate?: boolean;
  wpm?: number;
}

const WordFlowDemo = ({
  sentence,
  emphasis = [],
  focalColor = FOCUS_YELLOW,
  guideColor,
  showGuides = false,
  accelerate = false,
  wpm = 220,
}: WordFlowProps) => {
  const words = sentence.split(' ');
  const [i, setI] = useState(0);

  useEffect(() => {
    const base = (60000 / wpm) * 1.4;
    const delay = accelerate
      ? Math.max(130, base * (1 - 0.55 * (i / words.length)))
      : base;
    const t = setTimeout(() => setI((prev) => (prev + 1) % words.length), delay);
    return () => clearTimeout(t);
  }, [i, words.length, wpm, accelerate]);

  const word = words[i] ?? '';
  const clean = word.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '');
  const isEmph = emphasis.map((e) => e.toLowerCase()).includes(clean);
  const orp = getOrpIndex(word);
  const prefix = word.slice(0, orp);
  const focal = word[orp] ?? '';
  const suffix = word.slice(orp + 1);
  const lineColor = guideColor ?? focalColor;

  return (
    <div className="relative h-24 my-3 rounded-xl bg-zinc-950 overflow-hidden flex items-center justify-center border border-white/5">
      {showGuides && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0.5 h-5 opacity-90 transition-colors duration-300"
            style={{ top: '16%', backgroundColor: lineColor, boxShadow: `0 0 8px ${lineColor}80` }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0.5 h-5 opacity-90 transition-colors duration-300"
            style={{ bottom: '16%', backgroundColor: lineColor, boxShadow: `0 0 8px ${lineColor}80` }}
          />
        </div>
      )}
      <AnimatePresence mode="wait">
        {showGuides ? (
          // Target Mode: ORP alignment — focal letter pinned to the centre line
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ duration: 0.05 }}
            className="grid grid-cols-[1fr_auto_1fr] items-baseline w-full px-4 text-3xl font-display text-white select-none"
            style={{ transform: isEmph ? 'scale(1.28)' : 'none', transition: 'transform 0.1s ease-out' }}
          >
            <span className="text-right whitespace-pre">{prefix}</span>
            <span className="text-center font-bold min-w-[1ch] transition-colors duration-300" style={{ color: focalColor }}>
              {focal}
            </span>
            <span className="text-left whitespace-pre">{suffix}</span>
          </motion.div>
        ) : (
          // Standard: whole word centred, focal letter still coloured
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ duration: 0.05 }}
            className="flex items-baseline justify-center w-full px-4 text-3xl font-display text-white select-none"
            style={{ transform: isEmph ? 'scale(1.28)' : 'none', transition: 'transform 0.1s ease-out' }}
          >
            <span className="whitespace-pre">{prefix}</span>
            <span className="font-bold transition-colors duration-300" style={{ color: focalColor }}>
              {focal}
            </span>
            <span className="whitespace-pre">{suffix}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Target Mode — word flow with guide lines plus the live colour picker cycling
const TargetModeDemo = () => {
  const [ci, setCi] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCi((p) => (p + 1) % TARGET_COLORS.length), 2600);
    return () => clearInterval(id);
  }, []);
  const color = TARGET_COLORS[ci].value;
  return (
    <div className="my-3">
      <WordFlowDemo sentence="Lock your eyes onto the target" focalColor={color} guideColor={color} showGuides />
      <div className="flex justify-center gap-3 mt-3">
        {TARGET_COLORS.map((c, idx) => (
          <div
            key={c.name}
            className="w-6 h-6 rounded-full border-2 transition-all duration-300"
            style={{
              backgroundColor: c.value,
              borderColor: idx === ci ? '#fff' : 'transparent',
              opacity: idx === ci ? 1 : 0.4,
              transform: idx === ci ? 'scale(1.1)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Acceleration — faithful replica of the in-app settings: starting & finishing
// speed sliders plus the "Reset speed after" options (mirrors KineticPlayer).
const RESET_OPTS = ['1 sentence', '2 sentences', '3 sentences', '4 sentences', 'End', 'Paragraph'];
const AccelerationDemo = () => {
  const [active, setActive] = useState(2);
  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % RESET_OPTS.length), 1300);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="my-4 rounded-xl border border-border bg-card/60 p-3 space-y-3 text-left">
      <div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Starting speed</span>
          <span className="font-medium tabular-nums">120 WPM</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-muted mt-1.5">
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow" style={{ left: '12%' }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Finishing speed</span>
          <span className="font-medium tabular-nums">480 WPM</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-muted mt-1.5">
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow" style={{ left: '80%' }} />
        </div>
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Reset speed after</div>
        <div className="flex flex-wrap gap-1">
          {RESET_OPTS.map((o, i) => (
            <span
              key={o}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                i === active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {o}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Speed control demo — a slider knob easing across a track
const SpeedDemo = () => (
  <div className="my-6 px-2">
    <div className="relative h-1.5 rounded-full bg-muted">
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary shadow-md"
        animate={{ left: ['8%', '78%', '40%'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
    <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
      <span>Slow & steady</span>
      <span>Lightning fast</span>
    </div>
  </div>
);

// Ebook library — auto-scrolling carousel of real classic titles (like the web home strip)
const LIBRARY_TITLES = [
  'Dracula',
  'Treasure Island',
  'The Time Machine',
  'Wuthering Heights',
  'The Call of the Wild',
  'Heart of Darkness',
  'The Picture of Dorian Gray',
  'The War of the Worlds',
  'White Fang',
  'The Jungle Book',
  'A Tale of Two Cities',
  'The Adventures of Sherlock Holmes',
];

// Cover styled exactly like EbookLibrary's BookCover (alternating black/white, "i -" logo, title)
const DemoBookCover = ({ title, index }: { title: string; index: number }) => {
  const isDark = index % 2 === 0;
  const bg = isDark ? 'bg-black' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-black';
  const logo = isDark ? 'bg-white' : 'bg-black';
  return (
    <div className={`shrink-0 w-[4.5rem] aspect-[2/3] rounded-md ${bg} flex flex-col items-center justify-between p-2 relative border border-border/10 shadow-inner overflow-hidden`}>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          <div className="relative flex flex-col items-center justify-center w-3 h-5">
            <span className={`w-1 h-1 rounded-full ${logo} mb-0.5`} />
            <span className={`w-1 h-2.5 ${logo} rounded-sm`} />
          </div>
          <div className={`w-2.5 h-0.5 ${logo} rounded-full opacity-80`} />
        </div>
      </div>
      <h4 className={`text-center font-display font-medium text-[6px] leading-tight uppercase tracking-widest ${text} line-clamp-3 text-balance`}>
        {title}
      </h4>
    </div>
  );
};

const LibraryDemo = () => {
  const row = [...LIBRARY_TITLES, ...LIBRARY_TITLES];
  return (
    <div className="relative my-5 -mx-2 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10" />
      <motion.div
        className="flex gap-2 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {row.map((t, idx) => (
          <DemoBookCover key={idx} title={t} index={idx % LIBRARY_TITLES.length} />
        ))}
      </motion.div>
    </div>
  );
};

// Full Text view — replica of FullTextView with a real excerpt; current word
// highlighted, past words muted, the reading position advancing.
const FULLTEXT_WORDS =
  'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity.'.split(
    ' '
  );
const FULLTEXT_CHOSEN = 5; // the word the demo "taps" → "times,"
const FullTextDemo = () => {
  const words = FULLTEXT_WORDS;
  const [phase, setPhase] = useState<'choosing' | 'tapped' | 'reading'>('choosing');
  const [readIdx, setReadIdx] = useState(FULLTEXT_CHOSEN);

  useEffect(() => {
    if (phase === 'choosing') {
      const id = setTimeout(() => setPhase('tapped'), 1100);
      return () => clearTimeout(id);
    }
    if (phase === 'tapped') {
      const id = setTimeout(() => {
        setReadIdx(FULLTEXT_CHOSEN);
        setPhase('reading');
      }, 750);
      return () => clearTimeout(id);
    }
    // reading — advance one word at a time, then loop back to the full text view
    if (readIdx >= FULLTEXT_CHOSEN + 7) {
      const id = setTimeout(() => setPhase('choosing'), 500);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setReadIdx((i) => i + 1), 470);
    return () => clearTimeout(id);
  }, [phase, readIdx]);

  // Kinetic player view — words appear one at a time, just like the real player
  if (phase === 'reading') {
    const word = words[readIdx] ?? '';
    return (
      <div className="my-4 relative h-[7.5rem] rounded-xl bg-zinc-950 border border-white/5 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={readIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ duration: 0.05 }}
            className="text-3xl font-display text-white select-none"
          >
            {word}
          </motion.div>
        </AnimatePresence>
        <span className="absolute bottom-2 left-0 right-0 text-center text-[9px] uppercase tracking-widest text-zinc-600 font-mono">
          Reading from here…
        </span>
      </div>
    );
  }

  // Full Text view — replica of FullTextView; the demo taps a word to choose it
  return (
    <div className="my-4 h-[7.5rem] rounded-xl border border-border bg-background overflow-hidden text-left flex flex-col">
      <div className="px-3 pt-2.5 pb-2 border-b border-border shrink-0">
        <div className="text-sm font-medium text-foreground">Full Text View</div>
        <div className="text-[10px] text-muted-foreground">Tap any word to continue reading from there</div>
      </div>
      <p className="p-3 text-[13px] leading-relaxed overflow-hidden">
        {words.map((w, i) => {
          const isChosen = phase === 'tapped' && i === FULLTEXT_CHOSEN;
          return (
            <motion.span
              key={i}
              animate={isChosen ? { scale: [1, 1.18, 1.08] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              className={`inline-block rounded px-0.5 ${isChosen ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground'}`}
            >
              {w}{' '}
            </motion.span>
          );
        })}
      </p>
    </div>
  );
};

// Chapters — replica of ChapterNavigation rows; the active chapter "colours in"
// from the left in proportion to how much of it you've read.
const DEMO_CHAPTERS = [
  { n: 1, title: 'Chapter I — The Period', state: 'done' as const },
  { n: 2, title: 'Chapter II — The Mail', state: 'active' as const },
  { n: 3, title: 'Chapter III — The Night Shadows', state: 'todo' as const },
];
const ChaptersDemo = () => {
  const [p, setP] = useState(20);
  useEffect(() => {
    const id = setInterval(() => setP((v) => (v >= 88 ? 20 : v + 1)), 55);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="my-4 rounded-xl border border-border bg-card/60 p-2 space-y-1 text-left">
      {DEMO_CHAPTERS.map((ch) => {
        const isActive = ch.state === 'active';
        const fill = ch.state === 'done' ? 100 : isActive ? p : 0;
        return (
          <div
            key={ch.n}
            className={`relative overflow-hidden rounded-lg p-2.5 ${isActive ? 'bg-primary/10 border border-primary/20' : ''}`}
          >
            <div className="absolute inset-0 bg-primary/20 transition-all" style={{ width: `${fill}%` }} />
            <div className="relative flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {ch.n}
              </div>
              <div className={`flex-1 min-w-0 text-xs font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {ch.title}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Splash shown after onboarding completes — replicates the app's intro: the "i-"
// animates, the KiN-TXT logo resolves, then the Enter button appears.
// Exported so the app can show the same splash on every startup (not just after
// onboarding). Renders the real interactive landing splash + its pull gesture.
export const OnboardingSplash = ({ onEnter }: { onEnter: () => void }) => {
  // Enable the same global pull gesture the web landing uses, then render the real
  // interactive splash so the intro + pull-the-"i" Pong behave exactly like the web.
  usePullGesture(true);
  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <InteractiveSplashScreen onEnter={onEnter} />
    </div>
  );
};

// Pro features — a rotating set of mini-diagrams, one per Pro feature
const ProFeatureViz = ({ type }: { type: string }) => {
  switch (type) {
    case 'streak':
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-6 h-6 text-orange-500" />
            <span className="text-2xl font-display text-foreground tabular-nums">7</span>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            ))}
          </div>
        </div>
      );
    case 'lapel':
      return (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow">
            <Medal className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <div className="text-lg font-display text-foreground tabular-nums">1,240</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">minutes · lapel earned</div>
          </div>
        </div>
      );
    case 'progress':
      return (
        <div className="w-44">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground">Dracula</span>
            <span className="font-medium text-foreground tabular-nums">64%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: '64%' }} />
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground">Resume exactly where you left off</div>
        </div>
      );
    case 'library':
      return (
        <div className="flex gap-1.5">
          {['Dracula', 'Candide', 'Dubliners'].map((t, i) => (
            <DemoBookCover key={t} title={t} index={i} />
          ))}
        </div>
      );
    case 'kins':
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="flex -space-x-2">
            {['AM', 'JP', 'RK', 'SL'].map((n, i) => (
              <div
                key={n}
                className="w-9 h-9 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-semibold text-primary-foreground"
                style={{ backgroundColor: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b'][i] }}
              >
                {n}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">See your KiNs’ reading lists & profiles</span>
        </div>
      );
    case 'share':
      return (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white">You</div>
          <div className="flex flex-col items-center text-muted-foreground">
            <BookOpen className="w-4 h-4 text-primary" />
            <Share2 className="w-3.5 h-3.5 mt-0.5" />
          </div>
          <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-semibold text-white">KiN</div>
        </div>
      );
    case 'club':
      return (
        <div className="w-48 text-left">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Classics KiN-Club</span>
          </div>
          {[
            { n: 'Anna', p: 82, c: '#6366f1' },
            { n: 'Raj', p: 47, c: '#14b8a6' },
            { n: 'Sam', p: 23, c: '#f59e0b' },
          ].map((m) => (
            <div key={m.n} className="flex items-center gap-2 mb-1">
              <span className="w-8 text-[10px] text-muted-foreground">{m.n}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${m.p}%`, backgroundColor: m.c }} />
              </div>
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground mt-1">Track your KiNs’ live progress</div>
        </div>
      );
    default:
      return null;
  }
};

const PRO_FEATURES = [
  { type: 'streak', icon: Flame, label: 'Build daily streaks' },
  { type: 'lapel', icon: Medal, label: 'Earn lapels for time read' },
  { type: 'progress', icon: Bookmark, label: 'Save your progress' },
  { type: 'library', icon: Library, label: 'Grow your own library' },
  { type: 'kins', icon: Users, label: 'Find & add your own KiNs' },
  { type: 'share', icon: Share2, label: 'Share txts with KiNs' },
  { type: 'club', icon: Trophy, label: 'Join & create KiN-Clubs' },
];

const ProDemo = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % PRO_FEATURES.length), 2400);
    return () => clearInterval(id);
  }, []);
  const feature = PRO_FEATURES[i];
  const Icon = feature.icon;
  return (
    <div className="my-4">
      <div className="relative h-36 rounded-xl border border-border bg-card/60 flex flex-col items-center justify-center overflow-hidden px-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={feature.type}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-1.5 text-primary">
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{feature.label}</span>
            </div>
            <ProFeatureViz type={feature.type} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1.5 mt-2.5">
        {PRO_FEATURES.map((_, idx) => (
          <span
            key={idx}
            className={`h-1 rounded-full transition-all duration-300 ${idx === i ? 'w-4 bg-primary' : 'w-1 bg-muted'}`}
          />
        ))}
      </div>
    </div>
  );
};

// Import — three ways in: paste/type, upload a document, or paste a URL for the AI
const IMPORT_METHODS = [
  { icon: ClipboardPaste, title: 'Paste or type', sub: 'Drop in any text you like' },
  { icon: Upload, title: 'Upload a document', sub: 'PDF · EPUB · DOCX · TXT' },
  { icon: Link2, title: 'Paste a link', sub: 'AI fetches & analyses the text' },
];

const ImportDemo = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % IMPORT_METHODS.length), 2200);
    return () => clearInterval(id);
  }, []);
  const m = IMPORT_METHODS[i];
  const Icon = m.icon;
  return (
    <div className="my-4">
      <div className="relative h-24 rounded-xl border border-border bg-card/60 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">{m.title}</div>
              <div className="text-[11px] text-muted-foreground">{m.sub}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1.5 mt-2.5">
        {IMPORT_METHODS.map((_, idx) => (
          <span key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === i ? 'w-4 bg-primary' : 'w-1 bg-muted'}`} />
        ))}
      </div>
    </div>
  );
};

// Comparison visual — static/spatial (you scan) vs kinetic/temporal (word comes to you)
const FLOW_WORDS = ['the', 'text', 'comes', 'to', 'you'];
const ComparisonVisual = () => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setW((p) => (p + 1) % FLOW_WORDS.length), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex justify-center gap-8 my-6">
      <div className="text-center">
        <div className="w-16 h-20 mx-auto mb-2 rounded-lg border border-border/50 bg-muted/20 p-1.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-1 bg-muted-foreground/20 rounded-full mb-1" style={{ width: `${60 + ((i * 37) % 40)}%` }} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Static · spatial</span>
      </div>
      <div className="text-center">
        <div className="w-16 h-20 mx-auto mb-2 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={w}
              className="text-sm font-medium text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              transition={{ duration: 0.05 }}
            >
              {FLOW_WORDS[w]}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="text-xs text-muted-foreground">Kinetic · temporal</span>
      </div>
    </div>
  );
};

const steps = [
  {
    icon: Zap,
    title: 'Welcome to KiN-TXT',
    description: 'Static reading is spatial; kinetic reading is temporal — the text comes to you. No page fright, no scanning ahead, no tracking where you are. Just the unfolding language. Reading, performed in time. Remove distraction. Regain focus.',
    visual: ComparisonVisual,
  },
  {
    icon: Activity,
    title: 'Rhythm & Emphasis Mode',
    description: 'Our AI reads the writing for you — words arrive one at a time through pace, pause and emphasis, so the important words land with weight, just like a great narrator.',
    visual: () => <WordFlowDemo sentence="The important words land with weight" emphasis={['important', 'weight']} focalColor="#ffffff" />,
  },
  {
    icon: Gauge,
    title: 'Acceleration Mode',
    description: 'Want to read faster? Acceleration Mode gently increases the pace as your brain adapts, training you to absorb more without losing a word.',
    visual: AccelerationDemo,
  },
  {
    icon: Target,
    title: 'Target Mode',
    description: 'Lock your eyes onto one fixed point — the coloured letter sitting between the two guide lines. Every word shifts so that single letter always lands on the target, so your gaze never has to move, not even across the word itself. Tap the dots to set the lines to yellow, pink or blue.',
    visual: TargetModeDemo,
  },
  {
    icon: Sliders,
    title: 'Set Your Own Speed',
    description: 'Dial in your perfect pace with the speed slider — it sets how fast the words arrive and the overall rhythm of your reading. Start gentle, then push faster as you get comfortable.',
    visual: SpeedDemo,
  },
  {
    icon: AlignLeft,
    title: 'See the Full Text, Skip Anywhere',
    description: 'Open the full text at any time to read normally, check your place, or tap any word to jump straight there.',
    visual: FullTextDemo,
  },
  {
    icon: List,
    title: 'Chapters & Sections',
    description: 'Jump between chapters and sections at a glance. Each chapter title fills in as you read it, so you can see exactly how far through you are.',
    visual: ChaptersDemo,
  },
  {
    icon: BookOpen,
    title: 'A Library of Classics',
    description: 'Browse a built-in library of timeless classics — Dracula, Treasure Island, Sherlock Holmes and more — ready to read in kinetic flow the moment you open them.',
    visual: LibraryDemo,
  },
  {
    icon: Newspaper,
    title: 'Live News, Built In',
    description: 'Stay current with live news pulled straight into the app. Read today\'s headlines in flow, hands-free.',
  },
  {
    icon: Link2,
    title: 'Bring Your Own Text',
    description: 'Copy-paste or type your own text, upload your own documents, or just paste a URL — our AI grabs the text and analyses it for emphasis and rhythm, ready to read in seconds.',
    visual: ImportDemo,
  },
  {
    icon: Crown,
    title: 'Go Pro with KiN',
    description: 'Go Pro to unlock the full experience. Build a daily streak, watch your reading minutes add up and earn lapels along the way, and never lose your place with saved progress and a library of your own. Then bring in your KiNs — find and add friends, browse their reading lists and profiles, share txts, and start or join KiN-Clubs to recommend books and follow each other\'s progress live.',
    visual: ProDemo,
  },
];

export function Onboarding({ currentStep, onNext, onPrev, onComplete, reopened = false }: OnboardingProps) {
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const Icon = step.icon;
  const Visual = 'visual' in step ? step.visual : null;

  const [showSplash, setShowSplash] = useState(false);

  // Exit/finish: first-launch flows through the splash; re-opened closes to the app.
  const finish = () => (reopened ? onComplete() : setShowSplash(true));

  if (showSplash) {
    return (
      <AnimatePresence>
        <OnboardingSplash onEnter={onComplete} />
      </AnimatePresence>
    );
  }

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
          onClick={finish}
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

          {/* Legal links — shown on the final step before entering the app */}
          {isLastStep && (
            <p className="text-center text-[11px] text-muted-foreground/70 mt-4 leading-relaxed">
              By continuing you agree to our{' '}
              <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</a>
              {' '}and{' '}
              <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
            </p>
          )}

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
              onClick={isLastStep ? finish : onNext}
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
