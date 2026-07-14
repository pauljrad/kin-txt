import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseFile, ParsedText } from '@/lib/textParser';

export interface Ebook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  filePath: string;
  synopsis?: string;
  wordCount?: number;
}

export const AVAILABLE_EBOOKS: Ebook[] = [
  {
    id: 'jekyll-hyde',
    title: 'Strange Case of Dr Jekyll and Mr Hyde',
    author: 'Robert Louis Stevenson',
    filePath: '/ebooks/jekyll-and-hyde.epub',
    wordCount: 25500,
    synopsis: "Follow the gripping investigation of London lawyer Gabriel John Utterson as he uncovers the dark and terrifying ties between his respectable friend Dr. Henry Jekyll and the brutal, misanthropic Edward Hyde in this classic psychological thriller exploring the duality of human nature."
  },
  {
    id: 'war-of-worlds',
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    filePath: '/ebooks/war-of-the-worlds.epub',
    wordCount: 60000,
    synopsis: "H.G. Wells's groundbreaking science fiction novel chronicles the sudden, catastrophic invasion of Earth by technologically advanced and ruthless Martians, vividly capturing panic and survival in late Victorian England."
  },
  {
    id: 'wuthering-heights',
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    filePath: '/ebooks/wuthering-heights.epub',
    wordCount: 107000,
    synopsis: "Emily Brontë's intense, haunting tale of passionate, destructive love and tragic vengeance set against the brooding, isolated moors of Yorkshire."
  },
  {
    id: 'dracula',
    title: 'Dracula',
    author: 'Bram Stoker',
    filePath: '/ebooks/dracula.epub',
    wordCount: 160000,
    synopsis: "Bram Stoker's seminal gothic masterpiece that introduced the modern vampire myth—following Jonathan Harker and Abraham Van Helsing's desperate battle against the ancient and malevolent Count Dracula."
  },
  {
    id: 'dorian-gray',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    filePath: '/ebooks/dorian-gray.epub',
    wordCount: 79000,
    synopsis: "Oscar Wilde's chilling philosophical novel about a young man who barters his soul for eternal youth and beauty, while a hidden portrait bears the horrific burden of his sins and aging."
  },
  {
    id: 'siddhartha',
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    filePath: '/ebooks/siddhartha.epub',
    wordCount: 39000,
    synopsis: "Hermann Hesse's deeply spiritual journey of a young Indian man's lifelong quest for enlightenment and self-discovery during the time of the Gautama Buddha."
  },
  {
    id: 'dubliners',
    title: 'Dubliners',
    author: 'James Joyce',
    filePath: '/ebooks/dubliners.epub',
    wordCount: 67000,
    synopsis: "James Joyce's stark, penetrating collection of fifteen short stories depicting middle-class life in early 20th century Dublin, culminating in quiet epiphanies."
  },
  {
    id: 'notes-underground',
    title: 'Notes from the Underground',
    author: 'Fyodor Dostoevsky',
    filePath: '/ebooks/notes-underground.epub',
    wordCount: 35000,
    synopsis: "Fyodor Dostoevsky's pioneering existentialist novella presenting the bitter, complex monologue of an isolated, unnamed former civil servant living in St. Petersburg."
  },
  {
    id: 'room-view',
    title: 'A Room with a View',
    author: 'E. M. Forster',
    filePath: '/ebooks/a-room-with-a-view.epub',
    wordCount: 65000,
    synopsis: "E. M. Forster's charming and witty social critique of Edwardian era culture, following young Lucy Honeychurch as she navigates love and societal expectations in Florence and England."
  },
  {
    id: 'tale-two-cities',
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    filePath: '/ebooks/a-tale-of-two-cities.epub',
    wordCount: 135000,
    synopsis: "Charles Dickens' iconic historical epic of love, sacrifice, and resurrection set in London and Paris before and during the bloody turmoil of the French Revolution."
  },
  {
    id: 'metamorphosis',
    title: 'Metamorphosis',
    author: 'Franz Kafka',
    filePath: '/ebooks/metamorphosis.epub',
    wordCount: 22000,
    synopsis: "Franz Kafka's surreal and tragic masterpiece following salesman Gregor Samsa, who awakens one morning to find himself inexplicably transformed into a massive, repulsive insect."
  },
  {
    id: 'sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    filePath: '/ebooks/sherlock-holmes.epub',
    wordCount: 105000,
    synopsis: "Sir Arthur Conan Doyle's legendary collection of twelve thrilling detective cases brilliantly solved by the iconic Sherlock Holmes and his faithful companion Dr. Watson."
  },
  {
    id: 'jungle-book',
    title: 'The Jungle Book',
    author: 'Rudyard Kipling',
    filePath: '/ebooks/the-jungle-book.epub',
    wordCount: 52000,
    synopsis: "Rudyard Kipling's enchanting collection of fables set in an Indian forest, featuring the unforgettable adventures of the man-cub Mowgli, raised by wolves and taught the Law of the Jungle."
  },
  {
    id: 'treasure-island',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    filePath: '/ebooks/treasure-island.epub',
    wordCount: 68000,
    synopsis: "Robert Louis Stevenson's classic adventure tale of pirates, hidden gold, and mutiny featuring young Jim Hawkins and the unforgettable one-legged sea-cook Long John Silver."
  },
  {
    id: 'call-wild',
    title: 'The Call of the Wild',
    author: 'Jack London',
    filePath: '/ebooks/call-of-the-wild.epub',
    wordCount: 32000,
    synopsis: "Jack London's powerful adventure of Buck, a domesticated dog stolen and sold into the brutal life of an Alaskan sled dog during the Klondike Gold Rush, who must embrace his primal instincts to survive."
  },
  {
    id: 'heart-darkness',
    title: 'Heart of Darkness',
    author: 'Joseph Conrad',
    filePath: '/ebooks/heart-of-darkness.epub',
    wordCount: 38000,
    synopsis: "Joseph Conrad's dark journey into the Congo Free State, following Charles Marlow as he searches for the mysterious and enigmatic ivory trader Kurtz, exploring the themes of colonialism and the darkness within the human heart."
  },
  {
    id: 'time-machine',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    filePath: '/ebooks/the-time-machine.epub',
    wordCount: 32000,
    synopsis: "H.G. Wells' seminal science fiction novella about an anonymous inventor who travels hundreds of thousands of years into the future, discovering the divergent evolution of humanity into the gentle Eloi and the subterranean Morlocks."
  },
  {
    id: 'carmilla',
    title: 'Carmilla',
    author: 'Sheridan Le Fanu',
    filePath: '/ebooks/carmilla.epub',
    wordCount: 31000,
    synopsis: "A foundational work of vampire fiction, this gothic novella tells the haunting story of a young woman's susceptibility to the attentions of a mysterious and beautiful visitor named Carmilla, long before Bram Stoker's Dracula."
  },
  {
    id: 'turn-screw',
    title: 'The Turn of the Screw',
    author: 'Henry James',
    filePath: '/ebooks/turn-of-the-screw.epub',
    wordCount: 42000,
    synopsis: "Henry James' masterful ghost story about a young governess sent to a remote country estate to care for two orphaned children, where she becomes convinced the house is haunted by the malevolent spirits of former employees."
  },
  {
    id: 'the-gambler',
    title: 'The Gambler',
    author: 'Fyodor Dostoevsky',
    filePath: '/ebooks/the-gambler.epub',
    wordCount: 45000,
    synopsis: "Dostoevsky's intense psychological novella about an impoverished tutor's obsession with gambling and the complex social hierarchy and desperate romance of a fictional German spa town."
  },
  {
    id: 'candide',
    title: 'Candide',
    author: 'Voltaire',
    filePath: '/ebooks/candide.epub',
    wordCount: 30000,
    synopsis: "Voltaire's satirical masterpiece following the optimistic Candide as he travels the world, encountering relentless misfortune and catastrophe that challenge his mentor Pangloss's philosophy that 'all is for the best in the best of all possible worlds.'"
  },
  {
    id: 'white-fang',
    title: 'White Fang',
    author: 'Jack London',
    filePath: '/ebooks/white-fang.epub',
    wordCount: 73000,
    synopsis: "Jack London's companion to The Call of the Wild, depicting a wild wolf-dog's journey from the harsh Yukon wilderness to civilization, exploring the powerful themes of survival, nature versus nurture, and redemption."
  },
  {
    id: 'rip-van-winkle',
    title: 'Rip Van Winkle',
    author: 'Washington Irving',
    filePath: '/ebooks/rip-van-winkle.epub',
    wordCount: 8000,
    synopsis: "Washington Irving's classic American short story about a Dutch-American villager who falls asleep in the Catskill Mountains for twenty years and wakes up to find a transformed world after the American Revolution."
  },
  {
    id: 'sleepy-hollow',
    title: 'The Legend of Sleepy Hollow',
    author: 'Washington Irving',
    filePath: '/ebooks/the-legend-of-sleepy-hollow.epub',
    wordCount: 12000,
    synopsis: "Washington Irving's iconic gothic story centered on the superstitious schoolmaster Ichabod Crane and his terrifying encounter with the Headless Horseman in a secluded, enchanted glen."
  },
  {
    id: 'bartleby',
    title: 'Bartleby, the Scrivener',
    author: 'Herman Melville',
    filePath: '/ebooks/bartleby-the-scrivener.epub',
    wordCount: 14000,
    synopsis: "Herman Melville's haunting story of a Wall Street lawyer who hires a new clerk, Bartleby, who initially performs well but soon begins to decline all requests with the famous phrase, 'I would prefer not to.'"
  },
  {
    id: 'house-usher',
    title: 'The Fall of the House of Usher',
    author: 'Edgar Allan Poe',
    filePath: '/ebooks/the-fall-of-the-house-of-usher.epub',
    wordCount: 11000,
    synopsis: "Edgar Allan Poe's quintessential gothic tale of terror, featuring a decaying mansion, a family curse, and the psychological descent of its inhabitants into madness and doom."
  },
  {
    id: 'thirty-nine-steps',
    title: 'The Thirty-Nine Steps',
    author: 'John Buchan',
    filePath: '/ebooks/the-thirty-nine-steps.epub',
    wordCount: 40000,
    synopsis: "John Buchan's classic adventure thriller following Richard Hannay as he becomes entangled in a high-stakes conspiracy, leading to a desperate chase across the Scottish moors to stop a secret society from stealing British naval secrets."
  },
  {
    id: 'owl-creek-bridge',
    title: 'An Occurrence at Owl Creek Bridge',
    author: 'Ambrose Bierce',
    filePath: '/ebooks/owl-creek-bridge.epub',
    wordCount: 3800,
    synopsis: "Ambrose Bierce's masterful Civil War tale follows Peyton Farquhar, a Southern planter about to be hanged from a railroad bridge, in a haunting meditation on time, perception and one of literature's most famous twist endings."
  },
  {
    id: 'beasts-and-super-beasts',
    title: 'Beasts and Super-Beasts',
    author: 'Saki',
    filePath: '/ebooks/beasts-and-super-beasts.epub',
    wordCount: 30500,
    synopsis: "Saki's sharp, wickedly funny collection skewers Edwardian high society with mischievous children, scheming animals and unforgettable characters like the incomparable Clovis, delivered with biting wit and sudden, delicious cruelty."
  },
  {
    id: 'bliss',
    title: 'Bliss and Other Stories',
    author: 'Katherine Mansfield',
    filePath: '/ebooks/bliss.epub',
    wordCount: 66000,
    synopsis: "Katherine Mansfield's landmark 1920 collection, led by the celebrated title story 'Bliss,' captures fleeting moments of joy, disillusion and quiet revelation with a delicate modernist eye that reshaped the short story form."
  },
  {
    id: 'the-awakening',
    title: 'The Awakening and Selected Short Stories',
    author: 'Kate Chopin',
    filePath: '/ebooks/the-awakening.epub',
    wordCount: 64000,
    synopsis: "Kate Chopin's daring 1899 novel follows Edna Pontellier as she awakens to her own desires and independence in Creole Louisiana — a landmark of early feminist literature, paired here with a selection of her finest short stories."
  },
  {
    id: 'the-garden-party',
    title: 'The Garden Party',
    author: 'Katherine Mansfield',
    filePath: '/ebooks/the-garden-party.epub',
    wordCount: 57500,
    synopsis: "Katherine Mansfield's exquisite collection, led by the title story, moves between a family's lavish garden party and a nearby tragedy, capturing class, mortality and fleeting perception with luminous modernist precision."
  },
  {
    id: 'gift-of-the-magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    filePath: '/ebooks/gift-of-the-magi.epub',
    wordCount: 2100,
    synopsis: "O. Henry's beloved Christmas tale of a young couple, Jim and Della, who each secretly sacrifice their most prized possession to buy the other a gift — a perfectly turned story of love and irony."
  },
  {
    id: 'the-great-god-pan',
    title: 'The Great God Pan',
    author: 'Arthur Machen',
    filePath: '/ebooks/the-great-god-pan.epub',
    wordCount: 22000,
    synopsis: "Arthur Machen's notorious tale of occult horror follows a doctor's forbidden experiment that tears the veil between worlds, unleashing an ancient terror across Victorian London — a foundational work of weird fiction."
  },
  {
    id: 'the-invisible-man',
    title: 'The Invisible Man',
    author: 'H. G. Wells',
    filePath: '/ebooks/the-invisible-man.epub',
    wordCount: 49000,
    synopsis: "H.G. Wells's chilling science fiction classic follows Griffin, a brilliant scientist who renders himself invisible, only to descend into paranoia, isolation and violence as he seeks to reverse — and exploit — his condition."
  },
  {
    id: 'the-monkeys-paw',
    title: "The Monkey's Paw",
    author: 'W. W. Jacobs',
    filePath: '/ebooks/the-monkeys-paw.epub',
    wordCount: 4000,
    synopsis: "W.W. Jacobs's masterpiece of supernatural dread: a family comes into possession of a mummified monkey's paw that grants three wishes — and learns the terrible price of tempting fate."
  },
  {
    id: 'the-willows',
    title: 'The Willows',
    author: 'Algernon Blackwood',
    filePath: '/ebooks/the-willows.epub',
    wordCount: 19500,
    synopsis: "Algernon Blackwood's landmark tale of cosmic horror follows two travellers stranded on a remote Danube island, where the whispering willows conceal a presence beyond human comprehension — hailed by H.P. Lovecraft as the finest weird tale ever written."
  },
  {
    id: 'works-of-poe',
    title: 'The Works of Edgar Allan Poe',
    author: 'Edgar Allan Poe',
    filePath: '/ebooks/works-of-poe.epub',
    wordCount: 90000,
    synopsis: "The first volume of Edgar Allan Poe's collected works, gathering the master of the macabre's tales of mystery and the grotesque — including 'The Murders in the Rue Morgue,' 'The Gold-Bug' and 'MS. Found in a Bottle.'"
  },
];

