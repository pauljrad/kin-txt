import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKidAuth } from '@/hooks/useKidAuth';
import { logoutKid } from '@/lib/kidAuth';
import { AvatarCanvas } from '@/components/kids/AvatarCanvas';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useNavigate } from 'react-router-dom';

export default function KidsProfile() {
  const { kid, setKid } = useKidAuth();
  const navigate = useNavigate();
  const [showCanvas, setShowCanvas] = useState(false);

  const handleLogout = () => {
    logoutKid();
    setKid(null);
    navigate('/login');
  };

  if (!kid) return null;

  return (
    <>
      <AnimatePresence>
        {showCanvas && <AvatarCanvas onClose={() => setShowCanvas(false)} />}
      </AnimatePresence>

      <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Top bar */}
        <div style={{ width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '32px' }}>
          <button onClick={() => navigate('/')} className="kid-btn kid-btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            ← Back
          </button>
        </div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', marginBottom: '32px' }}
        >
          <div
            onClick={() => setShowCanvas(true)}
            title="Tap to draw your avatar!"
            style={{
              width: '150px', height: '150px', borderRadius: '50%',
              background: 'var(--bg-card)', border: '4px solid var(--border)',
              margin: '0 auto 16px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 8px 24px var(--shadow)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
          >
            {kid.avatarData ? (
              <img src={kid.avatarData} alt="My avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem' }}>Avatar</div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>Tap to draw!</p>
              </div>
            )}
          </div>

          <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2.2rem', fontWeight: 800, color: 'var(--text)' }}>
            {kid.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Pupil ID: {kid.pupilId}</p>
        </motion.div>

        {/* Stats card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="kid-card"
          style={{ width: '100%', maxWidth: '480px', padding: '28px', marginBottom: '24px', textAlign: 'center' }}
        >
          <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text)' }}>
            My Reading
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)', fontFamily: "'Baloo 2', sans-serif" }}>1</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Book Started</div>
              </div>
              <div style={{ opacity: 0.4 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-muted)', fontFamily: "'Baloo 2', sans-serif" }}>⭐</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>0 Stars</div>
              </div>
            </div>

            <div style={{ 
              background: 'var(--bg-elevated)', 
              padding: '12px 16px', 
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              border: '2px dashed var(--border)',
              maxWidth: '300px'
            }}>
              ⭐ Finish reading a book to get your first reading star!
            </div>
          </div>
        </motion.div>

        {/* Logout */}
        <button onClick={handleLogout} className="kid-btn kid-btn-ghost" style={{ marginTop: '8px' }}>
          Log Out
        </button>
      </div>
    </>
  );
}
