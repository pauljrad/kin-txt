// ─── KiD-TXT Curriculum Model ────────────────────────────────────
// Everything in this file is derived from the DfE National Curriculum
// for England (Crown copyright, Open Government Licence v3.0):
//   • the statutory spelling word lists (English Appendix 1)
//   • the KS1/KS2 reading content domains (2a–2h)
//   • published fluency (WCPM) expectations
// No content from commercial reading schemes is reproduced here.
// ──────────────────────────────────────────────────────────────────

// ═══ 1. Reading skills ═══════════════════════════════════════════
// The eight comprehension strands. These map 1:1 onto the DfE reading
// content domains, and onto the same eight skills schools already
// display on the wall — so a teacher recognises them instantly.

export type SkillKey =
  | 'clarify'
  | 'retrieve'
  | 'summarise'
  | 'infer'
  | 'predict'
  | 'structure'
  | 'language'
  | 'compare';

export interface ReadingSkill {
  key: SkillKey;
  /** Teacher-facing name. */
  label: string;
  /** Child-facing "I can…" statement. */
  kidLabel: string;
  /** DfE content domain reference. */
  domain: string;
  colour: string;
  icon: string;
}

export const READING_SKILLS: Record<SkillKey, ReadingSkill> = {
  clarify: {
    key: 'clarify',
    label: 'Clarify',
    kidLabel: 'I know what the words mean',
    domain: '2a — vocabulary',
    colour: '#E8543F',
    icon: '🔍',
  },
  retrieve: {
    key: 'retrieve',
    label: 'Retrieve',
    kidLabel: 'I can find the answer in the text',
    domain: '2b — retrieve & record',
    colour: '#F2A03D',
    icon: '📌',
  },
  summarise: {
    key: 'summarise',
    label: 'Summarise',
    kidLabel: 'I can say what happened, in order',
    domain: '2c — summarise',
    colour: '#5BA85B',
    icon: '📝',
  },
  infer: {
    key: 'infer',
    label: 'Infer',
    kidLabel: 'I can work out what is not written down',
    domain: '2d — inference',
    colour: '#3E8FC4',
    icon: '💭',
  },
  predict: {
    key: 'predict',
    label: 'Predict',
    kidLabel: 'I can guess what happens next',
    domain: '2e — prediction',
    colour: '#8E6BC4',
    icon: '🔮',
  },
  structure: {
    key: 'structure',
    label: 'Structure',
    kidLabel: 'I know how the writing is put together',
    domain: '2f — structure & organisation',
    colour: '#C4568E',
    icon: '🧱',
  },
  language: {
    key: 'language',
    label: 'Language',
    kidLabel: 'I can see why the writer chose those words',
    domain: '2g — language choice',
    colour: '#3FA9A0',
    icon: '🎨',
  },
  compare: {
    key: 'compare',
    label: 'Compare',
    kidLabel: 'I can spot what is the same and different',
    domain: '2h — comparison',
    colour: '#7A6A55',
    icon: '⚖️',
  },
};

export const SKILL_ORDER: SkillKey[] = [
  'clarify', 'retrieve', 'summarise', 'infer',
  'predict', 'structure', 'language', 'compare',
];

// ═══ 2. Reading bands ════════════════════════════════════════════
// Deliberately named after gemstones rather than year groups.
// A child working outside their chronological year should never be
// able to read their level off the screen, and the names are not in
// an order children can rank — unlike a rainbow or a number.
// `yearLabel` is teacher-facing only and never rendered to the pupil.

export type BandKey =
  | 'coral' | 'amber' | 'jade' | 'topaz'
  | 'sapphire' | 'violet' | 'ruby';

export interface ReadingBand {
  key: BandKey;
  label: string;
  colour: string;
  /** Teacher//admin-facing only — never shown to the child. */
  yearLabel: string;
  /** Target words correct per minute (the median expectation). */
  targetWcpm: number;
  /** The child may move within this range, and no further. */
  minWcpm: number;
  maxWcpm: number;
  /** Comprehension question cadence, in words. */
  wordsPerQuestion: number;
  /** Which statutory spelling list applies at this band. */
  spellingList: SpellingListKey;
}

