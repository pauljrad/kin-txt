import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Library, FileText, Newspaper } from 'lucide-react';
import { TextInput } from '@/components/TextInput';
import { KineticPlayer } from '@/components/KineticPlayer';
import { DocumentHistory } from '@/components/DocumentHistory';
import { EbookLibrary } from '@/components/EbookLibrary';
import { NewsLibrary } from '@/components/NewsLibrary';

import { ThemeToggle } from '@/components/ThemeToggle';
import { AnimatedTitle } from '@/components/AnimatedTitle';
import { usePullGesture } from '@/hooks/usePullGesture';
import { ParsedText, processTextStyles } from '@/lib/textParser';
import { SavedDocument, saveDocument, updateDocumentProgress, updateDocumentEmphasis } from '@/lib/documentDatabase';
import { migrateLocalDocumentsToAccount } from '@/lib/documentMigration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

type TabMode = 'my-texts' | 'library' | 'news';

interface ActiveDocument {
  parsedText: ParsedText;
  id?: string;
  initialProgress?: { paragraph: number; word: number };
  emphasisWords?: string[];
  whisperedWords?: string[];
  totalReadingTime?: number;
  isEbook?: boolean;
}

interface EmphasisAnalysis {
  emphasisWords: string[];
  whisperedWords: string[];
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabMode>('my-texts');
  const [activeDocument, setActiveDocument] = useState<ActiveDocument | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPongGameActive, setIsPongGameActive] = useState(false);

  // If we switch into the reader view, forcibly clear the "Pong active" UI lock
  // so the main interface never stays blurred/unclickable.
  useEffect(() => {
    if (activeDocument) setIsPongGameActive(false);
  }, [activeDocument]);

  // Use shared pull-down gesture hook (only when no document is active)
  usePullGesture(!activeDocument);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0); // Start at 0, will be measured

  // One-time migration: bring this device's old local history into your account
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const { imported } = await migrateLocalDocumentsToAccount(user.id);
      if (cancelled) return;
      if (imported > 0) {
        toast.success(`Imported ${imported} saved text${imported > 1 ? 's' : ''} from this device`);
        setRefreshTrigger((p) => p + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Measure fixed header so content never clashes (esp. iPhone safe-area + dynamic text sizes)
  // Re-run when switching back from player (activeDocument becomes null)
  useLayoutEffect(() => {
    // When returning from player, give DOM time to render the header
    const measureHeader = () => {
      const el = headerRef.current;
      if (el) {
        const next = Math.ceil(el.getBoundingClientRect().height);
        if (next > 0) {
          setHeaderHeight(next);
        }
      }
    };

    // Immediate measurement
    measureHeader();

    // Also measure after a short delay (for when returning from player)
    const timeout = setTimeout(measureHeader, 50);

    const el = headerRef.current;
    if (!el) {
      return () => clearTimeout(timeout);
    }

    const ro = new ResizeObserver(() => measureHeader());
    ro.observe(el);

    return () => {
      clearTimeout(timeout);
      ro.disconnect();
    };
  }, [activeDocument]);

  const analyzeEmphasis = async (text: string): Promise<EmphasisAnalysis> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-emphasis', {
        body: { text }
      });

      if (error) {
        console.error('Error analyzing emphasis:', error);
        return { emphasisWords: [], whisperedWords: [] };
      }

      return {
        emphasisWords: data?.emphasisWords || [],
        whisperedWords: data?.whisperedWords || [],
      };
    } catch (err) {
      console.error('Failed to analyze emphasis:', err);
      return { emphasisWords: [], whisperedWords: [] };
    }
  };

  const handleTextParsed = useCallback(async (parsed: ParsedText, title: string, source: 'paste' | 'file' | 'url') => {
    setIsAnalyzing(true);

    // Save the document to database
    const saved = await saveDocument({
      title,
      source,
      parsedText: parsed,
      progress: { paragraph: 0, word: 0 },
    });

    if (!saved) {
      toast.error('Failed to save document');
      setIsAnalyzing(false);
      return;
    }

    // Get full text for emphasis analysis
    const fullText = parsed.paragraphs.map(p => p.join(' ')).join(' ');
    const { emphasisWords, whisperedWords } = await analyzeEmphasis(fullText);

    // Update document with emphasis data
    if (saved.id) {
      await updateDocumentEmphasis(saved.id, emphasisWords, whisperedWords);
    }

    setIsAnalyzing(false);
    setRefreshTrigger(prev => prev + 1);

    // Merge findings
    const totalFound = emphasisWords.length + whisperedWords.length;

    // Ensure whisper trumps emphasis if there's a collision
    // (e.g. if AI says "mouse" is emphasis but it's in our auto-whisper list)
    const filteredEmphasisWords = emphasisWords.filter(w => !whisperedWords.includes(w));

    if (totalFound > 0) {
      toast.success(`Found ${filteredEmphasisWords.length} emphasis and ${whisperedWords.length} whispered words`);
    }

    setActiveDocument({
      parsedText: parsed,
      id: saved.id,
      emphasisWords: filteredEmphasisWords,
      whisperedWords,
      totalReadingTime: 0,
      isEbook: false, // Pasted text is never an ebook
    });
  }, []);

  const handleEbookSelect = useCallback(async (
    parsed: ParsedText,
    title: string,
    initialProgress?: { paragraph: number; word: number }
  ) => {
    setIsAnalyzing(true);
    toast.info('Analyzing text for emphasis...');

    // Use provided initial progress (from Chapter 1) or default to start
    const startProgress = initialProgress || { paragraph: 0, word: 0 };

    // Save the document to database with ebook file type
    const saved = await saveDocument({
      title,
      source: 'file',
      parsedText: parsed,
      progress: startProgress,
      fileType: 'epub',
    });

    if (!saved) {
      toast.error('Failed to save document');
      setIsAnalyzing(false);
      return;
    }

    // Get full text for emphasis analysis
    const fullText = parsed.paragraphs.map(p => p.join(' ')).join(' ');
    const { emphasisWords, whisperedWords } = await analyzeEmphasis(fullText);

    // Update document with emphasis data
    if (saved.id) {
      await updateDocumentEmphasis(saved.id, emphasisWords, whisperedWords);
    }

    setIsAnalyzing(false);
    setRefreshTrigger(prev => prev + 1);

    const totalFound = emphasisWords.length + whisperedWords.length;
    if (totalFound > 0) {
      toast.success(`Found ${emphasisWords.length} emphasis and ${whisperedWords.length} whispered words`);
    }

    setActiveDocument({
      parsedText: parsed,
      id: saved.id,
      emphasisWords,
      whisperedWords,
      totalReadingTime: 0,
      initialProgress: startProgress,
      isEbook: true,
    });
  }, []);

  const handleNewsSelect = useCallback(async (
    parsed: ParsedText,
    title: string,
    meta?: { link: string; source: string }
  ) => {
    setIsAnalyzing(true);
    toast.info('Analyzing article for emphasis...');

    // Process styles deterministically
    const { cleanedText, detectedWhispered, detectedEmphasis } = processTextStyles(parsed);

    // Save the document to database as an article with CLEANED text
    const saved = await saveDocument({
      title,
      source: 'url',
      parsedText: cleanedText,
      progress: { paragraph: 0, word: 0 },
      // Ensure this never gets treated as an ebook
      fileType: undefined,
    });

    if (!saved) {
      toast.error('Failed to save article');
      setIsAnalyzing(false);
      return;
    }

    // Get full text for emphasis analysis
    const fullText = cleanedText.paragraphs.map((p) => p.join(' ')).join(' ');
    const { emphasisWords: aiEmphasis, whisperedWords: aiWhispered } = await analyzeEmphasis(fullText);

    // Merge findings
    const finalWhisperedWords = Array.from(new Set([...detectedWhispered, ...aiWhispered]));

    // Filter emphasis to EXCLUDE any detected whispers (Deterministic whisper > AI emphasis)
    // This ensures words like "mouse" or "whisper" don't get blown up if AI marks them as emphatic
    const rawEmphasis = [...detectedEmphasis, ...aiEmphasis];
    const finalEmphasisWords = Array.from(new Set(
      rawEmphasis.filter(w => !finalWhisperedWords.includes(w))
    ));

    // Update document with emphasis data
    if (saved.id) {
      await updateDocumentEmphasis(saved.id, finalEmphasisWords, finalWhisperedWords);
    }

    setIsAnalyzing(false);
    setRefreshTrigger((prev) => prev + 1);

    const totalFound = finalEmphasisWords.length + finalWhisperedWords.length;
    if (totalFound > 0) {
      toast.success(`Found ${finalEmphasisWords.length} emphasis and ${finalWhisperedWords.length} whispered words`);
    }

    setActiveDocument({
      parsedText: cleanedText,
      id: saved.id,
      emphasisWords: finalEmphasisWords,
      whisperedWords: finalWhisperedWords,
      totalReadingTime: 0,
      isEbook: false,
    });
  }, []);

  const handleSelectDocument = useCallback(async (doc: SavedDocument) => {
    // ALWAYS re-process deterministic styles (KiN-TXT, plain italics, caps)
    // This ensures that if we update the logic, old docs get the new rendering immediately.
    const { cleanedText, detectedWhispered, detectedEmphasis } = processTextStyles(doc.parsedText);

    let finalEmphasisWords: string[] = [];
    let finalWhisperedWords: string[] = [];

    // Check if we already have saved emphasis data from AI
    if (doc.emphasisWords && doc.emphasisWords.length > 0) {
      // Merge new deterministic findings with EXISTING saved AI findings
      finalEmphasisWords = Array.from(new Set([...detectedEmphasis, ...doc.emphasisWords]));
      finalWhisperedWords = Array.from(new Set([...detectedWhispered, ...(doc.whisperedWords || [])]));
    } else {
      // No saved data? We need to run analysis.
      setIsAnalyzing(true);
      toast.info('Analyzing text for emphasis...');

      const fullText = cleanedText.paragraphs.map(p => p.join(' ')).join(' ');
      const { emphasisWords: aiEmphasis, whisperedWords: aiWhispered } = await analyzeEmphasis(fullText);

      finalWhisperedWords = Array.from(new Set([...detectedWhispered, ...aiWhispered]));

      const rawEmphasis = [...detectedEmphasis, ...aiEmphasis];
      finalEmphasisWords = Array.from(new Set(
        rawEmphasis.filter(w => !finalWhisperedWords.includes(w))
      ));

      // Save this new data back to the document
      if (doc.id) {
        await updateDocumentEmphasis(doc.id, finalEmphasisWords, finalWhisperedWords);
      }
      setIsAnalyzing(false);
    }

    setActiveDocument({
      parsedText: cleanedText, // Use the CLEANED text (With KiN-TXT fixed)
      id: doc.id,
      initialProgress: doc.progress,
      emphasisWords: finalEmphasisWords,
      whisperedWords: finalWhisperedWords,
      totalReadingTime: doc.totalReadingTime || 0,
      isEbook: doc.fileType === 'epub',
    });
  }, []);

  const handleProgressChange = useCallback(async (paragraph: number, word: number) => {
    if (activeDocument?.id) {
      await updateDocumentProgress(activeDocument.id, paragraph, word, activeDocument.parsedText);
    }
  }, [activeDocument?.id, activeDocument?.parsedText]);

  const handleBack = useCallback(() => {
    setActiveDocument(null);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };



  return (
    <div
      className="min-h-[100svh] relative bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Pull-down progress indicator - removed per user request */}

      <ThemeToggle />

      {/* Sign out button */}
      {!activeDocument && (
        <motion.button
          onClick={handleSignOut}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            opacity: isPongGameActive ? 0 : 1,
            filter: isPongGameActive ? 'blur(6px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.4 }}
          className="fixed left-4 z-50 p-2 rounded-lg bg-card/50 hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))', pointerEvents: isPongGameActive ? 'none' : 'auto' }}
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      )}


      <AnimatePresence mode="wait">
        {!activeDocument ? (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="min-h-[100svh]"
          >
            {/* Content */}
            <div
              className="relative z-10 px-4 pb-12"
              style={{
                paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))',
              }}
            >
              {/* Static header (logo + tabs) - does not scroll with content */}
              <div className="mx-auto w-full max-w-4xl">
                <div ref={headerRef} className="rounded-2xl bg-background backdrop-blur-sm">
                  <div className="py-4 sm:py-5">
                    {/* Header */}
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="text-center"
                    >
                      <AnimatedTitle onGameStateChange={setIsPongGameActive} />
                    </motion.div>

                    {/* Tab Toggle */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: isPongGameActive ? 0 : 1,
                        y: 0,
                        filter: isPongGameActive ? 'blur(6px)' : 'blur(0px)',
                      }}
                      transition={{ duration: 0.4, delay: isPongGameActive ? 0 : 0.3 }}
                      className="flex justify-center gap-2 mt-6"
                      style={{ pointerEvents: isPongGameActive ? 'none' : 'auto' }}
                    >
                      <motion.button
                        onClick={() => setActiveTab('my-texts')}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${activeTab === 'my-texts'
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        My TXTs
                      </motion.button>
                      <motion.button
                        onClick={() => setActiveTab('library')}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'library'
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                      >
                        <Library className="w-4 h-4" />
                        Ebooks
                      </motion.button>
                      <motion.button
                        onClick={() => setActiveTab('news')}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'news'
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                      >
                        <Newspaper className="w-4 h-4" />
                        News
                      </motion.button>
                    </motion.div>

                    {/* Loading indicator */}
                    {isAnalyzing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-center text-sm text-muted-foreground"
                      >
                        Analyzing text...
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="pb-12">
                {/* Tab Content */}
                <motion.div
                  className="flex w-full justify-center"
                  animate={{
                    opacity: isPongGameActive ? 0 : 1,
                    filter: isPongGameActive ? 'blur(6px)' : 'blur(0px)',
                  }}
                  transition={{ duration: 0.4 }}
                  style={{ pointerEvents: isPongGameActive ? 'none' : 'auto' }}
                >
                  <div className="w-full max-w-4xl">
                    <AnimatePresence mode="wait">
                      {activeTab === 'my-texts' ? (
                        <motion.div
                          key="my-texts"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3 }}
                          className="w-full flex flex-col items-center"
                        >
                          {/* Input Component */}
                          <TextInput onTextParsed={handleTextParsed} />

                          {/* Document History */}
                          <DocumentHistory onSelectDocument={handleSelectDocument} refreshTrigger={refreshTrigger} />
                        </motion.div>
                      ) : activeTab === 'library' ? (
                        <motion.div
                          key="library"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="w-full flex flex-col items-center"
                        >
                          <EbookLibrary onSelectEbook={handleEbookSelect} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="news"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="w-full flex flex-col items-center"
                        >
                          <NewsLibrary onSelectArticle={handleNewsSelect} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <KineticPlayer
              parsedText={activeDocument.parsedText}
              documentId={activeDocument.id}
              initialProgress={activeDocument.initialProgress}
              emphasisWords={activeDocument.emphasisWords}
              whisperedWords={activeDocument.whisperedWords}
              initialTotalReadingTime={activeDocument.totalReadingTime}
              onBack={handleBack}
              onProgressChange={handleProgressChange}
              isEbook={activeDocument.isEbook}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Index;
