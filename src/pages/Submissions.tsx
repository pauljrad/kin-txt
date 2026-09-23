import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Gauge, Music2, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const DRAFT_KEY = 'kinxt_first_book_draft';

interface BookForm {
  authorName: string;
  authorEmail: string;
  bookTitle: string;
  genre: string;
  wordCount: string;
  manuscriptLink: string;
  pitch: string;
}

const EMPTY_BOOK_FORM: BookForm = {
  authorName: '',
  authorEmail: '',
  bookTitle: '',
  genre: '',
  wordCount: '',
  manuscriptLink: '',
  pitch: '',
};

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm normal-case text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors';

function KiNTxtBrand() {
  return <span className="normal-case">KiN-TXT</span>;
}

function FeatureItem({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{text}</p>
      </div>
    </div>
  );
}

export default function Submissions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const isNative = Capacitor.isNativePlatform();

  // This page sells a one-off payment outside Apple's IAP system — Apple
  // rejects apps that expose that inside the native shell (Guideline 3.1.1).
  // It also has no reason to exist there: it's a website-only feature.
  useEffect(() => {
    if (isNative) navigate('/home', { replace: true });
  }, [isNative, navigate]);

  const paidParam = searchParams.get('paid');

  // ---- Writers Wanted ----
  const [writerForm, setWriterForm] = useState({ name: '', email: '', links: '', pitch: '' });
  const [writerStatus, setWriterStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [writerError, setWriterError] = useState('');

  // ---- First Book Open Call ----
  const [bookForm, setBookForm] = useState<BookForm>(EMPTY_BOOK_FORM);
  const [bookStatus, setBookStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'redirecting'>('idle');
  const [bookError, setBookError] = useState('');

  // Restore a draft saved before sending someone off to /pricing or to
  // Stripe, so leaving this page never loses their work.
  useEffect(() => {
    if (paidParam === 'success') {
      sessionStorage.removeItem(DRAFT_KEY);
      return;
    }
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setBookForm({ ...EMPTY_BOOK_FORM, ...JSON.parse(raw) });
    } catch {
      // Ignore a corrupted draft.
    }
  }, [paidParam]);

  const saveDraft = (form: BookForm) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // Storage unavailable — non-fatal, just no draft recovery.
    }
  };

  const validateBookForm = (): string | null => {
    if (!bookForm.authorName.trim()) return 'Enter your name.';
    if (!bookForm.bookTitle.trim()) return 'Enter your book title.';
    if (!bookForm.manuscriptLink.trim()) return 'Add a link to your manuscript.';
    if (!bookForm.pitch.trim()) return 'Add a short pitch.';
    return null;
  };

  const submitWriterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setWriterError('');
    if (!writerForm.name.trim() || !writerForm.email.trim() || !writerForm.pitch.trim()) {
      setWriterError('Name, email, and a note about yourself are required.');
      return;
    }
    setWriterStatus('sending');
    const { error } = await supabase.functions.invoke('submit-application', {
      body: { type: 'writer', ...writerForm },
    });
    if (error) {
      setWriterStatus('error');
      setWriterError('Something went wrong sending that — please try again, or email hello@kin-txt.com directly.');
      return;
    }
    setWriterStatus('sent');
  };

  const submitBookFree = async () => {
    const validationError = validateBookForm();
    if (validationError) {
      setBookError(validationError);
      return;
    }
    setBookError('');
    setBookStatus('sending');
    const { error } = await supabase.functions.invoke('submit-application', {
      body: { type: 'first-book-free', ...bookForm },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      setBookStatus('error');
      setBookError('Something went wrong sending that — please try again, or email hello@kin-txt.com directly.');
      return;
    }
    sessionStorage.removeItem(DRAFT_KEY);
    setBookStatus('sent');
  };

  const goUpgradeAndSubmit = () => {
    const validationError = validateBookForm();
    if (validationError) {
      setBookError(validationError);
      return;
    }
    setBookError('');
    saveDraft(bookForm);
    navigate('/pricing?returnTo=submissions');
  };

  const submitBookPaid = async () => {
    const validationError = validateBookForm();
    if (validationError) {
      setBookError(validationError);
      return;
    }
    if (!bookForm.authorEmail.trim()) {
      setBookError('Add your email so we can send a receipt and get in touch.');
      return;
    }
    setBookError('');
    saveDraft(bookForm);
    setBookStatus('redirecting');

    // Persist the full submission before involving Stripe. The checkout only
    // carries this durable row's UUID; payment and email become follow-up state.
    const { data: pendingData, error: pendingError } = await supabase.functions.invoke('submit-application', {
      body: { type: 'first-book-paid-pending', ...bookForm },
    });
    if (pendingError || !pendingData?.submissionId) {
      setBookStatus('error');
      setBookError('Could not save your submission before checkout — please try again in a moment.');
      return;
    }

    const { data, error } = await supabase.functions.invoke('create-submission-checkout-session', {
      body: {
        ...bookForm,
        // Existing checkout metadata field, now used only as a durable-record pointer.
        pitch: `submission:${pendingData.submissionId}`,
      },
    });
    if (error || !data?.url) {
      setBookStatus('error');
      setBookError('Your submission is saved, but checkout could not start — please try again in a moment.');
      return;
    }
    window.location.href = data.url;
  };

  // Both paid and Pro submissions are stored in Supabase before notification,
  // so Stripe metadata no longer limits the pitch length.
  const bookPitchLimit = 6000;

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <ThemeToggle />
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="absolute left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>

      <div className="flex-1 max-w-2xl mx-auto px-6 pt-[calc(6.5rem+env(safe-area-inset-top,0px))] pb-20 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Deliberately no text-transform here — the wordmark's lowercase
              "i" must survive, and an ancestor `uppercase` class would erase it. */}
          <p className="text-xs tracking-widest text-muted-foreground font-display mb-2"><KiNTxtBrand /></p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-3">Writers &amp; Submissions</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-lg">
            <KiNTxtBrand /> is open to writers at any age and any stage — first-timers and career authors alike.
            Opinion or fact, fiction or memoir, news, sport, travel, a single essay or a finished manuscript.
            If it's worth reading, if it's worth experiencing, and if you want to control the pace,
            rhythm, and emphasis of it, then we want to see it.
          </p>

          {/* ---------------------------------------------------------- */}
          {/* Shared: what publishing on KiN-TXT actually gives a writer */}
          {/* ---------------------------------------------------------- */}
          <div className="rounded-2xl border border-border bg-card/50 p-6 mb-12">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-1">The Format</p>
            <h2 className="font-display text-xl tracking-wide text-foreground mb-2">Your Words, Delivered Differently</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              <KiNTxtBrand /> isn't just a place where your writing is published — it’s a place where it’s performed.
              As the writer, you dictate how your piece is experienced, and have control of your TXT's:
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              <FeatureItem icon={Sparkles} label="Emphasis" text="Choose which words hit harder, and where the reader's eye should catch." />
              <FeatureItem icon={Gauge} label="Pace" text="Set the rhythm — where it races, where it holds, where it breathes." />
              <FeatureItem icon={Music2} label="Atmosphere" text="Pick the background music that plays behind your piece as it's read." />
              <FeatureItem
                icon={ImageIcon}
                label="Imagery — New"
                text={<>Full-screen images that appear inside the text, exactly where you place them. A <KiNTxtBrand /> first, launching with our published writers.</>}
              />
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Writers Wanted */}
          {/* ---------------------------------------------------------- */}
          <section className="mb-16">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-1">Ongoing</p>
            <h2 className="font-display text-2xl tracking-wide text-foreground mb-2">Writers Wanted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Be one of the first names on <KiNTxtBrand />. We're building a small, ongoing roster of contributors —
              in-house writers whose work becomes part of the platform itself, not a one-off byline. Opinion or
              fact, fiction or reporting, a running column or a single short story: write with total freedom.
              Every piece you publish is instantly shareable to your own socials, presented exactly the way
              readers experience the rest of <KiNTxtBrand />.
            </p>

            {writerStatus === 'sent' ? (
              <div className="rounded-2xl border border-border bg-card/50 p-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-foreground shrink-0" />
                <p className="text-sm text-foreground">Got it — thank you. We read every application and will be in touch.</p>
              </div>
            ) : (
              <form onSubmit={submitWriterForm} className="rounded-2xl border border-border bg-card/50 p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={writerForm.name}
                    onChange={(e) => setWriterForm((f) => ({ ...f, name: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={writerForm.email}
                    onChange={(e) => setWriterForm((f) => ({ ...f, email: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Portfolio, published work, or a writing sample (recommended)"
                  value={writerForm.links}
                  onChange={(e) => setWriterForm((f) => ({ ...f, links: e.target.value }))}
                  className={FIELD_CLASS}
                />
                <textarea
                  placeholder="Tell us who you are, what you write, and why KiN-TXT should be reading it"
                  value={writerForm.pitch}
                  onChange={(e) => setWriterForm((f) => ({ ...f, pitch: e.target.value }))}
                  maxLength={4000}
                  rows={5}
                  className={`${FIELD_CLASS} resize-none`}
                />

                {writerError && <p className="text-xs text-destructive">{writerError}</p>}

                <button
                  type="submit"
                  disabled={writerStatus === 'sending'}
                  className="w-full h-12 rounded-xl font-display tracking-widest uppercase text-sm bg-foreground text-background hover:bg-foreground/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {writerStatus === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {writerStatus === 'sending' ? 'Sending…' : 'Apply Now'}
                </button>
              </form>
            )}
          </section>

          <div className="h-px bg-border mb-16" />

          {/* ---------------------------------------------------------- */}
          {/* First Book Open Call */}
          {/* ---------------------------------------------------------- */}
          <section>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-1">Open Call</p>
            <h2 className="font-display text-2xl tracking-wide text-foreground mb-2">The <KiNTxtBrand /> First Book</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              We're looking for the first book we will ever publish. One writer. One manuscript. The beginning
              of <KiNTxtBrand /> as a publishing house — and you could be the name it starts with.
            </p>

            <div className="rounded-xl border border-foreground/30 bg-foreground/5 p-5 mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-1">Author Royalty</p>
              <p className="font-display text-5xl text-foreground mb-2">60%</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every sale goes through the <KiNTxtBrand /> app, and 60% of everything it earns goes straight to you.
                Traditional publishing deals typically pay authors 5–15%. This is a real book deal, not a
                competition — and we think our first author should be treated like a partner, not a supplier.
              </p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              As our first published author, your book gets the full treatment above — emphasis, pace,
              atmosphere, and full-screen imagery, built around your text with you.
            </p>

            {paidParam === 'success' && (
              <div className="rounded-2xl border border-border bg-card/50 p-6 flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-5 h-5 text-foreground shrink-0" />
                <p className="text-sm text-foreground">Payment received and your entry is in. Thank you — we read every submission.</p>
              </div>
            )}
            {paidParam === 'cancelled' && (
              <div className="rounded-2xl border border-border bg-card/50 p-4 mb-6">
                <p className="text-xs text-muted-foreground">Payment was cancelled. Your entry is still here — pick up where you left off below.</p>
              </div>
            )}

            {bookStatus === 'sent' ? (
              <div className="rounded-2xl border border-border bg-card/50 p-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-foreground shrink-0" />
                <p className="text-sm text-foreground">Entry received — thank you. We read every submission.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card/50 p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Author name"
                    value={bookForm.authorName}
                    onChange={(e) => setBookForm((f) => ({ ...f, authorName: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                  <input
                    type="email"
                    placeholder={user ? `Email (${user.email})` : 'Email'}
                    value={bookForm.authorEmail}
                    onChange={(e) => setBookForm((f) => ({ ...f, authorEmail: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Book title"
                  value={bookForm.bookTitle}
                  onChange={(e) => setBookForm((f) => ({ ...f, bookTitle: e.target.value }))}
                  className={FIELD_CLASS}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Genre / theme (fiction, poetry, essays, memoir…)"
                    value={bookForm.genre}
                    onChange={(e) => setBookForm((f) => ({ ...f, genre: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Word count"
                    value={bookForm.wordCount}
                    onChange={(e) => setBookForm((f) => ({ ...f, wordCount: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Link to your manuscript (Google Drive, Dropbox — set to 'anyone with the link')"
                  value={bookForm.manuscriptLink}
                  onChange={(e) => setBookForm((f) => ({ ...f, manuscriptLink: e.target.value }))}
                  className={FIELD_CLASS}
                />
                <div>
                  <textarea
                    placeholder="What is it, who is it for, and why does it deserve to be KiN-TXT's first book?"
                    value={bookForm.pitch}
                    onChange={(e) => setBookForm((f) => ({ ...f, pitch: e.target.value.slice(0, bookPitchLimit) }))}
                    maxLength={bookPitchLimit}
                    rows={5}
                    className={`${FIELD_CLASS} resize-none`}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Up to {bookPitchLimit.toLocaleString()} characters.
                  </p>
                </div>

                {bookError && <p className="text-xs text-destructive">{bookError}</p>}

                <div className="pt-2 space-y-3">
                  {subscriptionLoading ? (
                    <div className="h-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Pro membership…
                    </div>
                  ) : isSubscribed ? (
                    <button
                      onClick={submitBookFree}
                      disabled={bookStatus === 'sending'}
                      className="w-full h-12 rounded-xl font-display tracking-widest uppercase text-sm bg-foreground text-background hover:bg-foreground/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {bookStatus === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {bookStatus === 'sending' ? 'Submitting…' : 'Submit Free — Pro Member'}
                    </button>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground text-center">
                        Free for <KiNTxtBrand /> Pro members. Otherwise, submit for £10.
                      </p>
                      <button
                        onClick={goUpgradeAndSubmit}
                        className="w-full h-12 rounded-xl font-display tracking-widest uppercase text-sm border border-foreground/40 text-foreground hover:bg-foreground/10 transition-all"
                      >
                        {user ? 'Reactivate Pro & Submit Free' : 'Join Pro & Submit Free'}
                      </button>
                      <button
                        onClick={submitBookPaid}
                        disabled={bookStatus === 'redirecting'}
                        className="w-full h-12 rounded-xl font-display tracking-widest uppercase text-sm bg-foreground text-background hover:bg-foreground/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {bookStatus === 'redirecting' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {bookStatus === 'redirecting' ? 'Redirecting to payment…' : 'Pay £10 & Submit'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </motion.div>
      </div>
    </div>
  );
}