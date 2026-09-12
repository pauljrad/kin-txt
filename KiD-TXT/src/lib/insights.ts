// ─── Insights ────────────────────────────────────────────────────
// Turns a pupil's raw record into what a teacher actually wants to
// know: how they read, what they understand, where they are strong,
// where they need help, and whether they should move band.
//
// The thresholds are deliberately simple and visible, so a teacher
// can disagree with one and know exactly why the app said what it did.
// ──────────────────────────────────────────────────────────────────

import { LIBRARY, toWordParagraphs } from './library';
import {
  READING_BANDS, READING_SKILLS, SKILL_ORDER, TEXT_TYPES, TEXT_TYPE_ORDER,
  SPELLING_LISTS, BAND_ORDER,
  type BandKey, type SkillKey, type TextTypeKey,
} from './curriculum';
import type { PupilRecord } from './classData';

export interface SkillScore { key: SkillKey; label: string; colour: string; asked: number; pct: number | null }
export interface TypeScore { key: TextTypeKey; label: string; colour: string; asked: number; pct: number | null; read: number; started: number }

export type Standing = 'excelling' | 'on-track' | 'needs-help' | 'new';

export interface Recommendation {
  move: 'up' | 'down' | 'stay';
  to?: BandKey;
  reason: string;
}

export interface PupilInsight {
  textsRead: number;
  textsStarted: number;
  wordsRead: number;
  accuracy: number | null;
  totalAnswered: number;
  pausesPer100: number | null;
  lessons: number;
  /** Where their speed sits in the band's range, 0–1. */
  speedPosition: number;
  skills: SkillScore[];
  strengths: SkillScore[];
  needsHelp: SkillScore[];
  types: TypeScore[];
  typesStrong: TypeScore[];
  typesWeak: TypeScore[];
  statutory: { met: number; total: number; listLabel: string };
  standing: Standing;
  recommendation: Recommendation;
  headline: string;
}

const pct = (correct: number, asked: number) => (asked === 0 ? null : Math.round((correct / asked) * 100));

// Tunable, and worth showing to a teacher. Skill judgements need at
// least this many questions before they count as evidence.
const MIN_EVIDENCE = 3;
const STRONG = 85;
const WEAK = 65;

