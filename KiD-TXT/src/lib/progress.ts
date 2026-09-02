// ─── KiD-TXT Progress, Coins & Leaderboard ───────────────────────
// Demo persistence is localStorage. In production this is the shape
// that would sit in Supabase, one row per pupil per text, so a
// teacher can see the same breakdown across a class.
// ──────────────────────────────────────────────────────────────────

import { SKILL_ORDER, type SkillKey } from './curriculum';

const KEY = 'kid_txt_progress_v2';

export interface SkillRecord {
  asked: number;
  correct: number;
}

export interface TextRecord {
  /** Furthest word index reached. */
  wordIndex: number;
  completed: boolean;
  /** Statutory words met in this text so far. */
  statutoryMet: string[];
}

export interface Progress {
  coins: number;
  /** Correct answers first time, across all texts. */
  firstTimeCorrect: number;
  totalAnswered: number;
  skills: Record<SkillKey, SkillRecord>;
  texts: Record<string, TextRecord>;
}

function emptySkills(): Record<SkillKey, SkillRecord> {
  return SKILL_ORDER.reduce((acc, k) => {
    acc[k] = { asked: 0, correct: 0 };
    return acc;
  }, {} as Record<SkillKey, SkillRecord>);
}

export function emptyProgress(): Progress {
  return {
    coins: 0,
    firstTimeCorrect: 0,
    totalAnswered: 0,
    skills: emptySkills(),
    texts: {},
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Progress;
    // Merge in any skills added since this profile was saved.
    return { ...emptyProgress(), ...parsed, skills: { ...emptySkills(), ...parsed.skills } };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — demo continues without persistence */
  }
}

// ─── Coin values ──────────────────────────────────────────────────
export const COINS_PER_CORRECT = 5;
export const COINS_PER_TEXT = 25;
export const COINS_PER_NEW_STATUTORY_WORD = 1;

/** Record an answer. `firstTry` only earns coins once per question. */
export function recordAnswer(
  p: Progress,
  skill: SkillKey,
  correct: boolean,
  firstTry: boolean,
): Progress {
  const s = p.skills[skill] ?? { asked: 0, correct: 0 };
  const next: Progress = {
    ...p,
    totalAnswered: p.totalAnswered + (firstTry ? 1 : 0),
    firstTimeCorrect: p.firstTimeCorrect + (correct && firstTry ? 1 : 0),
    coins: p.coins + (correct && firstTry ? COINS_PER_CORRECT : 0),
    skills: {
      ...p.skills,
      [skill]: {
        asked: s.asked + (firstTry ? 1 : 0),
        correct: s.correct + (correct && firstTry ? 1 : 0),
      },
    },
  };
  saveProgress(next);
  return next;
}

/** Save reading position, and any newly met statutory words. */
export function recordReading(
  p: Progress,
  textId: string,
  wordIndex: number,
  statutoryMet: string[],
): Progress {
  const prev = p.texts[textId] ?? { wordIndex: 0, completed: false, statutoryMet: [] };
  const merged = [...new Set([...prev.statutoryMet, ...statutoryMet])];
  const newWords = merged.length - prev.statutoryMet.length;

  const next: Progress = {
    ...p,
    coins: p.coins + newWords * COINS_PER_NEW_STATUTORY_WORD,
    texts: {
      ...p.texts,
      [textId]: {
        ...prev,
        wordIndex: Math.max(prev.wordIndex, wordIndex),
        statutoryMet: merged,
      },
    },
  };
  saveProgress(next);
  return next;
}

/** Mark a text finished. Only pays out the first time. */
export function recordCompletion(p: Progress, textId: string): Progress {
  const prev = p.texts[textId] ?? { wordIndex: 0, completed: false, statutoryMet: [] };
  if (prev.completed) return p;

  const next: Progress = {
    ...p,
    coins: p.coins + COINS_PER_TEXT,
    texts: { ...p.texts, [textId]: { ...prev, completed: true } },
  };
  saveProgress(next);
  return next;
}

// ─── Derived stats ────────────────────────────────────────────────

export function textsCompleted(p: Progress): number {
  return Object.values(p.texts).filter((t) => t.completed).length;
}

export function accuracy(p: Progress): number {
  if (p.totalAnswered === 0) return 0;
  return Math.round((p.firstTimeCorrect / p.totalAnswered) * 100);
}

export function skillAccuracy(p: Progress, skill: SkillKey): number | null {
  const s = p.skills[skill];
  if (!s || s.asked === 0) return null;
  return Math.round((s.correct / s.asked) * 100);
}

/**
 * The skill worth practising next: the lowest-scoring tested skill,
 * but only once there is enough evidence to be worth saying. With one
 * question answered, or with everything correct, there is no weakness
 * to point at — and telling a child to practise the thing they just
 * got right reads as nonsense.
 */
export function weakestSkill(p: Progress): SkillKey | null {
  const tested = SKILL_ORDER
    .map((k) => ({ k, acc: skillAccuracy(p, k) }))
    .filter((x): x is { k: SkillKey; acc: number } => x.acc !== null);
  if (tested.length === 0) return null;

  const lowest = tested.reduce((lo, x) => (x.acc < lo.acc ? x : lo));
  if (lowest.acc >= 85) return null;
  if (p.skills[lowest.k].asked < 2) return null;
  return lowest.k;
}

/** Every statutory word met, across all texts. */
export function allStatutoryMet(p: Progress): string[] {
  return [...new Set(Object.values(p.texts).flatMap((t) => t.statutoryMet))];
}

// ─── Leaderboard ──────────────────────────────────────────────────
// Demo classmates so the board has something to rank against. Real
// data would come from the class table. Ranked by texts read first,
// then comprehension accuracy — never by reading speed, which would
// push children to skim.

export interface LeaderboardRow {
  name: string;
  textsRead: number;
  accuracy: number;
  coins: number;
  isMe?: boolean;
}

const CLASSMATES: LeaderboardRow[] = [
  { name: 'Amira',  textsRead: 7, accuracy: 91, coins: 340 },
  { name: 'Jonah',  textsRead: 6, accuracy: 84, coins: 295 },
  { name: 'Priya',  textsRead: 5, accuracy: 88, coins: 268 },
  { name: 'Kwame',  textsRead: 4, accuracy: 79, coins: 205 },
  { name: 'Ellis',  textsRead: 3, accuracy: 82, coins: 176 },
  { name: 'Rosa',   textsRead: 2, accuracy: 74, coins: 120 },
];

export function buildLeaderboard(p: Progress, myName: string): LeaderboardRow[] {
  const me: LeaderboardRow = {
    name: myName,
    textsRead: textsCompleted(p),
    accuracy: accuracy(p),
    coins: p.coins,
    isMe: true,
  };
  return [...CLASSMATES, me].sort(
    (a, b) => b.textsRead - a.textsRead || b.accuracy - a.accuracy || b.coins - a.coins,
  );
}
