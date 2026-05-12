// Pre-written comprehension questions for The Jungle Book
// These cycle through as the child reads every 500 words.

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number; // 0-based
}

export const JUNGLE_BOOK_QUESTIONS: QuizQuestion[] = [
  {
    question: "What is the name of the human boy raised by wolves in The Jungle Book?",
    options: ["Shere Khan", "Mowgli", "Baloo", "Bagheera"],
    correctIndex: 1,
  },
  {
    question: "Which animal is Baloo in The Jungle Book?",
    options: ["A tiger", "A wolf", "A bear", "A panther"],
    correctIndex: 2,
  },
  {
    question: "What kind of animal is Bagheera?",
    options: ["A black panther", "A brown bear", "A tiger", "A python"],
    correctIndex: 0,
  },
  {
    question: "Who is the main villain in The Jungle Book who wants to kill Mowgli?",
    options: ["Baloo", "King Louie", "Shere Khan", "Kaa"],
    correctIndex: 2,
  },
  {
    question: "Where did Mowgli grow up?",
    options: ["In a city", "In the jungle", "On a farm", "By the sea"],
    correctIndex: 1,
  },
  {
    question: "What does Shere Khan fear above all else?",
    options: ["Water", "The wolves", "Man's fire / Red Flower", "Kaa the snake"],
    correctIndex: 2,
  },
  {
    question: "What is the 'Law of the Jungle'?",
    options: [
      "Every animal for themselves",
      "Always travel alone",
      "The rules that all jungle creatures must live by",
      "Only the strongest animal rules",
    ],
    correctIndex: 2,
  },
  {
    question: "Which animal raised Mowgli as a cub?",
    options: ["A tiger", "A bear", "A wolf pack", "A python"],
    correctIndex: 2,
  },
  {
    question: "What does Kaa the python try to do to Mowgli?",
    options: ["Teach him to swim", "Hypnotise and eat him", "Take him to the village", "Protect him from Shere Khan"],
    correctIndex: 1,
  },
  {
    question: "What is special about the 'Red Flower' that Mowgli holds?",
    options: [
      "It smells very nice",
      "It gives Mowgli magical powers",
      "It is fire, which jungle animals fear",
      "It is Baloo's favourite food",
    ],
    correctIndex: 2,
  },
  {
    question: "Where does Mowgli go at the end of the story?",
    options: ["He stays in the jungle forever", "He travels to the sea", "He returns to live among humans", "He becomes King of the jungle"],
    correctIndex: 2,
  },
  {
    question: "What does Baloo love to teach Mowgli?",
    options: ["How to fight tigers", "The Master Words and Laws of the Jungle", "How to swim", "How to fly"],
    correctIndex: 1,
  },
  {
    question: "Who wrote The Jungle Book?",
    options: ["Roald Dahl", "Charles Dickens", "Rudyard Kipling", "Mark Twain"],
    correctIndex: 2,
  },
  {
    question: "What is the name of the wolf pack's leader?",
    options: ["Shere Khan", "Rikki-Tikki", "Akela", "Baloo"],
    correctIndex: 2,
  },
  {
    question: "What does the word 'Mowgli' mean?",
    options: ["Little wolf", "Jungle boy", "The frog", "Brave one"],
    correctIndex: 2,
  },
];

// Get the next question in sequence based on how many have been answered
export function getQuestion(index: number): QuizQuestion {
  return JUNGLE_BOOK_QUESTIONS[index % JUNGLE_BOOK_QUESTIONS.length];
}
