import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KidKineticPlayer, type ParsedText } from '@/components/KidKineticPlayer';
import { useKidAuth } from '@/hooks/useKidAuth';

// For the demo, we will hardcode the first chapter of The Jungle Book!
const JUNGLE_BOOK_TEXT: ParsedText = {
  title: "The Jungle Book",
  paragraphs: [
    "It was seven o'clock of a very warm evening in the Seeonee hills when Father Wolf woke up from his day's rest, scratched himself, yawned, and spread out his paws one after the other to get rid of the sleepy feeling in their tips.".split(' '),
    "Mother Wolf lay with her big gray nose dropped across her four tumbling, squealing cubs, and the moon shone into the mouth of the cave where they all lived.".split(' '),
    "\"Augrh!\" said Father Wolf. \"It is time to hunt again.\"".split(' '),
    "He was going to spring down hill when a little shadow with a bushy tail crossed the threshold and whined: \"Good luck go with you, O Chief of the Wolves. And good luck and strong white teeth go with noble children that they may never forget the hungry in this world.\"".split(' '),
    "It was the jackal—Tabaqui, the Dish-licker—and the wolves of India despise Tabaqui because he runs about making mischief, and telling tales, and eating rags and pieces of leather from the village rubbish-heaps.".split(' '),
    "But they are afraid of him too, because Tabaqui, more than anyone else in the jungle, is apt to go mad, and then he forgets that he was ever afraid of anyone, and runs through the forest biting everything in his way.".split(' '),
    "Even the tiger runs and hides when little Tabaqui goes mad, for madness is the most disgraceful thing that can overtake a wild creature. We call it hydrophobia, but they call it dewanee—the madness—and run.".split(' '),
    "\"Enter, then, and look,\" said Father Wolf stiffly, \"but there is no food here.\"".split(' '),
    "\"For a wolf, no,\" said Tabaqui, \"but for so mean a person as myself a dry bone is a good feast. Who are we, the Gidur-log (the jackal people), to pick and choose?\"".split(' '),
    "He scuttled to the back of the cave, where he found the bone of a buck with some meat on it, and sat cracking the end merrily.".split(' '),
    // Adding enough dummy text to ensure a 500 word limit is hit if they read it all
    ...Array(40).fill("The jungle is a wonderful place, bursting with life, secrets, and the ancient laws that govern the animals who call it home. Every rustling leaf, every snapping twig, tells a story of survival and respect. Mowgli learned these lessons well under the watchful eyes of Baloo the bear and Bagheera the panther, who loved him dearly.".split(' '))
  ]
};

export default function KidReader() {
  const { kid } = useKidAuth();
  const navigate = useNavigate();

  if (!kid) return null;

  return (
    <KidKineticPlayer 
      parsedText={JUNGLE_BOOK_TEXT} 
      onBack={() => navigate('/')} 
    />
  );
}
