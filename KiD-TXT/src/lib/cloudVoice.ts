// ─── Realistic voices ────────────────────────────────────────────
// Two sources, one player.
//
// Bundled: every sound the app can make was generated once, on a Mac,
// with Kokoro (an open neural voice, Apache 2.0) and shipped inside the
// app as small MP3s — scripts/generate-audio.py. Nothing to sign up
// for, nothing to download on the phone, identical on every device,
// and offline after the first play.
//
// Azure: neural voices reached through our own edge function, only
// when a key has been set. Results are kept in a public bucket so a
// word is synthesised once for the whole school.
//
// Both are looked up by voice / rate / sha256(text). Audio plays
// through Web Audio, resumed inside a tap, so a spelling lesson's
// nine sounds can follow one gesture on iOS.
// ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/kid-tts`;
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/kid-tts`;
const AUDIO_CACHE = 'kidtxt-cloud-tts-v1';

export interface CloudVoice {
  id: string;
  name: string;
  blurb: string;
  accent: string;
  source: 'bundled' | 'azure';
  child?: boolean;
}

/** Shipped with the app. Generate another with scripts/generate-audio.py and add it here. */
export const BUNDLED_VOICES: CloudVoice[] = [
  { id: 'bf_emma',     name: 'Emma',     blurb: 'Warm and clear',       accent: 'British', source: 'bundled' },
  { id: 'bf_isabella', name: 'Isabella', blurb: 'Gentle and friendly',  accent: 'British', source: 'bundled' },
  { id: 'bm_george',   name: 'George',   blurb: 'Calm storyteller',     accent: 'British', source: 'bundled' },
];

/** Only offered when the edge function reports a key. */
export const AZURE_VOICES: CloudVoice[] = [
  { id: 'en-GB-MaisieNeural',  name: 'Maisie', blurb: 'A girl, bright and kind',    accent: 'British', source: 'azure', child: true },
  { id: 'en-GB-AlfieNeural',   name: 'Alfie',  blurb: 'A boy, cheerful',            accent: 'British', source: 'azure', child: true },
  { id: 'en-GB-SoniaNeural',   name: 'Sonia',  blurb: 'Warm and gentle',            accent: 'British', source: 'azure' },
  { id: 'en-GB-LibbyNeural',   name: 'Libby',  blurb: 'Clear and friendly',         accent: 'British', source: 'azure' },
  { id: 'en-GB-RyanNeural',    name: 'Ryan',   blurb: 'Calm storyteller',           accent: 'British', source: 'azure' },
];

export const CLOUD_VOICES: CloudVoice[] = [...BUNDLED_VOICES, ...AZURE_VOICES];

export function cloudVoice(id: string): CloudVoice | undefined {
  return CLOUD_VOICES.find((v) => v.id === id);
}

export type Rate = 'slow' | 'normal';

// ─── Is the service set up? ───────────────────────────────────────
let configured: Promise<boolean> | null = null;

/** True once the edge function reports it has a key. Cached per session. */
export function cloudConfigured(): Promise<boolean> {
  if (!SUPABASE_URL) return Promise.resolve(false);
  configured ??= fetch(`${FUNCTION_URL}?health=1`)
    .then((r) => (r.ok ? r.json() : { configured: false }))
    .then((j: { configured?: boolean }) => Boolean(j.configured))
    .catch(() => false);
  return configured;
}

// ─── Fetching audio ───────────────────────────────────────────────
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const memKey = (voice: string, rate: Rate, text: string) => `${voice}|${rate}|${text}`;

async function readDisk(k: string): Promise<ArrayBuffer | null> {
  try {
    if (!('caches' in window)) return null;
    const c = await caches.open(AUDIO_CACHE);
    const r = await c.match(`/cloud-tts/${encodeURIComponent(k)}`);
    return r ? await r.arrayBuffer() : null;
  } catch { return null; }
}

async function writeDisk(k: string, audio: ArrayBuffer): Promise<void> {
  try {
    if (!('caches' in window)) return;
    const c = await caches.open(AUDIO_CACHE);
    await c.put(`/cloud-tts/${encodeURIComponent(k)}`, new Response(audio, { headers: { 'Content-Type': 'audio/mpeg' } }));
  } catch { /* disk cache is a nicety */ }
}

/** Thrown when a bundled voice has no file for this text; the caller falls back. */
export class NotBundled extends Error {}

/** Bytes for this text: device cache, then the app's files or the shared bucket, then the function. */
async function fetchAudio(text: string, voice: string, rate: Rate): Promise<ArrayBuffer> {
  const k = memKey(voice, rate, text);
  const local = await readDisk(k);
  if (local) return local;

  const path = `${voice}/${rate}/${await sha256(text)}.mp3`;

  if (cloudVoice(voice)?.source === 'bundled') {
    const r = await fetch(`/audio/${path}`).catch(() => null);
    // A missing file comes back as the app shell (SPA rewrite), not a 404
    if (!r?.ok || !(r.headers.get('content-type') ?? '').startsWith('audio/')) throw new NotBundled(text);
    const buf = await r.arrayBuffer();
    void writeDisk(k, buf.slice(0));
    return buf;
  }

  const shared = await fetch(`${STORAGE_URL}/${path}`).catch(() => null);
  if (shared?.ok) {
    const buf = await shared.arrayBuffer();
    void writeDisk(k, buf.slice(0));
    return buf;
  }

  const r = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, rate }),
  });
  if (!r.ok) throw new Error(`tts ${r.status}`);
  const buf = await r.arrayBuffer();
  void writeDisk(k, buf.slice(0));
  return buf;
}

// ─── Decoding + playback ──────────────────────────────────────────
let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const inFlight = new Map<string, Promise<AudioBuffer>>();

/** Call inside a tap. After this, sounds may play without further taps. */
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export function isReady(text: string, voice: string, rate: Rate): boolean {
  return buffers.has(memKey(voice, rate, text));
}

export function prepare(text: string, voice: string, rate: Rate): Promise<AudioBuffer> {
  const k = memKey(voice, rate, text);
  const hit = buffers.get(k);
  if (hit) return Promise.resolve(hit);
  const flying = inFlight.get(k);
  if (flying) return flying;

  const p = (async () => {
    const bytes = await fetchAudio(text, voice, rate);
    unlockAudio();
    if (!ctx) throw new Error('No audio context');
    const buffer = await ctx.decodeAudioData(bytes);
    buffers.set(k, buffer);
    return buffer;
  })();
  inFlight.set(k, p);
  p.finally(() => inFlight.delete(k));
  return p;
}

/** Fetch a batch ahead of time so playback never waits. Order preserved. */
export async function warm(texts: string[], voice: string, rate: Rate): Promise<void> {
  await Promise.all(texts.map((t) => prepare(t, voice, rate).catch(() => undefined)));
}

let current: AudioBufferSourceNode | null = null;

export function play(buffer: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    unlockAudio();
    if (!ctx) { resolve(); return; }
    stop();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => { if (current === src) current = null; resolve(); };
    current = src;
    src.start();
  });
}

export function stop(): void {
  if (current) {
    try { current.stop(); } catch { /* already stopped */ }
    current = null;
  }
}

export async function say(text: string, voice: string, rate: Rate): Promise<void> {
  const buffer = await prepare(text, voice, rate);
  await play(buffer);
}
