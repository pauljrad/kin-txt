import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronLeft, Rewind, BookOpen, Clock, Music, Settings, Focus, Eye, Type, Share2 } from 'lucide-react';
import { ParsedText, getWordDelay, filterEmphasis } from '@/lib/textParser';
import { detectChapters, findSentenceBoundaries, getRewindPosition, Chapter } from '@/lib/chapterParser';
import { updateDocumentReadingTime as updateLocalReadingTime } from '@/lib/documentStorage';
import { updateDocumentReadingTime as updateDbReadingTime, markDocumentCompleted, logReadingSession } from '@/lib/documentDatabase';
import { ChapterNavigation } from './ChapterNavigation';
import { FullTextView } from './FullTextView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTextSize } from '@/hooks/useTextSize';

interface WordSpeed {
  word: string;
  speed: number;
}

interface KineticPlayerProps {
  parsedText: ParsedText;
  documentId?: string;
  initialProgress?: { paragraph: number; word: number };
  emphasisWords?: string[];
  whisperedWords?: string[];
  initialTotalReadingTime?: number;
  onBack: () => void;
  onProgressChange?: (paragraph: number, word: number) => void;
  isEbook?: boolean;
  onShare?: () => void;
  attribution?: {
    author: string;
    source?: string;
    pixelUrl?: string;
  };
}

