import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, Trash2, Play, Pencil, Check, X, CheckCircle2, BookCheck, Calendar, BookOpen, Newspaper, File, ChevronDown, Undo2 } from 'lucide-react';
import { SavedDocument, DocumentCategory, getDocuments, deleteDocument, renameDocument, markDocumentCompleted } from '@/lib/documentDatabase';
import { useState, useEffect, useMemo, useCallback, forwardRef, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface DocumentHistoryProps {
  onSelectDocument: (doc: SavedDocument) => void;
  refreshTrigger?: number;
}

export const DocumentHistory = forwardRef<HTMLDivElement, DocumentHistoryProps>(function DocumentHistory(
  { onSelectDocument, refreshTrigger }: DocumentHistoryProps,
  ref
) {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  // Start with all categories collapsed by default for a neater look
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set(['book', 'article', 'document']));
  const [collapsedReadCategories, setCollapsedReadCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<{ doc: SavedDocument; timeoutId: NodeJS.Timeout } | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    const docs = await getDocuments();
    setDocuments(docs);
    setIsLoading(false);
  }, []);

  const toggleCategory = (key: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleReadCategory = (key: string) => {
    setCollapsedReadCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments, refreshTrigger]);

  const handleDeleteClick = (e: React.MouseEvent, doc: SavedDocument) => {
    e.stopPropagation();
    
    // Clear any existing pending delete
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }
    
    // Set up the pending delete with a timeout
    const timeoutId = setTimeout(async () => {
      await deleteDocument(doc.id);
      setPendingDelete(null);
      deleteTimeoutRef.current = null;
      // Reload documents after deletion
      loadDocuments();
    }, 5000);
    
    deleteTimeoutRef.current = timeoutId;
    setPendingDelete({ doc, timeoutId });
    
    // Show toast with undo option
    toast({
      title: "Item deleted",
      description: (
        <div className="flex items-center justify-between gap-4">
          <span className="truncate max-w-[200px]">"{doc.title}" was deleted</span>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            onClick={() => handleUndoDelete()}
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
        </div>
      ),
      duration: 5000,
    });
  };

  const handleUndoDelete = () => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      setPendingDelete(null);
      deleteTimeoutRef.current = null;
      toast({
        title: "Restored",
        description: "Item has been restored",
        duration: 2000,
      });
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const handleStartRename = (e: React.MouseEvent, doc: SavedDocument) => {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const handleSaveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      await renameDocument(id, editingTitle.trim());
      await loadDocuments();
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleMarkCompleted = async (e: React.MouseEvent, id: string, completed: boolean) => {
    e.stopPropagation();
    await markDocumentCompleted(id, completed);
    await loadDocuments();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatReadingTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  const getProgress = (doc: SavedDocument) => {
    const totalWords = doc.parsedText.paragraphs.flat().length;
    let currentIndex = 0;
    for (let i = 0; i < doc.progress.paragraph; i++) {
      currentIndex += doc.parsedText.paragraphs[i]?.length || 0;
    }
    currentIndex += doc.progress.word;
    return Math.round((currentIndex / totalWords) * 100);
  };

  // Filter out pending delete item from display
  const visibleDocuments = useMemo(() => 
    documents.filter(d => !pendingDelete || d.id !== pendingDelete.doc.id),
    [documents, pendingDelete]
  );

  const activeDocuments = visibleDocuments.filter(d => !d.completed);
  const completedDocuments = visibleDocuments.filter(d => d.completed);

  // Group active documents by category
  const documentsByCategory = useMemo(() => {
    const categories: { key: DocumentCategory; label: string; icon: typeof BookOpen; docs: SavedDocument[] }[] = [
      { key: 'book', label: 'Ebooks', icon: BookOpen, docs: [] },
      { key: 'article', label: 'Articles', icon: Newspaper, docs: [] },
      { key: 'document', label: 'Documents', icon: File, docs: [] },
    ];
    
    activeDocuments.forEach(doc => {
      const category = categories.find(c => c.key === doc.category);
      if (category) {
        category.docs.push(doc);
      } else {
        categories[2].docs.push(doc);
      }
    });
    
    return categories.filter(c => c.docs.length > 0);
  }, [activeDocuments]);

  // Group completed documents by month, then by category within each month
  const completedByMonth = useMemo(() => {
    const monthGroups: Map<string, { label: string; timestamp: number; categories: Map<DocumentCategory, SavedDocument[]> }> = new Map();
    
    completedDocuments
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .forEach(doc => {
        const date = new Date(doc.completedAt || doc.updatedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        
        if (!monthGroups.has(monthKey)) {
          monthGroups.set(monthKey, { 
            label: monthLabel, 
            timestamp: date.getTime(),
            categories: new Map([['book', []], ['article', []], ['document', []]])
          });
        }
        
        const group = monthGroups.get(monthKey)!;
        const category = doc.category || 'document';
        group.categories.get(category)?.push(doc);
      });
    
    return Array.from(monthGroups.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .map(([key, value]) => ({
        key,
        label: value.label,
        categories: [
          { key: 'book' as DocumentCategory, label: 'Ebooks', icon: BookOpen, docs: value.categories.get('book') || [] },
          { key: 'article' as DocumentCategory, label: 'Articles', icon: Newspaper, docs: value.categories.get('article') || [] },
          { key: 'document' as DocumentCategory, label: 'Documents', icon: File, docs: value.categories.get('document') || [] },
        ].filter(c => c.docs.length > 0)
      }));
  }, [completedDocuments]);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-24"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return null;
  }

  const renderDocumentCard = (doc: SavedDocument, showDates: boolean = false) => (
    <motion.div
      key={doc.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={() => editingId !== doc.id && onSelectDocument(doc)}
      className="glass-panel p-4 cursor-pointer group hover:bg-card/90 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Left side - Icon and info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.completed ? 'bg-primary/20' : 'bg-secondary'}`}>
            {doc.completed ? (
              <BookCheck className="w-5 h-5 text-primary" />
            ) : (
              <FileText className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingId === doc.id ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(e as any, doc.id);
                    if (e.key === 'Escape') handleCancelRename(e as any);
                  }}
                />
                <button
                  onClick={(e) => handleSaveRename(e, doc.id)}
                  className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCancelRename}
                  className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="font-medium text-foreground truncate">{doc.title}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>{doc.parsedText.paragraphs.flat().length} words</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatReadingTime(doc.totalReadingTime || 0)}
              </span>
              {!showDates && (
                <>
                  <span>•</span>
                  <span>{formatDate(doc.updatedAt)}</span>
                </>
              )}
            </div>
            {/* Date info for completed documents */}
            {showDates && doc.completed && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Started: {formatDateShort(doc.startedAt || doc.createdAt)}
                </span>
                {doc.completedAt && (
                  <>
                    <span>→</span>
                    <span>Finished: {formatDateShort(doc.completedAt)}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Progress and actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-13 sm:ml-0">
          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-12 sm:w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${doc.completed ? 'bg-primary' : 'bg-accent'}`}
                style={{ width: `${doc.completed ? 100 : getProgress(doc)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-7 text-right">
              {doc.completed ? '100%' : `${getProgress(doc)}%`}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Mark as completed/uncompleted */}
            <button
              onClick={(e) => handleMarkCompleted(e, doc.id, !doc.completed)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                doc.completed 
                  ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
              title={doc.completed ? "Mark as unread" : "Mark as read"}
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Rename button */}
            <button
              onClick={(e) => handleStartRename(e, doc)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Rename"
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Play button */}
            <button 
              className="p-1.5 sm:p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={(e) => { e.stopPropagation(); onSelectDocument(doc); }}
              title="Play"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Delete button */}
            <button
              onClick={(e) => handleDeleteClick(e, doc)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div ref={ref} className="w-full max-w-2xl mx-auto mt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {/* Active/Reading Documents grouped by category */}
      {documentsByCategory.length > 0 && (
        <div className="space-y-4">
          {documentsByCategory.map(category => (
            <div key={category.key}>
              <button
                onClick={() => toggleCategory(category.key)}
                className="text-lg font-medium text-foreground mb-3 flex items-center gap-2 hover:text-primary transition-colors w-full text-left"
              >
                <category.icon className="w-5 h-5 text-muted-foreground" />
                {category.label}
                <span className="text-sm text-muted-foreground">({category.docs.length})</span>
                <ChevronDown 
                  className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${
                    collapsedCategories.has(category.key) ? '-rotate-90' : ''
                  }`} 
                />
              </button>
              <AnimatePresence initial={false}>
                {!collapsedCategories.has(category.key) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      {category.docs.map(doc => renderDocumentCard(doc, false))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Completed Documents */}
      {completedDocuments.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 hover:text-primary transition-colors"
          >
            <BookCheck className="w-5 h-5 text-primary" />
            Finished ({completedDocuments.length})
            <ChevronDown 
              className={`w-4 h-4 ml-2 text-muted-foreground transition-transform ${
                !showCompleted ? '-rotate-90' : ''
              }`} 
            />
          </button>
          
          <AnimatePresence initial={false}>
            {showCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-6">
                  {completedByMonth.map(month => (
                    <div key={month.key}>
                      <button
                        onClick={() => toggleReadCategory(month.key)}
                        className="text-base font-medium text-foreground mb-3 flex items-center gap-2 hover:text-primary transition-colors w-full text-left"
                      >
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {month.label}
                        <span className="text-sm text-muted-foreground">
                          ({month.categories.reduce((sum, c) => sum + c.docs.length, 0)})
                        </span>
                        <ChevronDown 
                          className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${
                            collapsedReadCategories.has(month.key) ? '-rotate-90' : ''
                          }`} 
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {!collapsedReadCategories.has(month.key) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 ml-4">
                              {month.categories.map(category => (
                                <div key={`${month.key}-${category.key}`}>
                                  <button
                                    onClick={() => toggleReadCategory(`${month.key}-${category.key}`)}
                                    className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2 hover:text-foreground transition-colors w-full text-left"
                                  >
                                    <category.icon className="w-4 h-4" />
                                    {category.label}
                                    <span className="text-xs">({category.docs.length})</span>
                                    <ChevronDown 
                                      className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${
                                        collapsedReadCategories.has(`${month.key}-${category.key}`) ? '-rotate-90' : ''
                                      }`} 
                                    />
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {!collapsedReadCategories.has(`${month.key}-${category.key}`) && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="space-y-2">
                                          {category.docs.map(doc => renderDocumentCard(doc, true))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      </motion.div>
    </div>
  );
});