export function analysePupil(p: PupilRecord): PupilInsight {
  const band = READING_BANDS[p.band];
  const list = SPELLING_LISTS[band.spellingList];
  const records = Object.entries(p.progress.texts);

  // ── reading volume ──
  let wordsRead = 0;
  let pauses = 0;
  let lessons = 0;
  let textsRead = 0;
  for (const [id, t] of records) {
    const text = LIBRARY.find((x) => x.id === id);
    if (!text) continue;
    const total = toWordParagraphs(text).flat().length;
    wordsRead += t.completed ? total : Math.min(t.wordIndex + 1, total);
    pauses += t.pauses;
    lessons += t.lessons;
    if (t.completed) textsRead += 1;
  }
  const pausesPer100 = wordsRead >= 50 ? +((pauses / wordsRead) * 100).toFixed(1) : null;

  // ── comprehension by skill ──
  const skills: SkillScore[] = SKILL_ORDER.map((k) => {
    const s = p.progress.skills[k] ?? { asked: 0, correct: 0 };
    return { key: k, label: READING_SKILLS[k].label, colour: READING_SKILLS[k].colour, asked: s.asked, pct: pct(s.correct, s.asked) };
  });
  const evidenced = skills.filter((s) => s.asked >= MIN_EVIDENCE && s.pct !== null);
  const strengths = evidenced.filter((s) => (s.pct ?? 0) >= STRONG).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const needsHelp = evidenced.filter((s) => (s.pct ?? 0) < WEAK).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

  // ── by text type ──
  const types: TypeScore[] = TEXT_TYPE_ORDER.map((k) => {
    let asked = 0, correct = 0, read = 0, started = 0;
    for (const text of LIBRARY.filter((x) => x.textType === k)) {
      const t = p.progress.texts[text.id];
      if (!t) continue;
      started += 1;
      if (t.completed) read += 1;
      asked += t.asked;
      correct += t.correct;
    }
    return { key: k, label: TEXT_TYPES[k].label, colour: TEXT_TYPES[k].colour, asked, pct: pct(correct, asked), read, started };
  });
  const typesEvidenced = types.filter((t) => t.asked >= 2 && t.pct !== null);
  const typesStrong = typesEvidenced.filter((t) => (t.pct ?? 0) >= STRONG);
  const typesWeak = typesEvidenced.filter((t) => (t.pct ?? 0) < WEAK);

  // ── statutory words ──
  const met = new Set<string>();
  for (const [, t] of records) for (const w of t.statutoryMet) met.add(w);

  const accuracy = pct(p.progress.firstTimeCorrect, p.progress.totalAnswered);
  const speedPosition = Math.max(0, Math.min(1, (p.wcpm - band.minWcpm) / (band.maxWcpm - band.minWcpm)));

  // ── standing ──
  let standing: Standing = 'new';
  if (p.progress.totalAnswered >= MIN_EVIDENCE) {
    if ((accuracy ?? 0) >= STRONG && (pausesPer100 ?? 0) <= 4) standing = 'excelling';
    else if ((accuracy ?? 0) < WEAK || (pausesPer100 ?? 0) >= 9) standing = 'needs-help';
    else standing = 'on-track';
  }

  // ── move band? ──
  const idx = BAND_ORDER.indexOf(p.band);
  const above = BAND_ORDER[idx + 1];
  const below = BAND_ORDER[idx - 1];
  let recommendation: Recommendation;

  if (p.progress.totalAnswered < MIN_EVIDENCE) {
    recommendation = { move: 'stay', reason: 'Not enough reading yet to judge — ask for two or three more texts first.' };
  } else if ((accuracy ?? 0) >= STRONG && speedPosition >= 0.7 && (pausesPer100 ?? 0) <= 4 && textsRead >= 3 && above) {
    recommendation = {
      move: 'up', to: above,
      reason: `${accuracy}% comprehension while reading at the top of ${band.label} (${p.wcpm} of ${band.maxWcpm} wpm), with very few pauses. Ready for ${READING_BANDS[above].label}.`,
    };
  } else if ((accuracy ?? 0) >= STRONG && speedPosition >= 0.7 && (pausesPer100 ?? 0) <= 4 && textsRead >= 3 && !above) {
    recommendation = { move: 'stay', reason: `Already in the top band and thriving. Stretch with harder texts and the Years 5 & 6 word list.` };
  } else if (((accuracy ?? 0) < WEAK || (pausesPer100 ?? 0) >= 9) && below && textsRead + (records.length ? 1 : 0) >= 2) {
    const why = (accuracy ?? 0) < WEAK
      ? `only ${accuracy}% of questions right`
      : `stopping ${pausesPer100} times per hundred words`;
    recommendation = {
      move: 'down', to: below,
      reason: `Struggling at ${band.label}: ${why}. A term at ${READING_BANDS[below].label} would rebuild confidence before trying again.`,
    };
  } else if (((accuracy ?? 0) < WEAK || (pausesPer100 ?? 0) >= 9) && !below) {
    const why = (accuracy ?? 0) < WEAK
      ? `only ${accuracy}% of questions right`
      : `stopping ${pausesPer100} times per hundred words`;
    recommendation = { move: 'stay', reason: `Finding ${band.label} hard: ${why}. Already in the first band, so this is one for shared reading and shorter texts rather than a move.` };
  } else if ((accuracy ?? 0) >= STRONG && speedPosition < 0.7) {
    recommendation = { move: 'stay', reason: `Understanding is strong (${accuracy}%). Nudge the reading speed up towards ${band.maxWcpm} wpm before moving band.` };
  } else if (needsHelp.length > 0) {
    recommendation = { move: 'stay', reason: `Right band, but ${needsHelp.map((s) => s.label.toLowerCase()).join(' and ')} need${needsHelp.length === 1 ? 's' : ''} targeted work before moving up.` };
  } else {
    recommendation = { move: 'stay', reason: `Working well at ${band.label}. Keep going.` };
  }

  // ── one line a teacher can read in a glance ──
  const headline = (() => {
    if (standing === 'new') return 'Just getting started.';
    const parts: string[] = [];
    if (accuracy !== null) parts.push(`${accuracy}% comprehension`);
    if (pausesPer100 !== null) parts.push(`${pausesPer100} pauses per 100 words`);
    if (strengths.length) parts.push(`strong at ${strengths.slice(0, 2).map((s) => s.label.toLowerCase()).join(', ')}`);
    if (needsHelp.length) parts.push(`needs help with ${needsHelp.slice(0, 2).map((s) => s.label.toLowerCase()).join(', ')}`);
    return parts.join(' · ') + '.';
  })();

  return {
    textsRead,
    textsStarted: records.length,
    wordsRead,
    accuracy,
    totalAnswered: p.progress.totalAnswered,
    pausesPer100,
    lessons,
    speedPosition,
    skills,
    strengths,
    needsHelp,
    types,
    typesStrong,
    typesWeak,
    statutory: { met: met.size, total: list.words.length, listLabel: list.label },
    standing,
    recommendation,
    headline,
  };
}

export const STANDING_LABEL: Record<Standing, string> = {
  excelling: 'Excelling',
  'on-track': 'On track',
  'needs-help': 'Needs help',
  new: 'New',
};
