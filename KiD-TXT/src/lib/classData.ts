// ─── The class ───────────────────────────────────────────────────
// One real pupil (whoever is logged in on this device — RUGRAT in the
// demo) and six manufactured ones, so the teacher's view has a class
// to look at. Every manufactured record is marked `demo` and built
// deterministically from a persona, so the numbers tell a coherent
// story: Priya is ready to move up, Kwame is struggling, and so on.
// ──────────────────────────────────────────────────────────────────

import { LIBRARY, toWordParagraphs } from './library';
import { loadProgress, type Progress, type TextRecord } from './progress';
import {
  READING_BANDS, SKILL_ORDER, statutoryWordsIn,
  type BandKey, type SkillKey,
} from './curriculum';
import { getKidSession } from './kidAuth';

export interface PupilRecord {
  pupilId: string;
  name: string;
  band: BandKey;
  wcpm: number;
  progress: Progress;
  /** True for the six invented classmates. */
  demo: boolean;
}

// ─── Band overrides, set by the teacher ───────────────────────────
// A teacher moving a child up or down is the one setting a pupil
// cannot change themselves. Kept separately so it applies whether
// the child is logged in now or next week.

const OVERRIDES_KEY = 'kid_txt_band_overrides';

export function bandOverrides(): Record<string, BandKey> {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}'); } catch { return {}; }
}

