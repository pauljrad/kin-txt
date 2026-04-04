import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Library, FileText, Newspaper } from 'lucide-react';
import { TextInput } from '@/components/TextInput';
import { KineticPlayer } from '@/components/KineticPlayer';
import { DocumentHistory } from '@/components/DocumentHistory';
import { EbookLibrary } from '@/components/EbookLibrary';
import { NewsLibrary } from '@/components/NewsLibrary';
import { InfoMenu } from '@/components/InfoMenu';

// KiN Components
import { KinUnifiedLayout } from '@/components/kin/KinUnifiedLayout';
import { KinPongGame } from '@/components/kin/KinPongGame';
import { Notifications } from '@/components/kin/Notifications';
import { UserProfile } from '@/components/kin/UserProfile';
import { KinProfileLayout } from '@/components/kin/KinProfileLayout';
import { ShareModal } from '@/components/kin/ShareModal';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { ThemeToggle } from '@/components/ThemeToggle';
import { AnimatedTitle } from '@/components/AnimatedTitle';
import { usePullGesture } from '@/hooks/usePullGesture';
import { ParsedText, processTextStyles, filterEmphasis } from '@/lib/textParser';
import { SavedDocument, saveDocument, updateDocumentProgress, updateDocumentEmphasis } from '@/lib/documentDatabase';
import { migrateLocalDocumentsToAccount } from '@/lib/documentMigration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

type TabMode = 'my-texts' | 'library' | 'news';

interface ActiveDocument {
  parsedText: ParsedText;
  title: string;
  id?: string;
  initialProgress?: { paragraph: number; word: number };
  emphasisWords?: string[];
  whisperedWords?: string[];
  totalReadingTime?: number;
  isEbook?: boolean;
  attribution?: {
    author: string;
    source?: string;
    pixelUrl?: string;
  };
}

