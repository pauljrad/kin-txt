import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Gauge, Music2, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';

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
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) navigate('/home', { replace: true });
  }, [isNative, navigate]);

  const [writerForm, setWriterForm] = useState({ name: '', email: '', links: '', pitch: '' });
  const [writerStatus, setWriterStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [writerError, setWriterError] = useState('');

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
            Write for <KiNTxtBrand /> as a KiN-Creator. We welcome original reporting, essays, opinion
            columns and short fiction from new and experienced writers. Apply with a link to your work
            or paste a sample below.
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
          <section>
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
        </motion.div>
      </div>
    </div>
  );
}