export const READING_BANDS: Record<BandKey, ReadingBand> = {
  coral: {
    key: 'coral', label: 'Coral', colour: '#FF7B6B',
    yearLabel: 'Year 1 (Autumn)',
    targetWcpm: 18, minWcpm: 12, maxWcpm: 26,
    wordsPerQuestion: 60, spellingList: 'y1_2',
  },
  amber: {
    key: 'amber', label: 'Amber', colour: '#F5A623',
    yearLabel: 'Year 1 (Summer)',
    targetWcpm: 65, minWcpm: 50, maxWcpm: 80,
    wordsPerQuestion: 100, spellingList: 'y1_2',
  },
  jade: {
    key: 'jade', label: 'Jade', colour: '#4CAF7D',
    yearLabel: 'Year 2',
    targetWcpm: 95, minWcpm: 80, maxWcpm: 110,
    wordsPerQuestion: 150, spellingList: 'y1_2',
  },
  topaz: {
    key: 'topaz', label: 'Topaz', colour: '#D4A017',
    yearLabel: 'Year 3',
    targetWcpm: 115, minWcpm: 95, maxWcpm: 135,
    wordsPerQuestion: 200, spellingList: 'y3_4',
  },
  sapphire: {
    key: 'sapphire', label: 'Sapphire', colour: '#3E7FC4',
    yearLabel: 'Year 4',
    targetWcpm: 130, minWcpm: 110, maxWcpm: 150,
    wordsPerQuestion: 250, spellingList: 'y3_4',
  },
  violet: {
    key: 'violet', label: 'Violet', colour: '#8E6BC4',
    yearLabel: 'Year 5',
    targetWcpm: 150, minWcpm: 130, maxWcpm: 170,
    wordsPerQuestion: 300, spellingList: 'y5_6',
  },
  ruby: {
    key: 'ruby', label: 'Ruby', colour: '#D9455F',
    yearLabel: 'Year 6',
    targetWcpm: 160, minWcpm: 140, maxWcpm: 185,
    wordsPerQuestion: 350, spellingList: 'y5_6',
  },
};

export const BAND_ORDER: BandKey[] = [
  'coral', 'amber', 'jade', 'topaz', 'sapphire', 'violet', 'ruby',
];

/** Milliseconds per word for a given reading speed. */
export function wcpmToDelayMs(wcpm: number): number {
  return 60000 / Math.max(1, wcpm);
}

// ═══ 3. Text types ═══════════════════════════════════════════════
// The ten text types a child should meet across a key stage. The
// library is organised by these so coverage is visible at a glance.

export type TextTypeKey =
  | 'narrative' | 'descriptive' | 'expository' | 'persuasive'
  | 'procedural' | 'recount' | 'explanation' | 'report'
  | 'poetry' | 'biography';

export interface TextType {
  key: TextTypeKey;
  label: string;
  kidBlurb: string;
  icon: string;
  colour: string;
}

export const TEXT_TYPES: Record<TextTypeKey, TextType> = {
  narrative:   { key: 'narrative',   label: 'Narrative',   kidBlurb: 'A story with characters and a plot',      icon: '📖', colour: '#E8543F' },
  descriptive: { key: 'descriptive', label: 'Descriptive', kidBlurb: 'Paints a picture using your senses',      icon: '🎨', colour: '#F2A03D' },
  expository:  { key: 'expository',  label: 'Expository',  kidBlurb: 'Explains a topic and gives you facts',    icon: '📚', colour: '#5BA85B' },
  persuasive:  { key: 'persuasive',  label: 'Persuasive',  kidBlurb: 'Tries to make you agree or act',          icon: '📣', colour: '#3E8FC4' },
  procedural:  { key: 'procedural',  label: 'Procedural',  kidBlurb: 'Tells you how to do it, step by step',    icon: '🪜', colour: '#8E6BC4' },
  recount:     { key: 'recount',     label: 'Recount',     kidBlurb: 'Retells what happened, in order',         icon: '🗓️', colour: '#C4568E' },
  explanation: { key: 'explanation', label: 'Explanation', kidBlurb: 'Tells you how or why something happens',  icon: '⚙️', colour: '#3FA9A0' },
  report:      { key: 'report',      label: 'Report',      kidBlurb: 'Organised facts about one subject',       icon: '📊', colour: '#7A6A55' },
  poetry:      { key: 'poetry',      label: 'Poetry',      kidBlurb: 'Rhythm, verses and playful language',      icon: '🪶', colour: '#D4A017' },
  biography:   { key: 'biography',   label: 'Biography',   kidBlurb: 'The true story of a real person',         icon: '👤', colour: '#D9455F' },
};

