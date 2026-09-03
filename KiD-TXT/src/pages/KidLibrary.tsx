import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useKidAuth } from '@/hooks/useKidAuth';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Icon } from '@/components/art/Icon';
import { Scene, type SceneKey } from '@/components/art/Scenes';
import { LIBRARY, toWordParagraphs, type LibraryText } from '@/lib/library';
import { skillsCovered } from '@/lib/quizQuestions';
import { loadProgress, textsCompleted, accuracy, type Progress } from '@/lib/progress';
import {
  READING_BANDS, READING_SKILLS, TEXT_TYPES, TEXT_TYPE_ORDER,
  statutoryWordsIn, SPELLING_LISTS, type SpellingListKey,
} from '@/lib/curriculum';

export default function KidLibrary() {
  const { kid } = useKidAuth();
  const navigate = useNavigate();
  const progress = useMemo(() => loadProgress(), []);

  if (!kid) return null;
  const band = READING_BANDS[kid.band];

  const shelves = TEXT_TYPE_ORDER
    .map((type) => ({ type, texts: LIBRARY.filter((t) => t.textType === type) }))
    .filter((s) => s.texts.length > 0);

  return (
    <div className="page">
      <div className="wrap">

        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
          <button
            onClick={() => navigate('/profile')}
            className="icon-btn"
            style={{ overflow: 'hidden', padding: 0 }}
            aria-label="My profile"
          >
            {kid.avatarData
              ? <img src={kid.avatarData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Icon name="person" size={22} />}
          </button>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="display" style={{ fontSize: '1.12rem' }}>Hi, {kid.name}</div>
            <div className="band-pill" style={{ background: band.colour, marginTop: '3px', fontSize: '0.72rem', padding: '2px 11px' }}>
              {band.label}
            </div>
          </div>

          <div className="coin-pill">
            <Icon name="coin" size={17} />
            {progress.coins}
          </div>
          <ThemeSelector />
        </div>

        {/* ── Wordmark ── */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            KiD<span style={{ color: 'var(--accent)' }}>-</span>TXT
          </h1>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div className="stat-tile">
            <div className="stat-value">
              {textsCompleted(progress)}
              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>/{LIBRARY.length}</span>
            </div>
            <div className="stat-label">Read</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{accuracy(progress)}%</div>
            <div className="stat-label">Correct</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{progress.coins}</div>
            <div className="stat-label">Coins</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/leaderboard')}
          className="kid-btn kid-btn-ghost"
          style={{ width: '100%', marginTop: '12px' }}
        >
          <Icon name="trophy" size={20} />
          Leaderboard
        </button>

        {/* ── Shelves ── */}
        {shelves.map(({ type, texts }) => {
          const meta = TEXT_TYPES[type];
          return (
            <section key={type}>
              <div className="shelf-header">
                <Icon name={type} size={26} colour={meta.colour} strokeWidth={2} />
                <div>
                  <div className="shelf-title" style={{ color: meta.colour }}>{meta.label}</div>
                  <div className="shelf-blurb">{meta.kidBlurb}</div>
                </div>
              </div>

              {texts.map((text) => (
                <BookRow
                  key={text.id}
                  text={text}
                  progress={progress}
                  list={band.spellingList}
                  onOpen={() => navigate(`/read/${text.id}`)}
                />
              ))}
            </section>
          );
        })}

        {/* ── For teachers ── */}
        <div className="note" style={{ marginTop: '30px' }}>
          <Icon name="clipboard" size={20} />
          <div>
            All {TEXT_TYPE_ORDER.length} text types. Questions cover the eight reading
            skills and appear every {band.wordsPerQuestion} words at {band.label}.
            Checked against the {SPELLING_LISTS[band.spellingList].label.toLowerCase()}.
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── One book ────────────────────────────────────────────────────
function BookRow({
  text, progress, list, onOpen,
}: {
  text: LibraryText;
  progress: Progress;
  list: SpellingListKey;
  onOpen: () => void;
}) {
  const words = useMemo(() => toWordParagraphs(text).flat(), [text]);
  const statutory = useMemo(() => statutoryWordsIn(words, list), [words, list]);

  const record = progress.texts[text.id];
  const pct = record ? Math.min(100, Math.round((record.wordIndex / words.length) * 100)) : 0;
  const skills = skillsCovered(text.id);
  const textBand = READING_BANDS[text.band];

  return (
    <button className="book-row" onClick={onOpen}>
      <div className="book-cover">
        <Scene name={text.id as SceneKey} title={text.title} />
        <span className="band-pill cover-band" style={{ background: textBand.colour, fontSize: '0.68rem', padding: '2px 10px' }}>
          {textBand.label}
        </span>
      </div>

      <div className="book-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
          <h3 style={{ fontSize: '1.14rem', fontWeight: 600, minWidth: 0 }}>{text.title}</h3>
          {record?.completed && <Icon name="check" size={18} colour="var(--correct)" strokeWidth={3} />}
        </div>

        <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '9px' }}>
          {text.author} · {words.length} words
        </p>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="mini-tag" style={{ color: 'var(--text-muted)' }}>
            <Icon name="star" size={11} strokeWidth={2.6} />
            {statutory.length}
          </span>
          {skills.slice(0, 3).map((s) => (
            <span key={s} className="mini-tag" style={{ color: READING_SKILLS[s].colour }}>
              {READING_SKILLS[s].label}
            </span>
          ))}
        </div>

        {pct > 0 && !record?.completed && (
          <div className="track" style={{ height: '9px', marginTop: '10px', borderWidth: '2px' }}>
            <div className="track-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </button>
  );
}