export function KineticPlayer({
  parsedText,
  documentId,
  initialProgress,
  emphasisWords = [],
  whisperedWords = [],
  initialTotalReadingTime = 0,
  onBack,
  onProgressChange,
  isEbook = false,
  onShare,
  attribution
}: KineticPlayerProps) {
  const { textSize, setTextSize } = useTextSize();

  // Settings Persistence Logic
  const STORAGE_KEY = 'kin_reader_settings';

  interface ReaderSettings {
    startSpeed: number;
    endSpeed: number;
    rhythmMode: boolean;
    rhythmPreset: 'slower' | 'normal' | 'faster';
    accelerationMode: boolean;
    adaptiveSpeed: boolean;
    resetInterval: '1' | '2' | '3' | '4' | 'end' | 'paragraph';
    focusMode: boolean;
    targetMode: boolean;
    targetColor: string;
  }

  const loadSettings = (): Partial<ReaderSettings> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to load settings', e);
      return {};
    }
  };

  // Initialize state from local storage or defaults
  const initialSettings = loadSettings();

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState({ 
    paragraph: initialProgress?.paragraph || 0, 
    word: initialProgress?.word || 0 
  });
  const { paragraph: currentParagraph, word: currentWord } = position;

  // Refs for logic "ground truth" to prevent stale closures and ensure absolute stability
  const positionRef = useRef(position);
  const sentenceCountRef = useRef(0);
  const wordInChunkRef = useRef(0);

  // Keep ref in sync with state for rendering/UI
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Persisted Stats
  const [startSpeed, setStartSpeed] = useState(initialSettings.startSpeed ?? 0.5);
  const [endSpeed, setEndSpeed] = useState(initialSettings.endSpeed ?? 1.4);
  const [rhythmMode, setRhythmMode] = useState(initialSettings.rhythmMode ?? true);
  const [rhythmPreset, setRhythmPreset] = useState<'slower' | 'normal' | 'faster'>(initialSettings.rhythmPreset ?? 'normal');
  const [accelerationMode, setAccelerationMode] = useState(initialSettings.accelerationMode ?? false);
  const [adaptiveSpeed, setAdaptiveSpeed] = useState(initialSettings.adaptiveSpeed ?? true);
  const [resetInterval, setResetInterval] = useState<'1' | '2' | '3' | '4' | 'end' | 'paragraph'>(initialSettings.resetInterval && (initialSettings.resetInterval as string) !== 'start' ? (initialSettings.resetInterval as any) : '3');
  const [focusMode, setFocusMode] = useState(initialSettings.focusMode ?? false);
  const [targetMode, setTargetMode] = useState(initialSettings.targetMode ?? false);
  const [targetColor, setTargetColor] = useState(initialSettings.targetColor ?? '#FFD600');
  const [showControls, setShowControls] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [chunkLength, setChunkLength] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [totalReadingTime, setTotalReadingTime] = useState(initialTotalReadingTime);
  const [currentWordDelayMs, setCurrentWordDelayMs] = useState(300);
  const [rhythmSpeeds, setRhythmSpeeds] = useState<WordSpeed[]>([]);
  const [wordsReadInSession, setWordsReadInSession] = useState(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showingChapterTitle, setShowingChapterTitle] = useState<string | null>(null);
  const [showingAttribution, setShowingAttribution] = useState<boolean>(!!attribution);
  const [lastChapterIndex, setLastChapterIndex] = useState(-1);
  const [activeAtmosphere, setActiveAtmosphere] = useState<'none' | 'noir' | 'fret' | 'fret2'>('none');
  const [musicMenuOpen, setMusicMenuOpen] = useState(false);


  const atmosphereAudioRef = useRef<HTMLAudioElement>(null);

  // Sync atmosphere audio with state
  useEffect(() => {
    const audio = atmosphereAudioRef.current;
    if (!audio) return;

    if (activeAtmosphere === 'none') {
      audio.pause();
    } else {
      const src = 
        activeAtmosphere === 'noir' ? "/atmosphere-jazz.mp3" : 
        activeAtmosphere === 'fret' ? "/atmosphere-guitar.mp3" :
        "/atmosphere-guitar-2.mp3";
      
      // Only update src if it's different to prevent restart on re-render

      const fullSrc = window.location.origin + src;
      if (audio.src !== fullSrc) {
        audio.src = src;
        audio.load();
      }
      
      audio.play().catch(err => {
        console.error("Audio block:", err);
        if (err.name === 'NotAllowedError') {
          toast.info("Click again to enable audio (Browser restriction)");
        }
      });
    }
  }, [activeAtmosphere]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chapterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(initialTotalReadingTime || 0);
  const totalReadingTimeRef = useRef<number>(initialTotalReadingTime || 0);

  // Keep a ref updated so we can persist the latest value on exit/unmount without stale closures.
  useEffect(() => {
    totalReadingTimeRef.current = totalReadingTime;
  }, [totalReadingTime]);

  const persistReadingTime = useCallback(
    async (force: boolean = false) => {
      if (!documentId) return;
      const current = totalReadingTimeRef.current;
      if (current <= 0) return;

      // Only persist if enough time has elapsed, unless forced.
      if (!force && current - lastSaveTimeRef.current < 10) return;

      // Save locally (offline) and to the database (when logged in).
      updateLocalReadingTime(documentId, current);
      try {
        await updateDbReadingTime(documentId, current);
      } catch {
        // ignore; local storage still keeps the time
      }

      lastSaveTimeRef.current = current;
    },
    [documentId]
  );
  const progressBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { allWords, totalWords, paragraphOffsets } = useMemo(() => {
    const all = parsedText.paragraphs.flat();
    const offsets: number[] = [];
    let currentOffset = 0;
    
    parsedText.paragraphs.forEach(para => {
      offsets.push(currentOffset);
      currentOffset += para.length;
    });
    
    return {
      allWords: all,
      totalWords: all.length,
      paragraphOffsets: offsets
    };
  }, [parsedText.paragraphs]);

  // Detect chapters and sentence boundaries
  const chapters = useMemo(() => detectChapters(parsedText), [parsedText]);
  const sentenceBoundaries = useMemo(() => findSentenceBoundaries(parsedText), [parsedText]);

  // Create sets for quick lookup (lowercase for comparison)
  const emphasisSet = useMemo(
    () => new Set(filterEmphasis(emphasisWords).map((w) => w.toLowerCase().replace(/[.,!?;:'"()[\]]/g, ''))),
    [emphasisWords]
  );
  const whisperedSet = useMemo(
    () => new Set(whisperedWords.map((w) => w.toLowerCase().replace(/[.,!?;:'"()[\]]/g, ''))),
    [whisperedWords]
  );

  // Create a map for rhythm speeds lookup
  const rhythmSpeedMap = useMemo(() => {
    const map = new Map<number, number>();
    rhythmSpeeds.forEach((ws, index) => {
      map.set(index, ws.speed);
    });
    return map;
  }, [rhythmSpeeds]);

  // Calculate current word index across all paragraphs
  const getCurrentWordIndex = useCallback(() => {
    if (currentParagraph < 0 || currentParagraph >= paragraphOffsets.length) return 0;
    return paragraphOffsets[currentParagraph] + currentWord;
  }, [currentParagraph, currentWord, paragraphOffsets]);

  // Helper to split word at Optimal Recognition Point (ORP)
  const getORPIndex = (word: string) => {
    const length = word.length;
    if (length === 0) return 0;
    if (length === 1) return 0;
    if (length <= 5) return 1;
    if (length <= 9) return 2;
    if (length <= 13) return 3;
    return 4;
  };

  const progress = totalWords > 0 ? (getCurrentWordIndex() / totalWords) * 100 : 0;

  // Safely get current word with fallback
  const currentDisplayWord = parsedText.paragraphs[currentParagraph]?.[currentWord] ?? '';

  // Early return check if parsedText is invalid
  const isValidText = parsedText?.paragraphs?.length > 0;

  // Check if current word should be emphasized or whispered
  // Use robust regex matching textParser to ensure punctuation/brackets/quotes don't break lookup
  const cleanWord = currentDisplayWord.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '');

  // FAILSAFE: Explicitly check for known keywords even if Set data is missing
  const autoWhisper = ['whisper', 'whispers', 'mouse', 'mice', 'tiny', 'quiet', 'quietly', 'silence', 'silent', 'soft', 'softly'];
  const isWhisperedWord = whisperedSet.has(cleanWord) || autoWhisper.includes(cleanWord);

  // CRITICAL FIX: Whisper trumps emphasis. If it's whispered, it CANNOT be emphasized.
  // This solves the issue where "Mouse" (AI detected emphasis) stayed big instead of shrinking.
  // Determine if the *current specific instance* has visual emphasis markers
  const wordNoPunct = currentDisplayWord.replace(/[.,!?;:'"()[\]]/g, '');
  const isAllCaps =
    wordNoPunct.length >= 3 &&
    wordNoPunct === wordNoPunct.toUpperCase() &&
    /[A-Z]/.test(wordNoPunct);

  const hasExclamation = currentDisplayWord.includes('!');

  // CRITICAL FIX: Whisper trumps emphasis. 
  // Emphasis triggers:
  // 1. AI suggested word (already filtered by STOP_WORDS in emphasisSet)
  // 2. Word is in ALL CAPS (Intent)
  // 3. Word has an exclamation mark (Intent)
  const isEmphasisWord = !isWhisperedWord && (
    emphasisSet.has(cleanWord) ||
    isAllCaps ||
    hasExclamation
  );

  // Calculate horizontal squash for emphasis words that might overflow
  const wordRef = useRef<HTMLDivElement>(null);
  const [emphasisScaleX, setEmphasisScaleX] = useState(1);

  // Measure word and calculate squash factor when emphasis word changes
  useEffect(() => {
    if (isEmphasisWord && wordRef.current) {
      // Get viewport width with some padding
      const viewportWidth = window.innerWidth - 32; // 16px padding on each side

      // Get the base font size for emphasis words
      const textSizeMultiplier = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--text-size-multiplier') || '1'
      );
      const baseFontSize = 4 * 16 * textSizeMultiplier; // 4rem in pixels
      const emphasisScale = 2.5;

      // Estimate word width (approximate: each char is ~0.6x font size for display fonts)
      const estimatedCharWidth = baseFontSize * 0.55;
      const estimatedWordWidth = currentDisplayWord.length * estimatedCharWidth * emphasisScale;

      if (estimatedWordWidth > viewportWidth) {
        // Calculate squash factor to fit, with a minimum of 0.3 to keep readable
        const squashFactor = Math.max(0.3, viewportWidth / estimatedWordWidth);
        setEmphasisScaleX(squashFactor);
      } else {
        setEmphasisScaleX(1);
      }
    } else {
      setEmphasisScaleX(1);
    }
  }, [currentDisplayWord, isEmphasisWord]);

  // Format time for display (mm:ss or hh:mm:ss)
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get rhythm multiplier based on preset AND adaptive mode
  // Research shows:
  // - Beginners: 150-200 WPM for RSVP to build comfort
  // - Comfortable: 200-250 WPM with good comprehension  
  // - Experienced: 250-300 WPM optimal balance
  // Base delay is 300ms at speed 1.0 = 200 WPM

  // Adaptive ramp: starts at ~150 WPM, reaches target after ~100 words
  const adaptiveMultiplier = useMemo(() => {
    if (!adaptiveSpeed) return 1.0;

    // Start a bit slower for comfort, then ramp up.
    // Ramp from ~0.80 to 1.0 over the first ~120 words.
    const rampWords = 120;
    const progress = Math.min(1, wordsReadInSession / rampWords);

    // Ease-out curve for natural acceleration
    const easeOut = 1 - Math.pow(1 - progress, 2);

    // Start at 0.75, ramp to 1.0
    return 0.75 + (0.25 * easeOut);
  }, [adaptiveSpeed, wordsReadInSession]);

  const rhythmMultiplier = useMemo(() => {
    // Base multipliers (lower = slower, more comfortable)
    // Empirically, sustained comprehension for RSVP-style word presentation tends to drop as you push above ~220–250 WPM.
    // Many adult silent reading speeds cluster around ~200–250 WPM for comfortable prose, but RSVP often needs a bit slower.
    // These presets aim for a more comfortable default range.
    // (Reminder: speed=1.0 corresponds to ~200 WPM given our 300ms baseline.)
    let baseMultiplier: number;
    switch (rhythmPreset) {
      case 'slower':
        baseMultiplier = 0.667; // 1.5x slower (1 / 1.5)
        break;
      case 'faster':
        baseMultiplier = 1.5;   // 1.5x faster
        break;
      default:
        baseMultiplier = 1.0;
    }

    return baseMultiplier * adaptiveMultiplier;
  }, [rhythmPreset, adaptiveMultiplier]);

  // Generate rhythm speeds synchronously using local heuristics (instant, no API call)
  const generateLocalRhythm = useCallback((words: string[]): WordSpeed[] => {
    const results: WordSpeed[] = [];

    // Quick function words - read faster (articles, prepositions, pronouns, auxiliaries)
    const quickWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'as', 'be',
      'was', 'were', 'been', 'are', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'shall', 'can', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'us', 'them', 'so', 'if', 'then', 'than', 'just',
      'not', 'no', 'yes', 'all', 'any', 'some', 'each', 'every', 'into', 'onto', 'from', 'about', 'through'
    ]);

    // Slow down for important/heavy words
    const slowWords = new Set([
      'however', 'therefore', 'nevertheless', 'furthermore', 'consequently', 'meanwhile', 'although',
      'because', 'suddenly', 'immediately', 'finally', 'always', 'never', 'perhaps', 'probably'
    ]);

    let prevEndedSentence = false;
    let prevHadComma = false;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const cleanWord = word.toLowerCase().replace(/[.,!?;:'"—–\-()[\]]/g, '');

      // Base speed: keep around 1.0 (≈200 WPM baseline) and let the preset handle global scaling.
      let speed = 1.0;

      // After sentence end, slow down significantly for the next word (new thought)
      if (prevEndedSentence) {
        speed = 0.75;
        prevEndedSentence = false;
        prevHadComma = false;
      } else if (prevHadComma) {
        // Slight pause after comma
        speed = 0.9;
        prevHadComma = false;
      }

      // Quick function words: small speed-up only.
      if (quickWords.has(cleanWord) && cleanWord.length <= 4) {
        speed = Math.min(speed + 0.12, 1.25);
      } else if (quickWords.has(cleanWord)) {
        speed = Math.min(speed + 0.08, 1.18);
      }

      // Slow words - always read slower
      if (slowWords.has(cleanWord)) {
        speed = 0.8;
      }

      // Word length adjustments - more gradual
      if (cleanWord.length >= 10) {
        speed -= 0.25;
      } else if (cleanWord.length >= 7) {
        speed -= 0.1;
      } else if (cleanWord.length <= 2 && !quickWords.has(cleanWord)) {
        speed += 0.1;
      }

      // First word of text or after paragraph break - slightly slower
      if (i === 0) {
        speed = 0.85;
      }

      // Capitalized words mid-sentence (names, places) - slight emphasis
      if (word[0] && word[0] === word[0].toUpperCase() && i > 0 && !prevEndedSentence) {
        speed -= 0.08;
      }

      // Check punctuation at end of word
      if (/[.!?]$/.test(word)) {
        // Sentence enders - slight slowdown on the word itself
        speed -= 0.15;
        prevEndedSentence = true;
      } else if (/[,;:]$/.test(word)) {
        // Clause separators
        speed -= 0.08;
        prevHadComma = true;
      } else if (/[—–\-]$/.test(word)) {
        // Dashes - dramatic pause
        speed -= 0.12;
        prevHadComma = true;
      }

      // Exclamation and question marks - extra emphasis
      if (/!$/.test(word)) {
        speed -= 0.1;
      }

      // Quoted text start - slight pause
      if (/^["']/.test(word)) {
        speed -= 0.05;
      }

      // Clamp to reasonable range - tighter range for more consistent flow
      // Clamp per-word local speed range.
      speed = Math.max(0.60, Math.min(1.45, speed));
      results.push({ word, speed });
    }

    return results;
  }, []);

  // Initialize rhythm immediately on mount (synchronous, no loading state needed)
  useEffect(() => {
    if (rhythmSpeeds.length === 0 && parsedText?.paragraphs?.length) {
      const speeds = generateLocalRhythm(allWords);
      setRhythmSpeeds(speeds);
    }
  }, [allWords, rhythmSpeeds.length, generateLocalRhythm]);

  const toggleRhythmMode = () => {
    setRhythmMode(!rhythmMode);
    toast.info(rhythmMode ? 'Rhythm mode disabled' : 'Rhythm mode enabled');
  };

  // Session timer - runs when playing
  useEffect(() => {
    if (isPlaying && !isComplete) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
        setTotalReadingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [isPlaying, isComplete]);

  // Persist total reading time periodically (every 10 seconds)
  useEffect(() => {
    // Fire-and-forget; we also flush on exit/unmount.
    void persistReadingTime(false);
  }, [totalReadingTime, persistReadingTime]);

  // Flush remaining time on unmount
  useEffect(() => {
    return () => {
      void persistReadingTime(true);
    };
  }, [persistReadingTime]);

  // Check if a word ends a sentence
  const isSentenceEnd = (word: string) => {
    return /[.!?]$/.test(word.trim());
  };

  // Calculate current speed based on position within the chunk OR rhythm mode
  const getCurrentSpeed = useCallback(() => {
    // Default safe speed
    const DEFAULT_SPEED = 1.0;

    if (rhythmMode && rhythmSpeeds.length > 0) {
      const currentIndex = getCurrentWordIndex();
      const rhythmSpeed = rhythmSpeedMap.get(currentIndex);
      if (rhythmSpeed !== undefined && Number.isFinite(rhythmSpeed) && rhythmSpeed > 0) {
        const speed = rhythmSpeed * rhythmMultiplier;
        return Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_SPEED;
      }
      // Fall back to default if beyond analyzed range
      return DEFAULT_SPEED * rhythmMultiplier;
    }


    if (accelerationMode) {
      let progressInChunk = 0;
      if (resetInterval === 'end') {
        progressInChunk = getCurrentWordIndex() / Math.max(1, totalWords - 1);
      } else {
        if (chunkLength <= 1) {
          return Number.isFinite(startSpeed) && startSpeed > 0 ? startSpeed : DEFAULT_SPEED;
        }
        progressInChunk = wordInChunkRef.current / Math.max(1, chunkLength - 1);
      }
      
      // Linear interpolation between start and end speed
      const speed = startSpeed + (endSpeed - startSpeed) * progressInChunk;
      return Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_SPEED;
    }

    // Default static speed (use startSpeed as the base)
    return Number.isFinite(startSpeed) && startSpeed > 0 ? startSpeed : DEFAULT_SPEED;
  }, [rhythmMode, rhythmSpeeds.length, rhythmSpeedMap, getCurrentWordIndex, rhythmMultiplier, accelerationMode, totalWords, chunkLength, resetInterval, startSpeed, endSpeed]);

  // Save progress when it changes
  useEffect(() => {
    if (documentId && onProgressChange) {
      onProgressChange(currentParagraph, currentWord);
    }
  }, [currentParagraph, currentWord, documentId, onProgressChange]);

  // Seek to a specific word index
  const seekToIndex = useCallback((targetIndex: number) => {
    if (!parsedText?.paragraphs?.length || !paragraphOffsets.length) return;

    let para = 0;
    // Find the paragraph using binary search (or efficient loop) over offsets
    for (let i = paragraphOffsets.length - 1; i >= 0; i--) {
      if (targetIndex >= paragraphOffsets[i]) {
        para = i;
        break;
      }
    }
    
    // CRITICAL: Clear all active timeouts during a seek.
    // This prevents background timers (like chapter title pauses) from jumping us back.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (chapterTimeoutRef.current) clearTimeout(chapterTimeoutRef.current);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    // Reset state associated with transitions
    setShowingChapterTitle(null);
    setIsComplete(false);

    const word = targetIndex - paragraphOffsets[para];
    
    setPosition({ paragraph: para, word: word });
    positionRef.current = { paragraph: para, word: word };
    sentenceCountRef.current = 0;
    wordInChunkRef.current = 0;

    // Recalculate chunk length for current position
    const currentPara = parsedText.paragraphs[para];
    let count = 0;
    let sentences = 0;
    for (let i = word; i < currentPara.length; i++) {
      count++;
      if (isSentenceEnd(currentPara[i])) {
        sentences++;
        if (sentences >= 3) break;
      }
    }
    setChunkLength(count);
  }, [parsedText.paragraphs, paragraphOffsets]);

  // Attribution Timer Logic
  useEffect(() => {
    if (showingAttribution && isPlaying) {
      const timer = setTimeout(() => {
        setShowingAttribution(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showingAttribution, isPlaying]);

  // Auto-complete document when user reaches the end
  useEffect(() => {
    if (isComplete && documentId) {
      console.log('[KineticPlayer] Document completed, marking as finished:', documentId);
      markDocumentCompleted(documentId, true).catch(err => {
        console.error('[KineticPlayer] Failed to mark document as completed:', err);
      });
    }
  }, [isComplete, documentId]);

  const handleProgressBarInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as any).clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetIndex = Math.floor(percentage * (totalWords - 1));

    seekToIndex(targetIndex);
  }, [totalWords, seekToIndex]);

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setIsPlaying(false);
    handleProgressBarInteraction(e);
  };

  const handleProgressMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleProgressBarInteraction(e as unknown as React.MouseEvent);
  }, [isDragging, handleProgressBarInteraction]);

  const handleProgressMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleProgressMouseMove);
      window.addEventListener('mouseup', handleProgressMouseUp);
      window.addEventListener('touchmove', handleProgressMouseMove as any);
      window.addEventListener('touchend', handleProgressMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleProgressMouseMove);
      window.removeEventListener('mouseup', handleProgressMouseUp);
      window.removeEventListener('touchmove', handleProgressMouseMove as any);
      window.removeEventListener('touchend', handleProgressMouseUp);
    };
  }, [isDragging, handleProgressMouseMove, handleProgressMouseUp]);

  const advanceWord = useCallback(() => {
    // Safety checks: ALWAYS use ref for current position to prevent stale jump issues
    const { paragraph: currentPara, word: currentW } = positionRef.current;
    
    // Safety checks: ensure we have valid data before advancing
    if (!parsedText?.paragraphs?.length) return;

    if (currentPara >= parsedText.paragraphs.length) return;

    const currentParagraphWords = parsedText.paragraphs[currentPara];
    if (!currentParagraphWords?.length) return;

    if (currentW >= currentParagraphWords.length) return;

    const word = currentParagraphWords[currentW];
    if (!word) return;

    // Check if this word ends a sentence
    if (isSentenceEnd(word)) {
      sentenceCountRef.current += 1;
    }

    // Determine reset count based on interval setting
    let resetCount = Infinity;
    if (resetInterval === 'end') {
      resetCount = Infinity; 
    } else if (resetInterval !== 'paragraph') {
      resetCount = parseInt(resetInterval);
    }

    if (currentW < currentParagraphWords.length - 1) {
      // Reset speed after configured number of sentences
      if (accelerationMode && sentenceCountRef.current >= resetCount && isSentenceEnd(word)) {
        sentenceCountRef.current = 0;
        wordInChunkRef.current = 0;
        // Calculate chunk length for next sentences
        let count = 0;
        let sentences = 0;
        for (let i = currentW + 1; i < currentParagraphWords.length; i++) {
          count++;
          if (isSentenceEnd(currentParagraphWords[i])) {
            sentences++;
            if (sentences >= resetCount) break;
          }
        }
        setChunkLength(count);
      } else {
        wordInChunkRef.current += 1;
      }
      
      const newPos = { paragraph: currentPara, word: currentW + 1 };
      setPosition(newPos);
      positionRef.current = newPos;
      
      // Track words for adaptive speed
      setWordsReadInSession(prev => prev + 1);
    } else if (currentPara < parsedText.paragraphs.length - 1) {
      // Move to next paragraph
      const nextPara = currentPara + 1;

      // Chapter Logic
      let enteringChapterIndex = -1;
      if (isEbook) {
        for (let i = 0; i < chapters.length; i++) {
          if (chapters[i].startParagraph === nextPara && i > lastChapterIndex) {
            enteringChapterIndex = i;
            break;
          }
        }
      }

      if (enteringChapterIndex >= 0) {
        const enteringChapter = chapters[enteringChapterIndex];
        setIsPlaying(false);
        setShowingChapterTitle(enteringChapter.title);
        setLastChapterIndex(enteringChapterIndex);

        if (chapterTimeoutRef.current) clearTimeout(chapterTimeoutRef.current);

        chapterTimeoutRef.current = setTimeout(() => {
          setShowingChapterTitle(null);
          
          if (resetInterval !== 'end') {
            sentenceCountRef.current = 0;
            wordInChunkRef.current = 0;
          }
          
          const nextPos = { paragraph: nextPara, word: 0 };
          setPosition(nextPos);
          positionRef.current = nextPos;
          
          setWordsReadInSession(prev => Math.floor(prev * 0.5));

          const nextParagraph = parsedText.paragraphs[nextPara];
          let resetCountVal = 1000; // default large if paragraph
          if (resetInterval !== 'end' && resetInterval !== 'paragraph') {
            resetCountVal = parseInt(resetInterval);
          }
          
          let count = 0;
          let sentences = 0;
          for (let i = 0; i < nextParagraph.length; i++) {
            count++;
            if (isSentenceEnd(nextParagraph[i])) {
              sentences++;
              if (sentences >= resetCountVal) break;
            }
          }
          setChunkLength(count);
          setIsPlaying(true);
        }, 3000);
      } else {
        // Normal paragraph transition
        const nextPos = { paragraph: nextPara, word: 0 };
        setPosition(nextPos);
        positionRef.current = nextPos;
        
        if (resetInterval !== 'end') {
          sentenceCountRef.current = 0;
          wordInChunkRef.current = 0;
        }

        const nextParagraph = parsedText.paragraphs[nextPara];
        let resetCountVal = 1000;
        if (resetInterval !== 'end' && resetInterval !== 'paragraph') {
          resetCountVal = parseInt(resetInterval);
        }
        
        let count = 0;
        let sentences = 0;
        for (let i = 0; i < nextParagraph.length; i++) {
          count++;
          if (isSentenceEnd(nextParagraph[i])) {
            sentences++;
            if (sentences >= resetCountVal) break;
          }
        }
        setChunkLength(count);
      }
    } else {
      // Finished
      setIsPlaying(false);
      setIsComplete(true);
    }
  }, [parsedText, resetInterval, accelerationMode, isEbook, chapters, lastChapterIndex]);

  useEffect(() => {
    // Clear any existing timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only play if playing, not complete, and no overlays are showing
    if (!isPlaying || isComplete || showFullText || isNavOpen || showingChapterTitle) return;

    // FORCE SYNC ground truth whenever the loop runs/re-runs
    // This ensures that hitting PLAY after a seek always uses the correct state
    positionRef.current = { paragraph: currentParagraph, word: currentWord };

    const para = parsedText.paragraphs[currentParagraph];
    if (!para) return;

    const word = para[currentWord];
    if (!word) return;

    // Get current speed based on paragraph progress or rhythm
    let currentSpeed = getCurrentSpeed();

    // Calculate delay with current speed - ensure it's valid
    let delay = getWordDelay(word, currentSpeed, rhythmMode ? 'rhythm' : 'normal');


    // Sanity check: delay must be a positive finite number
    if (!Number.isFinite(delay) || delay <= 0) {
      delay = 300; // fallback to 300ms
    }

    // Slightly longer pause at paragraph start (only if not rhythm mode)
    if (currentWord === 0 && !rhythmMode) {
      delay = delay * 1.3;
    }

    // Extra pause for emphasis words (only if not rhythm mode)
    const wordClean = word.toLowerCase().replace(/[.,!?;:]/g, '');
    if (!rhythmMode && emphasisSet.has(wordClean)) {
      delay = delay * 1.5;
    }

    // Cap maximum delay to prevent freezing / stalling
    delay = Math.min(delay, 2500);

    // Keep the animation duration in sync with the scheduling delay.
    // This prevents the word feeling "late" (long delay but quick animation) or "rushed".
    setCurrentWordDelayMs(delay);

    timeoutRef.current = setTimeout(advanceWord, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isPlaying, currentParagraph, currentWord, getCurrentSpeed, advanceWord, parsedText.paragraphs, isComplete, emphasisSet, showFullText, isNavOpen, rhythmMode, showingChapterTitle]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current && document.fullscreenEnabled) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.log('Fullscreen not available');
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.log('Could not exit fullscreen');
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        // Exited fullscreen - pause and show controls
        setShowControls(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Stop atmosphere on cleanup
      if (atmosphereAudioRef.current) {
        atmosphereAudioRef.current.pause();
      }

    };
  }, []);

  // Hide controls after 3 seconds when playing
  useEffect(() => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      // Show controls when paused
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Tap to toggle play/pause
  const handleScreenTap = useCallback(async (e: React.MouseEvent) => {
    if (showingChapterTitle) return;

    // Don't toggle if clicking on controls or progress bar
    const target = e.target as HTMLElement;
    if (target.closest('.controls-panel') || target.closest('.progress-bar-container')) {
      return;
    }

    if (isComplete) {
      handleRestart();
      return;
    }

    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);

    // If pausing — show controls immediately on the same tap, not after a re-render cycle
    if (!newPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }

    // Enter fullscreen when starting to play
    if (newPlaying && !isFullscreen) {
      await enterFullscreen();
    }
  }, [isComplete, isPlaying, isFullscreen, enterFullscreen, showingChapterTitle]);

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isComplete) {
      handleRestart();
      return;
    }
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);

    // Enter fullscreen when starting to play
    if (newPlaying && !isFullscreen) {
      await enterFullscreen();
    }
  };

  const handleRestart = () => {
    const startPos = { paragraph: 0, word: 0 };
    setPosition(startPos);
    positionRef.current = startPos;
    sentenceCountRef.current = 0;
    wordInChunkRef.current = 0;
    setIsComplete(false);
    setIsPlaying(false);
    setSessionTime(0);
    setWordsReadInSession(0);
    
    // Calculate initial chunk length
    const firstParagraph = parsedText.paragraphs[0];
    let count = 0;
    let sentences = 0;
    for (let i = 0; i < firstParagraph.length; i++) {
      count++;
      if (isSentenceEnd(firstParagraph[i])) {
        sentences++;
        if (sentences >= 3) break;
      }
    }
    setChunkLength(count);
  };

  // Rewind 2 sentences
  const handleRewind = useCallback(() => {
    const currentIndex = getCurrentWordIndex();
    const rewindTo = getRewindPosition(currentIndex, sentenceBoundaries, 2);
    seekToIndex(rewindTo);
  }, [getCurrentWordIndex, sentenceBoundaries, seekToIndex]);

  // Navigate to a specific word index (for chapter navigation)
  const handleChapterNavigate = useCallback((wordIndex: number) => {
    seekToIndex(wordIndex);
    setIsPlaying(false);
  }, [seekToIndex]);

  useEffect(() => {
    // Safety check: ensure parsedText is valid
    if (!parsedText?.paragraphs?.length) return;

    // Calculate initial chunk length on mount (only if no initial progress)
    if (!initialProgress) {
      const firstParagraph = parsedText.paragraphs[0];
      if (firstParagraph?.length) {
        let resetCount = Infinity;
        if (resetInterval === 'end') {
          resetCount = Infinity;
        } else if (resetInterval !== 'paragraph') {
          resetCount = parseInt(resetInterval);
        }
        let count = 0;
        let sentences = 0;
        for (let i = 0; i < firstParagraph.length; i++) {
          count++;
          if (isSentenceEnd(firstParagraph[i])) {
            sentences++;
            if (sentences >= resetCount) break;
          }
        }
        setChunkLength(count);
      }
    }

    // Start playing automatically after a short delay (rhythm is already analyzed synchronously)
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsPlaying(true);
      }
    }, 300); // Faster start since rhythm is instant now
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (chapterTimeoutRef.current) {
        clearTimeout(chapterTimeoutRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Calculate current speed for display
  const displaySpeed = getCurrentSpeed();

  // In focus mode, minimal controls (Back + Eye) are ALWAYS visible
  // so user can exit focus mode any time. Full HUD only when showControls & not focus.
  const isHudVisible = showControls && !focusMode;
  const minimalControlsVisible = focusMode;

  // Error state: if parsedText is invalid, show error and back button
  if (!isValidText) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg text-destructive mb-4">Unable to load text</p>
          <button
            onClick={() => {
              void persistReadingTime(true);
              onBack();
            }}
            className="control-button"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 h-[100dvh] w-screen flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-700 bg-background touch-none z-50"
      onMouseMove={handleMouseMove}
      onClick={handleScreenTap}
    >
      {/* Attribution Splash Overlay */}
      <AnimatePresence>
        {showingAttribution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center p-8 text-center"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
          >
            <div className="max-w-2xl space-y-6">
              <h2 className="text-3xl md:text-5xl font-display uppercase leading-none tracking-wide text-foreground">
                Written by <span className="text-primary">{attribution?.author}</span>
              </h2>
              <p className="text-muted-foreground text-xl font-display tracking-wide uppercase">
                Originally published by {attribution?.source || 'The Conversation'}.
              </p>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mt-8 font-mono">
                {attribution?.source === 'Wikinews'
                  ? 'Republished under CC BY 2.5.'
                  : attribution?.source === 'Global Voices'
                    ? 'Republished under CC BY 3.0.'
                    : 'Republished under CC BY-ND.'} No changes have been made to the text.
              </p>

              {!isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-12 flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Pause className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-primary font-medium">Paused</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mt-2">Tap to read</span>
                </motion.div>
              )}

              {isPlaying && (
                <div className="mt-8 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 animate-pulse">
                  Starting in 2 seconds...
                </div>
              )}
            </div>

            {/* Invisible Tracking Pixel */}
            {attribution?.pixelUrl && (
              <img src={attribution.pixelUrl} alt="" className="w-[1px] h-[1px] opacity-0 absolute pointer-events-none" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Title Overlay */}
      <AnimatePresence>
        {showingChapterTitle && !showingAttribution && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0 z-50 flex items-center justify-center px-8 bg-background"
          >
            <motion.h1
              initial={{ y: 20, filter: 'blur(10px)' }}
              animate={{ y: 0, filter: 'blur(0px)' }}
              className="font-display text-center leading-tight max-w-5xl px-4 text-foreground"
              style={{
                // Keep chapter/section titles readable but not gigantic.
                // Match the reader's base word size (respects the user's text size multiplier) and scale it by 3x.
                fontSize: `calc(3rem * 1.5 * var(--text-size-multiplier, 1))`,
              }}
            >
              {showingChapterTitle}
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap indicator */}
      <AnimatePresence>
        {!isPlaying && !isComplete && showControls && !showingChapterTitle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center z-5 pointer-events-none"
          >
            <motion.div
              className={`w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm ${focusMode
                ? 'bg-white/20 border border-white/30'
                : 'bg-muted/60 border border-border/50'
                }`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Play className={`w-8 h-8 ml-1 ${focusMode ? 'text-white' : 'text-foreground'}`} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word Display */}
      <div className="relative z-10 flex items-center justify-center px-4 sm:px-8 h-[25vh] min-h-[160px]">
        {targetMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Top Anchor - Adjusted for better sight alignment */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[64px] w-0.5 h-10 opacity-90 transition-colors duration-300"
              style={{ backgroundColor: targetColor }}
            />
            {/* Bottom Anchor - Adjusted for better sight alignment */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[24px] w-0.5 h-10 opacity-90 transition-colors duration-300"
              style={{ backgroundColor: targetColor }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!showingChapterTitle && (
            <motion.div
              ref={wordRef}
              key={`${currentParagraph}-${currentWord}`}
              initial={isDragging ? { opacity: 1 } : { opacity: 0 }}
              animate={isDragging 
                ? { opacity: 1 }
                : (targetMode
                  ? { opacity: 1 }
                  : { opacity: isWhisperedWord ? 0.6 : 1 }
                )
              }
              exit={isDragging 
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, transition: { duration: 0.05 } }
              }
              transition={isDragging 
                ? { duration: 0 }
                : (targetMode
                  ? { duration: Math.min(0.15, (currentWordDelayMs / 1000) * 0.3), ease: "easeOut" }
                  : {
                    duration: Math.min(0.2, (currentWordDelayMs / 1000) * 0.4),
                    ease: "easeOut"
                  }
                )
              }
              className={`kinetic-word select-none w-full flex items-center justify-center ${cleanWord.includes('kin-txt') || cleanWord === 'kin-txt'
                ? 'text-foreground'
                : `font-display ${isWhisperedWord && !targetMode ? 'text-muted-foreground/60 italic' : ''}`
                }`}
              style={{
                fontSize: targetMode
                  ? `calc(2.9rem * var(--text-size-multiplier, 1))` // Match normal text size in Target Mode
                  : `calc(${cleanWord.includes('kin-txt') || cleanWord === 'kin-txt' ? '6rem' :
                    isEmphasisWord ? '6rem' :
                      isWhisperedWord ? '2.4rem' : '2.9rem'
                  } * var(--text-size-multiplier, 1))`,
              }}
            >
              {cleanWord.includes('kin-txt') || cleanWord === 'kin-txt' ? (
                // Center the special branding by aligning 'i' to center
                <div className="flex w-full items-center justify-center h-full">
                  <div className="flex-1 text-right whitespace-nowrap">K</div>
                  <div className="text-red-500 shrink-0 min-w-[0.4em] text-center px-[1px]">i</div>
                  <div className="flex-1 text-left whitespace-nowrap">N-TXT</div>
                </div>
              ) : targetMode ? (
                (() => {
                  const safeWord = currentDisplayWord || '';
                  const orpIndex = getORPIndex(safeWord);
                  const prefix = safeWord.substring(0, orpIndex);
                  const focalChar = safeWord[orpIndex] || '';
                  const suffix = safeWord.substring(orpIndex + 1);

                  return (
                    <div className="w-full grid grid-cols-[1fr_auto_1fr] items-baseline">
                      <span className="text-right whitespace-pre">{prefix}</span>
                      <span className="text-center font-bold min-w-[1ch] transition-colors duration-300" style={{ color: targetColor }}>{focalChar}</span>
                      <span className="text-left whitespace-pre">{suffix}</span>
                    </div>
                  );
                })()
              ) : (
                currentDisplayWord
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar - Seekable */}
      <AnimatePresence>
        {isHudVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            ref={progressBarRef}
            className="progress-bar-container absolute left-0 right-0 z-40 flex items-end justify-center px-6 pb-2 cursor-pointer group"
            style={{ bottom: 'env(safe-area-inset-bottom, 20px)' }}
            onMouseDown={handleProgressMouseDown}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsDragging(true);
              setIsPlaying(false);
              handleProgressBarInteraction(e);
            }}
          >
            {/* Track background */}
            <div className="relative w-full h-1.5 bg-muted/30 rounded-full">
              {/* Progress fill */}
              <motion.div
                className="absolute top-0 left-0 h-full bg-foreground rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: isDragging ? 0 : 0.1 }}
              />

              {/* Handle Container - Moves with progress */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `${progress}%` }}
                animate={{ scale: isDragging ? 1.1 : 1 }}
                transition={{ duration: 0.1 }}
              >
                {/* Handle Dot */}
                <div className="w-5 h-5 bg-foreground rounded-full shadow-lg border-2 border-background" />

                {/* Percentage Label - Floating above (Always visible) */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md whitespace-nowrap pointer-events-none shadow-sm">
                  {Math.round(progress)}%
                  {/* Triangle */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-primary/90" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Navigation - uses toolbar button (no floating toggle) */}
      {
        isHudVisible && (
          <ChapterNavigation
            chapters={chapters}
            currentWordIndex={getCurrentWordIndex()}
            totalWords={totalWords}
            isOpen={isNavOpen}
            onToggle={() => setIsNavOpen(!isNavOpen)}
            onNavigate={handleChapterNavigate}
            showToggle={false}
          />
        )
      }

      {/* Controls Overlay */}
      <AnimatePresence>
        {isHudVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            {/* Top-left Controls (aligned) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="pointer-events-auto absolute left-4 flex items-center gap-2 sm:gap-3"
              style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
            >
              {/* Back Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void persistReadingTime(true);
                  onBack();
                }}
                className="toolbar-button"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
              </button>

              {/* Full Text View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setShowFullText(true);
                }}
                className="toolbar-button"
                title="View full text"
              >
                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" />
              </button>

              {/* Chapter Navigation Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setIsNavOpen((v) => !v);
                }}
                className="toolbar-button"
                title="Chapter navigation"
              >
                <svg
                  className="w-4 h-4 sm:w-6 sm:h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>

              {/* Focus Mode Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusMode(!focusMode);
                }}
                className={`toolbar-button transition-all duration-300 ${focusMode ? "ring-2 ring-primary" : ""
                  }`}
                title={focusMode ? "Exit focus mode" : "Focus mode: hide controls for immersive reading"}
              >
                <Eye className={`w-4 h-4 sm:w-6 sm:h-6 ${focusMode ? "text-primary" : ""}`} />
              </button>
            </motion.div>

            {/* Combined Indicators Panel (Speed + Duration) */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto absolute right-16 sm:right-24 flex flex-col items-start gap-4"
              style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
            >
              {/* Speed Indicator */}
              <div className="glass-panel px-2 py-1 sm:px-4 sm:py-2 flex items-center justify-center min-h-[3rem] w-[140px] sm:w-[180px]">
                <span className="text-[10px] sm:text-sm text-muted-foreground mr-1">
                  {rhythmMode ? 'Rhythm: ' : 'Speed: '}
                </span>
                <span className="text-xs sm:text-sm font-medium">{Math.round(displaySpeed * 200)} WPM</span>
              </div>

              {/* Duration Timer */}
              <div className="glass-panel px-3 py-2 flex items-center gap-2 w-[140px] sm:w-[180px]">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="text-xs">
                  <div className="text-muted-foreground whitespace-nowrap">Session: <span className="text-foreground font-medium tabular-nums">{formatTime(sessionTime)}</span></div>
                  <div className="text-muted-foreground whitespace-nowrap">Total: <span className="text-foreground font-medium tabular-nums">{formatTime(totalReadingTime)}</span></div>
                </div>
              </div>
            </motion.div>


            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="controls-panel pointer-events-auto absolute bottom-24 sm:bottom-14 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto"
            >
              <div className="glass-panel p-2 sm:p-4 flex flex-col gap-2 sm:gap-4">
                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-4">
                  {/* Rewind 2 sentences */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRewind();
                    }}
                    className="p-1.5 sm:p-3 rounded-xl hover:bg-secondary transition-colors"
                    title="Rewind 2 sentences"
                  >
                    <Rewind className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 ml-0.5" />
                    )}
                  </button>

                  {/* Restart */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestart();
                    }}
                    className="p-1.5 sm:p-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </button>

                  {/* Divider */}
                  <div className="w-px h-6 sm:h-8 bg-border" />

                  {/* Rhythm Presets - Hidden on very small screens, use settings instead */}
                  <div className="hidden xs:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {(['slower', 'normal', 'faster'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setRhythmPreset(preset);
                          if (!rhythmMode) {
                            setRhythmMode(true);
                          }
                        }}
                        className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[0.65em] sm:text-[0.8em] font-medium transition-colors capitalize ${rhythmMode && rhythmPreset === preset
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary text-muted-foreground'
                          }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Share Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare?.();
                    }}
                    className="p-1.5 sm:p-3 rounded-xl transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
                    title="Share with KiN"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </button>

                  {/* Settings Button */}
                  <Popover open={showSettingsPopover} onOpenChange={setShowSettingsPopover}>
                    <PopoverTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className={`p-1.5 sm:p-3 rounded-xl transition-colors ${showSettingsPopover ? 'bg-secondary' : 'hover:bg-secondary'
                          }`}
                        title="Speed settings"
                      >
                        <Settings className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-72 sm:w-80"
                      side="top"
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                      container={containerRef.current}
                    >
                      <div className="space-y-4">
                        <div className="font-medium text-sm">Speed Settings</div>

                        {/* Mode Toggle */}
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Mode</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setRhythmMode(true);
                                setAccelerationMode(false);
                              }}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${rhythmMode
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80'
                                }`}
                            >
                              Rhythm
                            </button>
                            <button
                              onClick={() => {
                                setRhythmMode(false);
                                setAccelerationMode(true);
                              }}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${!rhythmMode && accelerationMode
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80'
                                }`}
                            >
                              Accelerate
                            </button>
                            <button
                              onClick={() => {
                                setRhythmMode(false);
                                setAccelerationMode(false);
                              }}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${!rhythmMode && !accelerationMode
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80'
                                }`}
                            >
                              Static
                            </button>
                          </div>
                        </div>

                        {/* Rhythm Speed Presets - Only show when rhythm mode is on */}
                        {rhythmMode && (
                          <div className="border-t border-border/50 pt-3 space-y-2">
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Music className="w-3 h-3" />
                              <span>Rhythm Speed</span>
                            </div>
                            <div className="flex gap-1.5">
                              {(['slower', 'normal', 'faster'] as const).map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => setRhythmPreset(preset)}
                                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${rhythmPreset === preset
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                                    }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Target Mode Toggle */}
                        <div className="flex items-center justify-between border-t border-border/50 pt-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Target Mode</span>
                          </div>
                          <button
                            onClick={() => {
                              setTargetMode(!targetMode);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${targetMode ? 'bg-primary' : 'bg-muted'
                              }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${targetMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </button>
                        </div>

                        {/* Target Mode Color Selection - Only show when target mode is on */}
                        {targetMode && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center justify-between pt-2 pb-1 overflow-hidden"
                          >
                            <span className="text-xs text-muted-foreground">Target Color</span>
                            <div className="flex gap-2">
                              {[
                                { name: 'Yellow', color: '#FFD600' },
                                { name: 'Pink', color: '#ff007f' },
                                { name: 'Blue', color: '#0000cd' }
                              ].map((item) => (
                                <button
                                  key={item.color}
                                  onClick={() => setTargetColor(item.color)}
                                  className={`w-5 h-5 rounded-full border-2 transition-all ${targetColor === item.color
                                    ? 'border-foreground scale-110 shadow-sm'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                  style={{ backgroundColor: item.color }}
                                  title={item.name}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* Acceleration Settings - Only show when acceleration mode */}
                        {!rhythmMode && accelerationMode && (
                          <>
                            {/* Speed Sliders */}
                            <div className="space-y-3">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Starting speed</span>
                                  <span className="font-medium tabular-nums">{Math.round(startSpeed * 200)} WPM</span>
                                </div>
                                <input
                                  type="range"
                                  min="40"
                                  max="600"
                                  step="10"
                                  value={Math.round(startSpeed * 200)}
                                  onChange={(e) => setStartSpeed(parseInt(e.target.value) / 200)}
                                  className="speed-slider"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Finishing speed</span>
                                  <span className="font-medium tabular-nums">{Math.round(endSpeed * 200)} WPM</span>
                                </div>
                                <input
                                  type="range"
                                  min="40"
                                  max="600"
                                  step="10"
                                  value={Math.round(endSpeed * 200)}
                                  onChange={(e) => setEndSpeed(parseInt(e.target.value) / 200)}
                                  className="speed-slider"
                                />
                              </div>
                            </div>

                            {/* Reset Interval */}
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground">Reset speed after</div>
                              <div className="flex flex-wrap gap-1.5">
                                {(['1', '2', '3', '4', 'end', 'paragraph'] as const).map((interval) => (
                                  <button
                                    key={interval}
                                    onClick={() => setResetInterval(interval)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${resetInterval === interval
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-secondary hover:bg-secondary/80'
                                      }`}
                                  >
                                    {interval === 'paragraph'
                                      ? 'Paragraph'
                                      : interval === 'end'
                                        ? 'End'
                                        : `${interval} sentence${interval !== '1' ? 's' : ''}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Static Speed - Only show when static mode */}
                        {!rhythmMode && !accelerationMode && !targetMode && (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Speed</span>
                              <span className="font-medium tabular-nums">{Math.round(startSpeed * 200)} WPM</span>
                            </div>
                            <input
                              type="range"
                              min="40"
                              max="600"
                              step="10"
                              value={Math.round(startSpeed * 200)}
                              onChange={(e) => setStartSpeed(parseInt(e.target.value) / 200)}
                              className="speed-slider"
                            />
                          </div>
                        )}

                        {/* Rhythm info - Removed per request */}

                        {/* Text Size */}
                        <div className="border-t border-border pt-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Type className="w-3 h-3" />
                            <span>Text Size</span>
                          </div>
                          <div className="flex gap-1.5">
                            {(['small', 'medium', 'large'] as const).map((size) => (
                              <button
                                key={size}
                                onClick={() => setTextSize(size)}
                                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${textSize === size
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary hover:bg-secondary/80'
                                  }`}
                              >
                                {size.charAt(0).toUpperCase() + size.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Atmosphere Music Presets */}
                  <Popover 
                    open={musicMenuOpen} 
                    onOpenChange={(open) => {
                      if (open && activeAtmosphere !== 'none') {
                        // If music is on, turn it off and don't open the menu
                        setActiveAtmosphere('none');
                        setMusicMenuOpen(false);
                        return;
                      }
                      setMusicMenuOpen(open);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className="hud-icon-button transition-all duration-300"
                        title="Atmosphere Music"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Music
                          className={`w-4 h-4 sm:w-6 sm:h-6 transition-all duration-300 ${activeAtmosphere !== 'none' ? 'text-primary' : 'text-foreground/40'}`}
                          strokeWidth={activeAtmosphere !== 'none' ? 3 : 1.5}
                        />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent className="w-48 bg-card border-border p-2 mb-2" side="top" align="center">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            setActiveAtmosphere('none');
                            setMusicMenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors ${activeAtmosphere === 'none' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                        >
                          <span className="text-sm font-medium">Silent</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveAtmosphere('noir');
                            setMusicMenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors ${activeAtmosphere === 'noir' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                        >
                          <span className="text-sm font-medium">Preset 1</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveAtmosphere('fret');
                            setMusicMenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors ${activeAtmosphere === 'fret' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                        >
                          <span className="text-sm font-medium">Preset 2</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveAtmosphere('fret2');
                            setMusicMenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors ${activeAtmosphere === 'fret2' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                        >
                          <span className="text-sm font-medium">Preset 3</span>
                        </button>


                      </div>
                    </PopoverContent>
                  </Popover>


                  {/* Divider */}
                  <div className="w-px h-6 sm:h-8 bg-border" />

                  {/* Word Counter */}
                  <div className="text-xs sm:text-sm text-muted-foreground min-w-[50px] sm:min-w-[70px] text-center tabular-nums">
                    {getCurrentWordIndex() + 1} / {totalWords}
                  </div>
                </div>

                {/* Mode indicator */}
                <div className="text-center text-[10px] sm:text-xs text-muted-foreground">
                  {rhythmMode ? (
                    <>
                      <Music className="w-3 h-3 inline mr-1" />
                      Rhythm mode ({rhythmPreset})
                    </>
                  ) : accelerationMode ? (
                    <>Accelerating: {startSpeed.toFixed(1)}x → {endSpeed.toFixed(1)}x</>
                  ) : (
                    <>Static: {startSpeed.toFixed(1)}x</>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal Focus HUD (Back + Eye only) */}
      <AnimatePresence>
        {minimalControlsVisible && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto absolute left-4 z-30 flex items-center gap-2 sm:gap-3"
            style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                void persistReadingTime(true);
                onBack();
              }}
              className="p-1.5 sm:p-3 glass-panel hover:bg-card/90 transition-colors"
              title="Back"
            >
              <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setFocusMode(false);
              }}
              className="p-1.5 sm:p-3 glass-panel hover:bg-card/90 transition-all duration-300 ring-2 ring-primary"
              title="Exit focus mode"
            >
              <Eye className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-background/80"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-panel p-6 sm:p-8 text-center mx-4"
            >
              <h2 className="text-2xl sm:text-3xl font-display mb-3 sm:mb-4">Finished</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                {totalWords} words displayed
              </p>
              <div className="flex gap-2 sm:gap-3 justify-center">
                <button onClick={handleRestart} className="control-button-secondary text-sm sm:text-base">
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                  Replay
                </button>
                <button
                  onClick={() => {
                    void persistReadingTime(true);
                    onBack();
                  }}
                  className="control-button text-sm sm:text-base"
                >
                  New Text
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Text View */}
      <AnimatePresence>
        {showFullText && (
          <FullTextView
            parsedText={parsedText}
            currentWordIndex={getCurrentWordIndex()}
            paragraphOffsets={paragraphOffsets}
            totalWords={totalWords}
            onClose={() => setShowFullText(false)}
            onNavigate={(index) => {
              seekToIndex(index);
              setShowFullText(false);
            }}
          />
        )}
      </AnimatePresence>

      <audio
        ref={atmosphereAudioRef}
        loop
        preload="auto"
      />

    </motion.div >
  );
}// v1.0.1
