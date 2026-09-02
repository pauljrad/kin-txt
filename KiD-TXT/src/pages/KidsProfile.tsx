import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKidAuth } from '@/hooks/useKidAuth';
import { logoutKid, updateKidBand } from '@/lib/kidAuth';
import { AvatarCanvas } from '@/components/kids/AvatarCanvas';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useNavigate } from 'react-router-dom';
import {
  loadProgress, textsCompleted, accuracy, skillAccuracy,
  weakestSkill, allStatutoryMet,
} from '@/lib/progress';
import {
  READING_BANDS, READING_SKILLS, SKILL_ORDER, BAND_ORDER,
  SPELLING_LISTS, TEXT_TYPE_ORDER, TEXT_TYPES,
} from '@/lib/curriculum';
import { LIBRARY } from '@/lib/library';

export default function KidsProfile() {
  const { kid, setKid, updateBand } = useKidAuth();
  const navigate = useNavigate();
  const [showCanvas, setShowCanvas] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

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

  // Which text types the child has actually finished.
  const typesRead = new Set(
    LIBRARY.filter((t) => progress.texts[t.id]?.completed).map((t) => t.textType),
  );

  return (
    <>
      <AnimatePresence>
        {showCanvas && <AvatarCanvas onClose={() => setShowCanvas(false)} />}
      </AnimatePresence>

      <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '20px 18px 48px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <button onClick={() => navigate('/')} className="kid-btn kid-btn-ghost" style={{ padding: '8px 14px', fontSize: '0.9rem' }}>
            ← Back
          </button>
          <div style={{ flex: 1 }} />
          <div className="coin-pill">🪙 {progress.coins}</div>
          <ThemeSelector />
        </div>

        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          {/* Avatar */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              onClick={() => setShowCanvas(true)}
              title="Tap to draw your avatar!"
              style={{
                width: '132px', height: '132px', borderRadius: '50%',
                background: 'var(--bg-card)', border: `4px solid ${band.colour}`,
                margin: '0 auto 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', boxShadow: '0 8px 24px var(--shadow)',
              }}
            >
              {kid.avatarData ? (
                <img src={kid.avatarData} alt="My avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.8rem' }}>🎨</div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>Tap to draw!</p>
                </div>
              )}
            </div>

            <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
              {kid.name}
            </h1>
            <div className="band-pill" style={{ background: band.colour, marginTop: '7px' }}>
              {band.label} band · {kid.wcpm} words a minute
            </div>
          </motion.div>

          {/* Headline stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '22px' }}>
            <div className="stat-tile">
              <div className="stat-value">{textsCompleted(progress)}</div>
              <div className="stat-label">Texts read</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{accuracy(progress)}%</div>
              <div className="stat-label">Questions right</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{met.length}</div>
              <div className="stat-label">Spelling words</div>
            </div>
          </div>

          {/* ─── Reading skills ─── */}
          <div className="kid-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text)' }}>
              My Reading Skills
            </h2>
            <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px' }}>
              The eight things good readers do.
            </p>

            {SKILL_ORDER.map((key) => {
              const skill = READING_SKILLS[key];
              const acc = skillAccuracy(progress, key);
              return (
                <div key={key} className="mastery-row" title={skill.kidLabel}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: skill.colour, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>{skill.icon}</span>
                    <span>{skill.label}</span>
                  </div>
                  <div className="mastery-track">
                    <div
                      className="mastery-fill"
                      style={{ width: `${acc ?? 0}%`, background: skill.colour }}
                    />
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {acc === null ? '–' : `${acc}%`}
                  </div>
                </div>
              );
            })}

            {weakest ? (
              <div style={{
                marginTop: '14px', padding: '11px 14px',
                background: 'var(--bg-elevated)', borderRadius: '13px',
                border: '2px dashed var(--border)',
                fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.45,
              }}>
                💡 Next, practise <strong style={{ color: READING_SKILLS[weakest].colour }}>
                  {READING_SKILLS[weakest].icon} {READING_SKILLS[weakest].label}
                </strong>. {READING_SKILLS[weakest].kidLabel}.
              </div>
            ) : (
              <div style={{
                marginTop: '14px', padding: '11px 14px',
                background: 'var(--bg-elevated)', borderRadius: '13px',
                border: '2px dashed var(--border)',
                fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.45,
              }}>
                {progress.totalAnswered === 0
                  ? '💡 Read a text and answer some questions to fill these in.'
                  : '💡 Going well — keep reading to test the other skills.'}
              </div>
            )}
          </div>

          {/* ─── Text types read ─── */}
          <div className="kid-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text)' }}>
              Kinds of Writing
            </h2>
            <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px' }}>
              {typesRead.size} of {TEXT_TYPE_ORDER.length} collected.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {TEXT_TYPE_ORDER.map((t) => {
                const meta = TEXT_TYPES[t];
                const got = typesRead.has(t);
                return (
                  <div
                    key={t}
                    title={meta.kidBlurb}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 11px', borderRadius: '50px',
                      border: `2px solid ${got ? meta.colour : 'var(--border)'}`,
                      background: got ? `color-mix(in srgb, ${meta.colour} 14%, transparent)` : 'transparent',
                      color: got ? meta.colour : 'var(--text-muted)',
                      opacity: got ? 1 : 0.5,
                      fontSize: '0.72rem', fontWeight: 800,
                    }}
                  >
                    <span>{meta.icon}</span> {meta.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Statutory spelling words ─── */}
          <div className="kid-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text)' }}>
              My Spelling Words
            </h2>
            <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>
              {met.length} of {spellingList.words.length} met while reading · {spellingList.label}
            </p>

            <div style={{ height: '9px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '99px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{
                height: '100%',
                width: `${Math.round((met.length / spellingList.words.length) * 100)}%`,
                background: 'var(--accent)', borderRadius: '99px', transition: 'width 0.5s ease',
              }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '150px', overflowY: 'auto' }}>
              {met.length === 0 ? (
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Read a text to start collecting words.
                </p>
              ) : (
                met.map((w) => (
                  <span
                    key={w}
                    style={{
                      fontSize: '0.72rem', fontWeight: 800,
                      background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
                      border: '1.5px solid var(--accent)',
                      color: 'var(--text)',
                      borderRadius: '50px', padding: '2px 9px',
                    }}
                  >
                    {w}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* ─── Teacher panel ─── */}
          <button
            onClick={() => setShowTeacher((s) => !s)}
            className="kid-btn kid-btn-ghost"
            style={{ width: '100%', fontSize: '0.85rem', padding: '11px' }}
          >
            {showTeacher ? '▲ Hide teacher settings' : '▼ Teacher settings'}
          </button>

          <AnimatePresence>
            {showTeacher && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="kid-card" style={{ padding: '20px', marginTop: '12px' }}>
                  <h3 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                    Reading band
                  </h3>
                  <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.45 }}>
                    Bands are named after gemstones, not year groups, so a child working
                    outside their year cannot read their level off the screen.
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '14px' }}>
                    {BAND_ORDER.map((b) => {
                      const meta = READING_BANDS[b];
                      const active = kid.band === b;
                      return (
                        <button
                          key={b}
                          onClick={() => { updateBand(b); updateKidBand(b); }}
                          style={{
                            padding: '7px 13px', borderRadius: '50px',
                            border: `2.5px solid ${active ? meta.colour : 'var(--border)'}`,
                            background: active ? meta.colour : 'transparent',
                            color: active ? '#fff' : 'var(--text-muted)',
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
                          }}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{
                    background: 'var(--bg-elevated)', borderRadius: '13px', padding: '13px 15px',
                    fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.6,
                  }}>
                    <div><strong style={{ color: 'var(--text)' }}>{band.label}</strong> = {band.yearLabel}</div>
                    <div>Target {band.targetWcpm} WCPM (range {band.minWcpm}–{band.maxWcpm})</div>
                    <div>A question every {band.wordsPerQuestion} words</div>
                    <div>{spellingList.label}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={handleLogout} className="kid-btn kid-btn-ghost">
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
