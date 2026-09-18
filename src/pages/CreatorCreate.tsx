import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileUp, Italic, Loader2, Play, Send } from 'lucide-react';
import mammoth from 'mammoth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCreatorAccess } from '@/hooks/useCreatorAccess';
import { parseCreatorMarkup, plainTextToEditorHtml, richHtmlToCreatorMarkup } from '@/lib/creatorText';
import { CreatorExperienceEditor } from '@/components/CreatorExperienceEditor';
import { KineticPlayer } from '@/components/KineticPlayer';
import { DEFAULT_CREATOR_EXPERIENCE, CreatorExperience, resolveOwnCreatorExperienceMedia, withCreatorExperienceDefaults } from '@/lib/creatorExperience';
import { useAuth } from '@/hooks/useAuth';

const FIELD = 'w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors';

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = url;
  });
}

export default function CreatorCreate() {
  const navigate = useNavigate();
  const { isCreator, displayName, loading } = useCreatorAccess();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('essay');
  const [editorHtml, setEditorHtml] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [experience, setExperience] = useState<CreatorExperience>(withCreatorExperienceDefaults(DEFAULT_CREATOR_EXPERIENCE));
  const [preview, setPreview] = useState<{ parsed: ReturnType<typeof parseCreatorMarkup>; experience: CreatorExperience } | null>(null);

  const setEditor = (html: string) => {
    setEditorHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
  };

  const applyItalic = () => {
    editorRef.current?.focus();
    document.execCommand('italic', false);
    setEditorHtml(editorRef.current?.innerHTML ?? '');
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoadingFile(true);
    setMessage('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt') {
        setEditor(plainTextToEditorHtml(await file.text()));
      } else if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setEditor(result.value);
      } else {
        throw new Error('Use a .txt or .docx file so KiN-TXT can preserve your formatting.');
      }
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not read that file.');
      setStatus('error');
    } finally {
      setLoadingFile(false);
    }
  };

  const submit = async () => {
    const body = richHtmlToCreatorMarkup(editorHtml);
    setMessage('');

    if (!title.trim()) {
      setStatus('error');
      setMessage('Give your TXT a title.');
      return;
    }
    if (body.split(/\s+/).filter(Boolean).length < 20) {
      setStatus('error');
      setMessage('Add a little more text before submitting.');
      return;
    }

    if (experience.music.kind === 'upload' && (!experience.music.storagePath || !experience.music.rightsConfirmed)) {
      setStatus('error');
      setMessage('Confirm the audio rights statement before submitting uploaded music.');
      return;
    }

    setStatus('submitting');
    const { data, error } = await supabase.functions.invoke('submit-creator-txt', {
      body: {
        title: title.trim(),
        contentType,
        body,
        experience,
      },
    });

    if (error || !data?.success) {
      setStatus('error');
      setMessage(data?.error || 'Could not submit this TXT. Please try again.');
      return;
    }

    setStatus('sent');
    setMessage('Sent for approval. The TXT is safely stored and the review link has been sent to KiN-TXT.');
    setTitle('');
    setEditor('');
    setExperience(withCreatorExperienceDefaults(DEFAULT_CREATOR_EXPERIENCE));
  };


  const draftMarkup = richHtmlToCreatorMarkup(editorHtml);
  const draftParagraphs = draftMarkup
    ? draftMarkup.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/[*_]/g, '').trim()).filter(Boolean)
    : [];

  const openPreview = async () => {
    setMessage('');
    if (draftMarkup.split(/\s+/).filter(Boolean).length < 20) {
      setStatus('error');
      setMessage('Add a little more text before previewing.');
      return;
    }
    try {
      const resolvedExperience = await resolveOwnCreatorExperienceMedia(experience);
      const imageUrls = resolvedExperience.images.map((image) => image.url).filter((url): url is string => !!url);
      if (imageUrls.length !== resolvedExperience.images.length) {
        throw new Error('One of your images could not be prepared for preview. Remove it and add it again.');
      }
      await Promise.all(imageUrls.map(preloadImage));
      setPreview({ parsed: parseCreatorMarkup(draftMarkup), experience: resolvedExperience });
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not prepare the preview.');
    }
  };

  if (preview) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <KineticPlayer
          parsedText={preview.parsed.parsedText}
          emphasisWords={preview.parsed.emphasisWords}
          whisperedWords={preview.parsed.whisperedWords}
          creatorExperience={preview.experience}
          onBack={() => setPreview(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background text-foreground px-5 pb-16 pt-[calc(5.5rem+env(safe-area-inset-top,0px))]">
      <ThemeToggle />
      <button
        onClick={() => navigate('/home')}
        className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-40 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <main className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">KiN-Creator</p>
        <h1 className="font-display text-4xl tracking-wide mb-2">Create a TXT</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          {displayName ? `${displayName}, ` : ''}write it, then direct how it is experienced — emphasis, pace, rhythm, images and sound.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Checking Creator access…
          </div>
        ) : !isCreator ? (
          <div className="rounded-2xl border border-border bg-card/60 p-6">
            <p className="text-sm">This page is only available to approved KiN-Creators.</p>
          </div>
        ) : status === 'sent' ? (
          <div className="rounded-2xl border border-border bg-card/60 p-7 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3" />
            <h2 className="font-display text-2xl mb-2">TXT submitted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{message}</p>
            <button onClick={() => { setStatus('idle'); setMessage(''); }} className="px-5 py-2.5 rounded-xl bg-foreground text-background font-medium">
              Create another
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-[1fr_180px] gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={220}
                placeholder="Title"
                className={FIELD}
              />
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={FIELD}>
                <option value="essay">Essay</option>
                <option value="story">Story</option>
                <option value="news">News</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={applyItalic}
                  className="h-9 px-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2 text-xs font-medium"
                >
                  <Italic className="w-4 h-4" /> Italic
                </button>
                <label className="h-9 px-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2 text-xs font-medium cursor-pointer">
                  {loadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                  Upload .txt / .docx
                  <input type="file" accept=".txt,.docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </label>
              </div>

              <div className="px-4 py-3 border-b border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
                <p><span className="font-semibold text-foreground">ALL CAPS</span> makes a word hit harder.</p>
                <p><em className="text-foreground">Italics</em> give words a softer delivery — lighter, quieter, almost under the breath.</p>
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setEditorHtml(e.currentTarget.innerHTML)}
                data-placeholder="Paste or write your essay, story, article or report here…"
                className="min-h-[360px] px-5 py-5 text-[15px] leading-7 outline-none whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
              />
            </div>

            {user && (
              <CreatorExperienceEditor
                userId={user.id}
                paragraphs={draftParagraphs}
                value={experience}
                onChange={setExperience}
                disabled={status === 'submitting'}
              />
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openPreview}
                disabled={status === 'submitting' || loadingFile}
                className="w-full h-12 rounded-xl border border-foreground/30 text-foreground font-display tracking-widest uppercase text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-secondary"
              >
                <Play className="w-4 h-4" /> Preview TXT
              </button>
              <button
                onClick={submit}
              disabled={status === 'submitting' || loadingFile}
              className="w-full h-12 rounded-xl bg-foreground text-background font-display tracking-widest uppercase text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {status === 'submitting' ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>

            {message && <p className="text-sm text-destructive">{message}</p>}

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Submitting does not publish immediately. KiN-TXT reviews the TXT first; approved pieces appear in the KiN-Creators section of the Journal.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