interface EmphasisAnalysis {
  emphasisWords: string[];
  whisperedWords: string[];
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isSubscribed, loading: subLoading } = useSubscription();
  const [activeTab, setActiveTab] = useState<TabMode>('my-texts');
  const [activeDocument, setActiveDocument] = useState<ActiveDocument | null>(null);
  const [sharingDoc, setSharingDoc] = useState<SavedDocument | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPongGameActive, setIsPongGameActive] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);

  // KiN State
  const [kinSession, setKinSession] = useState<{ id: string; isHost: boolean; opponentId: string } | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // If we switch into the reader view, forcibly clear the "Pong active" UI lock
  // so the main interface never stays blurred/unclickable.
  useEffect(() => {
    if (activeDocument) setIsPongGameActive(false);
  }, [activeDocument]);

  // Use shared pull-down gesture hook (only when no document is active)
  usePullGesture(!activeDocument);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0); // Start at 0, will be measured

  // Measure header height for layout
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [activeDocument]);

  // Subscription Enforcement:
  // If the user is logged in but NOT subscribed, redirect them to pricing.
  // Note: Existing users are grandfathered as 'lifetime' in the database.
  useEffect(() => {
    if (!subLoading && user && !isSubscribed) {
      navigate('/pricing');
    }
  }, [user, isSubscribed, subLoading, navigate]);

  // Loading state while checking subscription
  if (subLoading && user) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/40 font-display tracking-widest uppercase">
          Verifying...
        </div>
      </div>
    );
  }

  // Listen for Pong Challenges and Global Events
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('global_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          // pong_ready notification means both players are ready - start the game!
          if (payload.new.type === 'pong_ready') {
            const data = payload.new.payload;

            // Set up the session and start the game
            setKinSession({
              id: data.sessionId,
              isHost: false, // We are the accepter
              opponentId: data.challengerId
            });

            setIsPongGameActive(true);
            toast.success("Game Starting!");

            // Mark notification read
            await supabase.from('notifications').update({ is_read: true }).eq('id', payload.new.id);
          }
        }
      )
      .subscribe();

    // Add real-time library refresh (for club suggestions)
    const docChannel = supabase.channel('library_refresh')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log("LIBRARY CHANGE DETECTED:", payload);
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    // Secondary refresh mechanism via custom events
    const handleRefresh = () => {
      console.log("REFRESH EVENT RECEIVED");
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('kin_library_refreshed', handleRefresh);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(docChannel);
      window.removeEventListener('kin_library_refreshed', handleRefresh);
    };
  }, [user]);

  const handleSendChallenge = async () => {
    if (!activeProfile || !user) return;

    const sessionId = crypto.randomUUID();

    // Notify opponent
    await supabase.from('notifications').insert({
      user_id: activeProfile,
      type: 'pong_challenge',
      payload: {
        challengerId: user.id,
        sessionId: sessionId
      }
    });

    // Join local session as host
    setKinSession({
      id: sessionId,
      isHost: true,
      opponentId: activeProfile
    });

    toast.success("Challenge Sent! Waiting for KiN...");
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
    const { emphasisWords: aiEmphasis, whisperedWords: aiWhispered } = await analyzeEmphasis(fullText);

    // Update document with emphasis data
    if (saved.id) {
      await updateDocumentEmphasis(saved.id, aiEmphasis, aiWhispered);
    }

    setIsAnalyzing(false);
    setRefreshTrigger(prev => prev + 1);

    // Merge findings
    const totalFound = aiEmphasis.length + aiWhispered.length;

    // Ensure whisper trumps emphasis if there's a collision
    // (e.g. if AI says "mouse" is emphasis but it's in our auto-whisper list)
    // AND apply stop-word filtering to remove common words like "the", "with"
    const filteredEmphasisWords = filterEmphasis(aiEmphasis.filter(w => !aiWhispered.includes(w)));

    if (totalFound > 0) {
      toast.success(`Found ${filteredEmphasisWords.length} emphasis and ${aiWhispered.length} whispered words`);
    }

    setActiveDocument({
      parsedText: parsed,
      title,
      id: saved.id,
      emphasisWords: filteredEmphasisWords,
      whisperedWords: aiWhispered,
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

    // Process styles deterministically (italics, caps, !, KiN-TXT branding)
    const { cleanedText, detectedWhispered, detectedEmphasis } = processTextStyles(parsed);

    // Save the document to database with ebook file type and CLEANED text
    const saved = await saveDocument({
      title,
      source: 'ebook',
      parsedText: cleanedText,
      progress: startProgress,
      fileType: 'epub',
    });

    if (!saved) {
      toast.error('Failed to save document');
      setIsAnalyzing(false);
      return;
    }

    // Get full text for emphasis analysis
    const fullText = cleanedText.paragraphs.map(p => p.join(' ')).join(' ');
    const { emphasisWords: aiEmphasis, whisperedWords: aiWhispered } = await analyzeEmphasis(fullText);

    const finalWhisperedWords = Array.from(new Set([...detectedWhispered, ...aiWhispered]));
    const rawEmphasis = [...detectedEmphasis, ...aiEmphasis];
    const finalEmphasisWords = filterEmphasis(Array.from(new Set(
      rawEmphasis.filter(w => !finalWhisperedWords.includes(w))
    )));

    // Update document with final emphasis data
    if (saved.id) {
      await updateDocumentEmphasis(saved.id, finalEmphasisWords, finalWhisperedWords);
    }

    setIsAnalyzing(false);
    setRefreshTrigger(prev => prev + 1);

    const totalFound = finalEmphasisWords.length + finalWhisperedWords.length;
    if (totalFound > 0) {
      toast.success(`Found ${finalEmphasisWords.length} emphasis and ${finalWhisperedWords.length} whispered words`);
    }

    setActiveDocument({
      parsedText: cleanedText,
      title,
      id: saved.id,
      emphasisWords: finalEmphasisWords,
      whisperedWords: finalWhisperedWords,
      totalReadingTime: 0,
      initialProgress: startProgress,
      isEbook: true,
    });
  }, []);

  // Attribution is now handled within KineticPlayer

  const handleNewsSelect = useCallback(async (
    parsed: ParsedText,
    title: string,
    meta?: { link: string; source: string; author?: string; rawHtml?: string }
  ) => {
    setIsAnalyzing(true);
    toast.info('Analyzing article for emphasis...');

    // Process styles deterministically
    const { cleanedText, detectedWhispered, detectedEmphasis } = processTextStyles(parsed);

    // Save the document to database as an article with CLEANED text
    const saved = await saveDocument({
      title,
      source: 'article',
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
    const rawEmphasis = [...detectedEmphasis, ...aiEmphasis];
    const finalEmphasisWords = filterEmphasis(Array.from(new Set(
      rawEmphasis.filter(w => !finalWhisperedWords.includes(w))
    )));

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

    // Extract pixel URL from rawHtml if present
    let pixelUrl: string | undefined;
    if (meta?.rawHtml) {
      const match = meta.rawHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (match) pixelUrl = match[1];
    }

    const sourceName = meta?.source || 'The Conversation';

    // Set document active immediately, KineticPlayer will handle the attribution splash
    setActiveDocument({
      parsedText: cleanedText,
      title,
      id: saved.id,
      emphasisWords: finalEmphasisWords,
      whisperedWords: finalWhisperedWords,
      totalReadingTime: 0,
      isEbook: false,
      attribution: {
        author: meta?.author || 'Unknown Author',
        source: sourceName,
        pixelUrl
      }
    });

  }, []);

  const analyzeEmphasis = async (text: string): Promise<EmphasisAnalysis> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-emphasis', {
        body: { text },
      });

      if (error) throw error;
      return {
        emphasisWords: (data as any).emphasisWords || [],
        whisperedWords: (data as any).whisperedWords || [],
      };
    } catch (err) {
      console.error('Failed to analyze emphasis:', err);
      return { emphasisWords: [], whisperedWords: [] };
    }
  };

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
      finalEmphasisWords = filterEmphasis(Array.from(new Set(
        rawEmphasis.filter(w => !finalWhisperedWords.includes(w))
      )));

      // Save this new data back to the document
      if (doc.id) {
        await updateDocumentEmphasis(doc.id, finalEmphasisWords, finalWhisperedWords);
      }
      setIsAnalyzing(false);
    }

    setActiveDocument({
      parsedText: cleanedText, // Use the CLEANED text (With KiN-TXT fixed)
      title: doc.title,
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

  const handleEndPong = () => {
    setIsPongGameActive(false);
    setKinSession(null);
  };

  const [isShareOpen, setIsShareOpen] = useState(false);

  const handleShareClick = (doc?: SavedDocument) => {
    if (doc) setSharingDoc(doc);
    else setSharingDoc(null);
    setIsShareOpen(true);
  };

  const handleConfirmShare = async (recipientId: string) => {
    const docToShare = sharingDoc || activeDocument;
    if (!docToShare || !user) return;

    try {
      const title = docToShare.title;

      // Create shared item with FULL content
      const { error } = await supabase
        .from('shared_items')
        .insert({
          sender_id: user.id,
          receiver_id: recipientId,
          item_type: 'txt',
          content: {
            title,
            parsedText: docToShare.parsedText,
            preview: docToShare.parsedText.paragraphs[0]?.slice(0, 20).join(' ') + '...',
          } as any
        });

      if (error) throw error;

      // Notify recipient
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'shared_item',
        payload: {
          senderId: user.id,
          documentTitle: title,
        }
      });

      toast.success("Sent to KiN!");
      setSharingDoc(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to share.");
    }
  };

  const handleOpenDocumentById = async (id: string) => {
    const { getDocument } = await import('@/lib/documentDatabase');
    const doc = await getDocument(id);
    if (doc) {
      handleSelectDocument(doc);
    }
  };

  // Handle 'read' query parameter for deep-linking (e.g., from club)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('read');
    if (docId) {
      // Clear the param to avoid re-opening on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('read');
      window.history.replaceState({}, '', newUrl.toString());

      handleOpenDocumentById(docId);
    }
  }, []);

  // Handle Shared Link Redemption
  useEffect(() => {
    if (!user) return;

    const redeemShare = async () => {
      // Check URL and LocalStorage
      const params = new URLSearchParams(window.location.search);
      const urlShareId = params.get('share_id');
      const pendingShareId = localStorage.getItem('pending_share_id');

      const shareId = urlShareId || pendingShareId;

      if (!shareId) return;

      try {
        // Clear immediately to prevent loop/double-add
        if (urlShareId) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('share_id');
          window.history.replaceState({}, '', newUrl.toString());
        }
        localStorage.removeItem('pending_share_id');

        toast.info("Importing shared TXT...");

        // Fetch Shared Link Content
        const { data: linkData, error: linkError } = await supabase
          .from('shared_links' as any)
          .select('*')
          .eq('id', shareId)
          .single();

        if (linkError || !linkData) throw new Error("Link invalid or expired");

        const content = (linkData as any).content as any;

        // Save to Library
        const { data: newDoc, error: saveErr } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            title: content.title || 'Shared TXT',
            content: JSON.stringify(content.parsedText),
            preview: content.preview || '',
            word_count: (content.parsedText?.paragraphs?.flat()?.length) || 0,
            current_word_index: 0,
            progress: 0,
            source: 'url',
            file_type: null
          })
          .select()
          .single();

        if (saveErr) throw saveErr;

        toast.success("Shared TXT added to library!");

        // Open it
        if (newDoc) {
          handleOpenDocumentById((newDoc as any).id);
        }

      } catch (e) {
        console.error("Error redeeming share:", e);
        toast.error("Could not import shared TXT.");
      }
    };

    redeemShare();
  }, [user]);

  const handleGenerateShareLink = async () => {
    const docToShare = sharingDoc || activeDocument;
    if (!docToShare || !user) return null;

    try {
      const { data, error } = await supabase
        .from('shared_links' as any)
        .insert({
          user_id: user.id,
          title: docToShare.title,
          content: {
            title: docToShare.title,
            parsedText: docToShare.parsedText,
            preview: docToShare.parsedText.paragraphs[0]?.slice(0, 20).join(' ') + '...',
          } as any
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) return null;

      // Construct URL
      const url = new URL(window.location.origin);
      url.searchParams.set('share_id', (data as any).id);
      return url.toString();
    } catch (e) {
      console.error("Error generating link:", e);
      toast.error("Failed to generate link.");
      return null;
    }
  };


  return (
    <div
      className="min-h-[100svh] relative bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >


      <ShareModal
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        onShare={handleConfirmShare}
        onGenerateLink={handleGenerateShareLink}
      />

      <AnimatePresence mode="wait">
        {!activeDocument ? (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center px-4 pt-24 sm:pt-28"
          >
            {/* Main Content Area */}
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
              <AnimatedTitle />

              <div className="w-full space-y-6 mt-8">
                {/* Tabs */}
                <div className="flex justify-center gap-2 sm:gap-4 mb-4">
                  <button
                    onClick={() => setActiveTab('my-texts')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'my-texts'
                      ? 'bg-foreground text-background font-medium'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>My TXTs</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('library')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'library'
                      ? 'bg-foreground text-background font-medium'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                  >
                    <Library className="w-4 h-4" />
                    <span>Ebooks</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('news')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'news'
                      ? 'bg-foreground text-background font-medium'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                  >
                    <Newspaper className="w-4 h-4" />
                    <span>News</span>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'my-texts' ? (
                      <div className="space-y-6">
                        <TextInput onTextParsed={handleTextParsed} />
                        <DocumentHistory
                          onSelectDocument={handleSelectDocument}
                          onShare={handleShareClick}
                          refreshTrigger={refreshTrigger}
                        />
                      </div>
                    ) : activeTab === 'library' ? (
                      <EbookLibrary onSelectEbook={handleEbookSelect} />
                    ) : (
                      <NewsLibrary onSelectArticle={handleNewsSelect} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="fixed inset-0 z-50 bg-background">
            <KineticPlayer
              documentId={activeDocument.id}
              parsedText={activeDocument.parsedText}
              initialProgress={activeDocument.initialProgress}
              emphasisWords={activeDocument.emphasisWords}
              whisperedWords={activeDocument.whisperedWords}
              initialTotalReadingTime={activeDocument.totalReadingTime}
              onBack={handleBack}
              onProgressChange={handleProgressChange}
              isEbook={activeDocument.isEbook}
              onShare={handleShareClick as any}
              attribution={activeDocument.attribution}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfoMenu && (
          <InfoMenu onClose={() => setShowInfoMenu(false)} />
        )}
      </AnimatePresence>

      {/* Pong Game Overlay */}
      {isPongGameActive && kinSession && (
        <KinPongGame
          sessionId={kinSession.id}
          isHost={kinSession.isHost}
          opponentId={kinSession.opponentId}
          onGameEnd={handleEndPong}
        />
      )}

      {/* User Profile View Overlay */}
      <Dialog open={!!activeProfile} onOpenChange={() => setActiveProfile(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
          <DialogTitle className="sr-only">User Profile</DialogTitle>
          {activeProfile && (
            <div className="space-y-6">
              <UserProfile userId={activeProfile} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FIXED TOOLBAR (Always On Top) */}
      <ThemeToggle />

      {/* Sign out button - Top Left */}
      {!activeDocument && (
        <motion.button
          onClick={handleSignOut}
          animate={{
            opacity: isPongGameActive ? 0 : 1,
            filter: isPongGameActive ? 'blur(6px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.4 }}
          className="absolute left-4 z-50 toolbar-button"
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))', pointerEvents: isPongGameActive ? 'none' : 'auto' }}
          title="Sign out"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
      )}

      {/* Notifications - Top Right (right-28) */}
      {!activeDocument && (
        <div
          className="absolute right-28 z-50 flex items-center justify-center p-0"
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
          <Notifications
            onOpenDocument={handleOpenDocumentById}
            onStartPongGame={(sessionId, opponentId, isHost) => {
              setKinSession({ id: sessionId, opponentId, isHost });
              setIsPongGameActive(true);
            }}
          />
        </div>
      )}

      {/* KiN-Profile - Top Right (right-52) */}
      {!activeDocument && (
        <KinProfileLayout />
      )}

      {/* KiN - Unified Menu - Top Right (right-40) */}
      {!activeDocument && !isPongGameActive && (
        <KinUnifiedLayout onViewProfile={setActiveProfile} />
      )}

      {/* Info Button - Top Right (right-16) */}
      {!activeDocument && (
        <motion.button
          onClick={() => setShowInfoMenu(true)}
          animate={{
            opacity: isPongGameActive ? 0 : 1,
            filter: isPongGameActive ? 'blur(6px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.4 }}
          className="absolute right-16 z-50 toolbar-button"
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))', pointerEvents: isPongGameActive ? 'none' : 'auto' }}
          title="Information & Instructions"
        >
          <div className="flex flex-col items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-foreground">
            <span className="w-[2px] sm:w-[3px] h-[2px] sm:h-[3px] rounded-full bg-current mb-[2px]" />
            <span className="w-[2px] sm:w-[3px] h-[8px] sm:h-[10px] bg-current rounded-[1px]" />
          </div>
        </motion.button>
      )}
    </div>
  );
};

export default Index;
