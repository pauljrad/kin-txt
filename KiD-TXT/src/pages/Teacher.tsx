import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/art/Icon';
import { ThemeSelector } from '@/components/ThemeSelector';
import { getTeacherSession, logoutTeacher } from '@/lib/teacherAuth';
import { classRoster, findPupil, setBandOverride, type PupilRecord } from '@/lib/classData';
import { analysePupil, STANDING_LABEL, type PupilInsight, type Standing } from '@/lib/insights';
import { READING_BANDS, BAND_ORDER, TEXT_TYPES, type BandKey } from '@/lib/curriculum';
import { LIBRARY, toWordParagraphs } from '@/lib/library';
import { getKidSession, saveKidSession } from '@/lib/kidAuth';

const STANDING_COLOUR: Record<Standing, string> = {
  excelling: 'var(--correct)',
  'on-track': 'var(--blue)',
  'needs-help': 'var(--wrong)',
  new: 'var(--text-muted)',
};

function StandingChip({ standing }: { standing: Standing }) {
  return (
    <span className="standing" style={{ background: STANDING_COLOUR[standing] }}>
      {STANDING_LABEL[standing]}
    </span>
  );
}

function TeacherBar({ title, back }: { title: string; back: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
      <button onClick={back} className="icon-btn" aria-label="Back">
        <Icon name="back" size={22} strokeWidth={2.4} />
      </button>
      <div className="display" style={{ fontSize: '1.05rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </div>
      <ThemeSelector />
    </div>
  );
}

// ═══ Class overview ═══════════════════════════════════════════════
export function TeacherDashboard() {
  const navigate = useNavigate();
  const teacher = getTeacherSession();

  const rows = useMemo(() => classRoster().map((p) => ({ p, i: analysePupil(p) })), []);

  if (!teacher) return null;

  const withEvidence = rows.filter((r) => r.i.accuracy !== null);
  const avgAccuracy = withEvidence.length
    ? Math.round(withEvidence.reduce((n, r) => n + (r.i.accuracy ?? 0), 0) / withEvidence.length)
    : 0;
  const textsRead = rows.reduce((n, r) => n + r.i.textsRead, 0);
  const attention = rows.filter((r) => r.i.standing === 'needs-help' || r.i.recommendation.move !== 'stay');

  const signOut = () => { logoutTeacher(); navigate('/login'); };

  return (
    <div className="page">
      <div className="wrap">
        <TeacherBar title={`${teacher.display} · ${teacher.className}`} back={signOut} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
          <div className="stat-tile"><div className="stat-value">{rows.length}</div><div className="stat-label">Pupils</div></div>
          <div className="stat-tile"><div className="stat-value">{avgAccuracy}%</div><div className="stat-label">Class accuracy</div></div>
          <div className="stat-tile"><div className="stat-value">{textsRead}</div><div className="stat-label">Texts read</div></div>
        </div>

        {/* ── Who needs a decision ── */}
        {attention.length > 0 && (
          <div className="kid-card" style={{ padding: '17px', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.12rem', marginBottom: '10px' }}>Needs your attention</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attention.map(({ p, i }) => (
                <button key={p.pupilId} className="attn-row" onClick={() => navigate(`/teacher/${p.pupilId}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span className="display" style={{ fontSize: '0.98rem' }}>{p.name}</span>
                      {i.recommendation.move === 'up' && <span className="mini-tag" style={{ color: 'var(--correct)' }}>Move up</span>}
                      {i.recommendation.move === 'down' && <span className="mini-tag" style={{ color: 'var(--wrong)' }}>Move down</span>}
                      {i.recommendation.move === 'stay' && i.standing === 'needs-help' && <span className="mini-tag" style={{ color: 'var(--wrong)' }}>Needs help</span>}
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '2px' }}>
                      {i.recommendation.reason}
                    </div>
                  </div>
                  <Icon name="chevron" size={18} strokeWidth={2.4} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Roster ── */}
        <h2 style={{ fontSize: '1.12rem', margin: '4px 0 10px' }}>Everyone</h2>
        {rows.map(({ p, i }) => (
          <button key={p.pupilId} className="t-row" onClick={() => navigate(`/teacher/${p.pupilId}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', minWidth: 0 }}>
              <span className="display" style={{ fontSize: '1.02rem' }}>{p.name}</span>
              {!p.demo && <span className="mini-tag" style={{ color: 'var(--sun-dark)', fontSize: '0.58rem' }}>Live</span>}
              <span className="band-pill" style={{ background: READING_BANDS[p.band].colour, fontSize: '0.62rem', padding: '1px 8px' }}>{READING_BANDS[p.band].label}</span>
              <StandingChip standing={i.standing} />
              <span style={{ flex: 1 }} />
              <Icon name="chevron" size={17} strokeWidth={2.4} />
            </div>
            <div className="t-stats">
              <span><b>{p.wcpm}</b> wpm</span>
              <span><b>{i.accuracy === null ? '–' : `${i.accuracy}%`}</b> right</span>
              <span><b>{i.textsRead}</b>/{LIBRARY.length} read</span>
              <span><b>{i.pausesPer100 === null ? '–' : i.pausesPer100}</b> pauses</span>
            </div>
          </button>
        ))}

        <p style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '16px', lineHeight: 1.5 }}>
          Pauses are per hundred words. "Live" is the pupil logged in on this device; the rest are demo data.
        </p>
      </div>
    </div>
  );
}

// ═══ One pupil ════════════════════════════════════════════════════
export function TeacherPupil() {
  const navigate = useNavigate();
  const { pupilId } = useParams<{ pupilId: string }>();
  const teacher = getTeacherSession();
  const [version, setVersion] = useState(0);

  const pupil = useMemo(() => (pupilId ? findPupil(pupilId) : undefined), [pupilId, version]);
  const insight = useMemo(() => (pupil ? analysePupil(pupil) : null), [pupil]);

  if (!teacher) return null;
  if (!pupil || !insight) {
    return (
      <div className="page"><div className="wrap">
        <TeacherBar title="Pupil" back={() => navigate('/teacher')} />
        <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No pupil with that ID.</p>
      </div></div>
    );
  }

  const band = READING_BANDS[pupil.band];

  const moveTo = (b: BandKey) => {
    setBandOverride(pupil.pupilId, b);
    // If this child is logged in on this device, move them now
    const session = getKidSession();
    if (session && session.pupilId === pupil.pupilId) {
      saveKidSession({ ...session, band: b, wcpm: READING_BANDS[b].targetWcpm });
    }
    setVersion((v) => v + 1);
  };

  return (
    <div className="page">
      <div className="wrap">
        <TeacherBar title={pupil.name} back={() => navigate('/teacher')} />

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span className="band-pill" style={{ background: band.colour }}>{band.label} · {band.yearLabel}</span>
          <StandingChip standing={insight.standing} />
          {!pupil.demo && <span className="mini-tag" style={{ color: 'var(--sun-dark)' }}>Live data</span>}
        </div>
        <p style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '16px' }}>
          {insight.headline}
        </p>

        {/* ── Numbers ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div className="stat-tile"><div className="stat-value">{insight.accuracy === null ? '–' : `${insight.accuracy}%`}</div><div className="stat-label">Correct</div></div>
          <div className="stat-tile"><div className="stat-value">{pupil.wcpm}</div><div className="stat-label">Words / min</div></div>
          <div className="stat-tile"><div className="stat-value">{insight.pausesPer100 ?? '–'}</div><div className="stat-label">Pauses / 100</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          <div className="stat-tile"><div className="stat-value">{insight.textsRead}</div><div className="stat-label">Texts read</div></div>
          <div className="stat-tile"><div className="stat-value">{insight.wordsRead.toLocaleString()}</div><div className="stat-label">Words read</div></div>
          <div className="stat-tile"><div className="stat-value">{insight.lessons}</div><div className="stat-label">Spellings taught</div></div>
        </div>

        {/* ── Speed within band ── */}
        <div className="kid-card" style={{ padding: '15px 17px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            <span>{band.minWcpm} wpm</span><span>{band.label} range</span><span>{band.maxWcpm} wpm</span>
          </div>
          <div className="band-track" style={{ marginTop: '10px' }}>
            <div className="band-dot" style={{ left: `${insight.speedPosition * 100}%`, background: band.colour }} />
          </div>
        </div>

        {/* ── Recommendation ── */}
        <div className="kid-card" style={{ padding: '17px', marginBottom: '14px', borderColor: insight.recommendation.move === 'stay' ? undefined : (insight.recommendation.move === 'up' ? 'var(--correct)' : 'var(--wrong)') }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Icon name="lightbulb" size={20} colour={insight.recommendation.move === 'up' ? 'var(--correct)' : insight.recommendation.move === 'down' ? 'var(--wrong)' : 'var(--text)'} />
            <h2 style={{ fontSize: '1.1rem' }}>
              {insight.recommendation.move === 'up' && `Consider moving up to ${READING_BANDS[insight.recommendation.to!].label}`}
              {insight.recommendation.move === 'down' && `Consider moving down to ${READING_BANDS[insight.recommendation.to!].label}`}
              {insight.recommendation.move === 'stay' && `Stay at ${band.label}`}
            </h2>
          </div>
          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.5 }}>{insight.recommendation.reason}</p>
          {insight.recommendation.to && (
            <button onClick={() => moveTo(insight.recommendation.to!)} className="kid-btn kid-btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Move to {READING_BANDS[insight.recommendation.to].label}
            </button>
          )}
        </div>

        {/* ── Skills ── */}
        <div className="kid-card" style={{ padding: '17px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Reading skills</h2>
          {insight.skills.map((s) => (
            <div key={s.key} className="mastery-row">
              <div className="mastery-head" style={{ color: s.colour }}>
                <Icon name={s.key} size={16} strokeWidth={2.2} />
                {s.label}
                <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem' }}>· {s.asked} asked</span>
              </div>
              <div className="mastery-pct">{s.pct === null ? '–' : `${s.pct}%`}</div>
              <div className="mastery-track"><div className="mastery-fill" style={{ width: `${s.pct ?? 0}%`, background: s.colour }} /></div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <Verdict label="Excelling at" items={insight.strengths.map((s) => s.label)} colour="var(--correct)" />
            <Verdict label="Needs help with" items={insight.needsHelp.map((s) => s.label)} colour="var(--wrong)" />
          </div>
        </div>

        {/* ── Text types ── */}
        <div className="kid-card" style={{ padding: '17px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Kinds of writing</h2>
          <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>
            Comprehension by text type. Grey means not read yet.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {insight.types.map((t) => {
              const done = t.started > 0;
              return (
                <div key={t.key} className="type-chip" style={{
                  borderColor: done ? 'var(--border)' : 'var(--text-muted)',
                  background: done ? t.colour : 'transparent',
                  color: done ? '#FFF9EC' : 'var(--text-muted)',
                  opacity: done ? 1 : 0.5,
                }}>
                  <Icon name={t.key} size={14} strokeWidth={2.2} />
                  {t.label}
                  {t.pct !== null && <b>{t.pct}%</b>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <Verdict label="Strong in" items={insight.typesStrong.map((t) => t.label)} colour="var(--correct)" />
            <Verdict label="Weaker in" items={insight.typesWeak.map((t) => t.label)} colour="var(--wrong)" />
          </div>
        </div>

        {/* ── Statutory words ── */}
        <div className="kid-card" style={{ padding: '17px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Spelling list</h2>
          <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
            {insight.statutory.met} of {insight.statutory.total} met · {insight.statutory.listLabel}
          </p>
          <div className="track" style={{ height: '12px' }}>
            <div className="track-fill" style={{ width: `${Math.round((insight.statutory.met / insight.statutory.total) * 100)}%`, background: 'var(--sun)' }} />
          </div>
        </div>

        {/* ── Texts ── */}
        <div className="kid-card" style={{ padding: '17px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Texts</h2>
          {Object.keys(pupil.progress.texts).length === 0 ? (
            <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>Nothing started yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="t-table">
                <thead><tr><th>Text</th><th>Done</th><th>Right</th><th>Stops</th><th>Spelt</th></tr></thead>
                <tbody>
                  {LIBRARY.filter((t) => pupil.progress.texts[t.id]).map((text) => {
                    const r = pupil.progress.texts[text.id];
                    const total = toWordParagraphs(text).flat().length;
                    const pctDone = r.completed ? 100 : Math.round(((r.wordIndex + 1) / total) * 100);
                    return (
                      <tr key={text.id}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{text.title}</div>
                          <div style={{ fontSize: '0.68rem', color: TEXT_TYPES[text.textType].colour, fontWeight: 800 }}>{TEXT_TYPES[text.textType].label}</div>
                        </td>
                        <td>{pctDone}%</td>
                        <td>{r.asked ? `${r.correct}/${r.asked}` : '–'}</td>
                        <td>{r.pauses}</td>
                        <td>{r.lessons}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Band control ── */}
        <div className="kid-card" style={{ padding: '17px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Reading band</h2>
          <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
            Only you can change this. The child sees the gemstone, never the year group.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {BAND_ORDER.map((b) => {
              const meta = READING_BANDS[b];
              const active = pupil.band === b;
              return (
                <button key={b} onClick={() => moveTo(b)} className="band-choice" style={{
                  background: active ? meta.colour : 'var(--bg)',
                  color: active ? '#FFF9EC' : 'var(--text-muted)',
                  boxShadow: active ? '0 3px 0 var(--shadow-col)' : 'none',
                }}>
                  {meta.label} <small>{meta.yearLabel.replace('Year ', 'Y')}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Verdict({ label, items, colour }: { label: string; items: string[]; colour: string }) {
  return (
    <div style={{ flex: 1, minWidth: '9rem' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div>
      {items.length === 0
        ? <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>—</span>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{items.map((i) => <span key={i} className="mini-tag" style={{ color: colour }}>{i}</span>)}</div>}
    </div>
  );
}
