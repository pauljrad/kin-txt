import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { getQuestion, type QuizQuestion } from '@/lib/quizQuestions';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Icon } from '@/components/art/Icon';
import { useKidAuth } from '@/hooks/useKidAuth';
import {
  speakWord, speakSentence, stopSpeaking, speechAvailable,
  speakSequence, spellingSteps,
} from '@/lib/speech';
import {
  READING_BANDS, READING_SKILLS, SPELLING_LISTS,
  isStatutoryWord, statutoryBase, statutoryWordsIn, wcpmToDelayMs, normaliseWord,
} from '@/lib/curriculum';
import {
  loadProgress, recordAnswer, recordReading, recordCompletion, recordPause, recordLesson,
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

/** Spelling words shorter than this are read, not taught — "a" and "I" need no lesson. */
const MIN_TEACH_LENGTH = 3;

// ─── The word ────────────────────────────────────────────────────
// The coloured letter — the optimal recognition point — sits at the
// exact centre of the page. The word is laid out as one plain run of
// text, so the browser decides where every glyph goes and no two can
// ever overlap; then we measure where the coloured letter landed and
// slide the whole word so that letter is on the centreline.
//
// (The previous version used grid columns to do the centring. On iOS
// the column for the coloured letter could be sized for the last
// word's font size, and the letters after it drew on top of it.)
function WordStage({
  word, teach, onTap, tappable,
}: {
  word: string;
  teach: boolean;
  onTap: () => void;
  tappable: boolean;
}) {
  const orp = Math.max(0, Math.ceil(word.length * 0.35) - 1);
  const before = word.slice(0, orp);
  const after = word.slice(orp + 1);
  // Room the shifted word needs: both sides as wide as the longer one.
  const virtualChars = 2 * Math.max(before.length, after.length) + 1;

  const wrapRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const focus = focusRef.current;
    if (!wrap || !focus) return;
    // offsetLeft/offsetWidth are layout values, untouched by the transform
    const focusCentre = focus.offsetLeft + focus.offsetWidth / 2;
    setShift(wrap.offsetWidth / 2 - focusCentre);
  }, []);

  useLayoutEffect(measure, [measure, word, teach]);

  // Re-measure when the font arrives or the screen turns
  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <button
      className="word-btn"
      onClick={onTap}
      disabled={!tappable}
      aria-label={tappable ? `Hear the word ${normaliseWord(word)}` : normaliseWord(word)}
    >
      <div
        ref={wrapRef}
        className={`word-stage${teach ? ' teach' : ''}`}
        style={{ '--chars': Math.max(3, virtualChars), transform: `translateX(${shift}px)` } as CSSProperties}
      >
        <span>{before}</span>
        <span ref={focusRef} className="focus">{word[orp] ?? ''}</span>
        <span>{after}</span>
      </div>
    </button>
  );
}

// ─── Spelling lesson ─────────────────────────────────────────────
type LessonStep = 'ready' | 'word' | 'letters' | 'repeat' | 'done';

interface Lesson {
  /** The list's own spelling, e.g. "certain" for "certainly". */
  word: string;
  step: LessonStep;
  /** Index of the letter being spoken, or -1. */
  letter: number;
}

