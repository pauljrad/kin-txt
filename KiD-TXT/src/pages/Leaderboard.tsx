import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useKidAuth } from '@/hooks/useKidAuth';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Icon } from '@/components/art/Icon';
import { loadProgress, buildLeaderboard } from '@/lib/progress';
import { demoPupils } from '@/lib/classData';

const MEDAL = ['#EDB230', '#B9BCC0', '#C08552'];

export default function Leaderboard() {
  const { kid } = useKidAuth();
  const navigate = useNavigate();
  const rows = useMemo(
    () => (kid ? buildLeaderboard(loadProgress(), kid.name, demoPupils()) : []),
    [kid],
  );

  if (!kid) return null;

  return (
    <div className="page">
      <div className="wrap">

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => navigate('/')} className="icon-btn" aria-label="Back">
            <Icon name="back" size={22} strokeWidth={2.4} />
          </button>
          <div style={{ flex: 1 }} />
          <ThemeSelector />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <Icon name="trophy" size={52} colour="var(--sun)" strokeWidth={1.7} />
          </div>
          <h1 style={{ fontSize: '1.9rem' }}>Class Leaderboard</h1>
        </div>

        <p style={{
          fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)',
          textAlign: 'center', margin: '0 auto 22px', lineHeight: 1.5, maxWidth: '24rem',
        }}>
          Ranked by texts read, then by questions you get right.
          Reading speed is never ranked.
        </p>

        {rows.map((row, i) => (
          <div key={row.name + i} className={`lb-row${row.isMe ? ' me' : ''}`}>
            <div className="lb-rank" style={{ color: i < 3 ? MEDAL[i] : 'var(--text-muted)' }}>
              {i < 3 ? <Icon name="star" size={22} colour={MEDAL[i]} strokeWidth={2.2} /> : i + 1}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '1.02rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {row.name}{row.isMe && ' (you)'}
              </div>
              <div className="lb-stat">
                {row.textsRead} read · {row.accuracy}% correct
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '0.95rem',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <Icon name="coin" size={17} />
              {row.coins}
            </div>
          </div>
        ))}

        <p style={{
          fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)',
          textAlign: 'center', marginTop: '18px', opacity: 0.75,
        }}>
          Classmates shown are demo data.
        </p>

      </div>
    </div>
  );
}
