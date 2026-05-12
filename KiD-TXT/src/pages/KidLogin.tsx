import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginKid } from '@/lib/kidAuth';
import { useKidAuth } from '@/hooks/useKidAuth';

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
      setError('Please enter your name and pupil ID!');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // friendly small delay
    const kid = loginKid(name, pupilId);
    if (!kid) {
      setError("Hmm, we couldn't find those details. Ask your teacher!");
      setLoading(false);
      return;
    }
    setKid(kid);
    navigate('/');
  };

  return (
    <div
      style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      {/* Logo / header */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: '40px' }}
      >
        {/* Removed emoji */ }
        <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2.8rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
          KiD-TXT
        </h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1.05rem', marginTop: '6px' }}>
          Read. Learn. Grow!
        </p>
      </motion.div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="kid-card"
        style={{ width: '100%', maxWidth: '380px', padding: '36px 32px' }}
      >
        <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '24px', textAlign: 'center' }}>
          Who are you?
        </h2>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Your First Name
            </label>
            <input
              className="kid-input"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value.toUpperCase()); setError(''); }}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Your Pupil ID
            </label>
            <input
              className="kid-input"
              type="text"
              inputMode="numeric"
              value={pupilId}
              onChange={e => { setPupilId(e.target.value); setError(''); }}
              autoComplete="off"
              disabled={loading}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'color-mix(in srgb, var(--wrong) 12%, var(--bg))',
                border: '2px solid var(--wrong)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--wrong)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
              }}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            className="kid-btn kid-btn-primary"
            style={{ marginTop: '8px', width: '100%', fontSize: '1.15rem' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : "Let's Go!"}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '20px', fontWeight: 600 }}>
          Don't know your details? Ask your teacher!
        </p>
      </motion.div>
    </div>
  );
}
