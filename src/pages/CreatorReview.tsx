import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import { KineticPlayer } from '@/components/KineticPlayer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { parseCreatorMarkup } from '@/lib/creatorText';
import type { CreatorExperience } from '@/lib/creatorExperience';

interface ReviewSubmission {
  id: string;
  creatorName: string;
  contentType: string;
  title: string;
  body: string;
  wordCount: number;
  submittedAt: string;
  experience?: CreatorExperience;
}

export default function CreatorReview() {
  const token = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
  const [submission, setSubmission] = useState<ReviewSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const parsed = useMemo(() => submission ? parseCreatorMarkup(submission.body) : null, [submission]);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('This review link is invalid.');
        setLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('creator-review', {
        body: { token, action: 'view' },
      });

      if (fnError || !data?.success) {
        setError(data?.error || 'This review link has expired or has already been used.');
      } else {
        setSubmission(data.submission as ReviewSubmission);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const review = async (action: 'approve' | 'reject') => {
    if (!submission || busy) return;
    setBusy(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('creator-review', {
      body: { token, action },
    });

    if (fnError || !data?.success) {
      setError(data?.error || 'Could not complete the review.');
      setBusy(false);
      return;
    }

    setResult(action === 'approve' ? 'approved' : 'rejected');
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    setBusy(false);
  };

  if (previewing && submission && parsed) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <KineticPlayer
          parsedText={parsed.parsedText}
          emphasisWords={parsed.emphasisWords}
          whisperedWords={parsed.whisperedWords}
          creatorExperience={submission.experience}
          onBack={() => setPreviewing(false)}
          attribution={{ author: submission.creatorName, source: 'KiN-Creator Review' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background text-foreground px-5 py-[calc(5rem+env(safe-area-inset-top,0px))]">
      <ThemeToggle />
      <main className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">Private KiN-Creator Review</p>

        {loading ? (
          <div className="py-24 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Opening TXT…
          </div>
        ) : result ? (
          <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
            {result === 'approved' ? <CheckCircle2 className="w-9 h-9 mx-auto mb-4" /> : <XCircle className="w-9 h-9 mx-auto mb-4" />}
            <h1 className="font-display text-3xl mb-2">{result === 'approved' ? 'Published' : 'Not published'}</h1>
            <p className="text-sm text-muted-foreground">
              {result === 'approved' ? 'This TXT is now live in Journal → KiN-Creators.' : 'This TXT has been rejected and the review link is now closed.'}
            </p>
          </div>
        ) : error || !submission ? (
          <div className="rounded-2xl border border-border bg-card/60 p-8">
            <h1 className="font-display text-2xl mb-3">Review unavailable</h1>
            <p className="text-sm text-muted-foreground">{error || 'This review link is unavailable.'}</p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-4xl tracking-wide mb-2">{submission.title}</h1>
            <p className="text-sm text-muted-foreground mb-7">
              {submission.creatorName} · {submission.contentType} · {submission.wordCount} words
            </p>

            <div className="rounded-2xl border border-border bg-card/50 p-5 mb-5">
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                This link is the approval credential. It can be used once; approving or rejecting closes it permanently.
              </p>
              {submission.experience && (
                <p className="text-[11px] text-muted-foreground mb-4">
                  Directed experience · {submission.experience.images?.length || 0} image moment{(submission.experience.images?.length || 0) === 1 ? '' : 's'} · {
                    submission.experience.music?.kind === 'upload'
                      ? 'Creator audio'
                      : submission.experience.music?.kind === 'kin'
                        ? `KiN ${submission.experience.music.track || 'music'}`
                        : 'No music'
                  } · {submission.experience.defaults?.startSpeed?.toFixed?.(2) || '0.50'}× opening speed
                </p>
              )}
              <button
                onClick={() => setPreviewing(true)}
                className="w-full h-12 rounded-xl border border-foreground/30 hover:bg-secondary transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Play className="w-4 h-4" /> Preview as KiN-TXT
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 px-5 py-5 max-h-[42vh] overflow-y-auto mb-5">
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                {submission.body.replace(/[*_]/g, '')}
              </div>
            </div>

            {error && <p className="text-sm text-destructive mb-4">{error}</p>}

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => review('reject')}
                disabled={busy}
                className="h-12 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => review('approve')}
                disabled={busy}
                className="h-12 rounded-xl bg-foreground text-background font-display tracking-wider uppercase text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Approve & Publish
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
