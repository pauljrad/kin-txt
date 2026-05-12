import { supabase } from '@/integrations/supabase/client';
import { ParsedText } from './textParser';
import { updateClubProgress } from './clubDatabase';

export type DocumentCategory = 'book' | 'article' | 'document';

export interface DatabaseDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  preview?: string;
  word_count: number;
  progress: number;
  current_word_index: number;
  is_completed: boolean;
  completed_at?: string;
  emphasis_words: string[];
  whispered_words: string[];
  total_reading_time: number;
  created_at: string;
  updated_at: string;
}

export interface SavedDocument {
  id: string;
  title: string;
  source: 'file' | 'paste' | 'url' | 'ebook' | 'article';
  category: DocumentCategory;
  parsedText: ParsedText;
  progress: {
    paragraph: number;
    word: number;
  };
  totalReadingTime: number;
  completed: boolean;
  startedAt: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  fileType?: string;
  isOffline?: boolean;
}

// Detect category based on source, file type, and content characteristics
export function detectCategory(source: 'file' | 'paste' | 'url' | 'ebook' | 'article', title: string, wordCount: number, fileType?: string): DocumentCategory {
  // Explicit source overrides
  if (source === 'ebook') return 'book';
  if (source === 'article') return 'article';

  // Check file type first if available
  if (fileType === 'epub' || fileType === 'mobi' || fileType === 'azw') {
    return 'book';
  }

  if (source === 'url') {
    return 'article';
  }

  // Check title for ebook extensions
  const bookIndicators = /\.(epub|mobi|azw)$/i;
  if (bookIndicators.test(title)) {
    return 'book';
  }

  // Check for common book-related title patterns
  const bookTitlePatterns = /^(strange case|the |a |an |dr\.|mr\.|mrs\.|ms\.)/i;
  if (source === 'file' && (wordCount > 8000 || bookTitlePatterns.test(title))) {
    return 'book';
  }

  if (source === 'paste') {
    return 'document';
  }

  if (/\.(pdf|docx?)$/i.test(title)) {
    return 'document';
  }

  if (wordCount > 10000) return 'book';
  if (wordCount < 2000) return 'article';
  return 'document';
}

// Convert database document to SavedDocument format
function dbToSavedDocument(doc: DatabaseDocument & { source?: string; file_type?: string }): SavedDocument {
  const parsedText: ParsedText = JSON.parse(doc.content);
  const wordCount = parsedText.paragraphs?.flat()?.length || doc.word_count;
  const source = (doc.source as 'file' | 'paste' | 'url' | 'ebook' | 'article') || 'paste';
  const fileType = doc.file_type;

  // Calculate paragraph and word from current_word_index
  let paragraph = 0;
  let word = 0;
  let count = 0;

  if (parsedText.paragraphs && doc.current_word_index > 0) {
    for (let p = 0; p < parsedText.paragraphs.length; p++) {
      const paragraphLength = parsedText.paragraphs[p].length;
      if (count + paragraphLength > doc.current_word_index) {
        paragraph = p;
        word = doc.current_word_index - count;
        break;
      }
      count += paragraphLength;
    }
  }

  return {
    id: doc.id,
    title: doc.title,
    source,
    category: detectCategory(source, doc.title, wordCount, fileType),
    parsedText,
    progress: { paragraph, word },
    totalReadingTime: doc.total_reading_time || 0,
    completed: doc.is_completed || false,
    startedAt: new Date(doc.created_at).getTime(),
    completedAt: doc.completed_at ? new Date(doc.completed_at).getTime() : undefined,
    createdAt: new Date(doc.created_at).getTime(),
    updatedAt: new Date(doc.updated_at).getTime(),
    emphasisWords: doc.emphasis_words || [],
    whisperedWords: doc.whispered_words || [],
  };
}

// Calculate word index from paragraph and word
function calculateWordIndex(parsedText: ParsedText, paragraph: number, word: number): number {
  let index = 0;
  for (let p = 0; p < paragraph && p < parsedText.paragraphs.length; p++) {
    index += parsedText.paragraphs[p].length;
  }
  return index + word;
}

export async function getDocuments(): Promise<SavedDocument[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Try to get offline documents first
  const { getAllOffline } = await import('./offlineDatabase');
  const offlineDocs = await getAllOffline();
  const offlineIds = new Set(offlineDocs.map(d => d.id));

  if (!user) {
    const guestDoc = sessionStorage.getItem('kinxt_guest_doc');
    if (guestDoc) {
      try {
        const doc = JSON.parse(guestDoc) as SavedDocument;
        return [doc];
      } catch (e) {
        console.error('Error parsing guest doc', e);
      }
    }
    return [];
  }

  if (!navigator.onLine) {
    return offlineDocs.map(doc => ({ ...doc, isOffline: true }));
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching documents:', error);
    return offlineDocs.map(doc => ({ ...doc, isOffline: true }));
  }

  const onlineDocs = (data || []).map(doc => dbToSavedDocument(doc as DatabaseDocument & { source?: string; file_type?: string }));
  
  // Merge: Use online doc as source of truth but flag if it's available offline
  return onlineDocs.map(doc => ({
    ...doc,
    isOffline: offlineIds.has(doc.id)
  }));
}

