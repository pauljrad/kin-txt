import { useEffect, useState } from 'react';
import { Loader2, PenLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ParsedText } from '@/lib/textParser';
import { parseCreatorMarkup } from '@/lib/creatorText';
import { CreatorExperience, resolvePublishedCreatorExperience, withCreatorExperienceDefaults } from '@/lib/creatorExperience';

interface CreatorPublication {
  id: string;
  creator_name: string;
  content_type: string;
  title: string;
  body: string;
  word_count: number;
  published_at: string;
  experience?: CreatorExperience | null;
}

interface CreatorJournalFeedProps {
  onSelectArticle: (
    parsed: ParsedText,
    title: string,
    meta: {
      creatorName: string;
      publicationId: string;
      emphasisWords: string[];
      whisperedWords: string[];
      creatorExperience?: CreatorExperience;
    },
  ) => void;
}

export function CreatorJournalFeed({ onSelectArticle }: CreatorJournalFeedProps) {
  const [items, setItems] = useState<CreatorPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('creator_publications' as any)
        .select('id, creator_name, content_type, title, body, word_count, published_at, experience')
        .order('published_at', { ascending: false });

      if (cancelled) return;
      if (loadError) {
        console.error('Could not load KiN-Creator publications:', loadError);
        setError('Could not load KiN-Creators right now.');
        setItems([]);
      } else {
        setItems((data ?? []) as CreatorPublication[]);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading KiN-Creators…
      </div>
    );
  }

  if (error) return <div className="py-14 text-center text-sm text-destructive">{error}</div>;

  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <PenLine className="w-10 h-10 mx-auto mb-4 text-muted-foreground/40" />
        <p className="font-display text-lg mb-1">KiN-Creators</p>
        <p className="text-sm text-muted-foreground">The first Creator TXTs will appear here after approval.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={async () => {
            if (openingId) return;
            setOpeningId(item.id);
            const parsed = parseCreatorMarkup(item.body);
            const rawExperience = withCreatorExperienceDefaults({
              ...(item.experience || {}),
              publicationId: item.id,
            });
            let creatorExperience = rawExperience;
            try {
              creatorExperience = await resolvePublishedCreatorExperience(item.id, rawExperience);
            } catch (err) {
              console.error('Could not resolve Creator media:', err);
            }
            onSelectArticle(parsed.parsedText, item.title, {
              creatorName: item.creator_name,
              publicationId: item.id,
              emphasisWords: parsed.emphasisWords,
              whisperedWords: parsed.whisperedWords,
              creatorExperience,
            });
            setOpeningId(null);
          }}
          className="group glass-panel p-5 text-left transition-all duration-300 hover:ring-2 hover:ring-primary/50 flex flex-col h-full justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{item.content_type}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(item.published_at).toLocaleDateString()}
              </span>
            </div>
            <h3 className="font-display font-medium text-lg leading-snug text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-4">
              {item.title}
            </h3>
            {openingId === item.id && (
              <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Preparing directed TXT…
              </div>
            )}
            <p className="text-xs text-muted-foreground line-clamp-3">
              {item.body.replace(/[*_]/g, '').slice(0, 150)}{item.body.length > 150 ? '…' : ''}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground font-medium truncate">By <span className="text-foreground/90">{item.creator_name}</span></p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.word_count} words</span>
          </div>
        </button>
      ))}
    </div>
  );
}
