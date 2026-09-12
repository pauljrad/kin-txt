// ─── KiD-TXT Pronunciation ───────────────────────────────────────
// "Highlight words to listen to pronunciation" — a child taps any
// word and hears it read aloud.
//
// Uses the browser's built-in speech synthesis, so it works offline
// and costs nothing per play. We prefer a British English voice,
// because the statutory word lists and spellings are British.
// ──────────────────────────────────────────────────────────────────

import { normaliseWord } from './curriculum';

/**
 * How each letter is said aloud. Spoken as its name, written out, so no
 * engine can say "capital em" or read "a" as the article. British: zed.
 */
const LETTER_NAMES: Record<string, string> = {
  a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'eff', g: 'gee',
  h: 'aitch', i: 'eye', j: 'jay', k: 'kay', l: 'el', m: 'em', n: 'en',
  o: 'oh', p: 'pee', q: 'queue', r: 'ar', s: 'ess', t: 'tee', u: 'you',
  v: 'vee', w: 'double you', x: 'ex', y: 'why', z: 'zed',
};

let cachedVoice: SpeechSynthesisVoice | null = null;
let preferredURI: string | null = null;



export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

if (speechAvailable()) {
  // Voices load asynchronously; drop the cache whenever the list changes.
  window.speechSynthesis.addEventListener('voiceschanged', () => { cachedVoice = null; });
}

/** The voice the child (or their teacher) chose in settings. */
export function setPreferredVoice(uri: string | null): void {
  preferredURI = uri;
  cachedVoice = null;
}

/**
 * How good a voice is likely to sound, higher is better. On iPhone the
 * compact default ("Daniel") is the robotic one; the Enhanced and
 * Premium downloads, and the Siri voices, are the pleasant ones.
 */
export function voiceQuality(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let q = 0;
  if (/premium/.test(n)) q += 40;
  if (/enhanced/.test(n)) q += 30;
  if (/siri/.test(n)) q += 30;
  if (/neural|natural|online/.test(n)) q += 25;      // Edge / Chrome cloud voices
  if (/google/.test(n)) q += 10;
  if (/compact|espeak|robot/.test(n)) q -= 30;
  if (v.lang === 'en-GB') q += 15;
  else if (v.lang.startsWith('en')) q += 5;
  return q;
}

/** macOS ships joke voices. A child should not be read to by "Zarvox". */
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|princess|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy)\b/i;

/** Every English voice on this device, best first, novelties excluded. */
export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechAvailable()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en') && !NOVELTY.test(v.name))
    .sort((a, b) => voiceQuality(b) - voiceQuality(a) || a.name.localeCompare(b.name));
}

/** The chosen voice if it exists here, otherwise the best one available. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechAvailable()) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const chosen = preferredURI ? voices.find((v) => v.voiceURI === preferredURI) ?? null : null;
  cachedVoice = chosen ?? listVoices()[0] ?? voices[0] ?? null;
  return cachedVoice;
}

/** Speak a sample in a specific voice, so a child can pick one they like. */
export function previewVoice(voice: SpeechSynthesisVoice, text: string): void {
  if (!speechAvailable()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  say(utterance);
}

/**
 * Say a single word slowly and clearly. Punctuation is stripped so
 * "wolves," is read as "wolves" rather than trailing off.
 */
export function speakWord(word: string): void {
  const clean = normaliseWord(word);
  if (!clean) return;

  if (!speechAvailable()) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-GB';
  utterance.rate = 0.75;   // slow enough to hear each sound
  utterance.pitch = 1.05;  // slightly bright, reads as friendly

  say(utterance);
}

/**
 * iOS drops an utterance queued in the same tick as cancel(). So: cancel
 * only if something is sounding, and leave a beat before speaking.
 */
function say(utterance: SpeechSynthesisUtterance): void {
  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => synth.speak(utterance), 100);
  } else {
    synth.speak(utterance);
  }
}

/** Read a whole sentence at a natural pace — used on the quiz question. */
export function speakSentence(text: string): void {
  if (!text.trim()) return;

  if (!speechAvailable()) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-GB';
  utterance.rate = 0.9;

  say(utterance);
}

export function stopSpeaking(): void {
  if (speechAvailable()) window.speechSynthesis.cancel();
}

// ─── Sequenced speech, for teaching a spelling ───────────────────
// A word, then each letter by name, then the word again — with a
// callback as each step starts so the interface can animate in time.
//
// Built for iOS Safari, which is the device this runs on and which
// is unreliable in two specific ways: `onend` sometimes never fires,
// and an utterance queued straight after `cancel()` is sometimes
// dropped. So every step carries a fallback timer sized to its text,
// and the first utterance waits a beat after cancelling.

export interface SpeechStep {
  text: string;
  rate?: number;
  pitch?: number;
  /** Silence to leave after this step, in ms. */
  gapMs?: number;
  /** Called as the step begins to sound. */
  onStart?: () => void;
}

/** Roughly how long the engine will take, so a lost `onend` can't hang us. */
function estimateMs(text: string, rate: number): number {
  return Math.max(500, (text.length * 95) / rate) + 400;
}

/**
 * Speak `steps` in order, then call `onDone`. Returns a cancel function;
 * a cancelled sequence stops sounding and never calls `onDone`.
 */
export function speakSequence(steps: SpeechStep[], onDone: () => void): () => void {
  if (steps.length === 0) { onDone(); return () => {}; }

  if (!speechAvailable()) { onDone(); return () => {}; }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const voice = pickVoice();

  const runStep = (i: number) => {
    if (cancelled) return;
    if (i >= steps.length) { onDone(); return; }

    const step = steps[i];
    const rate = step.rate ?? 0.8;
    const utterance = new SpeechSynthesisUtterance(step.text);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? 'en-GB';
    utterance.rate = rate;
    utterance.pitch = step.pitch ?? 1.05;

    let finished = false;
    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => runStep(i + 1), step.gapMs ?? 80);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    // `onstart` is as unreliable as `onend` on iOS; fire the callback ourselves.
    step.onStart?.();
    window.speechSynthesis.speak(utterance);
    timer = setTimeout(finish, estimateMs(step.text, rate));
  };

  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) {
    synth.cancel();
    timer = setTimeout(() => runStep(0), 120);
  } else {
    runStep(0);
  }

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    synth.cancel();
  };
}



/** The steps that teach one word: say it, spell it, say it again. */
export function spellingSteps(
  word: string,
  onWord: () => void,
  onLetter: (index: number) => void,
  onRepeat: () => void,
): SpeechStep[] {
  const letters = word.split('');
  return [
    { text: word, rate: 0.72, gapMs: 420, onStart: onWord },
    ...letters.map((ch, i) => ({
      text: LETTER_NAMES[ch.toLowerCase()] ?? ch,
      rate: 0.85,
      gapMs: 140,
      onStart: () => onLetter(i),
    })),
    { text: word, rate: 0.72, gapMs: 0, onStart: onRepeat },
  ];
}
