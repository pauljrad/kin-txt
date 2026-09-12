// Everything the app can say, so a voice can be pre-generated in full.
//
//   npx tsx scripts/dump-audio-texts.ts > scripts/audio-texts.json
//
// Strings must match what the app sends at runtime exactly, because
// the audio file is looked up by a hash of the string. Reading words
// go through normaliseWord; lesson words use the list's own casing;
// letters are plain lowercase; questions are verbatim.

import { LIBRARY, toWordParagraphs } from '../src/lib/library';
import { QUESTIONS } from '../src/lib/quizQuestions';
import { SPELLING_LISTS, normaliseWord } from '../src/lib/curriculum';

const slow = new Set<string>();
const normal = new Set<string>();

// Every word of every text, as the reader speaks it
for (const text of LIBRARY) {
  for (const w of toWordParagraphs(text).flat()) {
    const clean = normaliseWord(w);
    if (clean) slow.add(clean);
  }
}

// Every statutory word in its own casing (lessons), and lowercase (reading)
for (const list of Object.values(SPELLING_LISTS)) {
  for (const w of list.words) {
    slow.add(w);
    slow.add(w.toLowerCase());
  }
}

// The letters
for (const ch of 'abcdefghijklmnopqrstuvwxyz') slow.add(ch);

// Questions, and the voice sampler
for (const q of QUESTIONS) normal.add(q.question);
normal.add("Hello! I'm going to help you read today.");

process.stdout.write(JSON.stringify({
  slow: [...slow].sort(),
  normal: [...normal].sort(),
}, null, 1));
