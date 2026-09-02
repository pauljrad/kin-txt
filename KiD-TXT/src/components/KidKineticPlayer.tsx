import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuestion, type QuizQuestion } from '@/lib/quizQuestions';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useKidAuth } from '@/hooks/useKidAuth';
import { speakWord, speakSentence, stopSpeaking, speechAvailable } from '@/lib/speech';
import {
  READING_BANDS, READING_SKILLS, isStatutoryWord, statutoryWordsIn,
  wcpmToDelayMs, normaliseWord,
} from '@/lib/curriculum';
import {
  loadProgress, recordAnswer, recordReading, recordCompletion,
  COINS_PER_CORRECT, COINS_PER_TEXT, type Progress,
} from '@/lib/progress';

// ─── Types ───────────────────────────────────────────────────────
export interface ParsedText {
  id: string;
  title: string;
  paragraphs: string[][];
}

interface KidPlayerProps {
  parsedText: ParsedText;
  onBack: () => void;
}

// Robust sentence end detection (handles quotes, parentheses, etc)
const isEndOfSentence = (word: string) => /[.!?]["'”)]*$/.test(word);

// ─── Quiz Overlay ────────────────────────────────────────────────
function QuizOverlay({
  question,
  onCorrect,
  onAnswer,
}: {
  question: QuizQuestion;
  onCorrect: () => void;
  onAnswer: (correct: boolean, firstTry: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'wrong' | 'correct'>('idle');
  const [attempted, setAttempted] = useState(false);
  const skill = READING_SKILLS[question.skill];

  const handleAnswer = (idx: number) => {
    if (state === 'correct') return;
    const firstTry = !attempted;
    setAttempted(true);
    setSelected(idx);

    const correct = idx === question.correctIndex;
    onAnswer(correct, firstTry);

    if (correct) {
      setState('correct');
      setTimeout(onCorrect, 2100);
    } else {
      setState('wrong');
      setTimeout(() => { setState('idle'); setSelected(null); }, 1200);
    }
  };

  return (
    <div className="quiz-overlay">
      <motion.div className="quiz-card bounce-in" initial={false}>
        {state === 'correct' ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: 'center', padding: '12px 0' }}
          >
            <div style={{ fontSize: '3.4rem', marginBottom: '8px' }} className="star-pop">⭐</div>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.9rem', fontWeight: 900, color: 'var(--correct)' }}>
              Well done!
            </h2>
            {/* Name the skill, so the child learns the vocabulary too */}
            <div className="skill-chip" style={{ borderColor: skill.colour, color: skill.colour, margin: '14px auto 0' }}>
              <span>{skill.icon}</span> {skill.label}
            </div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '12px', fontSize: '0.95rem', lineHeight: 1.4 }}>
              {question.because}
            </p>
            <p style={{ color: 'var(--accent)', fontWeight: 800, marginTop: '12px' }}>
              +{COINS_PER_CORRECT} coins 🪙
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
                Not quite! Have another go.
              </motion.p>
            )}

            {/* Which skill is being practised */}
            <div className="skill-chip" style={{ borderColor: skill.colour, color: skill.colour, margin: '0 auto 16px' }}>
              <span>{skill.icon}</span> {skill.label}
            </div>

            <h2 style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: '8px',
              lineHeight: 1.35,
            }}>
              {question.question}
            </h2>

            {speechAvailable() && (
              <button
                onClick={() => speakSentence(question.question)}
                className="listen-btn"
                style={{ margin: '0 auto 20px' }}
              >
                🔊 Read it to me
              </button>
            )}

            {question.options.map((opt, i) => {
              let cls = 'quiz-option';
              if (selected === i && state === 'wrong') cls += ' wrong';
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
  const { kid, updateWcpm } = useKidAuth();
  const band = READING_BANDS[kid?.band ?? 'topaz'];

  const allWords = useMemo(() => parsedText.paragraphs.flat(), [parsedText.paragraphs]);
  const totalWords = allWords.length;

  const [progressState, setProgressState] = useState<Progress>(() => loadProgress());

  const [wordIndex, setWordIndex] = useState(
    () => loadProgress().texts[parsedText.id]?.wordIndex ?? 0,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [coinFlash, setCoinFlash] = useState(false);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [pendingQuizMilestone, setPendingQuizMilestone] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordIndexRef = useRef(wordIndex);
  const wcpmRef = useRef(kid?.wcpm ?? band.targetWcpm);

  const wcpm = kid?.wcpm ?? band.targetWcpm;
  useEffect(() => { wcpmRef.current = wcpm; }, [wcpm]);

  const currentWord = allWords[wordIndex] ?? '';
  const progress = totalWords > 0 ? (wordIndex / totalWords) * 100 : 0;
  const isStatutory = isStatutoryWord(currentWord, band.spellingList);

  // Statutory words met up to this point in the text.
  const statutorySoFar = useMemo(
    () => statutoryWordsIn(allWords.slice(0, wordIndex + 1), band.spellingList),
    [allWords, wordIndex, band.spellingList],
  );

  // Persist position and any newly met statutory words.
  useEffect(() => {
    wordIndexRef.current = wordIndex;
    setProgressState((p) => recordReading(p, parsedText.id, wordIndex, statutorySoFar));
  }, [wordIndex, parsedText.id, statutorySoFar]);

  useEffect(() => () => stopSpeaking(), []);

  // ── Advance word ──────────────────────────────────────────────
  const advance = useCallback(() => {
    const idx = wordIndexRef.current;
    if (idx >= allWords.length - 1) {
      setIsComplete(true);
      setIsPlaying(false);
      setProgressState((p) => recordCompletion(p, parsedText.id));
      return;
    }
    const next = idx + 1;
    setWordIndex(next);
    wordIndexRef.current = next;
  }, [allWords.length, parsedText.id]);

  // Quiz cadence comes from the band: lower bands are asked more often.
  const wordsPerQuiz = band.wordsPerQuestion;

  useEffect(() => {
    const milestoneIndex = Math.floor(wordIndex / wordsPerQuiz);
    if (milestoneIndex > quizIndex && pendingQuizMilestone !== milestoneIndex && !showQuiz) {
      setPendingQuizMilestone(milestoneIndex);
    }
    if (wordIndex < quizIndex * wordsPerQuiz) {
      setQuizIndex((q) => Math.max(0, q - 1));
      setPendingQuizMilestone(null);
    }
  }, [wordIndex, quizIndex, pendingQuizMilestone, showQuiz, wordsPerQuiz]);

  // Hold the quiz until the end of a sentence, so we never cut a clause.
  useEffect(() => {
    if (pendingQuizMilestone === null || !isPlaying || showQuiz) return;
    if (isEndOfSentence(allWords[wordIndex] ?? '')) {
      setIsPlaying(false);
      setShowQuiz(true);
      setPendingQuizMilestone(null);
    }
  }, [wordIndex, pendingQuizMilestone, isPlaying, showQuiz, allWords]);

  // ── Playback loop, paced by words per minute ──────────────────
  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const word = allWords[wordIndexRef.current] ?? '';

    // Base pace is the child's actual WCPM target.
    const base = wcpmToDelayMs(wcpmRef.current);
    const lenFactor = Math.max(1, word.length / 5);
    const delay =
      base *
      (isEndOfSentence(word) ? 1.8 : word.includes(',') ? 1.25 : lenFactor > 1.5 ? 1.15 : 1.0);

    timeoutRef.current = setTimeout(() => {
      advance();
      if (!showQuiz) scheduleNext();
    }, Math.max(120, Math.min(3000, delay)));
  }, [allWords, advance, showQuiz]);

  useEffect(() => {
    if (isPlaying && !showQuiz) {
      scheduleNext();
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, showQuiz, scheduleNext]);

  const togglePlay = () => {
    if (isComplete) return;
    stopSpeaking();
    setIsPlaying((p) => !p);
  };

  const handleQuizAnswer = (correct: boolean, firstTry: boolean) => {
    const q = getQuestion(parsedText.id, quizIndex);
    if (!q) return;
    setProgressState((p) => recordAnswer(p, q.skill, correct, firstTry));
    if (correct && firstTry) {
      setCoinFlash(true);
      setTimeout(() => setCoinFlash(false), 1200);
    }
  };

  const handleQuizCorrect = () => {
    setShowQuiz(false);
    setQuizIndex((q) => q + 1);
    setTimeout(() => setIsPlaying(true), 600);
  };

  const nudgeSpeed = (delta: number) => updateWcpm(wcpm + delta);

  // ── Word rendering (optimal recognition point) ────────────────
  const orp = Math.ceil(currentWord.length * 0.35) - 1;
  const before = currentWord.slice(0, orp);
  const focus = currentWord.slice(orp, orp + 1);
  const after = currentWord.slice(orp + 1);

  // Words either side, shown while paused so a child can tap any of them.
  const contextWords = useMemo(() => {
    const start = Math.max(0, wordIndex - 6);
    return allWords.slice(start, wordIndex + 7).map((w, i) => ({
      word: w,
      index: start + i,
    }));
  }, [allWords, wordIndex]);

  const activeQuestion = showQuiz ? getQuestion(parsedText.id, quizIndex) : null;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--reader-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Quiz overlay ── */}
      <AnimatePresence>
        {showQuiz && activeQuestion && (
          <QuizOverlay
            question={activeQuestion}
            onCorrect={handleQuizCorrect}
            onAnswer={handleQuizAnswer}
          />
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 18px',
        borderBottom: '2px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <button onClick={onBack} className="kid-btn kid-btn-ghost" style={{ padding: '8px 14px', fontSize: '0.9rem' }}>
          ← Back
        </button>

        {/* Band shown as a colour, never as a year group */}
        <div className="band-pill" style={{ background: band.colour }}>
          {band.label}
        </div>

        <div style={{ flex: 1 }} />

        <motion.div
          animate={coinFlash ? { scale: [1, 1.35, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="coin-pill"
        >
          🪙 {progressState.coins}
        </motion.div>

        <div style={{ flexShrink: 0 }}>
          <ThemeSelector />
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: '6px', background: 'var(--border)' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'var(--accent)',
          transition: 'width 0.3s ease',
          borderRadius: '0 99px 99px 0',
        }} />
      </div>

      {/* ── Word display ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative',
      }}>
        {isComplete ? (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🎉</div>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2rem', fontWeight: 900, color: 'var(--text)' }}>
              Amazing work!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '10px' }}>
              You finished <strong>{parsedText.title}</strong>.
            </p>
            <p style={{ color: 'var(--accent)', fontWeight: 800, marginTop: '10px', fontSize: '1.1rem' }}>
              +{COINS_PER_TEXT} coins 🪙
            </p>
            <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '16px', fontSize: '0.9rem' }}>
              You met <strong>{statutorySoFar.length}</strong> spelling list words in this text.
            </p>
            <button onClick={onBack} className="kid-btn kid-btn-primary" style={{ marginTop: '24px' }}>
              ← Back to Library
            </button>
          </motion.div>
        ) : (
          <>
            {/* Tap the word to hear it read aloud */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={wordIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.08 }}
                style={{ textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <div
                  onClick={() => speakWord(currentWord)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Hear the word ${normaliseWord(currentWord)}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') speakWord(currentWord); }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'baseline',
                    fontSize: 'clamp(2.6rem, 11vw, 6rem)',
                    cursor: speechAvailable() ? 'pointer' : 'default',
                    // Statutory words get a soft underline the child learns to notice
                    borderBottom: isStatutory ? '6px solid var(--accent)' : '6px solid transparent',
                    paddingBottom: '6px',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <span className="kid-word" style={{ textAlign: 'right' }}>{before}</span>
                  <span className="kid-word" style={{ color: 'var(--accent)', fontWeight: 900 }}>{focus}</span>
                  <span className="kid-word" style={{ textAlign: 'left' }}>{after}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Statutory word flag */}
            <div style={{ height: '30px', marginTop: '12px' }}>
              {isStatutory && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="statutory-flag"
                >
                  ⭐ Spelling list word
                </motion.div>
              )}
            </div>

            {speechAvailable() && (
              <button onClick={() => speakWord(currentWord)} className="listen-btn" style={{ marginTop: '4px' }}>
                🔊 Hear this word
              </button>
            )}

            {/* Paused: show the sentence around the word, every word tappable */}
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="context-strip"
              >
                <p className="context-hint">Tap any word to hear it</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                  {contextWords.map(({ word, index }) => (
                    <button
                      key={index}
                      onClick={() => { setWordIndex(index); speakWord(word); }}
                      className="context-word"
                      style={{
                        opacity: index === wordIndex ? 1 : 0.55,
                        fontWeight: index === wordIndex ? 900 : 700,
                        textDecoration: isStatutoryWord(word, band.spellingList) ? 'underline' : 'none',
                        textDecorationColor: 'var(--accent)',
                        textDecorationThickness: '3px',
                      }}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ── Controls ── */}
      {!isComplete && (
        <div style={{
          padding: '16px 24px 28px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          borderTop: '2px solid var(--border)',
          background: 'var(--bg-card)',
        }}>
          {/* Speed, in real words per minute, clamped to the child's band */}
          <div className="speed-row">
            <button
              onClick={() => nudgeSpeed(-5)}
              disabled={wcpm <= band.minWcpm}
              className="speed-btn"
              aria-label="Read a little slower"
            >
              −
            </button>

            <div style={{ textAlign: 'center', minWidth: '132px' }}>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
                {wcpm}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                WORDS / MINUTE
              </div>
              {/* Position within the band, no numbers a child can rank */}
              <div className="band-track">
                <div
                  className="band-dot"
                  style={{
                    left: `${((wcpm - band.minWcpm) / (band.maxWcpm - band.minWcpm)) * 100}%`,
                    background: band.colour,
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => nudgeSpeed(5)}
              disabled={wcpm >= band.maxWcpm}
              className="speed-btn"
              aria-label="Read a little faster"
            >
              +
            </button>
          </div>

          {/* Play / pause / rewind */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%', maxWidth: '380px' }}>
            <div style={{ justifySelf: 'end', paddingRight: '20px' }}>
              <button
                onClick={() => setWordIndex((i) => Math.max(0, i - 10))}
                className="kid-btn kid-btn-ghost"
                style={{ width: '78px', height: '58px', borderRadius: '30px', padding: 0, flexDirection: 'column', gap: '2px' }}
              >
                <span style={{ fontSize: '1.3rem' }}>↺</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 800 }}>Back</span>
              </button>
            </div>

            <div style={{ justifySelf: 'center' }}>
              <button
                onClick={togglePlay}
                className="kid-btn kid-btn-primary"
                style={{ width: '118px', height: '78px', borderRadius: '40px', fontSize: '1.3rem', padding: 0 }}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>

            <div style={{ justifySelf: 'start', paddingLeft: '20px' }}>
              <button
                onClick={() => {
                  setWordIndex(0);
                  setQuizIndex(0);
                  setIsComplete(false);
                  setIsPlaying(false);
                }}
                className="kid-btn kid-btn-ghost"
                style={{ width: '78px', height: '58px', borderRadius: '30px', padding: 0, flexDirection: 'column', gap: '2px' }}
              >
                <span style={{ fontSize: '1.3rem' }}>↻</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 800 }}>Restart</span>
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>
            Word {wordIndex + 1} of {totalWords}
            {' · '}
            <span style={{ color: 'var(--accent)' }}>⭐ {statutorySoFar.length} spelling words met</span>
            {' · '}
            next question in {Math.max(0, (quizIndex + 1) * wordsPerQuiz - wordIndex)} words
          </p>
        </div>
      )}
    </div>
  );
}
