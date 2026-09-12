// ─── KiD-TXT Pronunciation ───────────────────────────────────────
// "Highlight words to listen to pronunciation" — a child taps any
// word and hears it read aloud.
//
// Uses the browser's built-in speech synthesis, so it works offline
// and costs nothing per play. We prefer a British English voice,
// because the statutory word lists and spellings are British.
// ──────────────────────────────────────────────────────────────────

import { normaliseWord } from './curriculum';

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesRequested = false;

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Pick the best available British voice, falling back to any English one. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechAvailable()) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Voices load asynchronously in most browsers — ask once, retry later.
    if (!voicesRequested) {
      voicesRequested = true;
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        cachedVoice = null;
        pickVoice();
      }, { once: true });
    }
    return null;
  }

  cachedVoice =
    voices.find((v) => v.lang === 'en-GB' && /female|kate|serena|sonia/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0] ??
    null;

  return cachedVoice;
}

/**
 * Say a single word slowly and clearly. Punctuation is stripped so
 * "wolves," is read as "wolves" rather than trailing off.
 */
export function speakWord(word: string): void {
  if (!speechAvailable()) return;
  const clean = normaliseWord(word);
  if (!clean) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-GB';
  utterance.rate = 0.75;   // slow enough to hear each sound
  utterance.pitch = 1.05;  // slightly bright, reads as friendly

  window.speechSynthesis.speak(utterance);
}

/** Read a whole sentence at a natural pace — used on the quiz question. */
export function speakSentence(text: string): void {
  if (!speechAvailable() || !text.trim()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-GB';
  utterance.rate = 0.9;

  window.speechSynthesis.speak(utterance);
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
  if (!speechAvailable() || steps.length === 0) {
    onDone();
    return () => {};
  }

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

/**
 * The steps that teach one word: say it, spell it, say it again.
 * Letters are spoken as capitals — engines read "A" as the letter name
 * and lowercase "a" as the article.
 */
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
      text: ch.toUpperCase(),
      rate: 0.85,
      gapMs: 140,
      onStart: () => onLetter(i),
    })),
    { text: word, rate: 0.72, gapMs: 0, onStart: onRepeat },
  ];
}
