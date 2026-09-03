import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { KidKineticPlayer, type ParsedText } from '@/components/KidKineticPlayer';
import { useKidAuth } from '@/hooks/useKidAuth';
import { getText, toWordParagraphs } from '@/lib/library';
import { Icon } from '@/components/art/Icon';

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
      <div className="page" style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center',
      }}>
        <Icon name="narrative" size={56} colour="var(--text-muted)" strokeWidth={1.6} />
        <h2 style={{ fontSize: '1.4rem' }}>We can't find that book</h2>
        <button onClick={() => navigate('/')} className="kid-btn kid-btn-primary">
          Back to Library
        </button>
      </div>
    );
  }

  return <KidKineticPlayer parsedText={parsed} onBack={() => navigate('/')} />;
}
