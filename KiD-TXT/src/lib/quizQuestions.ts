// ─── KiD-TXT Comprehension Questions ─────────────────────────────
// Every question is tagged with one of the eight reading skills, so
// the app can report which strands a child is strong in — not just a
// single "score". Questions are written for KiD-TXT against our own
// library texts; no scheme question bank is reproduced.
//
// Questions appear every N words, where N comes from the child's
// reading band (see curriculum.ts). A child in a lower band therefore
// answers more often, on shorter stretches of text.
// ──────────────────────────────────────────────────────────────────

import type { SkillKey } from './curriculum';

export interface QuizQuestion {
  textId: string;
  skill: SkillKey;
  question: string;
  options: string[];
  correctIndex: number;
  /** Shown after a correct answer, to make the skill explicit. */
  because: string;
}

export const QUESTIONS: QuizQuestion[] = [
  // ─── The Jungle Book ───────────────────────────────────────────
  {
    textId: 'jungle-book', skill: 'retrieve',
    question: 'What time of day does the story begin?',
    options: ['Early morning', 'Seven o\'clock in the evening', 'The middle of the night', 'Just after lunch'],
    correctIndex: 1,
    because: 'You found that written in the very first sentence.',
  },
  {
    textId: 'jungle-book', skill: 'clarify',
    question: 'Tabaqui is called a "Dish-licker". What does this tell you about him?',
    options: ['He is a very clean animal', 'He eats what others leave behind', 'He washes the dishes', 'He is a good cook'],
    correctIndex: 1,
    because: 'You worked out the meaning of a nickname from the words around it.',
  },
  {
    textId: 'jungle-book', skill: 'infer',
    question: 'Father Wolf says "there is no food here." Why does he say this?',
    options: ['The cave is completely empty', 'He wants Tabaqui to leave', 'He has forgotten about the bone', 'He is asking Tabaqui for help'],
    correctIndex: 1,
    because: 'The text never says it — you worked it out from how he behaves.',
  },
  {
    textId: 'jungle-book', skill: 'language',
    question: 'Why does the writer call Tabaqui "a little shadow with a bushy tail"?',
    options: ['Tabaqui is made of shadow', 'It is night and he arrives quietly', 'He is standing in the sun', 'He is very large'],
    correctIndex: 1,
    because: 'You spotted why the writer chose that description instead of just naming him.',
  },
  {
    textId: 'jungle-book', skill: 'predict',
    question: 'Tabaqui is pleased to make the wolves uncomfortable. What is he most likely to do next?',
    options: ['Leave quietly and say nothing', 'Say something else to worry them', 'Fall asleep in the cave', 'Bring them more food'],
    correctIndex: 1,
    because: 'You used what you already know about him to guess what comes next.',
  },

  // ─── The Owl and the Pussy-cat ─────────────────────────────────
  {
    textId: 'owl-and-pussycat', skill: 'retrieve',
    question: 'What colour was the boat?',
    options: ['Sky blue', 'Pea-green', 'Bright red', 'Golden yellow'],
    correctIndex: 1,
    because: 'You found the exact word in the poem.',
  },
  {
    textId: 'owl-and-pussycat', skill: 'structure',
    question: 'The words "you are, you are" are repeated. Why do poems do this?',
    options: ['The poet made a mistake', 'To build a rhythm you can hear', 'To make the poem longer', 'To explain a hard word'],
    correctIndex: 1,
    because: 'You noticed how the poem is built, not just what it says.',
  },
  {
    textId: 'owl-and-pussycat', skill: 'clarify',
    question: 'The Pussy-cat calls the Owl an "elegant fowl". What does "elegant" mean here?',
    options: ['Very noisy', 'Graceful and fine-looking', 'Extremely hungry', 'Rather silly'],
    correctIndex: 1,
    because: 'You used the friendly tone around the word to work out its meaning.',
  },
  {
    textId: 'owl-and-pussycat', skill: 'language',
    question: 'A "runcible spoon" is a word Edward Lear invented. Why might a poet make up a word?',
    options: ['To sound playful and strange', 'Because he forgot the real word', 'To make the poem shorter', 'Because spoons have no name'],
    correctIndex: 0,
    because: 'You thought about the writer\'s choice, not just the meaning.',
  },

  // ─── The Lighthouse at Dawn ────────────────────────────────────
  {
    textId: 'lighthouse-dawn', skill: 'language',
    question: 'The sea is "the colour of old iron". What does this suggest?',
    options: ['The sea is warm and bright', 'The sea is grey, cold and heavy', 'The sea is full of metal', 'The sea is completely still'],
    correctIndex: 1,
    because: 'You explained the effect of a comparison the writer chose.',
  },
  {
    textId: 'lighthouse-dawn', skill: 'infer',
    question: 'The stone steps are "worn into shallow dips". What does this tell you?',
    options: ['The steps were badly built', 'Many people climbed them for many years', 'Water has damaged them', 'They were carved that shape on purpose'],
    correctIndex: 1,
    because: 'The text does not say it directly — you worked it out from the evidence.',
  },
  {
    textId: 'lighthouse-dawn', skill: 'compare',
    question: 'How does the sea change when the sun comes up?',
    options: ['From iron and grey to glass and gold', 'From calm to stormy', 'From gold to grey', 'It does not change at all'],
    correctIndex: 0,
    because: 'You compared how something looked before and after.',
  },
  {
    textId: 'lighthouse-dawn', skill: 'clarify',
    question: 'The door is a "peculiar green". What does "peculiar" mean?',
    options: ['Very bright', 'Odd or unusual', 'Freshly painted', 'Dark and dull'],
    correctIndex: 1,
    because: 'You found the meaning of a word from how it is used.',
  },

  // ─── The Great Fire of London ──────────────────────────────────
  {
    textId: 'great-fire', skill: 'retrieve',
    question: 'Where did the Great Fire of London start?',
    options: ['In St Paul\'s Cathedral', 'In a bakery on Pudding Lane', 'On a ship in the river', 'In the King\'s palace'],
    correctIndex: 1,
    because: 'You located a specific fact in the text.',
  },
  {
    textId: 'great-fire', skill: 'summarise',
    question: 'Which sentence best sums up why the fire spread so fast?',
    options: [
      'The houses were wooden, the summer was dry and the wind was strong',
      'Nobody in London noticed the fire for four days',
      'There was no water anywhere in the city',
      'The fire was started deliberately by an enemy',
    ],
    correctIndex: 0,
    because: 'You pulled several reasons together into one short answer.',
  },
  {
    textId: 'great-fire', skill: 'infer',
    question: 'Why do historians think the real number of deaths was higher than recorded?',
    options: [
      'The records were burned in the fire',
      'Deaths of poor people were often not written down',
      'Nobody could count that quickly',
      'People were afraid to report deaths'
    ],
    correctIndex: 1,
    because: 'You read past the obvious answer to the reason the text gives.',
  },
  {
    textId: 'great-fire', skill: 'structure',
    question: 'How is this text organised?',
    options: [
      'As a list of names',
      'In time order, from the start of the fire to the rebuilding',
      'As a set of instructions',
      'As a poem in verses'
    ],
    correctIndex: 1,
    because: 'You looked at the shape of the whole text, not one part.',
  },

  // ─── Every School Needs a Library ──────────────────────────────
  {
    textId: 'school-library', skill: 'structure',
    question: 'Why does the writer mention the internet and the cost?',
    options: [
      'To change the subject',
      'To answer arguments against libraries before you make them',
      'To pad out the text',
      'To explain how libraries work'
    ],
    correctIndex: 1,
    because: 'You saw how the writer built the argument, step by step.',
  },
  {
    textId: 'school-library', skill: 'infer',
    question: 'What does the writer think is special about choosing your own book?',
    options: [
      'It is faster than being given one',
      'Choosing makes children want to read more',
      'It saves the teacher time',
      'Chosen books are always easier'
    ],
    correctIndex: 1,
    because: 'You worked out the writer\'s real point from what they argue.',
  },
  {
    textId: 'school-library', skill: 'language',
    question: 'The writer says a library is "not a luxury". Why put it that way?',
    options: [
      'To admit libraries are expensive',
      'To argue it is a necessity, not an extra',
      'To describe how the room looks',
      'To compare it to a hotel'
    ],
    correctIndex: 1,
    because: 'You explained why the writer picked those particular words.',
  },
  {
    textId: 'school-library', skill: 'compare',
    question: 'How does the writer compare a shelf with a screen of search results?',
    options: [
      'A shelf lets you notice books you were not looking for',
      'A screen holds many more books',
      'A shelf is cheaper to buy',
      'They are exactly the same'
    ],
    correctIndex: 0,
    because: 'You compared two things the writer set side by side.',
  },

  // ─── How to Make a Paper Aeroplane ─────────────────────────────
  {
    textId: 'paper-aeroplane', skill: 'structure',
    question: 'Why are the instructions numbered?',
    options: [
      'To show how long the text is',
      'Because the steps must be done in that order',
      'To make it look tidy',
      'Because each step is a different plane'
    ],
    correctIndex: 1,
    because: 'You understood why this kind of writing is laid out that way.',
  },
  {
    textId: 'paper-aeroplane', skill: 'retrieve',
    question: 'What must you not use to make the plane?',
    options: ['A sheet of paper', 'Card, because it is too stiff', 'Your hands', 'A table'],
    correctIndex: 1,
    because: 'You found the instruction that tells you what to avoid.',
  },
  {
    textId: 'paper-aeroplane', skill: 'predict',
    question: 'What will happen if one wing is bigger than the other?',
    options: [
      'The plane will fly further',
      'The plane will turn in a circle',
      'The plane will not fold',
      'Nothing will change'
    ],
    correctIndex: 1,
    because: 'The text warns you — you used it to predict the result.',
  },
  {
    textId: 'paper-aeroplane', skill: 'clarify',
    question: 'The text says to push the plane "gently". Why does it not say "throw"?',
    options: [
      'Throwing is against the rules',
      'A slow, level push flies further',
      'The paper would tear',
      'It means the same thing'
    ],
    correctIndex: 1,
    because: 'You noticed a word choice that carries an instruction inside it.',
  },

  // ─── Our Trip to the Coast ─────────────────────────────────────
  {
    textId: 'trip-to-coast', skill: 'summarise',
    question: 'Which list puts the day in the right order?',
    options: [
      'Beach, lunch, rock pools, harbour wall',
      'Lunch, beach, harbour wall, rock pools',
      'Rock pools, beach, lunch, harbour wall',
      'Harbour wall, lunch, beach, rock pools'
    ],
    correctIndex: 0,
    because: 'You retold the events in the order they happened.',
  },
  {
    textId: 'trip-to-coast', skill: 'retrieve',
    question: 'What did the writer find on the beach?',
    options: ['A crab', 'A small gold shell', 'A green weed', 'A tiny fish'],
    correctIndex: 1,
    because: 'You found the right detail among several similar ones.',
  },
  {
    textId: 'trip-to-coast', skill: 'infer',
    question: 'Why did the class eat lunch behind a big rock?',
    options: [
      'It was the only place to sit',
      'The rock kept the cold wind off them',
      'They were hiding from the teacher',
      'The sand was cleaner there'
    ],
    correctIndex: 1,
    because: 'You linked the rock to the wind mentioned earlier.',
  },
  {
    textId: 'trip-to-coast', skill: 'structure',
    question: 'The writer uses words like "First", "Then" and "The last thing". Why?',
    options: [
      'To show the order events happened in',
      'To make the writing sound older',
      'To start each new character',
      'To ask the reader questions'
    ],
    correctIndex: 0,
    because: 'You spotted the signposts that hold a recount together.',
  },

  // ─── Why We Have Day and Night ─────────────────────────────────
  {
    textId: 'day-and-night', skill: 'clarify',
    question: 'What does the text mean when it says the Earth "spins"?',
    options: [
      'It travels around the Sun',
      'It turns all the way round once a day',
      'It wobbles from side to side',
      'It moves closer to the Sun'
    ],
    correctIndex: 1,
    because: 'You pinned down what a key word means in this text.',
  },
  {
    textId: 'day-and-night', skill: 'infer',
    question: 'If it is midday where you are, what is happening on the opposite side of the Earth?',
    options: ['It is also midday', 'It is the middle of the night', 'It is sunrise', 'The Sun has switched off'],
    correctIndex: 1,
    because: 'You applied the idea to a new situation the text did not spell out.',
  },
  {
    textId: 'day-and-night', skill: 'summarise',
    question: 'In one sentence, why do we have night?',
    options: [
      'The Sun moves behind the Earth',
      'Our side of the Earth has turned away from the Sun',
      'The Sun stops shining at night',
      'Clouds cover the Sun'
    ],
    correctIndex: 1,
    because: 'You boiled the whole explanation down to its main idea.',
  },
  {
    textId: 'day-and-night', skill: 'compare',
    question: 'What is the difference between the Earth spinning and the Earth being tilted?',
    options: [
      'Spinning gives day and night; tilt gives long and short days',
      'Tilt gives day and night; spinning gives the seasons',
      'They both cause night',
      'Neither one affects us'
    ],
    correctIndex: 0,
    because: 'You told apart two ideas that are easy to muddle.',
  },

  // ─── The Blue Whale: A Fact File ───────────────────────────────
  {
    textId: 'blue-whale', skill: 'retrieve',
    question: 'How long can a full grown blue whale be?',
    options: ['Seven metres', 'Thirty metres', 'Ninety metres', 'Four metres'],
    correctIndex: 1,
    because: 'You found an exact number in the text.',
  },
  {
    textId: 'blue-whale', skill: 'structure',
    question: 'The text has headings like "Size", "Food" and "Sound". Why?',
    options: [
      'To make it look like a story',
      'So you can find the fact you want quickly',
      'Because it is a poem',
      'To show the order things happened'
    ],
    correctIndex: 1,
    because: 'You worked out what the headings are for in a report.',
  },
  {
    textId: 'blue-whale', skill: 'compare',
    question: 'How is a blue whale different from most animals that eat a lot?',
    options: [
      'It has no teeth and filters tiny krill',
      'It eats only once a year',
      'It hunts very large animals',
      'It does not need to eat at all'
    ],
    correctIndex: 0,
    because: 'You compared the whale with what you would normally expect.',
  },
  {
    textId: 'blue-whale', skill: 'clarify',
    question: 'What is "krill"?',
    options: [
      'A kind of small fish',
      'Tiny animals about the size of your little finger',
      'A plant that grows in the sea',
      'A young whale'
    ],
    correctIndex: 1,
    because: 'You used the text\'s own explanation of a new word.',
  },

  // ─── Mary Anning, Fossil Hunter ────────────────────────────────
  {
    textId: 'mary-anning', skill: 'retrieve',
    question: 'How old was Mary Anning when her father died?',
    options: ['Eleven', 'Twelve', 'Forty-seven', 'Nineteen'],
    correctIndex: 0,
    because: 'You picked the right number out of several in the text.',
  },
  {
    textId: 'mary-anning', skill: 'infer',
    question: 'Why did Mary search the cliffs straight after winter storms?',
    options: [
      'The weather was warmer then',
      'Landslides uncovered new fossils',
      'There were fewer visitors',
      'Her father had told her to'
    ],
    correctIndex: 1,
    because: 'You connected two facts the text keeps a sentence apart.',
  },
  {
    textId: 'mary-anning', skill: 'language',
    question: 'Mary wrote that scientists had "sucked her brains". What does this show?',
    options: [
      'She was frightened of them',
      'She felt used, and said so bluntly',
      'She did not understand her own work',
      'She admired them greatly'
    ],
    correctIndex: 1,
    because: 'You read the feeling behind a strong choice of words.',
  },
  {
    textId: 'mary-anning', skill: 'summarise',
    question: 'What is the main point of this biography?',
    options: [
      'Fossils are found near the sea',
      'She made great discoveries but was denied the credit',
      'Dogs are useful on fossil hunts',
      'Lyme Regis is a seaside town'
    ],
    correctIndex: 1,
    because: 'You found the idea that runs through the whole text.',
  },
  {
    textId: 'mary-anning', skill: 'compare',
    question: 'How did what Mary found differ from what people believed at the time?',
    options: [
      'People thought no animal had ever become extinct',
      'People thought fossils were worthless',
      'People believed the cliffs were safe',
      'People thought she was a scientist'
    ],
    correctIndex: 0,
    because: 'You compared the evidence with the beliefs of the day.',
  },
];

/** All questions written for one text, in order. */
export function questionsForText(textId: string): QuizQuestion[] {
  return QUESTIONS.filter((q) => q.textId === textId);
}

/**
 * The nth question for a text. Cycles if a child reads far enough to
 * exhaust the bank, so the reader never runs dry.
 */
export function getQuestion(textId: string, n: number): QuizQuestion | null {
  const bank = questionsForText(textId);
  if (bank.length === 0) return null;
  return bank[n % bank.length];
}

/** Which skills a text can assess — used for the library card. */
export function skillsCovered(textId: string): SkillKey[] {
  return [...new Set(questionsForText(textId).map((q) => q.skill))];
}
