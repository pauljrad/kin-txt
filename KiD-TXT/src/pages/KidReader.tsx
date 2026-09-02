import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { KidKineticPlayer, type ParsedText } from '@/components/KidKineticPlayer';
import { useKidAuth } from '@/hooks/useKidAuth';
import { getText, toWordParagraphs } from '@/lib/library';

export default function KidReader() {
  const { kid } = useKidAuth();
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const text = bookId ? getText(bookId) : undefined;

  const parsed: ParsedText | null = useMemo(() => {
    if (!text) return null;
    return {
      id: text.id,
      title: text.title,
      paragraphs: toWordParagraphs(text),
    };
  }, [text]);

  if (!kid) return null;

  if (!parsed) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px',
      }}>
        <div style={{ fontSize: '3rem' }}>📚</div>
        <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          We can't find that book
        </h2>
        <button onClick={() => navigate('/')} className="kid-btn kid-btn-primary">
          ← Back to Library
        </button>
      </div>
    );
  }

  return <KidKineticPlayer parsedText={parsed} onBack={() => navigate('/')} />;
}