const BookCover = ({ title, index }: { title: string; index: number }) => {
  const isDark = index % 2 === 0;
  const bgColor = isDark ? 'bg-[#000000]' : 'bg-[#ffffff]';
  const textColor = isDark ? 'text-white' : 'text-black';
  const logoColor = isDark ? 'bg-white' : 'bg-black';

  return (
    <div className={`aspect-[2/3] mb-2 rounded-md ${bgColor} flex flex-col items-center justify-between p-2 sm:p-4 relative border border-border/10 shadow-inner group-hover:shadow-lg transition-all duration-500 overflow-hidden`}>
      {/* Centered KiN-TXT "i -" Logo */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="relative flex flex-col items-center justify-center w-3 h-5 sm:w-6 sm:h-10">
            <span className={`w-1 h-1 sm:w-2 sm:h-2 rounded-full ${logoColor} mb-0.5 sm:mb-1`} />
            <span className={`w-1 h-2.5 sm:w-2 sm:h-5 ${logoColor} rounded-sm`} />
          </div>
          <div className={`w-2.5 h-0.5 sm:w-5 sm:h-1 ${logoColor} rounded-full opacity-80`} />
        </div>
      </div>

      {/* Title at the bottom */}
      <div className="w-full">
        <h4 className={`text-center font-display font-medium text-[6px] sm:text-[10px] leading-tight uppercase tracking-widest ${textColor} line-clamp-3 text-balance`}>
          {title}
        </h4>
      </div>
    </div>
  );
};

interface EbookLibraryProps {
  onSelectEbook: (parsed: ParsedText, title: string, initialProgress?: { paragraph: number; word: number }) => void;
}

export function EbookLibrary({ onSelectEbook }: EbookLibraryProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Ebook | null>(null);

  const filteredEbooks = useMemo(() => {
    if (!searchQuery.trim()) return AVAILABLE_EBOOKS;
    const query = searchQuery.toLowerCase().trim();
    return AVAILABLE_EBOOKS.filter(ebook => 
      ebook.title.toLowerCase().includes(query) || 
      ebook.author.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectEbook = useCallback(async (ebook: Ebook) => {
    setLoadingId(ebook.id);
    setError(null);

    try {
      // Fetch the epub file
      const response = await fetch(ebook.filePath);
      if (!response.ok) throw new Error('Failed to load ebook');

      const blob = await response.blob();
      const file = new File([blob], `${ebook.title}.epub`, { type: 'application/epub+zip' });

      const parsed = await parseFile(file);

      // Start from the beginning
      onSelectEbook(parsed, ebook.title, { paragraph: 0, word: 0 });
    } catch (err) {
      console.error('Error loading ebook:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ebook');
    } finally {
      setLoadingId(null);
    }
  }, [onSelectEbook]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-5xl mx-auto mt-3"
    >
      <div className="px-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search titles or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 px-4">
        {filteredEbooks.map((ebook, idx) => (
          <motion.button
            key={ebook.id}
            onClick={() => setSelectedBook(ebook)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative glass-panel p-3 text-left transition-all duration-300 hover:ring-1 hover:ring-primary/30"
          >
            <BookCover title={ebook.title} index={idx} />
            <h3 className="font-medium text-[10px] leading-tight text-foreground mb-0.5 line-clamp-2 group-hover:text-primary">
              {ebook.title}
            </h3>
            <p className="text-[8px] text-muted-foreground truncate uppercase tracking-widest">
              {ebook.author}
            </p>

            {loadingId === ebook.id && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <Dialog open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest uppercase text-xl">{selectedBook?.title}</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
              By {selectedBook?.author} • {selectedBook?.wordCount?.toLocaleString() || "N/A"} Words
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-light leading-relaxed text-foreground/80">
              {selectedBook?.synopsis}
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setSelectedBook(null)}>Cancel</Button>
            <Button 
                onClick={() => selectedBook && handleSelectEbook(selectedBook)}
                disabled={loadingId !== null}
                className="font-display tracking-widest uppercase"
            >
              {loadingId === selectedBook?.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</>
              ) : "READ NOW"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center text-destructive text-sm"
        >
          {error}
        </motion.p>
      )}

      {filteredEbooks.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No ebooks found</p>
        </div>
      )}
    </motion.div>
  );
}