function SpellingCard({
  lesson, onHear, onContinue,
}: {
  lesson: Lesson;
  onHear: () => void;
  onContinue: () => void;
}) {
  const letters = lesson.word.split('');
  const speaking = lesson.step === 'word' || lesson.step === 'letters' || lesson.step === 'repeat';

  const tileState = (i: number) => {
    if (lesson.step === 'letters') {
      if (i === lesson.letter) return ' on';
      if (i < lesson.letter) return ' done';
      return '';
    }
    if (lesson.step === 'repeat' || lesson.step === 'done') return ' done';
    return '';
  };

  const hint = (() => {
    switch (lesson.step) {
      case 'ready':   return 'Tap to hear it, then listen for every letter.';
      case 'word':    return 'Listen…';
      case 'letters': return letters.slice(0, lesson.letter + 1).join(' · ');
      case 'repeat':  return lesson.word;
      case 'done':    return `You can spell ${lesson.word}.`;
    }
  })();

  return (
    <div className="spell-card pop-in">
      <div className="statutory-flag">
        <Icon name="star" size={16} strokeWidth={2.4} />
        Spelling word
      </div>

      <div
        className={`spell-tiles${lesson.step === 'repeat' ? ' cheer' : ''}`}
        style={{ '--n': letters.length } as CSSProperties}
        aria-label={`${lesson.word}, spelled ${letters.join(' ')}`}
      >
        {letters.map((ch, i) => (
          <span key={i} className={`tile${tileState(i)}`} style={{ '--i': i } as CSSProperties}>
            {ch}
          </span>
        ))}
      </div>

      <p className="spell-hint" aria-live="polite">{hint}</p>

      {lesson.step === 'done' ? (
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button onClick={onHear} className="kid-btn kid-btn-ghost" style={{ flex: '0 0 auto', padding: '12px 16px' }} aria-label="Hear it again">
            <Icon name="sound" size={20} />
          </button>
          <button onClick={onContinue} className="kid-btn kid-btn-primary" style={{ flex: 1 }}>
            <Icon name="play" size={18} strokeWidth={2.4} />
            Keep reading
          </button>
        </div>
      ) : (
        <button
          onClick={onHear}
          disabled={speaking}
          className={`kid-btn kid-btn-primary${lesson.step === 'ready' ? ' pulse' : ''}`}
          style={{ width: '100%', fontSize: '1.08rem' }}
        >
          <Icon name="sound" size={21} />
          {speaking ? 'Listening…' : 'Hear it'}
        </button>
      )}
    </div>
  );
}

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
  const listWords = SPELLING_LISTS[band.spellingList].words;

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

  // The spelling lesson. Words already taught this session are not
  // taught again — "the" would otherwise stop a Year 1 reader every line.
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const taughtRef = useRef<Set<string>>(new Set());
  const cancelLessonRef = useRef<(() => void) | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordIndexRef = useRef(wordIndex);
  const wcpm = kid?.wcpm ?? band.targetWcpm;
  const wcpmRef = useRef(wcpm);
  useEffect(() => { wcpmRef.current = wcpm; }, [wcpm]);

  const currentWord = allWords[wordIndex] ?? '';
  const progress = totalWords > 0 ? (wordIndex / totalWords) * 100 : 0;

  const statutorySoFar = useMemo(
    () => statutoryWordsIn(allWords.slice(0, wordIndex + 1), band.spellingList),
    [allWords, wordIndex, band.spellingList],
  );

  useEffect(() => {
    wordIndexRef.current = wordIndex;
    setProgressState((p) => recordReading(p, parsedText.id, wordIndex, statutorySoFar));
  }, [wordIndex, parsedText.id, statutorySoFar]);

  useEffect(() => () => { cancelLessonRef.current?.(); stopSpeaking(); }, []);

  // ── Advance ───────────────────────────────────────────────────
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

  // ── Spelling words stop the reader ────────────────────────────
  // Fires on arrival at a word while playing, and when play starts on
  // one. The taught-set means a resume from the same word carries on.
  useEffect(() => {
    if (!isPlaying || showQuiz || lesson) return;
    const base = statutoryBase(allWords[wordIndex] ?? '', band.spellingList);
    if (!base || base.length < MIN_TEACH_LENGTH || taughtRef.current.has(base)) return;

    // Use the list's casing — "February", not "february"
    const canonical = listWords.find((w) => w.toLowerCase() === base) ?? base;
    setIsPlaying(false);
    setLesson({ word: canonical, step: 'ready', letter: -1 });
  }, [wordIndex, isPlaying, showQuiz, lesson, allWords, band.spellingList, listWords]);

  const hearLesson = useCallback(() => {
    if (!lesson) return;
    cancelLessonRef.current?.();
    const word = lesson.word;
    cancelLessonRef.current = speakSequence(
      spellingSteps(
        word,
        () => setLesson((l) => l && { ...l, step: 'word', letter: -1 }),
        (i) => setLesson((l) => l && { ...l, step: 'letters', letter: i }),
        () => setLesson((l) => l && { ...l, step: 'repeat', letter: -1 }),
      ),
      () => {
        taughtRef.current.add(word.toLowerCase());
        setProgressState((p) => recordLesson(p, parsedText.id));
        setLesson((l) => l && { ...l, step: 'done', letter: -1 });
      },
    );
  }, [lesson]);

  const continueReading = useCallback(() => {
    cancelLessonRef.current?.();
    cancelLessonRef.current = null;
    setLesson(null);
    setIsPlaying(true);
  }, []);

  const lessonLocksPlay = lesson !== null && lesson.step !== 'done';

  // ── Questions ─────────────────────────────────────────────────
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

  useEffect(() => {
    if (pendingQuizMilestone === null || !isPlaying || showQuiz) return;
    if (isEndOfSentence(allWords[wordIndex] ?? '')) {
      setIsPlaying(false);
      setShowQuiz(true);
      setPendingQuizMilestone(null);
    }
  }, [wordIndex, pendingQuizMilestone, isPlaying, showQuiz, allWords]);

  // ── Playback loop ─────────────────────────────────────────────
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

  const togglePlay = () => {
    if (isComplete || lessonLocksPlay) return;
    if (lesson) { continueReading(); return; }
    stopSpeaking();
    if (isPlaying) setProgressState((p) => recordPause(p, parsedText.id));
    setIsPlaying((p) => !p);
  };

  /** A pause the child chose — tapping the stage or the word. */
  const pauseByTap = () => {
    if (!isPlaying) return;
    stopSpeaking();
    setProgressState((p) => recordPause(p, parsedText.id));
    setIsPlaying(false);
  };

  const handleQuizAnswer = (correct: boolean, firstTry: boolean) => {
    const q = getQuestion(parsedText.id, quizIndex);
    if (!q) return;
    setProgressState((p) => recordAnswer(p, q.skill, correct, firstTry, parsedText.id));
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

  const contextWords = useMemo(() => {
    const start = Math.max(0, wordIndex - 6);
    return allWords.slice(start, wordIndex + 7).map((w, i) => ({ word: w, index: start + i }));
  }, [allWords, wordIndex]);

  const activeQuestion = showQuiz ? getQuestion(parsedText.id, quizIndex) : null;
  const paused = !isPlaying && !isComplete;


  return (
    <div style={{ minHeight: '100dvh', background: 'var(--reader-bg)', display: 'flex', flexDirection: 'column' }}>
      {showQuiz && activeQuestion && (
        <QuizOverlay question={activeQuestion} onCorrect={handleQuizCorrect} onAnswer={handleQuizAnswer} />
      )}

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

      {/* ── Stage ──
          Playing: the word alone, dead centre. A tap anywhere here pauses.
          Paused:  the word, then the lesson or the tappable sentence. */}
      <div
        onClick={pauseByTap}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '16px',
          cursor: isPlaying ? 'pointer' : 'default',
        }}
      >
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
            <WordStage
              word={currentWord}
              teach={lesson !== null}
              tappable={paused ? speechAvailable() : true}
              onTap={() => {
                if (isPlaying) return;               // bubbles to the stage, which pauses
                if (!lesson) speakWord(currentWord);
              }}
            />

            {lesson && (
              <SpellingCard lesson={lesson} onHear={hearLesson} onContinue={continueReading} />
            )}

            {paused && !lesson && (
              <>
                {speechAvailable() && (
                  <button
                    onClick={() => speakWord(currentWord)}
                    className="kid-btn kid-btn-ghost"
                    style={{ padding: '10px 20px', minHeight: '46px', fontSize: '0.92rem', marginTop: '18px' }}
                  >
                    <Icon name="sound" size={19} />
                    Hear it
                  </button>
                )}

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
              </>
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
              disabled={lesson !== null}
              className="icon-btn"
              aria-label="Back ten words"
            >
              <Icon name="rewind" size={21} strokeWidth={2.2} />
            </button>

            <button
              onClick={togglePlay}
              disabled={lessonLocksPlay}
              className="play-btn"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              style={lessonLocksPlay ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={34} strokeWidth={2.6} />
            </button>

            <button
              onClick={() => { setWordIndex(0); setQuizIndex(0); setIsComplete(false); setIsPlaying(false); }}
              disabled={lesson !== null}
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
