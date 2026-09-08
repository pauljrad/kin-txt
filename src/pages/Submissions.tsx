import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
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
  'w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors';

export default function Submissions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, session } = useAuth();
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

  // Restore a draft saved before sending someone off to /register or to
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

  const submitBookSignUpFree = () => {
    const validationError = validateBookForm();
    if (validationError) {
      setBookError(validationError);
      return;
    }
    setBookError('');
    saveDraft(bookForm);
    navigate('/register');
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
    const { data, error } = await supabase.functions.invoke('create-submission-checkout-session', {
      body: bookForm,
    });
    if (error || !data?.url) {
      setBookStatus('error');
      setBookError('Could not start checkout — please try again in a moment.');
      return;
    }
    window.location.href = data.url;
  };

  const bookPitchLimit = user ? 6000 : 490;

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
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">KiN-TXT</p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-3">Writers &amp; Submissions</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-12 max-w-lg">
            KiN-TXT is open to writers at any age and any stage — first-timers and career authors alike.
            Fiction, poetry, essays, news, sport, travel, memoir, whatever you've got. If it's worth reading
            one word at a time, we want to see it.
          </p>

          {/* ---------------------------------------------------------- */}
          {/* Writers Wanted */}
          {/* ---------------------------------------------------------- */}
          <section className="mb-16">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-1">Ongoing</p>
            <h2 className="font-display text-2xl tracking-wide text-foreground mb-2">Writers Wanted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              We're always looking for regular contributors — people who want their words read on KiN-TXT
              on an ongoing basis. Tell us who you are and what you write.
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
                  placeholder="Links / portfolio / published work (optional)"
                  value={writerForm.links}
                  onChange={(e) => setWriterForm((f) => ({ ...f, links: e.target.value }))}
                  className={FIELD_CLASS}
                />
                <textarea
                  placeholder="Tell us about yourself and what you'd want to write for KiN-TXT"
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
                  {writerStatus === 'sending' ? 'Sending…' : 'Apply to Write for KiN-TXT'}
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
            <h2 className="font-display text-2xl tracking-wide text-foreground mb-2">The KiN-TXT First Book</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              We're looking for the first book we will ever publish. One writer. One manuscript. The beginning
              of KiN-TXT as a publishing house.
            </p>
            <p className="text-sm text-foreground font-semibold mb-6">Author royalty: 60%.</p>

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
                    placeholder="Short pitch — what is it, and why should we read it?"
                    value={bookForm.pitch}
                    onChange={(e) => setBookForm((f) => ({ ...f, pitch: e.target.value.slice(0, bookPitchLimit) }))}
                    maxLength={bookPitchLimit}
                    rows={5}
                    className={`${FIELD_CLASS} resize-none`}
                  />
                  {!user && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Keep it under {bookPitchLimit} characters for a paid entry. Sign up free below for more room.
                    </p>
                  )}
                </div>

                {bookError && <p className="text-xs text-destructive">{bookError}</p>}

                <div className="pt-2 space-y-3">
                  {user ? (
                    <button
                      onClick={submitBookFree}
                      disabled={bookStatus === 'sending'}
                      className="w-full h-12 rounded-xl font-display tracking-widest uppercase text-sm bg-foreground text-background hover:bg-foreground/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {bookStatus === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {bookStatus === 'sending' ? 'Submitting…' : `Submit Free — Signed in as ${user.email}`}
                    </button>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground text-center">
                        Free if you sign up to KiN-TXT on the website. £10 to submit without an account.
                      </p>
                      <button
                        onClick={submitBookSignUpFree}
                        className="w-full h-12 rounded-xl font-display tracking-widest uppercase text-sm border border-foreground/40 text-foreground hover:bg-foreground/10 transition-all"
                      >
                        Sign Up Free &amp; Submit
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
