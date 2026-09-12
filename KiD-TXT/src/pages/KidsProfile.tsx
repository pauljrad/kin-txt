import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useKidAuth } from '@/hooks/useKidAuth';
import { logoutKid } from '@/lib/kidAuth';
import { AvatarCanvas } from '@/components/kids/AvatarCanvas';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Icon } from '@/components/art/Icon';
import { VoicePicker } from '@/components/VoicePicker';
import { useNavigate } from 'react-router-dom';
import {
  loadProgress, textsCompleted, accuracy, skillAccuracy,
  weakestSkill, allStatutoryMet,
} from '@/lib/progress';
import {
  READING_BANDS, READING_SKILLS, SKILL_ORDER,
  SPELLING_LISTS, TEXT_TYPE_ORDER, TEXT_TYPES,
} from '@/lib/curriculum';
import { LIBRARY } from '@/lib/library';

export default function KidsProfile() {
  const { kid, setKid } = useKidAuth();
  const navigate = useNavigate();
  const [showCanvas, setShowCanvas] = useState(false);

  const progress = useMemo(() => loadProgress(), []);

  const handleLogout = () => {
    logoutKid();
    setKid(null);
    navigate('/login');
  };

  if (!kid) return null;

  const band = READING_BANDS[kid.band];
  const spellingList = SPELLING_LISTS[band.spellingList];
  const met = allStatutoryMet(progress);
  const weakest = weakestSkill(progress);

  const typesRead = new Set(
    LIBRARY.filter((t) => progress.texts[t.id]?.completed).map((t) => t.textType),
  );

  return (
    <>
      <AnimatePresence>
        {showCanvas && <AvatarCanvas onClose={() => setShowCanvas(false)} />}
      </AnimatePresence>

      <div className="page">
        <div className="wrap">

          {/* ── Top bar ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => navigate('/')} className="icon-btn" aria-label="Back">
              <Icon name="back" size={22} strokeWidth={2.4} />
            </button>
            <div style={{ flex: 1 }} />
            <div className="coin-pill">
              <Icon name="coin" size={17} />
              {progress.coins}
            </div>
            <ThemeSelector />
          </div>

          {/* ── Avatar ── */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <button
              onClick={() => setShowCanvas(true)}
              style={{
                width: '128px', height: '128px', borderRadius: '50%',
                background: 'var(--bg-card)',
                border: `3px solid var(--border)`,
                boxShadow: `0 6px 0 ${band.colour}`,
                margin: '0 auto 14px', cursor: 'pointer', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '4px', padding: 0,
              }}
              aria-label="Draw my avatar"
            >
              {kid.avatarData ? (
                <img src={kid.avatarData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <Icon name="brush" size={36} colour="var(--text-muted)" strokeWidth={1.7} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    Tap to draw
                  </span>
                </>
              )}
            </button>

            <h1 style={{ fontSize: '1.9rem' }}>{kid.name}</h1>
            <div className="band-pill" style={{ background: band.colour, marginTop: '8px' }}>
              {band.label} · {kid.wcpm} words a minute
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <div className="stat-tile">
              <div className="stat-value">{textsCompleted(progress)}</div>
              <div className="stat-label">Read</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{accuracy(progress)}%</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{met.length}</div>
              <div className="stat-label">Words</div>
            </div>
          </div>

          {/* ── Reading skills ── */}
          <div className="kid-card" style={{ padding: '19px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.18rem' }}>My Reading Skills</h2>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', margin: '3px 0 16px' }}>
              The eight things good readers do.
            </p>

            {SKILL_ORDER.map((key) => {
              const skill = READING_SKILLS[key];
              const acc = skillAccuracy(progress, key);
              return (
                <div key={key} className="mastery-row">
                  <div className="mastery-head" style={{ color: skill.colour }}>
                    <Icon name={key} size={17} strokeWidth={2.2} />
                    {skill.label}
                  </div>
                  <div className="mastery-pct">{acc === null ? '–' : `${acc}%`}</div>
                  <div className="mastery-track">
                    <div className="mastery-fill" style={{ width: `${acc ?? 0}%`, background: skill.colour }} />
                  </div>
                </div>
              );
            })}

            <div className="note" style={{ marginTop: '15px' }}>
              <Icon name="lightbulb" size={19} />
              <div>
                {weakest ? (
                  <>Next, practise <strong style={{ color: READING_SKILLS[weakest].colour }}>
                    {READING_SKILLS[weakest].label}</strong>. {READING_SKILLS[weakest].kidLabel}.</>
                ) : progress.totalAnswered === 0 ? (
                  'Read a text and answer some questions to fill these in.'
                ) : (
                  'Going well — keep reading to test the other skills.'
                )}
              </div>
            </div>
          </div>

          {/* ── Text types ── */}
          <div className="kid-card" style={{ padding: '19px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.18rem' }}>Kinds of Writing</h2>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', margin: '3px 0 14px' }}>
              {typesRead.size} of {TEXT_TYPE_ORDER.length} collected.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {TEXT_TYPE_ORDER.map((t) => {
                const meta = TEXT_TYPES[t];
                const got = typesRead.has(t);
                return (
                  <div
                    key={t}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 11px', borderRadius: '50px',
                      border: `2.5px solid ${got ? 'var(--border)' : 'var(--text-muted)'}`,
                      background: got ? meta.colour : 'transparent',
                      color: got ? '#FFF9EC' : 'var(--text-muted)',
                      opacity: got ? 1 : 0.55,
                      fontSize: '0.74rem', fontWeight: 800,
                    }}
                  >
                    <Icon name={t} size={14} strokeWidth={2.2} />
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Spelling words ── */}
          <div className="kid-card" style={{ padding: '19px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.18rem' }}>My Spelling Words</h2>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', margin: '3px 0 12px' }}>
              {met.length} of {spellingList.words.length} met while reading.
            </p>

            <div className="track" style={{ height: '12px', marginBottom: '14px' }}>
              <div
                className="track-fill"
                style={{ width: `${Math.round((met.length / spellingList.words.length) * 100)}%`, background: 'var(--sun)' }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '156px', overflowY: 'auto' }}>
              {met.length === 0 ? (
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Read a text to start collecting words.
                </p>
              ) : (
                met.map((w) => (
                  <span
                    key={w}
                    style={{
                      fontSize: '0.74rem', fontWeight: 800,
                      background: 'var(--sun)', border: '2px solid var(--border)',
                      color: 'var(--ink)', borderRadius: '50px', padding: '2px 10px',
                    }}
                  >
                    {w}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* ── Reading voice ── */}
          <div className="kid-card" style={{ padding: '19px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.18rem' }}>Reading Voice</h2>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', margin: '3px 0 14px' }}>
              Who reads the words to you. Tap the speaker to hear each one.
            </p>
            <VoicePicker />
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={handleLogout} className="kid-btn kid-btn-ghost">
              Log out
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
