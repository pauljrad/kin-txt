import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useKidAuth } from '@/hooks/useKidAuth';
import { ThemeSelector } from '@/components/ThemeSelector';
import { loadProgress, buildLeaderboard } from '@/lib/progress';

export default function Leaderboard() {
  const { kid } = useKidAuth();
  const navigate = useNavigate();
  const rows = useMemo(
    () => (kid ? buildLeaderboard(loadProgress(), kid.name) : []),
    [kid],
  );

  if (!kid) return null;

  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '20px 18px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/')} className="kid-btn kid-btn-ghost" style={{ padding: '8px 14px', fontSize: '0.9rem' }}>
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <ThemeSelector />
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '2.6rem' }}>🏆</div>
          <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
            Class Leaderboard
          </h1>
        </div>

        {/* Ranked by reading and understanding — deliberately not by speed */}
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '22px', lineHeight: 1.5 }}>
          Ranked by texts read, then by how many questions you get right.
          <br />
          <span style={{ opacity: 0.75 }}>Reading speed is never ranked — understanding is what counts.</span>
        </p>

        {/* Column headings */}
        <div style={{
          display: 'grid', gridTemplateColumns: '38px 1fr auto auto auto',
          gap: '11px', padding: '0 15px 7px',
          fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          <div style={{ textAlign: 'center' }}>#</div>
          <div>Name</div>
          <div style={{ minWidth: '54px', textAlign: 'right' }}>Texts</div>
          <div style={{ minWidth: '54px', textAlign: 'right' }}>Right</div>
          <div style={{ minWidth: '54px', textAlign: 'right' }}>Coins</div>
        </div>

        {rows.map((row, i) => (
          <motion.div
            key={row.name + i}
            className={`lb-row${row.isMe ? ' me' : ''}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="lb-rank">{medal(i + 1)}</div>
            <div style={{ color: 'var(--text)', fontWeight: row.isMe ? 900 : 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.name}{row.isMe && ' (you)'}
            </div>
            <div className="lb-stat">{row.textsRead}</div>
            <div className="lb-stat">{row.accuracy}%</div>
            <div className="lb-stat">🪙 {row.coins}</div>
          </motion.div>
        ))}

        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px', opacity: 0.7 }}>
          Classmates shown are demo data.
        </p>
      </div>
    </div>
  );
}