export async function saveDocument(doc: {
  title: string;
  source: 'file' | 'paste' | 'url' | 'ebook' | 'article';
  parsedText: ParsedText;
  progress: { paragraph: number; word: number };
  fileType?: string;
}): Promise<SavedDocument | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Guest logic: Only 1 doc allowed
    const wordCount = doc.parsedText.paragraphs?.flat()?.length || 0;
    const preview = doc.parsedText.paragraphs?.[0]?.slice(0, 20).join(' ') || '';
    
    const guestDoc: SavedDocument = {
      id: 'guest-' + Date.now(),
      title: doc.title,
      source: doc.source,
      category: detectCategory(doc.source, doc.title, wordCount, doc.fileType),
      parsedText: doc.parsedText,
      progress: { paragraph: 0, word: 0 },
      totalReadingTime: 0,
      completed: false,
      startedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileType: doc.fileType,
    };

    sessionStorage.setItem('kinxt_guest_doc', JSON.stringify(guestDoc));
    return guestDoc;
  }

  const wordCount = doc.parsedText.paragraphs?.flat()?.length || 0;
  const preview = doc.parsedText.paragraphs?.[0]?.slice(0, 20).join(' ') || '';
  const wordIndex = calculateWordIndex(doc.parsedText, doc.progress.paragraph, doc.progress.word);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title: doc.title,
      content: JSON.stringify(doc.parsedText),
      preview,
      word_count: wordCount,
      progress: Math.round((wordIndex / wordCount) * 100),
      current_word_index: wordIndex,
      is_completed: false,
      emphasis_words: [],
      whispered_words: [],
      total_reading_time: 0,
      source: doc.source,
      file_type: doc.fileType || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving document:', error);
    return null;
  }

  return dbToSavedDocument(data as DatabaseDocument & { source?: string; file_type?: string });
}

export async function updateDocumentProgress(id: string, paragraph: number, word: number, parsedText?: ParsedText): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // For guest users, we don't save progress to storage, 
    // but the user requested: "won’t be able to save where they’re upto when reading txts"
    // So we just skip saving.
    return;
  }

  let wordIndex = 0;
  let progress = 0;
  let totalWords = 1;

  if (parsedText) {
    wordIndex = calculateWordIndex(parsedText, paragraph, word);
    totalWords = parsedText.paragraphs?.flat()?.length || 1;
    progress = Math.round((wordIndex / totalWords) * 100);
  }

  const { error } = await supabase
    .from('documents')
    .update({
      current_word_index: wordIndex,
      progress,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating progress:', error);
  }

  // Also update club progress if this is a club book (non-blocking)
  updateClubProgress(id, wordIndex, totalWords).catch(err => {
    console.error('[documentDatabase] Failed to sync club progress:', err);
  });
}

export async function updateDocumentReadingTime(id: string, totalSeconds: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('documents')
    .update({ total_reading_time: totalSeconds })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating reading time:', error);
  } else {
    // Synchronize global lifetime reading time (monotonically increasing)
    void syncLifetimeReadingTime(user.id, totalSeconds);
  }
}

export async function syncLifetimeReadingTime(userId: string, totalSeconds: number): Promise<void> {
  if (!userId || totalSeconds <= 0) return;
  if (!navigator.onLine) return;

  const { error } = await supabase.rpc('sync_lifetime_reading_time', {
    p_user_id: userId,
    p_total_seconds: Math.floor(totalSeconds),
  });

  if (error) {
    console.error('[documentDatabase] Error syncing lifetime reading time:', error);
  }
}

export async function logReadingSession(documentId: string, durationSeconds: number, category: string = 'document', wordsRead: number = 0): Promise<any> {
  if (!navigator.onLine) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || durationSeconds <= 0) return;

  console.log('[documentDatabase] Logging session:', { documentId, durationSeconds, category, userId: user.id });

  // @ts-ignore - RPC not yet in generated types
  const { data, error } = await supabase.rpc('log_reading_session', {
    p_document_id: documentId,
    p_duration_seconds: Math.floor(durationSeconds),
    p_category: category,
    p_words_read: wordsRead,
  });

  if (error) {
    console.error('[documentDatabase] RPC Error:', error);
    return { status: 'error', message: error.message };
  }

  if (!data || (data as any).status === 'error') {
    console.error('[documentDatabase] RPC returned error:', data);
    return data || { status: 'error', message: 'No data returned from RPC' };
  }

  console.log('[documentDatabase] Sync successful:', data);
  window.dispatchEvent(new CustomEvent('kin_stats_updated', { detail: data }));

  return data;
}

export async function updateDocumentEmphasis(id: string, emphasisWords: string[], whisperedWords: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('documents')
    .update({
      emphasis_words: emphasisWords,
      whispered_words: whisperedWords,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating emphasis:', error);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (id.startsWith('guest-')) {
      sessionStorage.removeItem('kinxt_guest_doc');
    }
    return;
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting document:', error);
  }
}

export async function renameDocument(id: string, newTitle: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('documents')
    .update({ title: newTitle })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error renaming document:', error);
  }
}

export async function markDocumentCompleted(id: string, completed: boolean = true): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('documents')
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking document completed:', error);
  }
}

export async function getDocument(id: string): Promise<SavedDocument | null> {
  // Check offline first
  const { getFromOffline } = await import('./offlineDatabase');
  const offlineDoc = await getFromOffline(id);
  
  if (!navigator.onLine && offlineDoc) {
    return { ...offlineDoc, isOffline: true };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return offlineDoc ? { ...offlineDoc, isOffline: true } : null;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching document:', error);
    return offlineDoc ? { ...offlineDoc, isOffline: true } : null;
  }

  const doc = dbToSavedDocument(data as DatabaseDocument & { source?: string; file_type?: string });
  return {
    ...doc,
    isOffline: !!offlineDoc
  };
}
