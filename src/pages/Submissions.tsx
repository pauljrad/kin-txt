import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Gauge, Music2, Image as ImageIcon, UploadCloud, FileText, type LucideIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const DRAFT_KEY = 'kinxt_first_book_draft';
const MANUSCRIPT_BUCKET = 'manuscript-submissions';
const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024;
const MANUSCRIPT_ACCEPT = '.pdf,.doc,.docx,.rtf,.txt,.epub,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,text/plain,application/epub+zip';

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
  const [manuscriptUploading, setManuscriptUploading] = useState(false);
  const [manuscriptUploadError, setManuscriptUploadError] = useState('');

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
    if (!bookForm.manuscriptLink.trim()) return 'Add a manuscript link or upload your manuscript.';
    if (!bookForm.pitch.trim()) return 'Add a short pitch.';
    return null;
  };

  const uploadedManuscriptPath = bookForm.manuscriptLink.startsWith(`storage://${MANUSCRIPT_BUCKET}/`)
    ? bookForm.manuscriptLink.slice(`storage://${MANUSCRIPT_BUCKET}/`.length)
    : '';
  const uploadedManuscriptName = uploadedManuscriptPath
    ? uploadedManuscriptPath.split('/').pop()?.replace(/^[0-9a-f-]{36}-/i, '') || 'manuscript'
    : '';

  const uploadManuscript = async (file: File) => {
    setManuscriptUploadError('');

    if (file.size > MAX_MANUSCRIPT_BYTES) {
      setManuscriptUploadError('That file is over 50 MB. Please upload a smaller file or use a share link instead.');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'doc', 'docx', 'rtf', 'txt', 'epub'].includes(extension)) {
      setManuscriptUploadError('Use PDF, DOC, DOCX, RTF, TXT or EPUB.');
      return;
    }

    setManuscriptUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-manuscript-upload', {
        body: {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        },
      });

      if (error || !data?.path || !data?.token) {
        throw error || new Error('Could not prepare manuscript upload.');
      }

      const { error: uploadError } = await supabase.storage
        .from(MANUSCRIPT_BUCKET)
        .uploadToSignedUrl(data.path, data.token, file, {
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) throw uploadError;

      setBookForm((current) => ({
        ...current,
        manuscriptLink: `storage://${MANUSCRIPT_BUCKET}/${data.path}`,
      }));
    } catch (err) {
      console.error('Manuscript upload failed:', err);
      setManuscriptUploadError('The manuscript could not be uploaded. Please try again or use a share link.');
    } finally {
      setManuscriptUploading(false);
    }
  };

  const submitWriterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setWriterError('');
    if (!writerForm.name.trim() || !writerForm.email.trim()) {
      setWriterError('Name and email are required.');
      return;
    }
    if (!writerForm.links.trim() && !writerForm.pitch.trim()) {
      setWriterError('Add a link to your work, paste a writing sample, or do both.');
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

  if (paidParam === 'success') {
    return (
      <div
        className="min-h-[100svh] bg-background flex flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <ThemeToggle />
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="mx-auto mb-7 w-20 h-20 rounded-full border border-foreground/30 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-foreground" />
            </motion.div>

            <p className="text-xs tracking-[0.22em] text-muted-foreground font-display mb-3">
              <KiNTxtBrand /> First Book
            </p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground leading-tight">
              Payment received.
            </h1>
            <p className="font-display text-2xl sm:text-3xl tracking-wide text-foreground mt-2">
              Your submission is in.
            </p>

            <div className="mt-7 rounded-2xl border border-border bg-card/50 p-5 text-left">
              <p className="text-sm text-foreground leading-relaxed">
                Your £10 payment has been completed and we've received your manuscript and submission details.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                We read every submission. If we need anything else, we'll contact you using the email address you supplied.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/home')}
              className="mt-7 w-full h-14 rounded-xl bg-foreground text-background font-display tracking-widest uppercase text-sm hover:bg-foreground/90 transition-colors"
            >
              Return to KiN-TXT
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

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
              As the writer, you dictate how your piece is experienced, by controlling your TXT’s:
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              <FeatureItem icon={Sparkles} label="Emphasis" text="Choose which words hit harder, how large they arrive, and exactly where and when to grab the reader’s eye." />
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
              Every piece approved for publication on <KiNTxtBrand /> is instantly shareable to your own socials,
              presented exactly as readers experience it on the platform. Our review isn't about rewriting your
              voice or imposing a house style — we mainly make sure your piece works as a <KiNTxtBrand /> experience:
              that the pacing, emphasis, imagery, audio and formatting all function properly. If something needs
              adjusting, we'll work with you to get it right while keeping the writing yours.
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
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Portfolio or published work</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Link us to your portfolio, website, Substack, published article or anywhere else we can read your work.
                    </p>
                  </div>
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="https://…"
                    value={writerForm.links}
                    onChange={(e) => setWriterForm((f) => ({ ...f, links: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="flex items-center gap-3 py-1" aria-hidden="true">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-display">Or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Show us what you write</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      No portfolio? Paste something here — an excerpt, article, opening, short piece, poem or anything that gives us a feel for your voice. It doesn't need to be finished.
                    </p>
                  </div>
                  <textarea
                    placeholder="Paste your writing here…"
                    value={writerForm.pitch}
                    onChange={(e) => setWriterForm((f) => ({ ...f, pitch: e.target.value }))}
                    maxLength={20000}
                    rows={12}
                    className={`${FIELD_CLASS} min-h-[18rem] resize-y leading-relaxed`}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">You only need to provide one option above — but you're welcome to include both.</p>
                    <p className="text-[11px] text-muted-foreground shrink-0">{writerForm.pitch.length.toLocaleString()} / 20,000</p>
                  </div>
                </div>

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
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              We're looking for the first book we will ever publish. One writer. One manuscript. The beginning
              of <KiNTxtBrand /> as a publishing house — and you could be the name it starts with.
            </p>
            <div className="rounded-xl border border-border bg-card/40 p-4 mb-6">
              <p className="text-sm font-medium text-foreground">Unsolicited submissions are welcome.</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                You do not need a literary agent, an existing publisher or previous publishing credits to submit.
                We accept manuscripts directly from writers.
              </p>
            </div>

            <div className="rounded-xl border border-foreground/30 bg-foreground/5 p-5 mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-1">Author Royalty</p>
              <p className="font-display text-5xl text-foreground mb-2">60%</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every sale goes through the <KiNTxtBrand /> app, and 60% of everything it earns goes straight to you.
                Traditional publishing deals typically pay authors 5–15%.
              </p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              As our first published author, your book will receive the full <KiNTxtBrand /> Creator treatment.
              We'll work with you to deliver the most powerful version of your work by refining how it’s experienced —
              fine-tuning how each chapter, paragraph and sentence lands through emphasis, pace, rhythm, atmosphere,
              full-screen imagery and audio.
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
                  <label className="space-y-2">
                    <span className="block text-xs text-muted-foreground">Author name</span>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={bookForm.authorName}
                      onChange={(e) => setBookForm((f) => ({ ...f, authorName: e.target.value }))}
                      className={FIELD_CLASS}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="block text-xs text-muted-foreground">Email</span>
                    <input
                      type="email"
                      placeholder={user?.email || 'you@example.com'}
                      value={bookForm.authorEmail}
                      onChange={(e) => setBookForm((f) => ({ ...f, authorEmail: e.target.value }))}
                      className={FIELD_CLASS}
                    />
                  </label>
                </div>

                <label className="space-y-2 block">
                  <span className="block text-xs text-muted-foreground">Book title</span>
                  <input
                    type="text"
                    placeholder="Title of your manuscript"
                    value={bookForm.bookTitle}
                    onChange={(e) => setBookForm((f) => ({ ...f, bookTitle: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="block text-xs text-muted-foreground">Genre / theme</span>
                    <input
                      type="text"
                      placeholder="Fiction, poetry, essays, memoir…"
                      value={bookForm.genre}
                      onChange={(e) => setBookForm((f) => ({ ...f, genre: e.target.value }))}
                      className={FIELD_CLASS}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="block text-xs text-muted-foreground">Approx. word count</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 72,000"
                      value={bookForm.wordCount}
                      onChange={(e) => setBookForm((f) => ({ ...f, wordCount: e.target.value }))}
                      className={FIELD_CLASS}
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/20 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Your manuscript</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Send us a viewing link or upload the file directly. Either option is fine.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Link to manuscript</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Google Drive, Dropbox, OneDrive or similar is fine. Make sure access is set to
                      “Anyone with the link can view” (or equivalent) and test that it opens without requesting permission.
                      View-only access is enough — please don't grant edit access.
                    </p>
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://…"
                      value={uploadedManuscriptPath ? '' : bookForm.manuscriptLink}
                      disabled={Boolean(uploadedManuscriptPath)}
                      onChange={(e) => setBookForm((f) => ({ ...f, manuscriptLink: e.target.value }))}
                      className={`${FIELD_CLASS} disabled:opacity-50`}
                    />
                  </div>

                  <div className="flex items-center gap-3" aria-hidden="true">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-display">Or upload</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {uploadedManuscriptPath ? (
                    <div className="rounded-xl border border-foreground/20 bg-foreground/5 p-3 flex items-center gap-3">
                      <FileText className="w-5 h-5 shrink-0 text-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{uploadedManuscriptName}</p>
                        <p className="text-[11px] text-muted-foreground">Uploaded privately and ready to submit.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookForm((f) => ({ ...f, manuscriptLink: '' }))}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className={`w-full min-h-24 rounded-xl border border-dashed border-border bg-card/30 px-4 py-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors hover:bg-card/60 ${manuscriptUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                      {manuscriptUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                      <span className="text-sm text-foreground">{manuscriptUploading ? 'Uploading manuscript…' : 'Choose manuscript file'}</span>
                      <span className="text-[11px] text-muted-foreground">PDF, DOCX, DOC, RTF, TXT or EPUB · up to 50 MB</span>
                      <input
                        type="file"
                        accept={MANUSCRIPT_ACCEPT}
                        className="hidden"
                        disabled={manuscriptUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadManuscript(file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  )}

                  {manuscriptUploadError && (
                    <p className="text-xs text-destructive">{manuscriptUploadError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Tell us about the book</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      What is it, who is it for, and why should it become <KiNTxtBrand />'s first published book?
                    </p>
                  </div>
                  <textarea
                    placeholder="Tell us about your manuscript…"
                    value={bookForm.pitch}
                    onChange={(e) => setBookForm((f) => ({ ...f, pitch: e.target.value.slice(0, bookPitchLimit) }))}
                    maxLength={bookPitchLimit}
                    rows={7}
                    className={`${FIELD_CLASS} min-h-[12rem] resize-y leading-relaxed`}
                  />
                  <p className="text-xs text-muted-foreground">
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