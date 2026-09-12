// ─── Realistic voices ────────────────────────────────────────────
// Azure neural voices, reached through our own edge function so the
// key never leaves the server. Three layers of cache mean a word is
// synthesised once for the whole school and then never waits:
//
//   1. memory       — decoded, ready to play this session
//   2. Cache API    — on this device, across visits
//   3. Storage      — public bucket the function fills; tried first,
//                     so a cached word never invokes the function
//
// Audio plays through Web Audio, resumed inside a tap, so a spelling
// lesson's nine sounds can follow one gesture on iOS.
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
  child?: boolean;
}

// Child voices first — a child reading to a child is the friendliest
// thing here — then adults, British before American.
export const CLOUD_VOICES: CloudVoice[] = [
  { id: 'en-GB-MaisieNeural',  name: 'Maisie', blurb: 'A girl, bright and kind',    accent: 'British', child: true },
  { id: 'en-GB-AlfieNeural',   name: 'Alfie',  blurb: 'A boy, cheerful',            accent: 'British', child: true },
  { id: 'en-GB-SoniaNeural',   name: 'Sonia',  blurb: 'Warm and gentle',            accent: 'British' },
  { id: 'en-GB-LibbyNeural',   name: 'Libby',  blurb: 'Clear and friendly',         accent: 'British' },
  { id: 'en-GB-RyanNeural',    name: 'Ryan',   blurb: 'Calm storyteller',           accent: 'British' },
  { id: 'en-GB-OliverNeural',  name: 'Oliver', blurb: 'Steady and reassuring',      accent: 'British' },
  { id: 'en-US-AnaNeural',     name: 'Ana',    blurb: 'A girl, playful',            accent: 'American', child: true },
  { id: 'en-US-JennyNeural',   name: 'Jenny',  blurb: 'Bubbly and clear',           accent: 'American' },
];

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

/** Bytes for this text: device cache, then the shared bucket, then the function. */
async function fetchAudio(text: string, voice: string, rate: Rate): Promise<ArrayBuffer> {
  const k = memKey(voice, rate, text);
  const local = await readDisk(k);
  if (local) return local;

  const path = `${voice}/${rate}/${await sha256(text)}.mp3`;
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