export function setBandOverride(pupilId: string, band: BandKey): void {
  const all = bandOverrides();
  all[pupilId] = band;
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

// ─── Personas ─────────────────────────────────────────────────────
interface Persona {
  pupilId: string;
  name: string;
  band: BandKey;
  /** Where in the band's range they read, 0–1. */
  speed: number;
  /** Texts finished, in library order. */
  finished: number;
  /** Base first-try accuracy, 0–1. */
  accuracy: number;
  /** Per-skill nudges on top of the base, −0.4…+0.1. */
  skills: Partial<Record<SkillKey, number>>;
  /** Pauses per hundred words. */
  pausing: number;
  seed: number;
}

const PERSONAS: Persona[] = [
  { pupilId: '10231', name: 'AMIRA', band: 'ruby',     speed: 0.85, finished: 7, accuracy: 0.91, skills: { infer: 0.05, language: 0.05, compare: -0.05 },            pausing: 1.2,  seed: 11 },
  { pupilId: '10232', name: 'JONAH', band: 'sapphire', speed: 0.55, finished: 6, accuracy: 0.84, skills: { infer: -0.28, predict: -0.2, retrieve: 0.08 },              pausing: 3.4,  seed: 23 },
  { pupilId: '10233', name: 'PRIYA', band: 'topaz',    speed: 0.92, finished: 5, accuracy: 0.9,  skills: { summarise: 0.05, structure: -0.08 },                       pausing: 1.6,  seed: 37 },
  { pupilId: '10234', name: 'KWAME', band: 'jade',     speed: 0.1,  finished: 4, accuracy: 0.66, skills: { retrieve: 0.12, summarise: -0.3, infer: -0.32, clarify: -0.1 }, pausing: 11.5, seed: 41 },
  { pupilId: '10235', name: 'ELLIS', band: 'amber',    speed: 0.5,  finished: 3, accuracy: 0.82, skills: { structure: -0.25, compare: -0.15 },                        pausing: 4.8,  seed: 53 },
  { pupilId: '10236', name: 'ROSA',  band: 'coral',    speed: 0.35, finished: 2, accuracy: 0.74, skills: { clarify: -0.3, language: -0.2, retrieve: 0.1 },            pausing: 14,   seed: 67 },
];

/** Small deterministic generator, so a demo pupil looks the same every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildProgress(p: Persona): Progress {
  const rand = rng(p.seed);
  const band = READING_BANDS[p.band];
  const texts: Record<string, TextRecord> = {};
  const skills = Object.fromEntries(SKILL_ORDER.map((k) => [k, { asked: 0, correct: 0 }])) as Progress['skills'];

  let totalAnswered = 0;
  let firstTimeCorrect = 0;
  let coins = 0;

  LIBRARY.forEach((text, i) => {
    const words = toWordParagraphs(text).flat();
    const completed = i < p.finished;
    // One unfinished text, part way through, after the finished ones
    const inProgress = i === p.finished;
    if (!completed && !inProgress) return;

    const wordIndex = completed ? words.length - 1 : Math.floor(words.length * (0.3 + rand() * 0.4));
    const met = statutoryWordsIn(words.slice(0, wordIndex + 1), band.spellingList);
    // A term's worth — texts get re-read, so more than one pass of questions
    const asked = completed ? 5 + Math.floor(rand() * 4) : 2 + Math.floor(rand() * 2);
    let correct = 0;

    // Questions alternate skills. Each skill's hit rate is the persona's
    // odds, applied to the count rather than rolled per question — with
    // four questions a coin-flip can bury the profile we are trying to show.
    const perSkill = new Map<SkillKey, number>();
    for (let q = 0; q < asked; q++) {
      const skill = SKILL_ORDER[(i * 3 + q) % SKILL_ORDER.length];
      perSkill.set(skill, (perSkill.get(skill) ?? 0) + 1);
    }
    for (const [skill, n] of perSkill) {
      const chance = Math.min(0.98, Math.max(0.15, p.accuracy + (p.skills[skill] ?? 0)));
      const jitter = rand() < 0.5 ? 0 : (rand() < 0.5 ? -1 : 1);
      const ok = Math.max(0, Math.min(n, Math.round(n * chance) + jitter));
      skills[skill].asked += n;
      skills[skill].correct += ok;
      correct += ok;
    }

    const pauses = Math.round(((wordIndex + 1) / 100) * p.pausing * (0.8 + rand() * 0.4));
    const lessons = Math.min(met.length, Math.round(met.length * (0.6 + rand() * 0.4)));

    texts[text.id] = { wordIndex, completed, statutoryMet: met, pauses, asked, correct, lessons };
    totalAnswered += asked;
    firstTimeCorrect += correct;
    coins += correct * 5 + (completed ? 25 : 0) + met.length;
  });

  return { coins, firstTimeCorrect, totalAnswered, skills, texts };
}

// ─── The class ────────────────────────────────────────────────────

function withOverride<T extends { pupilId: string; band: BandKey; wcpm: number }>(r: T): T {
  const o = bandOverrides()[r.pupilId];
  if (!o || o === r.band) return r;
  return { ...r, band: o, wcpm: READING_BANDS[o].targetWcpm };
}

export function demoPupils(): PupilRecord[] {
  return PERSONAS.map((p) => {
    const band = READING_BANDS[p.band];
    return withOverride({
      pupilId: p.pupilId,
      name: p.name,
      band: p.band,
      wcpm: Math.round(band.minWcpm + (band.maxWcpm - band.minWcpm) * p.speed),
      progress: buildProgress(p),
      demo: true,
    });
  });
}

/** The pupil actually using this device, with their real progress. */
export function realPupil(): PupilRecord | null {
  const session = getKidSession();
  if (!session) return null;
  return withOverride({
    pupilId: session.pupilId,
    name: session.name,
    band: session.band,
    wcpm: session.wcpm,
    progress: loadProgress(),
    demo: false,
  });
}

/** Everyone, real pupil first. Falls back to a demo RUGRAT if nobody has logged in here. */
export function classRoster(): PupilRecord[] {
  const real = realPupil() ?? withOverride({
    pupilId: '12345',
    name: 'RUGRAT',
    band: 'topaz' as BandKey,
    wcpm: 115,
    progress: loadProgress(),
    demo: false,
  });
  return [real, ...demoPupils()];
}

export function findPupil(pupilId: string): PupilRecord | undefined {
  return classRoster().find((p) => p.pupilId === pupilId);
}