export const TEXT_TYPE_ORDER: TextTypeKey[] = [
  'narrative', 'descriptive', 'expository', 'persuasive', 'procedural',
  'recount', 'explanation', 'report', 'poetry', 'biography',
];

// ═══ 4. Statutory spelling lists ═════════════════════════════════
// National Curriculum English Appendix 1. Every text in the library
// is checked against these, so we can show exactly which statutory
// words a child has met — the headline claim for a school buyer.

export type SpellingListKey = 'y1_2' | 'y3_4' | 'y5_6';

export const SPELLING_LISTS: Record<SpellingListKey, { label: string; words: string[] }> = {
  y1_2: {
    label: 'Years 1 & 2 common exception words',
    words: [
      'the', 'a', 'do', 'to', 'today', 'of', 'said', 'says', 'your', 'they',
      'be', 'he', 'me', 'she', 'we', 'no', 'come', 'some', 'one', 'once',
      'ask', 'friend', 'school', 'put', 'are', 'were', 'was', 'is', 'his',
      'has', 'I', 'you', 'go', 'so', 'by', 'my', 'here', 'there', 'where',
      'love', 'push', 'pull', 'full', 'house', 'our', 'door', 'poor', 'find',
      'mind', 'floor', 'because', 'kind', 'whole', 'any', 'child', 'wild',
      'most', 'both', 'children', 'climb', 'only', 'old', 'many', 'clothes',
      'cold', 'gold', 'hold', 'told', 'every', 'great', 'break', 'steak',
      'busy', 'people', 'pretty', 'beautiful', 'after', 'fast', 'last',
      'past', 'father', 'class', 'water', 'again', 'grass', 'pass', 'plant',
      'path', 'bath', 'hour', 'move', 'prove', 'half', 'money', 'improve',
      'sugar', 'could', 'would', 'sure', 'eye', 'should', 'who', 'Mr', 'Mrs',
      'parents', 'Christmas', 'everybody', 'even',
    ],
  },
  y3_4: {
    label: 'Years 3 & 4 statutory word list',
    words: [
      'accident', 'accidentally', 'actual', 'actually', 'address', 'although',
      'answer', 'appear', 'arrive', 'believe', 'bicycle', 'breath', 'breathe',
      'build', 'busy', 'business', 'calendar', 'caught', 'centre', 'century',
      'certain', 'circle', 'complete', 'consider', 'continue', 'decide',
      'describe', 'different', 'difficult', 'disappear', 'early', 'earth',
      'eight', 'eighth', 'enough', 'exercise', 'experience', 'experiment',
      'extreme', 'famous', 'favourite', 'February', 'forwards', 'fruit',
      'grammar', 'group', 'guard', 'guide', 'heard', 'heart', 'height',
      'history', 'imagine', 'increase', 'important', 'interest', 'island',
      'knowledge', 'learn', 'length', 'library', 'material', 'medicine',
      'mention', 'minute', 'natural', 'naughty', 'notice', 'occasion',
      'occasionally', 'often', 'opposite', 'ordinary', 'particular',
      'peculiar', 'perhaps', 'popular', 'position', 'possess', 'possession',
      'possible', 'potatoes', 'pressure', 'probably', 'promise', 'purpose',
      'quarter', 'question', 'recent', 'regular', 'reign', 'remember',
      'sentence', 'separate', 'special', 'straight', 'strange', 'strength',
      'suppose', 'surprise', 'therefore', 'though', 'thought', 'through',
      'various', 'weight', 'woman', 'women',
    ],
  },
  y5_6: {
    label: 'Years 5 & 6 statutory word list',
    words: [
      'accommodate', 'accompany', 'according', 'achieve', 'aggressive',
      'amateur', 'ancient', 'apparent', 'appreciate', 'attached', 'available',
      'average', 'awkward', 'bargain', 'bruise', 'category', 'cemetery',
      'committee', 'communicate', 'community', 'competition', 'conscience',
      'conscious', 'controversy', 'convenience', 'correspond', 'criticise',
      'curiosity', 'definite', 'desperate', 'determined', 'develop',
      'dictionary', 'disastrous', 'embarrass', 'environment', 'equip',
      'equipped', 'equipment', 'especially', 'exaggerate', 'excellent',
      'existence', 'explanation', 'familiar', 'foreign', 'forty',
      'frequently', 'government', 'guarantee', 'harass', 'hindrance',
      'identity', 'immediate', 'immediately', 'individual', 'interfere',
      'interrupt', 'language', 'leisure', 'lightning', 'marvellous',
      'mischievous', 'muscle', 'necessary', 'neighbour', 'nuisance', 'occupy',
      'occur', 'opportunity', 'parliament', 'persuade', 'physical',
      'prejudice', 'privilege', 'profession', 'programme', 'pronunciation',
      'queue', 'recognise', 'recommend', 'relevant', 'restaurant', 'rhyme',
      'rhythm', 'sacrifice', 'secretary', 'shoulder', 'signature', 'sincere',
      'sincerely', 'soldier', 'stomach', 'sufficient', 'suggest', 'symbol',
      'system', 'temperature', 'thorough', 'twelfth', 'variety', 'vegetable',
      'vehicle', 'yacht',
    ],
  },
};

