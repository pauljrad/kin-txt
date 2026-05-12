import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuestion, type QuizQuestion } from '@/lib/quizQuestions';
import { ThemeSelector } from '@/components/ThemeSelector';

// ─── Types ───────────────────────────────────────────────────────
export interface ParsedText {
  title: string;
  paragraphs: string[][];
}

interface KidPlayerProps {
  parsedText: ParsedText;
  onBack: () => void;
}

// ─── Constants ───────────────────────────────────────────────────
const WORDS_PER_QUIZ = 500; // show quiz every N words
const BASE_DELAY_MS  = 300; // 300ms per word at speed 1.0 — then multiplied 1.5x below

// Slower speed multiplier: all presets are 1.5× slower than KiN-TXT
const KID_SPEED_GLOBAL = 1 / 1.5; // ≈ 0.667

// Robust sentence end detection (handles quotes, parentheses, etc)
const isEndOfSentence = (word: string) => /[.!?]["'”)]*$/.test(word);

type SpeedPreset = 'slower' | 'normal' | 'faster';

const SPEED_MULTIPLIERS: Record<SpeedPreset, number> = {
  slower:  0.5   * KID_SPEED_GLOBAL, // very slow
  normal:  1.0   * KID_SPEED_GLOBAL, // comfy
  faster:  1.4   * KID_SPEED_GLOBAL, // still slower than adult KiN-TXT "normal"
};

// ─── Quiz Overlay ────────────────────────────────────────────────
function QuizOverlay({
  question,
  onCorrect,
}: {
  question: QuizQuestion;
  onCorrect: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'wrong' | 'correct'>('idle');

  const handleAnswer = (idx: number) => {
    if (state === 'correct') return;
    setSelected(idx);
    if (idx === question.correctIndex) {
      setState('correct');
      setTimeout(onCorrect, 1800);
    } else {
      setState('wrong');
      setTimeout(() => { setState('idle'); setSelected(null); }, 1200);
    }
  };

  return (
    <div className="quiz-overlay">
      <motion.div
        className="quiz-card bounce-in"
        initial={false}
      >
        {state === 'correct' ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: 'center', padding: '20px 0' }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '12px' }} className="star-pop">Star</div>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2rem', fontWeight: 900, color: 'var(--correct)' }}>
              Well done!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '8px' }}>
              Get ready to keep reading…
            </p>
          </motion.div>
        ) : (
          <>
            {state === 'wrong' && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'color-mix(in srgb, var(--wrong) 14%, var(--bg))',
                  color: 'var(--wrong)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  marginBottom: '16px',
                  border: '2px solid var(--wrong)',
                }}
              >
                Not quite! Please try again
              </motion.p>
            )}

            <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}>Question</div>
            <h2 style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: '22px',
              lineHeight: 1.3,
            }}>
              {question.question}
            </h2>

            {question.options.map((opt, i) => {
              let cls = 'quiz-option';
              if (selected === i) {
                cls += state === 'wrong' ? ' wrong' : '';
              }
              return (
                <button key={i} className={cls} onClick={() => handleAnswer(i)}>
                  <span style={{ fontWeight: 900, marginRight: '10px', opacity: 0.5 }}>
                    {['A', 'B', 'C', 'D'][i]}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Player ─────────────────────────────────────────────────
export function KidKineticPlayer({ parsedText, onBack }: KidPlayerProps) {
  const allWords = useMemo(() => parsedText.paragraphs.flat(), [parsedText.paragraphs]);
  const totalWords = allWords.length;

  const storageKey = `kid_progress_${parsedText.title.replace(/\s+/g, '_')}`;

  const [wordIndex, setWordIndex] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [preset, setPreset] = useState<SpeedPreset>('normal');
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0); 
  const [pendingQuizMilestone, setPendingQuizMilestone] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordIndexRef = useRef(wordIndex);
  const presetRef = useRef(preset);

  useEffect(() => { 
    wordIndexRef.current = wordIndex; 
    localStorage.setItem(storageKey, wordIndex.toString());
  }, [wordIndex, storageKey]);
  
  useEffect(() => { presetRef.current = preset; }, [preset]);

  const currentWord = allWords[wordIndex] ?? '';
  const progress = totalWords > 0 ? (wordIndex / totalWords) * 100 : 0;

  // ── Advance word ──────────────────────────────────────────────
  const advance = useCallback(() => {
    const idx = wordIndexRef.current;

    if (idx >= allWords.length - 1) {
      setIsComplete(true);
      setIsPlaying(false);
      return;
    }

    const next = idx + 1;
    setWordIndex(next);
    wordIndexRef.current = next;
  }, [allWords.length]);

  // Manage quiz triggers based on absolute word progress
  useEffect(() => {
    // If we passed the next 500-word milestone, set a pending quiz for that index
    const milestoneIndex = Math.floor(wordIndex / WORDS_PER_QUIZ);
    if (milestoneIndex > quizIndex && pendingQuizMilestone !== milestoneIndex && !showQuiz) {
      setPendingQuizMilestone(milestoneIndex);
    }

    // If we backed out past our current passed milestone index, rewind the counter
    if (wordIndex < quizIndex * WORDS_PER_QUIZ) {
      setQuizIndex(q => Math.max(0, q - 1));
      setPendingQuizMilestone(null);
    }
  }, [wordIndex, quizIndex, pendingQuizMilestone, showQuiz]);

  // Handle pending quizzes at sentence bounds
  useEffect(() => {
    if (pendingQuizMilestone === null || !isPlaying || showQuiz) return;
    
    // Check if the current word ends a sentence
    const word = allWords[wordIndex] ?? '';
    if (isEndOfSentence(word)) {
      setIsPlaying(false);
      setShowQuiz(true);
      setPendingQuizMilestone(null);
    }
  }, [wordIndex, pendingQuizMilestone, isPlaying, showQuiz, allWords]);

  // ── Playback loop ─────────────────────────────────────────────
  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const word = allWords[wordIndexRef.current] ?? '';
    const speed = SPEED_MULTIPLIERS[presetRef.current];
    // Rough heuristic: longer words get a bit more time
    const lenFactor = Math.max(1, word.length / 5);
    const delay = (BASE_DELAY_MS / speed) * (isEndOfSentence(word) ? 1.8 : word.includes(',') ? 1.2 : lenFactor > 1.5 ? 1.15 : 1.0);
    const finalDelay = Math.max(120, Math.min(1800, delay));
    timeoutRef.current = setTimeout(() => {
      advance();
      if (!showQuiz) scheduleNext();
    }, finalDelay);
  }, [allWords, advance, showQuiz]);

  useEffect(() => {
    if (isPlaying && !showQuiz) {
      scheduleNext();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, showQuiz, scheduleNext]);

  const togglePlay = () => {
    if (isComplete) return;
    setIsPlaying(p => !p);
  };

  const handleQuizCorrect = () => {
    setShowQuiz(false);
    setQuizIndex(q => q + 1);
    // small delay before auto-resuming
    setTimeout(() => setIsPlaying(true), 600);
  };

  // ── Render ────────────────────────────────────────────────────
  const orp = Math.ceil(currentWord.length * 0.35) - 1;
  const before = currentWord.slice(0, orp);
  const focus = currentWord.slice(orp, orp + 1);
  const after = currentWord.slice(orp + 1);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--reader-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Quiz overlay ── */}
      <AnimatePresence>
        {showQuiz && (
          <QuizOverlay
            question={getQuestion(quizIndex)}
            onCorrect={handleQuizCorrect}
          />
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '2px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <button onClick={onBack} className="kid-btn kid-btn-ghost" style={{ padding: '8px 14px', fontSize: '0.9rem' }}>
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ flexShrink: 0 }}>
          <ThemeSelector />
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: '6px', background: 'var(--border)' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--accent)',
          transition: 'width 0.3s ease',
          borderRadius: '0 99px 99px 0',
        }} />
      </div>

      {/* ── Word display ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}>
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>Finished!</div>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2rem', fontWeight: 900, color: 'var(--text)' }}>
              Amazing work!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '12px' }}>
              You've read the whole book!
            </p>
            <button onClick={onBack} className="kid-btn kid-btn-primary" style={{ marginTop: '28px' }}>
              ← Back to Library
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={wordIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.08 }}
              style={{ textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr auto 1fr', 
                alignItems: 'baseline',
                fontSize: 'clamp(3rem, 12vw, 6.5rem)'
              }}>
                <span className="kid-word" style={{ textAlign: 'right' }}>{before}</span>
                <span className="kid-word" style={{ color: 'var(--accent)', fontWeight: 900 }}>{focus}</span>
                <span className="kid-word" style={{ textAlign: 'left' }}>{after}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Controls ── */}
      {!isComplete && (
        <div style={{
          padding: '20px 24px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
          borderTop: '2px solid var(--border)',
          background: 'var(--bg-card)',
        }}>
          {/* Speed presets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', width: '100%', maxWidth: '380px', justifyItems: 'center' }}>
            {/* Slower */}
            <button
              onClick={() => setPreset('slower')}
              className="kid-btn"
              style={{
                justifySelf: 'end',
                padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700,
                background: preset === 'slower' ? 'var(--accent)' : 'var(--bg)',
                color: preset === 'slower' ? 'var(--accent-text)' : 'var(--text-muted)',
                border: `2.5px solid ${preset === 'slower' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              Slow
            </button>
            
            {/* Normal */}
            <button
              onClick={() => setPreset('normal')}
              className="kid-btn"
              style={{
                padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700,
                background: preset === 'normal' ? 'var(--accent)' : 'var(--bg)',
                color: preset === 'normal' ? 'var(--accent-text)' : 'var(--text-muted)',
                border: `2.5px solid ${preset === 'normal' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              Normal
            </button>

            {/* Faster */}
            <button
              onClick={() => setPreset('faster')}
              className="kid-btn"
              style={{
                justifySelf: 'start',
                padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700,
                background: preset === 'faster' ? 'var(--accent)' : 'var(--bg)',
                color: preset === 'faster' ? 'var(--accent-text)' : 'var(--text-muted)',
                border: `2.5px solid ${preset === 'faster' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              Fast
            </button>
          </div>

          {/* Play/Pause Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%', maxWidth: '380px' }}>
            
            <div style={{ justifySelf: 'end', paddingRight: '24px' }}>
              {/* Rewind */}
              <button
                onClick={() => {
                  setWordIndex(i => Math.max(0, i - 10));
                }}
                className="kid-btn kid-btn-ghost"
                style={{ width: '80px', height: '60px', borderRadius: '30px', fontSize: '1.1rem', padding: 0, flexDirection: 'column', gap: '2px' }}
              >
                <span style={{ fontSize: '1.4rem' }}>↺</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 800 }}>Back</span>
              </button>
            </div>

            {/* Play/Pause */}
            <div style={{ justifySelf: 'center' }}>
              <button
                onClick={togglePlay}
                className="kid-btn kid-btn-primary"
                style={{ width: '120px', height: '80px', borderRadius: '40px', fontSize: '1.4rem', padding: 0 }}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
            
            <div style={{ justifySelf: 'start', paddingLeft: '24px' }}>
              {/* Restart */}
              <button
                onClick={() => {
                  setWordIndex(0);
                  setQuizIndex(0);
                  setIsComplete(false);
                  setIsPlaying(false);
                }}
                className="kid-btn kid-btn-ghost"
                style={{ width: '80px', height: '60px', borderRadius: '30px', fontSize: '1.1rem', padding: 0, flexDirection: 'column', gap: '2px' }}
              >
                <span style={{ fontSize: '1.4rem' }}>↻</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 800 }}>Restart</span>
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Word {wordIndex + 1} of {totalWords}
          </p>
        </div>
      )}
    </div>
  );
}
