// ─── AI voices ───────────────────────────────────────────────────
// Free, open neural voices (Rhasspy Piper, MIT) that run on the
// device itself — no key, no per-word cost, no server. A voice is a
// one-off download of about 60MB, after which it works offline.
//
// Audio plays through Web Audio rather than <audio> elements: iOS
// lets a page keep playing sounds once an AudioContext has been
// resumed inside a tap, which is exactly what a spelling lesson —
// one tap, then nine sounds in a row — needs.
// ──────────────────────────────────────────────────────────────────

import type { WorkerRequest, WorkerResponse } from './ttsWorker';

export interface AiVoice {
  id: string;
  name: string;
  blurb: string;
  accent: string;
  /** Approximate download, so the child (or teacher) knows before tapping. */
  sizeMB: number;
}

// Chosen for children: clear, unhurried, and mostly British, to match
// the spelling lists. Every one is a Piper "medium" model.
export const AI_VOICES: AiVoice[] = [
  { id: 'en_GB-cori-medium',                  name: 'Cori',   blurb: 'Warm and gentle',        accent: 'British',          sizeMB: 61 },
  { id: 'en_GB-jenny_dioco-medium',           name: 'Jenny',  blurb: 'Bright and clear',       accent: 'British',          sizeMB: 61 },
  { id: 'en_GB-alba-medium',                  name: 'Alba',   blurb: 'Soft and friendly',      accent: 'Scottish',         sizeMB: 61 },
  { id: 'en_GB-alan-medium',                  name: 'Alan',   blurb: 'Calm and steady',        accent: 'British',          sizeMB: 61 },
  { id: 'en_GB-northern_english_male-medium', name: 'Sam',    blurb: 'Cheerful storyteller',   accent: 'Northern English', sizeMB: 61 },
  { id: 'en_US-amy-medium',                   name: 'Amy',    blurb: 'Bubbly and kind',        accent: 'American',         sizeMB: 61 },
];

export function aiVoice(id: string): AiVoice | undefined {
  return AI_VOICES.find((v) => v.id === id);
}

/** Workers, OPFS and WebAssembly — all required. */
export function aiVoicesSupported(): boolean {
  return typeof Worker !== 'undefined'
    && typeof WebAssembly !== 'undefined'
    && typeof navigator !== 'undefined'
    && !!navigator.storage?.getDirectory;
}

// ─── Worker plumbing ──────────────────────────────────────────────
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, {
  resolve: (r: WorkerResponse) => void;
  reject: (e: Error) => void;
  onProgress?: (loaded: number, total: number) => void;
}>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./ttsWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    const p = pending.get(msg.id);
    if (!p) return;
    if (msg.type === 'progress') { p.onProgress?.(msg.loaded, msg.total); return; }
    pending.delete(msg.id);
    if (msg.type === 'error') p.reject(new Error(msg.message));
    else p.resolve(msg);
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'Voice worker failed'));
    pending.clear();
  };
  return worker;
}

type Request = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never;

function call(
  req: Request,
  onProgress?: (loaded: number, total: number) => void,
): Promise<WorkerResponse> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ ...req, id } as WorkerRequest);
  });
}

// ─── Voice storage ────────────────────────────────────────────────
export async function storedAiVoices(): Promise<string[]> {
  if (!aiVoicesSupported()) return [];
  const r = await call({ type: 'stored' });
  return r.type === 'done' ? (r.stored ?? []) : [];
}

export function downloadAiVoice(
  voiceId: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return call({ type: 'download', voiceId }, (loaded, total) => {
    onProgress(total > 0 ? loaded / total : 0);
  }).then(() => undefined);
}

export function removeAiVoice(voiceId: string): Promise<void> {
  return call({ type: 'remove', voiceId }).then(() => undefined);
}

// ─── Synthesis + playback ─────────────────────────────────────────
let ctx: AudioContext | null = null;
const cache = new Map<string, AudioBuffer>();
const inFlight = new Map<string, Promise<AudioBuffer>>();

/** Call inside a tap. After this, sounds may play without further taps. */
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

const key = (voiceId: string, text: string) => `${voiceId}|${text}`;

// Synthesised audio is kept on disk too, so the 26 letter names and
// every word a child has heard are made once per device, not once
// per visit. The Cache API is the simplest durable byte store there is.
const AUDIO_CACHE = 'kidtxt-tts-v1';
const cacheUrl = (k: string) => `/tts-audio/${encodeURIComponent(k)}`;

async function readDisk(k: string): Promise<ArrayBuffer | null> {
  try {
    if (!('caches' in window)) return null;
    const c = await caches.open(AUDIO_CACHE);
    const r = await c.match(cacheUrl(k));
    return r ? await r.arrayBuffer() : null;
  } catch { return null; }
}

async function writeDisk(k: string, wav: ArrayBuffer): Promise<void> {
  try {
    if (!('caches' in window)) return;
    const c = await caches.open(AUDIO_CACHE);
    await c.put(cacheUrl(k), new Response(wav, { headers: { 'Content-Type': 'audio/wav' } }));
  } catch { /* disk cache is a nicety */ }
}

/** Is this already made and ready to play instantly? */
export function isReady(text: string, voiceId: string): boolean {
  return cache.has(key(voiceId, text));
}

/** Synthesise once; every later request for the same text is instant. */
export function synthesise(text: string, voiceId: string): Promise<AudioBuffer> {
  const k = key(voiceId, text);
  const hit = cache.get(k);
  if (hit) return Promise.resolve(hit);
  const flying = inFlight.get(k);
  if (flying) return flying;

  const p = (async () => {
    let wav = await readDisk(k);
    if (!wav) {
      const r = await call({ type: 'predict', voiceId, text });
      if (r.type !== 'done' || !r.wav) throw new Error('No audio returned');
      wav = r.wav;
      void writeDisk(k, wav.slice(0));
    }
    unlockAudio();
    if (!ctx) throw new Error('No audio context');
    const buffer = await ctx.decodeAudioData(wav);
    cache.set(k, buffer);
    return buffer;
  })();
  inFlight.set(k, p);
  p.finally(() => inFlight.delete(k));
  return p;
}

/** Synthesise a batch ahead of time, in order, so playback never waits. */
export async function warm(texts: string[], voiceId: string): Promise<void> {
  for (const t of texts) {
    try { await synthesise(t, voiceId); } catch { /* one miss is not fatal */ }
  }
}

let current: AudioBufferSourceNode | null = null;

/** Play a buffer; resolves when it finishes. */
export function play(buffer: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    unlockAudio();
    if (!ctx) { resolve(); return; }
    stopAi();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => { if (current === src) current = null; resolve(); };
    current = src;
    src.start();
  });
}

export function stopAi(): void {
  if (current) {
    try { current.stop(); } catch { /* already stopped */ }
    current = null;
  }
}

/** Say something in an AI voice; resolves when it has finished sounding. */
export async function sayAi(text: string, voiceId: string): Promise<void> {
  const buffer = await synthesise(text, voiceId);
  await play(buffer);
}
