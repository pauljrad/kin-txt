import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronLeft, Rewind, BookOpen, Clock, Music, Settings, Focus, Eye, Type } from 'lucide-react';
import { ParsedText, getWordDelay } from '@/lib/textParser';
import { detectChapters, findSentenceBoundaries, getRewindPosition, Chapter } from '@/lib/chapterParser';
import { updateDocumentReadingTime as updateLocalReadingTime } from '@/lib/documentStorage';
import { updateDocumentReadingTime as updateDbReadingTime } from '@/lib/documentDatabase';
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
}

export function KineticPlayer({
  parsedText,
  documentId,
  initialProgress,
  emphasisWords = [],
  whisperedWords = [],
  initialTotalReadingTime = 0,
  onBack,
  onProgressChange
}: KineticPlayerProps) {
  const { textSize, setTextSize } = useTextSize();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentParagraph, setCurrentParagraph] = useState(initialProgress?.paragraph || 0);
  const [currentWord, setCurrentWord] = useState(initialProgress?.word || 0);
  const [startSpeed, setStartSpeed] = useState(0.5);
  const [endSpeed, setEndSpeed] = useState(1.4);
  const [showControls, setShowControls] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [sentenceCount, setSentenceCount] = useState(0);
  const [wordInChunk, setWordInChunk] = useState(0);
  const [chunkLength, setChunkLength] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [totalReadingTime, setTotalReadingTime] = useState(initialTotalReadingTime);
  const [currentWordDelayMs, setCurrentWordDelayMs] = useState(300);
  const [rhythmMode, setRhythmMode] = useState(true); // Start enabled by default
  const [rhythmSpeeds, setRhythmSpeeds] = useState<WordSpeed[]>([]);
  const [rhythmPreset, setRhythmPreset] = useState<'slower' | 'normal' | 'faster'>('normal');
  const [accelerationMode, setAccelerationMode] = useState(false); // start-slow-get-faster mode
  const [adaptiveSpeed, setAdaptiveSpeed] = useState(true); // Adaptive speed that increases as user reads
  const [wordsReadInSession, setWordsReadInSession] = useState(0); // Track words read for adaptive mode
  const [resetInterval, setResetInterval] = useState<'start' | '1' | '2' | '3' | '4' | 'end' | 'paragraph'>('3'); // Sentence count for reset
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showingChapterTitle, setShowingChapterTitle] = useState<string | null>(null);
  const [lastChapterIndex, setLastChapterIndex] = useState(-1);
  const [focusMode, setFocusMode] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chapterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const totalReadingTimeRef = useRef<number>(initialTotalReadingTime);

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

  const allWords = parsedText.paragraphs.flat();
  const totalWords = allWords.length;

  // Detect chapters and sentence boundaries
  const chapters = useMemo(() => detectChapters(parsedText), [parsedText]);
  const sentenceBoundaries = useMemo(() => findSentenceBoundaries(parsedText), [parsedText]);

  // Create sets for quick lookup (lowercase for comparison)
  const emphasisSet = useMemo(
    () => new Set(emphasisWords.map((w) => w.toLowerCase().replace(/[.,!?;:]/g, ''))),
    [emphasisWords]
  );
  const whisperedSet = useMemo(
    () => new Set(whisperedWords.map((w) => w.toLowerCase().replace(/[.,!?;:]/g, ''))),
    [whisperedWords]
  );

  // Create a set for words that are in ALL CAPS (for direct case-sensitive matching)
  const allCapsSet = useMemo(
    () => new Set(
      parsedText.paragraphs.flat().filter((word) => {
        const cleanWord = word.replace(/[.,!?;:""'""']/g, '');
        return cleanWord.length >= 3 && /^[A-Z]+$/.test(cleanWord);
      }).map((w) => w.toLowerCase().replace(/[.,!?;:]/g, ''))
    ),
    [parsedText.paragraphs]
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
    let index = 0;
    for (let i = 0; i < currentParagraph; i++) {
      index += parsedText.paragraphs[i].length;
    }
    return index + currentWord;
  }, [currentParagraph, currentWord, parsedText.paragraphs]);

  const progress = totalWords > 0 ? (getCurrentWordIndex() / totalWords) * 100 : 0;

  // Safely get current word with fallback
  const currentDisplayWord = parsedText.paragraphs[currentParagraph]?.[currentWord] ?? '';

  // Early return check if parsedText is invalid
  const isValidText = parsedText?.paragraphs?.length > 0;

  // Check if current word should be emphasized or whispered
  const cleanWord = currentDisplayWord.toLowerCase().replace(/[.,!?;:]/g, '');
  const isEmphasisWord = emphasisSet.has(cleanWord) || allCapsSet.has(cleanWord);
  const isWhisperedWord = whisperedSet.has(cleanWord);

  // Calculate horizontal squash for emphasis words that might overflow
  const wordRef = useRef<HTMLSpanElement>(null);
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
        baseMultiplier = 0.75; // ~150 WPM peak (after ramp) - original speed
        break;
      case 'faster':
        baseMultiplier = 1.05; // ~210 WPM peak (after ramp) - original speed
        break;
      default:
        baseMultiplier = 0.90; // ~180 WPM peak (after ramp) - original speed
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
      const words = parsedText.paragraphs.flat();
      const speeds = generateLocalRhythm(words);
      setRhythmSpeeds(speeds);
    }
  }, [parsedText, rhythmSpeeds.length, generateLocalRhythm]);

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
      if (chunkLength <= 1) {
        return Number.isFinite(startSpeed) && startSpeed > 0 ? startSpeed : DEFAULT_SPEED;
      }
      const progressInChunk = wordInChunk / Math.max(1, chunkLength - 1);
      // Linear interpolation between start and end speed
      const speed = startSpeed + (endSpeed - startSpeed) * progressInChunk;
      return Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_SPEED;
    }

    // Default static speed (use startSpeed as the base)
    return Number.isFinite(startSpeed) && startSpeed > 0 ? startSpeed : DEFAULT_SPEED;
  }, [rhythmMode, rhythmSpeeds.length, rhythmSpeedMap, getCurrentWordIndex, rhythmMultiplier, accelerationMode, wordInChunk, chunkLength, startSpeed, endSpeed]);

  // Save progress when it changes
  useEffect(() => {
    if (documentId && onProgressChange) {
      onProgressChange(currentParagraph, currentWord);
    }
  }, [currentParagraph, currentWord, documentId, onProgressChange]);

  // Seek to a specific word index
  const seekToIndex = useCallback((targetIndex: number) => {
    let remaining = targetIndex;
    let para = 0;
    let word = 0;

    for (let i = 0; i < parsedText.paragraphs.length; i++) {
      const paraLength = parsedText.paragraphs[i].length;
      if (remaining < paraLength) {
        para = i;
        word = remaining;
        break;
      }
      remaining -= paraLength;
      para = i;
      word = parsedText.paragraphs[i].length - 1;
    }

    setCurrentParagraph(para);
    setCurrentWord(word);
    setSentenceCount(0);
    setWordInChunk(0);
    setIsComplete(false);

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
  }, [parsedText.paragraphs]);

  // Handle progress bar click/drag
  const handleProgressBarInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
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
    // Safety checks: ensure we have valid data before advancing
    if (!parsedText?.paragraphs?.length) return;

    const paragraphsLength = parsedText.paragraphs.length;
    if (currentParagraph >= paragraphsLength) return;

    const currentParagraphWords = parsedText.paragraphs[currentParagraph];
    if (!currentParagraphWords?.length) return;

    const currentParagraphLength = currentParagraphWords.length;
    if (currentWord >= currentParagraphLength) return;

    const word = currentParagraphWords[currentWord];
    if (!word) return;

    // Check if this word ends a sentence
    let newSentenceCount = sentenceCount;
    if (isSentenceEnd(word)) {
      newSentenceCount = sentenceCount + 1;
    }

    // Determine reset count based on interval setting
    // 'start' = never reset (always start speed), 'end' = never reset (always accelerate), 'paragraph' = infinite
    let resetCount = Infinity;
    if (resetInterval === 'end') {
      resetCount = Infinity; // Never reset, accelerate to end
    } else if (resetInterval === 'start') {
      resetCount = 0; // Always reset (always start speed)
    } else if (resetInterval !== 'paragraph') {
      resetCount = parseInt(resetInterval);
    }

    if (currentWord < currentParagraphLength - 1) {
      // Reset speed after configured number of sentences
      if (accelerationMode && newSentenceCount >= resetCount && isSentenceEnd(word)) {
        setSentenceCount(0);
        setWordInChunk(0);
        // Calculate chunk length for next sentences
        let count = 0;
        let sentences = 0;
        for (let i = currentWord + 1; i < currentParagraphLength; i++) {
          count++;
          if (isSentenceEnd(currentParagraphWords[i])) {
            sentences++;
            if (sentences >= resetCount) break;
          }
        }
        setChunkLength(count);
      } else {
        setSentenceCount(newSentenceCount);
        setWordInChunk(prev => prev + 1);
      }
      setCurrentWord(prev => prev + 1);
      // Track words for adaptive speed
      setWordsReadInSession(prev => prev + 1);
    } else if (currentParagraph < paragraphsLength - 1) {
      // Move to next paragraph
      const nextPara = currentParagraph + 1;

      // Check if entering a new chapter - find any chapter that starts at nextPara
      // and that we haven't shown yet (index > lastChapterIndex)
      let enteringChapterIndex = -1;
      for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].startParagraph === nextPara && i > lastChapterIndex) {
          enteringChapterIndex = i;
          break;
        }
      }

      if (enteringChapterIndex >= 0) {
        const enteringChapter = chapters[enteringChapterIndex];

        // Show chapter title for 3 seconds
        setIsPlaying(false);
        setShowingChapterTitle(enteringChapter.title);
        setLastChapterIndex(enteringChapterIndex);

        // Clear any existing chapter timeout
        if (chapterTimeoutRef.current) {
          clearTimeout(chapterTimeoutRef.current);
        }

        chapterTimeoutRef.current = setTimeout(() => {
          setShowingChapterTitle(null);
          setCurrentParagraph(nextPara);
          setCurrentWord(0);
          setSentenceCount(0);
          setWordInChunk(0);
          // Partial reset for adaptive - keep some momentum but slow down for new chapter
          setWordsReadInSession(prev => Math.floor(prev * 0.5));

          // Calculate chunk length for first sentences of next paragraph
          const nextParagraph = parsedText.paragraphs[nextPara];
          let resetCount = Infinity;
          if (resetInterval === 'end') {
            resetCount = Infinity;
          } else if (resetInterval === 'start') {
            resetCount = 0;
          } else if (resetInterval !== 'paragraph') {
            resetCount = parseInt(resetInterval);
          }
          let count = 0;
          let sentences = 0;
          for (let i = 0; i < nextParagraph.length; i++) {
            count++;
            if (isSentenceEnd(nextParagraph[i])) {
              sentences++;
              if (sentences >= resetCount) break;
            }
          }
          setChunkLength(count);
          setIsPlaying(true);
        }, 3000);
      } else {
        // Normal paragraph transition
        setCurrentParagraph(nextPara);
        setCurrentWord(0);
        setSentenceCount(0);
        setWordInChunk(0);

        // Calculate chunk length for first sentences of next paragraph
        const nextParagraph = parsedText.paragraphs[nextPara];
        let resetCount = Infinity;
        if (resetInterval === 'end') {
          resetCount = Infinity;
        } else if (resetInterval === 'start') {
          resetCount = 0;
        } else if (resetInterval !== 'paragraph') {
          resetCount = parseInt(resetInterval);
        }
        let count = 0;
        let sentences = 0;
        for (let i = 0; i < nextParagraph.length; i++) {
          count++;
          if (isSentenceEnd(nextParagraph[i])) {
            sentences++;
            if (sentences >= resetCount) break;
          }
        }
        setChunkLength(count);
      }
    } else {
      // Finished
      setIsPlaying(false);
      setIsComplete(true);
    }
  }, [currentParagraph, currentWord, parsedText.paragraphs, sentenceCount, chapters, lastChapterIndex, getCurrentWordIndex, resetInterval, accelerationMode, adaptiveSpeed]);

  useEffect(() => {
    // Clear any existing timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only play if playing, not complete, and no overlays are showing
    if (!isPlaying || isComplete || showFullText || isNavOpen || showingChapterTitle) return;

    const para = parsedText.paragraphs[currentParagraph];
    if (!para) return;

    const word = para[currentWord];
    if (!word) return;

    // Get current speed based on paragraph progress or rhythm
    const currentSpeed = getCurrentSpeed();

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
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
    setCurrentParagraph(0);
    setCurrentWord(0);
    setSentenceCount(0);
    setWordInChunk(0);
    setIsPlaying(false);
    setIsComplete(false);
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
        } else if (resetInterval === 'start') {
          resetCount = 0;
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
  const hudVisible = showControls && !focusMode;
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
      className={`fixed inset-0 flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-700 ${focusMode
        ? 'focus-mode-bg'
        : 'bg-background'
        }`}
      onMouseMove={handleMouseMove}
      onClick={handleScreenTap}
    >
      {/* Focus mode vignette overlay */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 focus-mode-vignette pointer-events-none z-0"
          />
        )}
      </AnimatePresence>
      {/* Chapter Title Overlay */}
      <AnimatePresence>
        {showingChapterTitle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className={`absolute inset-0 z-50 flex items-center justify-center px-8 ${focusMode ? 'focus-mode-bg' : 'bg-background'
              }`}
          >
            <motion.h1
              initial={{ y: 20, filter: 'blur(10px)' }}
              animate={{ y: 0, filter: 'blur(0px)' }}
              className={`font-display text-center leading-tight max-w-5xl px-4 ${focusMode ? 'text-white focus-word-glow' : 'text-foreground'
                }`}
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
      <div className="relative z-10 flex items-center justify-center px-4 sm:px-8">
        <AnimatePresence mode="wait">
          {!showingChapterTitle && (
            <motion.span
              ref={wordRef}
              key={`${currentParagraph}-${currentWord}`}
              initial={{
                opacity: 0,
                scaleX: isEmphasisWord ? 0.5 * emphasisScaleX : isWhisperedWord ? 1.0 : 0.8,
                scaleY: isEmphasisWord ? 0.5 : isWhisperedWord ? 1.0 : 0.8,
                y: 30,
                filter: 'blur(8px)'
              }}
              animate={{
                opacity: isWhisperedWord ? 0.5 : 1,
                scaleX: isEmphasisWord ? 2.5 * emphasisScaleX : isWhisperedWord ? 0.85 : 1,
                scaleY: isEmphasisWord ? 2.5 : isWhisperedWord ? 0.85 : 1,
                y: 0,
                filter: 'blur(0px)'
              }}
              exit={{
                opacity: 0,
                scaleX: 0.9,
                scaleY: 0.9,
                y: -30,
                filter: 'blur(4px)'
              }}
              transition={{
                // Drive animation duration from the actual per-word delay.
                // Use a fraction of the delay so there's still time for the word to "sit" on screen.
                duration: (() => {
                  const base = Math.max(0.12, Math.min(0.32, (currentWordDelayMs / 1000) * 0.35));
                  if (isEmphasisWord) return Math.min(0.4, base * 1.25);
                  if (isWhisperedWord) return Math.max(0.14, base * 0.9);
                  return base;
                })(),
                ease: [0.34, 1.56, 0.64, 1],
                filter: { duration: 0.2 }
              }}
              className={`kinetic-word text-center select-none ${cleanWord.includes('kin-txt')
                  ? 'text-foreground' // Ensure it's not faded/colored weirdly
                  : `font-display ${isWhisperedWord ? 'text-muted-foreground/60 italic' : focusMode ? 'text-white focus-word-glow' : ''}`
                } ${isEmphasisWord && focusMode ? 'focus-word-glow' : ''}`}
              style={{
                fontSize: `calc(${cleanWord.includes('kin-txt') ? '5rem' : // FORCE VERY large size for KiN-TXT
                    isEmphasisWord ? '4rem' :
                      isWhisperedWord ? '1.5rem' : '3rem'
                  } * var(--text-size-multiplier, 1))`,
              }}
            >
              {cleanWord.includes('kin-txt') ? (
                // Force explicit casing rendering with standard font to avoid small-caps issues
                <span className="font-sans font-black tracking-tight">K<span style={{ fontSize: '0.8em', textTransform: 'lowercase' }}>i</span>N-TXT</span>
              ) : (
                currentDisplayWord
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Reading Time Display - positioned below the speed indicator */}
      <AnimatePresence>
        {hudVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 sm:top-20 right-4 glass-panel px-3 py-2 flex items-center gap-2 z-20"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div className="text-xs">
              <div className="text-muted-foreground">Session: <span className="text-foreground font-medium tabular-nums">{formatTime(sessionTime)}</span></div>
              <div className="text-muted-foreground">Total: <span className="text-foreground font-medium tabular-nums">{formatTime(totalReadingTime)}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar - Seekable */}
      <AnimatePresence>
        {hudVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            ref={progressBarRef}
            className="progress-bar-container absolute bottom-0 left-0 right-0 h-8 sm:h-6 bg-muted/20 cursor-pointer group flex items-center"
            onMouseDown={handleProgressMouseDown}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsDragging(true);
              setIsPlaying(false);
              handleProgressBarInteraction(e);
            }}
          >
            {/* Progress fill */}
            <motion.div
              className="absolute top-0 left-0 h-full bg-foreground/20"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: isDragging ? 0 : 0.1 }}
            />

            {/* Drag handle */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 bg-foreground rounded-full shadow-lg cursor-grab active:cursor-grabbing"
              style={{ left: `calc(${progress}% - 10px)` }}
              animate={{ scale: isDragging ? 1.2 : 1 }}
            />

            {/* Percentage label */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground tabular-nums">
              {Math.round(progress)}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Navigation - uses toolbar button (no floating toggle) */}
      {hudVisible && (
        <ChapterNavigation
          chapters={chapters}
          currentWordIndex={getCurrentWordIndex()}
          totalWords={totalWords}
          isOpen={isNavOpen}
          onToggle={() => setIsNavOpen(!isNavOpen)}
          onNavigate={handleChapterNavigate}
          showToggle={false}
        />
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {hudVisible && (
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
              className="pointer-events-auto absolute top-4 left-4 flex items-center gap-2 sm:gap-3"
            >
              {/* Back Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void persistReadingTime(true);
                  onBack();
                }}
                className="p-2 sm:p-3 glass-panel hover:bg-card/90 transition-colors"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Full Text View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setShowFullText(true);
                }}
                className="p-2 sm:p-3 glass-panel hover:bg-card/90 transition-colors"
                title="View full text"
              >
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Chapter Navigation Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setIsNavOpen((v) => !v);
                }}
                className="p-2 sm:p-3 glass-panel hover:bg-card/90 transition-colors"
                title="Chapter navigation"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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
                className={`p-2 sm:p-3 glass-panel hover:bg-card/90 transition-all duration-300 ${focusMode ? "ring-2 ring-primary" : ""
                  }`}
                title={focusMode ? "Exit focus mode" : "Focus mode: hide controls for immersive reading"}
              >
                <Eye className={`w-5 h-5 sm:w-6 sm:h-6 ${focusMode ? "text-primary" : ""}`} />
              </button>
            </motion.div>

            {/* Current Speed Indicator */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pointer-events-none absolute top-4 right-20 sm:right-24 glass-panel px-3 py-1.5 sm:px-4 sm:py-2"
            >
              <span className="text-xs sm:text-sm text-muted-foreground">
                {rhythmMode ? 'Rhythm: ' : 'Speed: '}
              </span>
              <span className="text-xs sm:text-sm font-medium">{displaySpeed.toFixed(1)}x</span>
            </motion.div>


            {/* Bottom Controls */}
            {hudVisible && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="controls-panel pointer-events-auto absolute bottom-12 sm:bottom-10 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto"
              >
                <div className="glass-panel p-3 sm:p-4 flex flex-col gap-3 sm:gap-4">
                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-2 sm:gap-4">
                    {/* Rewind 2 sentences */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRewind();
                      }}
                      className="p-2 sm:p-3 rounded-xl hover:bg-secondary transition-colors"
                      title="Rewind 2 sentences"
                    >
                      <Rewind className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Play/Pause */}
                    <button
                      onClick={handlePlayPause}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                      )}
                    </button>

                    {/* Restart */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestart();
                      }}
                      className="p-2 sm:p-3 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 sm:h-8 bg-border" />

                    {/* Rhythm Presets */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {(['slower', 'normal', 'faster'] as const).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setRhythmPreset(preset);
                            if (!rhythmMode) {
                              setRhythmMode(true);
                            }
                          }}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[0.7em] sm:text-[0.8em] font-medium transition-colors capitalize ${rhythmMode && rhythmPreset === preset
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary text-muted-foreground'
                            }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Settings Button */}
                    <Popover open={showSettingsPopover} onOpenChange={setShowSettingsPopover}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={`p-2 sm:p-3 rounded-xl transition-colors ${showSettingsPopover ? 'bg-secondary' : 'hover:bg-secondary'
                            }`}
                          title="Speed settings"
                        >
                          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72 sm:w-80"
                        side="top"
                        align="end"
                        onClick={(e) => e.stopPropagation()}
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
                                <Music className="w-3 h-3" />
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

                          {/* Acceleration Settings - Only show when acceleration mode */}
                          {!rhythmMode && accelerationMode && (
                            <>
                              {/* Speed Sliders */}
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Starting speed</span>
                                    <span className="font-medium tabular-nums">{startSpeed.toFixed(1)}x</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.2"
                                    max="3"
                                    step="0.1"
                                    value={startSpeed}
                                    onChange={(e) => setStartSpeed(parseFloat(e.target.value))}
                                    className="speed-slider"
                                  />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Finishing speed</span>
                                    <span className="font-medium tabular-nums">{endSpeed.toFixed(1)}x</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.2"
                                    max="3"
                                    step="0.1"
                                    value={endSpeed}
                                    onChange={(e) => setEndSpeed(parseFloat(e.target.value))}
                                    className="speed-slider"
                                  />
                                </div>
                              </div>

                              {/* Reset Interval */}
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Reset speed after</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(['start', '1', '2', '3', '4', 'end', 'paragraph'] as const).map((interval) => (
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
                                        : interval === 'start'
                                          ? 'Start'
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
                          {!rhythmMode && !accelerationMode && (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Speed</span>
                                <span className="font-medium tabular-nums">{startSpeed.toFixed(1)}x</span>
                              </div>
                              <input
                                type="range"
                                min="0.2"
                                max="3"
                                step="0.1"
                                value={startSpeed}
                                onChange={(e) => setStartSpeed(parseFloat(e.target.value))}
                                className="speed-slider"
                              />
                            </div>
                          )}

                          {/* Rhythm info */}
                          {rhythmMode && (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              <Music className="w-3 h-3 inline mr-1" />
                              Following the writer's intended pace
                            </div>
                          )}

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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal Focus HUD (Back + Eye only) */}
      <AnimatePresence>
        {minimalControlsVisible && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pointer-events-auto absolute top-4 left-4 z-30 flex items-center gap-2 sm:gap-3"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                void persistReadingTime(true);
                onBack();
              }}
              className="p-2 sm:p-3 glass-panel hover:bg-card/90 transition-colors"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setFocusMode(false);
              }}
              className="p-2 sm:p-3 glass-panel hover:bg-card/90 transition-all duration-300 ring-2 ring-primary"
              title="Exit focus mode"
            >
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
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
            onClose={() => setShowFullText(false)}
            onNavigate={(index) => {
              seekToIndex(index);
              setShowFullText(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}