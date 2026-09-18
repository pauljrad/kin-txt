import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Music2, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  CreatorExperience,
  CreatorImageMoment,
  CreatorTrack,
  withCreatorExperienceDefaults,
} from '@/lib/creatorExperience';

interface CreatorExperienceEditorProps {
  userId: string;
  paragraphs: string[];
  value: CreatorExperience;
  onChange: (value: CreatorExperience) => void;
  disabled?: boolean;
}

const BUILT_IN_TRACKS: { id: CreatorTrack; label: string; description: string }[] = [
  { id: 'noir', label: 'Noir', description: 'Jazz atmosphere' },
  { id: 'fret', label: 'Fret', description: 'Guitar atmosphere' },
  { id: 'fret2', label: 'Fret II', description: 'Second guitar atmosphere' },
];

const cleanFileName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-90) || 'media';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function CreatorExperienceEditor({
  userId,
  paragraphs,
  value,
  onChange,
  disabled = false,
}: CreatorExperienceEditorProps) {
  const experience = withCreatorExperienceDefaults(value);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [error, setError] = useState('');
  const dragRef = useRef<{ id: string; x: number; focalX: number; width: number } | null>(null);

  const paragraphOptions = useMemo(
    () => paragraphs.map((paragraph, index) => ({
      index,
      label: `After paragraph ${index + 1}`,
      preview: paragraph.replace(/\s+/g, ' ').trim().slice(0, 90),
    })),
    [paragraphs],
  );

  const updateImage = (id: string, patch: Partial<CreatorImageMoment>) => {
    onChange({
      ...experience,
      images: experience.images.map((image) => image.id === id ? { ...image, ...patch } : image),
    });
  };

  const uploadImages = async (files?: FileList | File[]) => {
    const selected = files ? Array.from(files) : [];
    if (!selected.length) return;

    setError('');
    const remaining = Math.max(0, 12 - experience.images.length);
    if (!remaining) {
      setError('A TXT can contain up to 12 image moments.');
      return;
    }

    const batch = selected.slice(0, remaining);
    if (selected.length > remaining) {
      setError(`Only the first ${remaining} image${remaining === 1 ? '' : 's'} were added — a TXT can contain up to 12 image moments.`);
    }

    const invalid = batch.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    if (invalid) {
      setError('Use JPG, PNG or WebP images.');
      return;
    }
    const oversized = batch.find((file) => file.size > 12 * 1024 * 1024);
    if (oversized) {
      setError('Keep each image under 12 MB.');
      return;
    }

    setUploadingImage(true);
    const added: CreatorImageMoment[] = [];
    try {
      for (const file of batch) {
        const id = crypto.randomUUID();
        const path = `${userId}/images/${id}-${cleanFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from('creator-media').upload(path, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) throw uploadError;

        const { data: signed, error: signError } = await supabase.storage.from('creator-media').createSignedUrl(path, 60 * 60 * 6);
        if (signError) throw signError;

        added.push({
          id,
          storagePath: path,
          afterParagraph: Math.max(0, paragraphs.length - 1),
          focalX: 50,
          alt: '',
          url: signed?.signedUrl,
        });
      }

      onChange({ ...experience, images: [...experience.images, ...added] });
    } catch (err) {
      if (added.length) onChange({ ...experience, images: [...experience.images, ...added] });
      setError(err instanceof Error ? err.message : 'Could not upload one of those images.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (image: CreatorImageMoment) => {
    onChange({ ...experience, images: experience.images.filter((item) => item.id !== image.id) });
    if (image.storagePath) {
      await supabase.storage.from('creator-media').remove([image.storagePath]).catch(() => undefined);
    }
  };

  const setMusicKind = (kind: 'none' | 'kin' | 'upload') => {
    if (kind === 'none') onChange({ ...experience, music: { kind: 'none' } });
    if (kind === 'kin') onChange({ ...experience, music: { kind: 'kin', track: experience.music.track || 'noir' } });
    if (kind === 'upload') onChange({ ...experience, music: { kind: 'upload', rightsConfirmed: false } });
  };

  const uploadAudio = async (file?: File) => {
    if (!file) return;
    setError('');
    const accepted = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav'];
    if (!accepted.includes(file.type)) {
      setError('Use an MP3, M4A or WAV audio file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Keep creator audio under 25 MB.');
      return;
    }

    setUploadingAudio(true);
    try {
      const id = crypto.randomUUID();
      const path = `${userId}/audio/${id}-${cleanFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('creator-media').upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: signed, error: signError } = await supabase.storage.from('creator-media').createSignedUrl(path, 60 * 60 * 6);
      if (signError) throw signError;

      onChange({
        ...experience,
        music: {
          kind: 'upload',
          storagePath: path,
          filename: file.name,
          rightsConfirmed: false,
          url: signed?.signedUrl,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that audio.');
    } finally {
      setUploadingAudio(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card/45 overflow-hidden">
        <div className="p-5 border-b border-border/70 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Image moments</p>
            <h2 className="font-display text-xl">Place images inside the TXT</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed">
              Images fill the reader screen edge-to-edge. Drag the preview left or right to choose the crop, then choose the paragraph after which it should appear.
            </p>
          </div>
          <label className="shrink-0 h-9 px-3 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-2 text-xs font-medium cursor-pointer">
            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {experience.images.length ? 'Add more' : 'Add images'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={disabled || uploadingImage || experience.images.length >= 12}
              onChange={(e) => {
                void uploadImages(e.target.files || undefined);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>

        {!experience.images.length ? (
          <div className="px-5 py-7 text-sm text-muted-foreground">
            No image moments yet. Add one when you want the TXT to stop and let the image take over the screen.
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {experience.images.map((image, index) => (
              <div key={image.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                <div
                  className="relative mx-auto overflow-hidden rounded-xl bg-black aspect-[9/16] max-h-[430px] w-full max-w-[242px] cursor-ew-resize select-none touch-none"
                  onPointerDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    dragRef.current = { id: image.id, x: e.clientX, focalX: image.focalX, width: rect.width };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const drag = dragRef.current;
                    if (!drag || drag.id !== image.id) return;
                    const delta = e.clientX - drag.x;
                    updateImage(image.id, { focalX: clamp(drag.focalX - (delta / Math.max(1, drag.width)) * 100, 0, 100) });
                  }}
                  onPointerUp={(e) => {
                    dragRef.current = null;
                    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* no-op */ }
                  }}
                  onPointerCancel={() => { dragRef.current = null; }}
                >
                  {image.url ? (
                    <img
                      src={image.url}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                      style={{ objectPosition: `${image.focalX}% 50%` }}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-xs text-white/50">Preview unavailable</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white">
                    <p className="text-[10px] uppercase tracking-[0.18em]">Drag left / right to frame</p>
                    <div className="mt-2 h-px bg-white/30 relative">
                      <span className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white" style={{ left: `calc(${image.focalX}% - 4px)` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
                  <label className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Appears</span>
                    <select
                      value={image.afterParagraph}
                      onChange={(e) => updateImage(image.id, { afterParagraph: Number(e.target.value) })}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                    >
                      {!paragraphOptions.length && <option value={0}>Write some text first</option>}
                      {paragraphOptions.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.label}{option.preview ? ` — ${option.preview}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeImage(image)}
                    className="h-10 px-3 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center gap-2 text-xs"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>

                <label className="block mt-3 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Image description · optional</span>
                  <input
                    value={image.alt || ''}
                    onChange={(e) => updateImage(image.id, { alt: e.target.value.slice(0, 300) })}
                    placeholder={`Image ${index + 1} — describe it for accessibility`}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
            ))}

            {experience.images.length < 12 && (
              <label className="w-full h-11 rounded-xl border border-dashed border-border hover:border-foreground/35 hover:bg-secondary/40 flex items-center justify-center gap-2 text-xs font-medium cursor-pointer transition-colors">
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                Add another image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={disabled || uploadingImage}
                  onChange={(e) => {
                    void uploadImages(e.target.files || undefined);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card/45 p-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Sound</p>
        <h2 className="font-display text-xl mb-1">Choose the atmosphere</h2>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Use one of KiN-TXT’s three tracks, no music, or upload your own.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            ['none', 'None'],
            ['kin', 'KiN music'],
            ['upload', 'Upload'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMusicKind(id as 'none' | 'kin' | 'upload')}
              className={`h-10 rounded-xl border text-xs font-medium transition-colors ${experience.music.kind === id ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-secondary'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {experience.music.kind === 'kin' && (
          <div className="grid sm:grid-cols-3 gap-2">
            {BUILT_IN_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => onChange({ ...experience, music: { kind: 'kin', track: track.id } })}
                className={`rounded-xl border p-3 text-left transition-colors ${experience.music.track === track.id ? 'border-foreground bg-secondary' : 'border-border hover:bg-secondary/60'}`}
              >
                <p className="text-sm font-medium">{track.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{track.description}</p>
              </button>
            ))}
          </div>
        )}

        {experience.music.kind === 'upload' && (
          <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
            <label className="h-10 px-3 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center gap-2 text-xs font-medium cursor-pointer">
              {uploadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {experience.music.filename || 'Upload MP3 / M4A / WAV'}
              <input
                type="file"
                accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                className="hidden"
                disabled={disabled || uploadingAudio}
                onChange={(e) => uploadAudio(e.target.files?.[0])}
              />
            </label>

            {experience.music.url && (
              <audio controls className="w-full h-10" src={experience.music.url} />
            )}

            <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={!!experience.music.rightsConfirmed}
                onChange={(e) => onChange({ ...experience, music: { ...experience.music, rightsConfirmed: e.target.checked } })}
                className="mt-0.5"
              />
              <span>
                I confirm I own the rights to this audio, have permission to use it, or it is properly licensed / free to use. I understand that responsibility for the audio I upload is mine.
              </span>
            </label>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card/45 p-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Default delivery</p>
        <h2 className="font-display text-xl mb-1">Direct the opening read</h2>
        <p className="text-xs text-muted-foreground leading-relaxed mb-5">
          These are the settings your TXT opens with. Readers can still take control afterwards.
        </p>

        <label className="block">
          <div className="flex items-center justify-between text-xs mb-2">
            <span>Base speed</span>
            <span className="font-mono text-muted-foreground">{experience.defaults.startSpeed.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={experience.defaults.startSpeed}
            onChange={(e) => onChange({ ...experience, defaults: { ...experience.defaults, startSpeed: Number(e.target.value) } })}
            className="w-full"
          />
        </label>

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <label className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Rhythm mode</span>
              <span className="block text-[10px] text-muted-foreground mt-1">Let sentence rhythm shape the pace.</span>
            </span>
            <input
              type="checkbox"
              checked={experience.defaults.rhythmMode}
              onChange={(e) => onChange({ ...experience, defaults: { ...experience.defaults, rhythmMode: e.target.checked } })}
            />
          </label>

          <label className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Adaptive speed</span>
              <span className="block text-[10px] text-muted-foreground mt-1">Let KiN respond to the text.</span>
            </span>
            <input
              type="checkbox"
              checked={experience.defaults.adaptiveSpeed}
              onChange={(e) => onChange({ ...experience, defaults: { ...experience.defaults, adaptiveSpeed: e.target.checked } })}
            />
          </label>
        </div>

        {experience.defaults.rhythmMode && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Rhythm feel</p>
            <div className="grid grid-cols-3 gap-2">
              {(['slower', 'normal', 'faster'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ ...experience, defaults: { ...experience.defaults, rhythmPreset: preset } })}
                  className={`h-9 rounded-xl border text-xs capitalize ${experience.defaults.rhythmPreset === preset ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-secondary'}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mt-4 rounded-xl border border-border p-3 flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium">Acceleration</span>
            <span className="block text-[10px] text-muted-foreground mt-1">Build pace through each reading section.</span>
          </span>
          <input
            type="checkbox"
            checked={experience.defaults.accelerationMode}
            onChange={(e) => onChange({ ...experience, defaults: { ...experience.defaults, accelerationMode: e.target.checked } })}
          />
        </label>

        {experience.defaults.accelerationMode && (
          <div className="mt-4 grid sm:grid-cols-[1fr_180px] gap-4 items-end">
            <label>
              <div className="flex items-center justify-between text-xs mb-2">
                <span>Accelerate to</span>
                <span className="font-mono text-muted-foreground">{experience.defaults.endSpeed.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={experience.defaults.endSpeed}
                onChange={(e) => onChange({ ...experience, defaults: { ...experience.defaults, endSpeed: Number(e.target.value) } })}
                className="w-full"
              />
            </label>
            <label>
              <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Reset pace</span>
              <select
                value={experience.defaults.resetInterval}
                onChange={(e) => onChange({ ...experience, defaults: { ...experience.defaults, resetInterval: e.target.value as any } })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              >
                <option value="1">Every sentence</option>
                <option value="2">Every 2 sentences</option>
                <option value="3">Every 3 sentences</option>
                <option value="4">Every 4 sentences</option>
                <option value="paragraph">Every paragraph</option>
                <option value="end">Never</option>
              </select>
            </label>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
