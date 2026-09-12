import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginKid } from '@/lib/kidAuth';
import { loginTeacher } from '@/lib/teacherAuth';
import { useKidAuth } from '@/hooks/useKidAuth';
import { Icon } from '@/components/art/Icon';
import { Scene } from '@/components/art/Scenes';

export default function KidLogin() {
  const [name, setName] = useState('');
  const [pupilId, setPupilId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [who, setWho] = useState<'pupil' | 'teacher'>('pupil');
  const { setKid } = useKidAuth();
  const navigate = useNavigate();

  const switchTo = (w: 'pupil' | 'teacher') => { setWho(w); setError(''); setName(''); setPupilId(''); };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !pupilId.trim()) {
      setError('Type your name and your passcode.');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    const teacher = loginTeacher(name, pupilId);
    if (!teacher) {
      setError("Those details don't match.");
      setLoading(false);
      return;
    }
    navigate('/teacher');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !pupilId.trim()) {
      setError('Type your name and your pupil ID.');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    const kid = loginKid(name, pupilId);
    if (!kid) {
      setError("Those details don't match. Ask your teacher.");
      setLoading(false);
      return;
    }
    setKid(kid);
    navigate('/');
  };

  return (
    <div
      className="page"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ width: '100%', maxWidth: '25rem' }}>

        {/* A cover panel stands in for a logo — the art is the identity */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div
            style={{
              width: '100%', aspectRatio: '200 / 112', margin: '0 auto 18px',
              borderRadius: '20px', border: '3px solid var(--border)',
              boxShadow: '0 6px 0 var(--shadow-col)', overflow: 'hidden',
            }}
          >
            <Scene name="lighthouse-dawn" title="" />
          </div>

          <h1 style={{ fontSize: '2.7rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            KiD<span style={{ color: 'var(--accent)' }}>-</span>TXT
          </h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.98rem', marginTop: '4px' }}>
            Read. Learn. Grow.
          </p>
        </div>

        <div className="kid-card" style={{ padding: '22px 22px 24px' }}>
          <div className="seg" role="group" aria-label="Who is logging in">
            <button type="button" aria-pressed={who === 'pupil'} onClick={() => switchTo('pupil')}>
              <Icon name="person" size={17} /> Pupil
            </button>
            <button type="button" aria-pressed={who === 'teacher'} onClick={() => switchTo('teacher')}>
              <Icon name="clipboard" size={17} /> Teacher
            </button>
          </div>

          <h2 style={{ fontSize: '1.32rem', marginBottom: '18px', textAlign: 'center' }}>
            {who === 'pupil' ? 'Who are you?' : 'Teacher login'}
          </h2>

          <form onSubmit={who === 'pupil' ? handleLogin : handleTeacherLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="kid-name" style={labelStyle}>{who === 'pupil' ? 'First name' : 'Surname'}</label>
              <input
                id="kid-name"
                className="kid-input"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value.toUpperCase()); setError(''); }}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="kid-id" style={labelStyle}>{who === 'pupil' ? 'Pupil ID' : 'Passcode'}</label>
              <input
                id="kid-id"
                className="kid-input"
                type={who === 'teacher' ? 'password' : 'text'}
                inputMode="numeric"
                pattern="[0-9]*"
                value={pupilId}
                onChange={(e) => { setPupilId(e.target.value); setError(''); }}
                autoComplete="off"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="verdict bad nudge">
                <Icon name="close" size={19} strokeWidth={2.8} />
                <span style={{ fontSize: '0.92rem' }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="kid-btn kid-btn-primary"
              style={{ width: '100%', fontSize: '1.1rem', marginTop: '4px' }}
              disabled={loading}
            >
              {loading ? 'Checking…' : "Let's go"}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)',
          marginTop: '18px', fontWeight: 700,
        }}>
          {who === 'pupil' ? "Don't know your details? Ask your teacher." : 'Demo: PATEL · 1234'}
        </p>

      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 800,
  fontSize: '0.82rem',
  color: 'var(--text-muted)',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};
