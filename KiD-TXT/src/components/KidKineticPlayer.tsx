import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuestion, type QuizQuestion } from '@/lib/quizQuestions';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Icon } from '@/components/art/Icon';
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

export interface ParsedText {
  id: string;
  title: string;
  paragraphs: string[][];
}

interface KidPlayerProps {
  parsedText: ParsedText;
  onBack: () => void;
}

const isEndOfSentence = (word: string) => /[.!?]["'”)]*$/.test(word);

// ─── Quiz ────────────────────────────────────────────────────────
function QuizOverlay({
  question, onCorrect, onAnswer,
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
      setTimeout(onCorrect, 2000);
    } else {
      setState('wrong');
      setTimeout(() => { setState('idle'); setSelected(null); }, 1100);
    }
  };

  return (
    <div className="quiz-overlay">
      <div className="quiz-card pop-in">
        {/* Which skill this question practises */}
        <div className="skill-chip" style={{ color: skill.colour, margin: '0 auto 16px' }}>
          <Icon name={question.skill} size={17} strokeWidth={2.2} />
          {skill.label}
        </div>

        <h2 style={{ fontSize: '1.22rem', lineHeight: 1.3, marginBottom: '10px', textWrap: 'balance' }}>
          {question.question}
        </h2>

        {speechAvailable() && state !== 'correct' && (
          <button
            onClick={() => speakSentence(question.question)}
            className="kid-btn kid-btn-ghost"
            style={{ margin: '0 auto 18px', padding: '9px 18px', minHeight: '42px', fontSize: '0.86rem' }}
          >
            <Icon name="sound" size={17} />
            Read it to me
          </button>
        )}

        {state === 'wrong' && (
          <div className="verdict bad nudge">
            <Icon name="close" size={20} strokeWidth={2.8} />
            <span>Not quite — have another go.</span>
          </div>
        )}

        {state === 'correct' ? (
          <div className="pop-in">
            <div className="verdict good" style={{ marginTop: '4px' }}>
              <Icon name="check" size={22} strokeWidth={3} />
              <span>{question.because}</span>
            </div>
            <div className="coin-pill" style={{ fontSize: '1.02rem', padding: '8px 16px 8px 13px' }}>
              <Icon name="coin" size={19} />
              +{COINS_PER_CORRECT}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '4px' }}>
            {question.options.map((opt, i) => (
              <button
                key={i}
                className={`quiz-option${selected === i && state === 'wrong' ? ' wrong' : ''}`}
                onClick={() => handleAnswer(i)}
              >
                <span className="letter">{['A', 'B', 'C', 'D'][i]}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Player ──────────────────────────────────────────────────────
export function KidKineticPlayer({ parsedText, onBack }: KidPlayerProps) {
  const { kid, updateWcpm } = useKidAuth();
  const band = READING_BANDS[kid?.band ?? 'topaz'];

  const allWords = useMemo(() => parsedText.paragraphs.flat(), [parsedText.paragraphs]);
  const totalWords = allWords.length;

  const [progressState, setProgressState] = useState<Progress>(() => loadProgress());
  const [wordIndex, setWordIndex] = useState(() => loadProgress().texts[parsedText.id]?.wordIndex ?? 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [coinFlash, setCoinFlash] = useState(false);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [pendingQuizMilestone, setPendingQuizMilestone] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordIndexRef = useRef(wordIndex);
  const wcpm = kid?.wcpm ?? band.targetWcpm;
  const wcpmRef = useRef(wcpm);
  useEffect(() => { wcpmRef.current = wcpm; }, [wcpm]);

  const currentWord = allWords[wordIndex] ?? '';
  const progress = totalWords > 0 ? (wordIndex / totalWords) * 100 : 0;
  const isStatutory = isStatutoryWord(currentWord, band.spellingList);

  const statutorySoFar = useMemo(
    () => statutoryWordsIn(allWords.slice(0, wordIndex + 1), band.spellingList),
    [allWords, wordIndex, band.spellingList],
  );

  useEffect(() => {
    wordIndexRef.current = wordIndex;
    setProgressState((p) => recordReading(p, parsedText.id, wordIndex, statutorySoFar));
  }, [wordIndex, parsedText.id, statutorySoFar]);

  useEffect(() => () => stopSpeaking(), []);

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

  const wordsPerQuiz = band.wordsPerQuestion;

  useEffect(() => {
    const milestone = Math.floor(wordIndex / wordsPerQuiz);
    if (milestone > quizIndex && pendingQuizMilestone !== milestone && !showQuiz) {
      setPendingQuizMilestone(milestone);
    }
    if (wordIndex < quizIndex * wordsPerQuiz) {
      setQuizIndex((q) => Math.max(0, q - 1));
      setPendingQuizMilestone(null);
    }
  }, [wordIndex, quizIndex, pendingQuizMilestone, showQuiz, wordsPerQuiz]);

  // Hold the question until a sentence ends, so we never cut a clause
  useEffect(() => {
    if (pendingQuizMilestone === null || !isPlaying || showQuiz) return;
    if (isEndOfSentence(allWords[wordIndex] ?? '')) {
      setIsPlaying(false);
      setShowQuiz(true);
      setPendingQuizMilestone(null);
    }
  }, [wordIndex, pendingQuizMilestone, isPlaying, showQuiz, allWords]);

  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const word = allWords[wordIndexRef.current] ?? '';
    const base = wcpmToDelayMs(wcpmRef.current);
    const lenFactor = Math.max(1, word.length / 5);
    const delay = base * (isEndOfSentence(word) ? 1.8 : word.includes(',') ? 1.25 : lenFactor > 1.5 ? 1.15 : 1);

    timeoutRef.current = setTimeout(() => {
      advance();
      if (!showQuiz) scheduleNext();
    }, Math.max(120, Math.min(3000, delay)));
  }, [allWords, advance, showQuiz]);

  useEffect(() => {
    if (isPlaying && !showQuiz) scheduleNext();
    else if (timeoutRef.current) clearTimeout(timeoutRef.current);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, showQuiz, scheduleNext]);

  const handleQuizAnswer = (correct: boolean, firstTry: boolean) => {
    const q = getQuestion(parsedText.id, quizIndex);
    if (!q) return;
    setProgressState((p) => recordAnswer(p, q.skill, correct, firstTry));
    if (correct && firstTry) {
      setCoinFlash(true);
      setTimeout(() => setCoinFlash(false), 1100);
    }
  };

  const handleQuizCorrect = () => {
    setShowQuiz(false);
    setQuizIndex((q) => q + 1);
    setTimeout(() => setIsPlaying(true), 500);
  };

  // Optimal recognition point — the letter the eye lands on
  const orp = Math.ceil(currentWord.length * 0.35) - 1;
  const before = currentWord.slice(0, orp);
  const focus = currentWord.slice(orp, orp + 1);
  const after = currentWord.slice(orp + 1);

  const contextWords = useMemo(() => {
    const start = Math.max(0, wordIndex - 6);
    return allWords.slice(start, wordIndex + 7).map((w, i) => ({ word: w, index: start + i }));
  }, [allWords, wordIndex]);

  const activeQuestion = showQuiz ? getQuestion(parsedText.id, quizIndex) : null;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--reader-bg)', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence>
        {showQuiz && activeQuestion && (
          <QuizOverlay question={activeQuestion} onCorrect={handleQuizCorrect} onAnswer={handleQuizAnswer} />
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: 'calc(12px + var(--safe-top)) 16px 12px',
      }}>
        <button onClick={onBack} className="icon-btn" aria-label="Back to library">
          <Icon name="back" size={22} strokeWidth={2.4} />
        </button>

        <div className="band-pill" style={{ background: band.colour }}>{band.label}</div>

        <div style={{ flex: 1 }} />

        <motion.div animate={coinFlash ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.45 }} className="coin-pill">
          <Icon name="coin" size={17} />
          {progressState.coins}
        </motion.div>

        <ThemeSelector />
      </div>

      {/* ── Progress ── */}
      <div style={{ padding: '0 16px 4px' }}>
        <div className="track">
          <div className="track-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Stage ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '20px 16px',
      }}>
        {isComplete ? (
          <div className="pop-in" style={{ textAlign: 'center', maxWidth: '22rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <Icon name="trophy" size={64} colour="var(--sun)" strokeWidth={1.6} />
            </div>
            <h2 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>Finished!</h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: '16px' }}>
              You read <strong style={{ color: 'var(--text)' }}>{parsedText.title}</strong> — all {totalWords} words.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '22px' }}>
              <div className="coin-pill" style={{ fontSize: '1rem', padding: '8px 15px 8px 12px' }}>
                <Icon name="coin" size={18} /> +{COINS_PER_TEXT}
              </div>
              <div className="statutory-flag">
                <Icon name="star" size={16} strokeWidth={2.4} />
                {statutorySoFar.length} words
              </div>
            </div>

            <button onClick={onBack} className="kid-btn kid-btn-primary" style={{ width: '100%' }}>
              Back to Library
            </button>
          </div>
        ) : (
          <>
            {/* The word. Tap it to hear it. */}
            <button
              onClick={() => speakWord(currentWord)}
              aria-label={`Hear the word ${normaliseWord(currentWord)}`}
              style={{
                background: 'none', border: 'none', padding: '4px 0 10px',
                cursor: speechAvailable() ? 'pointer' : 'default',
                borderBottom: `7px solid ${isStatutory ? 'var(--sun)' : 'transparent'}`,
                borderRadius: 0, transition: 'border-color 0.2s ease',
                maxWidth: '100%',
              }}
            >
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'baseline',
                fontSize: 'clamp(2.5rem, 13vw, 5.5rem)',
              }}>
                <span className="kid-word" style={{ textAlign: 'right' }}>{before}</span>
                <span className="kid-word" style={{ color: 'var(--accent)' }}>{focus}</span>
                <span className="kid-word" style={{ textAlign: 'left' }}>{after}</span>
              </div>
            </button>

            {/* Statutory flag holds its space so the word never jumps */}
            <div style={{ height: '34px', display: 'flex', alignItems: 'center', marginTop: '12px' }}>
              {isStatutory && (
                <div className="statutory-flag pop-in">
                  <Icon name="star" size={16} strokeWidth={2.4} />
                  Spelling word
                </div>
              )}
            </div>

            {speechAvailable() && (
              <button
                onClick={() => speakWord(currentWord)}
                className="kid-btn kid-btn-ghost"
                style={{ padding: '9px 18px', minHeight: '44px', fontSize: '0.88rem', marginTop: '2px' }}
              >
                <Icon name="sound" size={18} />
                Hear it
              </button>
            )}

            {/* Paused: the sentence around the word, every word tappable */}
            {!isPlaying && (
              <div className="context-strip">
                <p className="context-hint">Tap any word to hear it</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'center' }}>
                  {contextWords.map(({ word, index }) => (
                    <button
                      key={index}
                      onClick={() => { setWordIndex(index); speakWord(word); }}
                      className="context-word"
                      style={{
                        opacity: index === wordIndex ? 1 : 0.5,
                        color: index === wordIndex ? 'var(--accent)' : 'var(--text)',
                        textDecoration: isStatutoryWord(word, band.spellingList) ? 'underline' : 'none',
                        textDecorationColor: 'var(--sun)',
                        textDecorationThickness: '3px',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Controls ── */}
      {!isComplete && (
        <div style={{
          padding: '16px 16px calc(20px + var(--safe-bottom))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
        }}>
          {/* Speed, in real words per minute, clamped to the child's band */}
          <div className="speed-row">
            <button
              onClick={() => updateWcpm(wcpm - 5)}
              disabled={wcpm <= band.minWcpm}
              className="icon-btn"
              aria-label="Read a little slower"
            >
              <Icon name="minus" size={20} strokeWidth={2.6} />
            </button>

            <div style={{ textAlign: 'center', minWidth: '116px' }}>
              <div className="display" style={{ fontSize: '1.45rem', fontVariantNumeric: 'tabular-nums' }}>{wcpm}</div>
              <div className="stat-label" style={{ marginTop: '1px' }}>Words / min</div>
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
              onClick={() => updateWcpm(wcpm + 5)}
              disabled={wcpm >= band.maxWcpm}
              className="icon-btn"
              aria-label="Read a little faster"
            >
              <Icon name="plus" size={20} strokeWidth={2.6} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <button
              onClick={() => setWordIndex((i) => Math.max(0, i - 10))}
              className="icon-btn"
              aria-label="Back ten words"
            >
              <Icon name="rewind" size={21} strokeWidth={2.2} />
            </button>

            <button
              onClick={() => { stopSpeaking(); setIsPlaying((p) => !p); }}
              className="play-btn"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={34} strokeWidth={2.6} />
            </button>

            <button
              onClick={() => { setWordIndex(0); setQuizIndex(0); setIsComplete(false); setIsPlaying(false); }}
              className="icon-btn"
              aria-label="Start again"
            >
              <Icon name="restart" size={21} strokeWidth={2.2} />
            </button>
          </div>

          <p style={{
            fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800,
            textAlign: 'center', letterSpacing: '0.02em',
          }}>
            {wordIndex + 1} / {totalWords}
            {'  ·  '}
            {statutorySoFar.length} spelling words
            {'  ·  '}
            next question in {Math.max(0, (quizIndex + 1) * wordsPerQuiz - wordIndex)}
          </p>
        </div>
      )}
    </div>
  );
}