/** Lower-cased lookup sets, built once. */
const SPELLING_SETS: Record<SpellingListKey, Set<string>> = {
  y1_2: new Set(SPELLING_LISTS.y1_2.words.map((w) => w.toLowerCase())),
  y3_4: new Set(SPELLING_LISTS.y3_4.words.map((w) => w.toLowerCase())),
  y5_6: new Set(SPELLING_LISTS.y5_6.words.map((w) => w.toLowerCase())),
};

/** Strip punctuation so "wolves," and "wolves" match. */
export function normaliseWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
}

/**
 * Candidate base forms for a word, so inflections still count.
 * "remembered" → remember, "appears" → appear, "equipped" → equip.
 * Deliberately conservative: a candidate only counts if it is itself
 * on the list, so over-eager stemming cannot invent a match.
 */
function baseForms(w: string): string[] {
  const c = [w];
  if (w.endsWith('s')) c.push(w.slice(0, -1));
  if (w.endsWith('es')) c.push(w.slice(0, -2));
  if (w.endsWith('ies')) c.push(w.slice(0, -3) + 'y');
  if (w.endsWith('d')) c.push(w.slice(0, -1));
  if (w.endsWith('ed')) c.push(w.slice(0, -2));
  if (w.endsWith('ied')) c.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ing')) {
    c.push(w.slice(0, -3));
    c.push(w.slice(0, -3) + 'e');
  }
  if (w.endsWith('ly')) c.push(w.slice(0, -2));
  if (w.endsWith('ally')) c.push(w.slice(0, -4));
  if (w.endsWith('ier')) c.push(w.slice(0, -3) + 'y');
  if (w.endsWith('est')) c.push(w.slice(0, -3));
  // Doubled consonant before a suffix: equipped → equip, stopped → stop.
  const doubled = w.match(/^(.*?)([bdfglmnprt])\2(ed|ing|er|est)$/);
  if (doubled) c.push(doubled[1] + doubled[2]);
  return c;
}

/**
 * If this word is on the list (in any inflected form), return the
 * list's own spelling of it. Otherwise null.
 */
export function statutoryBase(word: string, list: SpellingListKey): string | null {
  const w = normaliseWord(word);
  if (!w) return null;
  const set = SPELLING_SETS[list];
  for (const candidate of baseForms(w)) {
    if (candidate.length > 1 && set.has(candidate)) return candidate;
  }
  return null;
}

/** Is this word on the given statutory list? */
export function isStatutoryWord(word: string, list: SpellingListKey): boolean {
  return statutoryBase(word, list) !== null;
}

/** Every statutory word from `list` that appears in `words`, in list order. */
export function statutoryWordsIn(words: string[], list: SpellingListKey): string[] {
  const present = new Set<string>();
  for (const raw of words) {
    const base = statutoryBase(raw, list);
    if (base) present.add(base);
  }
  return SPELLING_LISTS[list].words.filter((w) => present.has(w.toLowerCase()));
}
