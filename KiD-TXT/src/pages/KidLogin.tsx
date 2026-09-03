import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginKid } from '@/lib/kidAuth';
import { useKidAuth } from '@/hooks/useKidAuth';
import { Icon } from '@/components/art/Icon';
import { Scene } from '@/components/art/Scenes';

export default function KidLogin() {
  const [name, setName] = useState('');
  const [pupilId, setPupilId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setKid } = useKidAuth();
  const navigate = useNavigate();

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

        <div className="kid-card" style={{ padding: '24px 22px' }}>
          <h2 style={{ fontSize: '1.32rem', marginBottom: '18px', textAlign: 'center' }}>
            Who are you?
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="kid-name" style={labelStyle}>First name</label>
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
              <label htmlFor="kid-id" style={labelStyle}>Pupil ID</label>
              <input
                id="kid-id"
                className="kid-input"
                type="text"
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
          Don't know your details? Ask your teacher.
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
