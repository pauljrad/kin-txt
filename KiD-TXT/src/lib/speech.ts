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
