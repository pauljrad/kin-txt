import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useKidAuth } from '@/hooks/useKidAuth';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LIBRARY, toWordParagraphs, type LibraryText } from '@/lib/library';
import { skillsCovered } from '@/lib/quizQuestions';
import { loadProgress, textsCompleted } from '@/lib/progress';
import {
  READING_BANDS, READING_SKILLS, TEXT_TYPES, TEXT_TYPE_ORDER,
  statutoryWordsIn, SPELLING_LISTS,
} from '@/lib/curriculum';

export default function KidLibrary() {
  const { kid } = useKidAuth();
  const navigate = useNavigate();
  const progress = useMemo(() => loadProgress(), []);

  if (!kid) return null;
  const band = READING_BANDS[kid.band];

  // Group the library by text type, so coverage of all ten is visible.
  const shelves = TEXT_TYPE_ORDER.map((type) => ({
    type,
    texts: LIBRARY.filter((t) => t.textType === type),
  })).filter((s) => s.texts.length > 0);

  const done = textsCompleted(progress);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '20px 18px 48px' }}>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '26px', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            onClick={() => navigate('/profile')}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--bg-card)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
            }}
          >
            {kid.avatarData
              ? <img src={kid.avatarData} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.3rem' }}>🙂</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              Hi, {kid.name}!
            </div>
            <div className="band-pill" style={{ background: band.colour, marginTop: '3px', fontSize: '0.72rem', padding: '3px 11px' }}>
              {band.label} · {kid.wcpm} wpm
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div className="coin-pill">🪙 {progress.coins}</div>
          <ThemeSelector />
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2.9rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            KiD-TXT
          </h1>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '5px' }}>
            Read, Learn, Grow!
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div className="stat-tile">
            <div className="stat-value">{done}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{LIBRARY.length}</span></div>
            <div className="stat-label">Texts read</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{progress.totalAnswered ? Math.round((progress.firstTimeCorrect / progress.totalAnswered) * 100) : 0}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{progress.coins}</div>
            <div className="stat-label">Coins</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/leaderboard')}
          className="kid-btn kid-btn-ghost"
          style={{ width: '100%', fontSize: '0.9rem', padding: '11px' }}
        >
          🏆 See the leaderboard
        </button>

        {/* ── Shelves, one per text type ── */}
        {shelves.map(({ type, texts }) => {
          const meta = TEXT_TYPES[type];
          return (
            <div key={type}>
              <div className="shelf-header">
                <div style={{ fontSize: '1.4rem' }}>{meta.icon}</div>
                <div>
                  <div className="shelf-title" style={{ color: meta.colour }}>{meta.label}</div>
                  <div className="shelf-blurb">{meta.kidBlurb}</div>
                </div>
              </div>

              {texts.map((text, i) => (
                <BookRow key={text.id} text={text} delay={i * 0.04} onOpen={() => navigate(`/read/${text.id}`)} />
              ))}
            </div>
          );
        })}

        {/* ── Curriculum note, for the grown-ups ── */}
        <div className="kid-card" style={{ marginTop: '34px', padding: '18px' }}>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: '7px' }}>
            📋 For teachers
          </div>
          <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This library covers all <strong>{TEXT_TYPE_ORDER.length} text types</strong>. Comprehension
            questions are tagged to the <strong>eight reading skills</strong> and appear every{' '}
            <strong>{band.wordsPerQuestion} words</strong> at {band.label} band. Every text is checked
            against the <strong>{SPELLING_LISTS[band.spellingList].label}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── One book on a shelf ─────────────────────────────────────────
function BookRow({ text, delay, onOpen }: { text: LibraryText; delay: number; onOpen: () => void }) {
  const { kid } = useKidAuth();
  const band = READING_BANDS[kid!.band];
  const textBand = READING_BANDS[text.band];

  const words = useMemo(() => toWordParagraphs(text).flat(), [text]);
  const statutory = useMemo(
    () => statutoryWordsIn(words, band.spellingList),
    [words, band.spellingList],
  );

  const progress = loadProgress();
  const record = progress.texts[text.id];
  const pct = record ? Math.min(100, Math.round((record.wordIndex / words.length) * 100)) : 0;
  const skills = skillsCovered(text.id);

  return (
    <motion.button
      className="kid-card book-row"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onOpen}
      style={{ marginBottom: '11px' }}
    >
      <div className="book-cover" style={{ background: text.gradient }}>
        {text.emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '3px' }}>
          <h3 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.15 }}>
            {text.title}
          </h3>
          {record?.completed && <span style={{ fontSize: '0.85rem' }}>✅</span>}
        </div>

        <p style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '7px' }}>
          {text.author} · {words.length} words
        </p>

        {/* Skills this text practises */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '7px' }}>
          {skills.map((s) => (
            <span
              key={s}
              title={READING_SKILLS[s].label}
              style={{
                fontSize: '0.63rem', fontWeight: 800,
                color: READING_SKILLS[s].colour,
                border: `1.5px solid ${READING_SKILLS[s].colour}`,
                borderRadius: '50px', padding: '1px 7px',
              }}
            >
              {READING_SKILLS[s].icon} {READING_SKILLS[s].label}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)' }}>
            ⭐ {statutory.length} spelling words
          </span>
          <span
            className="band-pill"
            style={{ background: textBand.colour, fontSize: '0.62rem', padding: '2px 9px' }}
          >
            {textBand.label}
          </span>
        </div>

        {pct > 0 && (
          <div style={{ height: '4px', background: 'var(--border)', borderRadius: '99px', marginTop: '8px' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '99px' }} />
          </div>
        )}
      </div>
    </motion.button>
  );
}
