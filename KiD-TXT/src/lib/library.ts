// ─── KiD-TXT Library ─────────────────────────────────────────────
// Ten texts, one per text type, so a child meets every kind of
// writing the curriculum asks for.
//
// LICENSING — every text here is safe to ship:
//   • "The Jungle Book" and "The Owl and the Pussy-cat" are public
//     domain (Kipling 1894, Lear 1871).
//   • Everything else is original writing for KiD-TXT.
// No text from a commercial reading scheme appears in this file.
//
// Each text is deliberately seeded with words from the statutory
// spelling list for its band, so the "every text covers the
// statutory words" claim is demonstrably true.
// ──────────────────────────────────────────────────────────────────

import type { BandKey, TextTypeKey } from './curriculum';

export interface LibraryText {
  id: string;
  title: string;
  author: string;
  textType: TextTypeKey;
  band: BandKey;
  blurb: string;
  /** Paragraphs of prose. Split into words at load time. */
  body: string[];
}

export const LIBRARY: LibraryText[] = [
  // ─── Narrative ─────────────────────────────────────────────────
  {
    id: 'jungle-book',
    title: 'The Jungle Book',
    author: 'Rudyard Kipling',
    textType: 'narrative',
    band: 'topaz',
    blurb: 'Father Wolf wakes, and a jackal brings news that will change everything for the wolves of Seeonee.',
    body: [
      "It was seven o'clock of a very warm evening in the Seeonee hills when Father Wolf woke up from his day's rest, scratched himself, yawned, and spread out his paws one after the other to get rid of the sleepy feeling in their tips.",
      'Mother Wolf lay with her big grey nose dropped across her four tumbling, squealing cubs, and the moon shone into the mouth of the cave where they all lived.',
      '"Augrh!" said Father Wolf. "It is time to hunt again."',
      'He was going to spring down hill when a little shadow with a bushy tail crossed the threshold and whined: "Good luck go with you, O Chief of the Wolves. And good luck and strong white teeth go with noble children, that they may never forget the hungry in this world."',
      'It was the jackal, Tabaqui the Dish-licker, and the wolves of India despise Tabaqui because he runs about making mischief, and telling tales, and eating rags and pieces of leather from the village rubbish heaps.',
      'But they are afraid of him too, because Tabaqui, more than anyone else in the jungle, is apt to go mad, and then he forgets that he was ever afraid of anyone, and runs through the forest biting everything in his way.',
      'Even the tiger runs and hides when little Tabaqui goes mad, for madness is the most disgraceful thing that can overtake a wild creature.',
      '"Enter, then, and look," said Father Wolf stiffly, "but there is no food here."',
      '"For a wolf, no," said Tabaqui, "but for so mean a person as myself a dry bone is a good feast. Who are we to pick and choose?"',
      'He scuttled to the back of the cave, where he found the bone of a buck with some meat on it, and sat happily cracking the end.',
      '"All thanks for this good meal," he said, licking his lips. "How beautiful are the noble children! How large are their eyes! And so young too! Indeed, indeed, I might have remembered that the children of kings are men from the beginning."',
      'Now, Tabaqui knew as well as anyone else that there is nothing so unlucky as to compliment children to their faces, and it pleased him to see Mother Wolf and Father Wolf look uncomfortable.',
    ],
  },

  // ─── Poetry ────────────────────────────────────────────────────
  {
    id: 'owl-and-pussycat',
    title: 'The Owl and the Pussy-cat',
    author: 'Edward Lear',
    textType: 'poetry',
    band: 'jade',
    blurb: 'A nonsense poem about a boat, a five pound note, and a wedding by the light of the moon.',
    body: [
      'The Owl and the Pussy-cat went to sea in a beautiful pea-green boat.',
      'They took some honey, and plenty of money, wrapped up in a five pound note.',
      'The Owl looked up to the stars above, and sang to a small guitar,',
      '"O lovely Pussy! O Pussy, my love, what a beautiful Pussy you are, you are, you are! What a beautiful Pussy you are!"',
      'Pussy said to the Owl, "You elegant fowl! How charmingly sweet you sing! O let us be married! Too long we have tarried. But what shall we do for a ring?"',
      'They sailed away, for a year and a day, to the land where the Bong-Tree grows.',
      'And there in a wood a Piggy-wig stood, with a ring at the end of his nose, his nose, his nose, with a ring at the end of his nose.',
      '"Dear Pig, are you willing to sell for one shilling your ring?" Said the Piggy, "I will."',
      'So they took it away, and were married next day by the Turkey who lives on the hill.',
      'They dined on mince, and slices of quince, which they ate with a runcible spoon.',
      'And hand in hand, on the edge of the sand, they danced by the light of the moon, the moon, the moon, they danced by the light of the moon.',
    ],
  },

  // ─── Descriptive ───────────────────────────────────────────────
  {
    id: 'lighthouse-dawn',
    title: 'The Lighthouse at Dawn',
    author: 'KiD-TXT Originals',
    textType: 'descriptive',
    band: 'sapphire',
    blurb: 'Stand on the cold rocks and watch the old lighthouse wake up with the sun.',
    body: [
      'The lighthouse stands on the edge of the island, straight and white and certain, the way it has stood for almost a century.',
      'At this early hour the sea is the colour of old iron. It heaves against the rocks, and the sound it makes is not a crash but a long, slow breath, in and out, in and out.',
      'Salt hangs in the air. You can taste it on your lips before you notice it, and it settles on your coat in a fine grey dust.',
      'The door of the lighthouse is painted a peculiar green, the green of a bottle held up to the light, and the paint has blistered and curled where the weather has caught it.',
      'Inside, a spiral staircase climbs through the dark. Eighty-eight steps. The stone is worn into shallow dips in the centre, where the feet of the old keepers wore it away, one thousand ordinary mornings at a time.',
      'At the top, the great lamp turns. It does not hurry. It sweeps its beam across the water in a slow, regular circle, and the light is so strong that for a moment it turns the falling rain into a curtain of silver.',
      'Then the sun appears at last, low and orange, and the sea changes its mind completely. What was iron becomes glass. What was grey becomes gold.',
      'The lamp blinks off. Its work is finished. And the lighthouse waits, quite still, for the dark to come round again.',
    ],
  },

  // ─── Expository ────────────────────────────────────────────────
  {
    id: 'great-fire',
    title: 'The Great Fire of London',
    author: 'KiD-TXT Originals',
    textType: 'expository',
    band: 'topaz',
    blurb: 'In September 1666 a fire started in a bakery. Four days later, most of London was gone.',
    body: [
      'The Great Fire of London began early on a Sunday morning in September 1666. It started in a bakery on Pudding Lane, and it burned for four days.',
      'London at that time was a difficult place for a fire to be stopped. Most houses were built of wood, and their upper floors leaned forwards over the street until they almost touched the house opposite.',
      'That summer had been extremely dry. There had been no rain of any strength for weeks, so the wooden buildings caught light easily, and a strong wind pushed the flames westwards through the city.',
      'People tried to fight the fire with leather buckets of water passed along a line, but buckets were no answer to a fire of that size.',
      'In the end the fire was stopped by pulling down whole rows of houses to make a gap the flames could not cross. This is called a firebreak.',
      'The damage was extreme. About thirteen thousand houses were destroyed, along with eighty-seven churches and the old St Paul\'s Cathedral. Something like seventy thousand people lost their homes.',
      'Strangely, very few deaths were recorded. Historians think the true number was probably much higher, because the deaths of poorer people were often not written down at all.',
      'After the fire, London was rebuilt in brick and stone rather than wood, and the streets were made wider. A monument still stands near the spot where the fire began.',
    ],
  },

  // ─── Persuasive ────────────────────────────────────────────────
  {
    id: 'school-library',
    title: 'Every School Needs a Library',
    author: 'KiD-TXT Originals',
    textType: 'persuasive',
    band: 'sapphire',
    blurb: 'An argument, in four steps, for why the library should never be the first room to go.',
    body: [
      'Every school should have a proper library, with a librarian in it. This is not a luxury. It is one of the most important rooms in the building, and it is often the first one to be closed.',
      'Consider what a library actually does. It is the only place in school where a child chooses what to read. In a lesson, the book is decided for you. In a library, you decide, and that changes everything.',
      'Children who choose their own reading read more. Children who read more meet more words, and a wider vocabulary makes every other subject easier, from history to science.',
      'Some people answer that children can simply use the internet instead. But a screen full of search results is not the same experience as a shelf. On a shelf you notice the book beside the one you came for, and that accident is often where a favourite book comes from.',
      'Others mention the cost. A library is not free, that is certainly true. But it is far cheaper than the years of catching up that follow when a child never becomes a reader in the first place.',
      'So here is the promise a school library makes. Give a child a quiet corner, a regular hour, and the right to choose, and you do not have to persuade them to read. They will do it without being asked.',
      'Do not close the library. It is the cheapest, most popular and most useful thing a school owns.',
    ],
  },

  // ─── Procedural ────────────────────────────────────────────────
  {
    id: 'paper-aeroplane',
    title: 'How to Make a Paper Aeroplane',
    author: 'KiD-TXT Originals',
    textType: 'procedural',
    band: 'jade',
    blurb: 'Six folds, one sheet of paper, and a plane that really flies.',
    body: [
      'You will need one sheet of paper. That is all. Do not use card, because it is too stiff to fold, and do not use paper that is old and soft.',
      'Step one. Put the paper on the table in front of you, with the short edge at the top.',
      'Step two. Fold the paper in half, from left to right, so both halves meet. Press along the fold with your thumb. Then open it out again. You should now find a line down the middle.',
      'Step three. Take the top left corner and fold it in to the middle line. Do the same with the top right corner. The top of your paper is now a point.',
      'Step four. Fold both of the new sloping edges in to the middle line again. The point will become long and thin.',
      'Step five. Fold the whole plane in half, along the middle line, so the folds you have made are on the outside.',
      'Step six. Make the wings. Fold the top layer down so its edge meets the bottom of the plane. Turn it over and fold the other wing to match. Both wings must be the same, or the plane will turn in a circle.',
      'Now hold your plane underneath, near the front, where it is heaviest. Push it forwards gently. Do not throw it hard. A slow, level push will always fly further than a fast one.',
    ],
  },

  // ─── Recount ───────────────────────────────────────────────────
  {
    id: 'trip-to-coast',
    title: 'Our Trip to the Coast',
    author: 'KiD-TXT Originals',
    textType: 'recount',
    band: 'amber',
    blurb: 'What happened on the day Class Four went to the sea, told in order from morning to home time.',
    body: [
      'On Friday our whole class went to the coast. We had to be at school very early, before the doors were even open.',
      'The bus was full. My friend and I sat by the window at the back. Mrs Patel counted us all twice, and then we could go.',
      'After one hour we saw the water. Everybody stood up to look, and Mrs Patel told us to sit down again.',
      'First we walked along the beach. The wind was so cold that we had to hold our coats closed. I found a small gold shell and put it in my pocket.',
      'Then we ate our lunch behind a big rock, because it was out of the wind. My sandwich had sand in it. It was still good.',
      'After lunch we went to the rock pools. We found a crab, two tiny fish, and a lot of green weed. Our teacher said the crab was more afraid of us than we were of it.',
      'The last thing we did was climb the path up to the old harbour wall. From the top you could see the whole beach, and all the people looked very small.',
      'We were back at school by four o\'clock. I was tired and my boots were full of sand, but it was the best day of the year.',
    ],
  },

  // ─── Explanation ───────────────────────────────────────────────
  {
    id: 'day-and-night',
    title: 'Why We Have Day and Night',
    author: 'KiD-TXT Originals',
    textType: 'explanation',
    band: 'topaz',
    blurb: 'The Sun does not go anywhere. So why does it get dark? The answer is that we are the ones moving.',
    body: [
      'It certainly appears as though the Sun travels across the sky. It arrives in the east early in the morning, continues overhead, and disappears in the west. Although that is what we notice, the Sun is not actually moving at all. We are.',
      'The Earth spins. It turns completely round once every twenty-four hours, and although it is an extreme speed, we do not feel a thing.',
      'Here is the important part. The Sun can only reach one half of the Earth at any minute. The half facing the Sun has day. The half turned away sits in its own shadow, and that shadow is what we call night.',
      'So when it is the middle of the day where you are, it is the middle of the night on the opposite side of the world. Nothing has been switched off. You have simply been carried round into the dark, though you did not notice the journey.',
      'Imagine standing on a slowly turning roundabout with a lamp beside it. Whenever you face the lamp it is bright. When you turn away it is dark. That is a complete explanation of day and night, and you can experiment with it yourself.',
      'Sunrise is the moment your position on Earth turns back towards the Sun. Sunset is the moment it turns away. Therefore the Sun always appears to rise in the east and set in the west, in the same regular order, every ordinary day of your life.',
      'The Earth is also tilted a little to one side. This does not cause day and night, but it does describe why the length of daylight increases in summer and falls in winter. Perhaps you have noticed how different the evenings feel in February.',
      'Remember: if the Earth stopped turning, one half of the world would have day for ever, and the other half would have night for ever. It is the spinning that gives us both.',
    ],
  },

  // ─── Report ────────────────────────────────────────────────────
  {
    id: 'blue-whale',
    title: 'The Blue Whale: A Fact File',
    author: 'KiD-TXT Originals',
    textType: 'report',
    band: 'jade',
    blurb: 'The largest animal that has ever lived, set out fact by fact.',
    body: [
      'The blue whale is the largest animal that has ever lived on Earth. It is bigger than any dinosaur that we have found.',
      'Size. A full grown blue whale can be thirty metres long. That is longer than three buses in a line. Its heart alone can weigh as much as a small car.',
      'Where it lives. Blue whales are found in every ocean in the world. Many spend the summer in cold water near the poles, where there is a lot of food, and move to warmer water when winter comes.',
      'Food. A blue whale eats krill, which are tiny animals about the size of your little finger. It does not have teeth. Instead it has long plates in its mouth that work like a comb, so the water passes out and the krill are held inside.',
      'In one day a blue whale can eat four thousand kilograms of krill. It takes a very great deal of small food to hold up a very large animal.',
      'Sound. Blue whales are among the loudest animals on the planet. Their low calls travel for hundreds of miles through the water, and they use them to find each other across the open ocean.',
      'Young. A baby blue whale is called a calf. It is about seven metres long when it is born, and it can put on ninety kilograms every day in its first year.',
      'Numbers. Blue whales were hunted until very few were left. They are now protected, and slowly their numbers are going up again.',
    ],
  },

  // ─── Biography ─────────────────────────────────────────────────
  {
    id: 'mary-anning',
    title: 'Mary Anning, Fossil Hunter',
    author: 'KiD-TXT Originals',
    textType: 'biography',
    band: 'violet',
    blurb: 'She found creatures nobody knew existed, and for most of her life was not allowed to say so.',
    body: [
      'Mary Anning was born in the seaside community of Lyme Regis in 1799. Her family was poor, and no formal education was available to her. She taught herself to read, especially so that she could follow the scientific papers of the day.',
      'Her father collected ancient fossils from the cliffs and sold them to visitors. When he died, Mary was eleven, and the family had no money whatsoever. She continued the work because it was necessary, searching the cliffs immediately after winter storms, when landslides brought fresh fossils to the surface.',
      'It was dangerous, physical work, and she was entirely conscious of the risk. Cliffs collapsed without warning. Her dog Tray, who accompanied her on every hunt, was killed by a landslide beside her. She carried on regardless, determined to achieve something with what she found.',
      'When she was about twelve, Mary and her brother found the first ichthyosaur skeleton to be recognised by scientists. She was later the first individual to find a complete plesiosaur, an animal so strange that some experts at first refused to believe in its existence.',
      'These discoveries were immensely important. At the time most people were definite that no creature had ever become extinct. Mary Anning kept finding a variety of animals that no longer occupy any part of the Earth, and the evidence in her hands was a serious hindrance to that comfortable idea.',
      'She developed real knowledge of her subject. She could identify a species from a fragment, and she prepared each specimen with a thorough patience that scientists came to appreciate, even when they would not credit her in public.',
      'The men who bought her fossils published papers about them. Almost none of them mentioned her name. Because she was a woman, she could not join the Geological Society of London. That profession was closed to her, and she had no opportunity to present her own findings.',
      'She was aware of this prejudice, and she was not silent about it. She wrote that the world had used her ill, and that these men of learning had sucked her brains, making a great deal by publishing works of which she had furnished the contents.',
      'Mary Anning died in 1847, aged forty-seven. The Society that had never admitted her marked her death with a sincere tribute. More than a century later, according to a poll of scientists, she was recognised as one of the most influential fossil hunters who has ever lived.',
    ],
  },
];

/** Look a text up by id. */
export function getText(id: string): LibraryText | undefined {
  return LIBRARY.find((t) => t.id === id);
}

/** Split a text's prose into paragraphs of words, for the player. */
export function toWordParagraphs(text: LibraryText): string[][] {
  return text.body.map((p) => p.split(/\s+/).filter(Boolean));
}

/** Total word count of a text. */
export function wordCount(text: LibraryText): number {
  return toWordParagraphs(text).reduce((n, p) => n + p.length, 0);
}
