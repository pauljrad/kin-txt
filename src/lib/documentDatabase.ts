import { supabase } from '@/integrations/supabase/client';
import { ParsedText } from './textParser';

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
  source: 'file' | 'paste' | 'url';
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
  emphasisWords?: string[];
  whisperedWords?: string[];
  fileType?: string;
}

// Detect category based on source, file type, and content characteristics
export function detectCategory(source: 'file' | 'paste' | 'url', title: string, wordCount: number, fileType?: string): DocumentCategory {
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
    return wordCount > 5000 ? 'document' : 'article';
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
  const source = (doc.source as 'file' | 'paste' | 'url') || 'paste';
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
  if (!user) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }

  return (data || []).map(doc => dbToSavedDocument(doc as DatabaseDocument & { source?: string; file_type?: string }));
}

export async function saveDocument(doc: {
  title: string;
  source: 'file' | 'paste' | 'url';
  parsedText: ParsedText;
  progress: { paragraph: number; word: number };
  fileType?: string;
}): Promise<SavedDocument | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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
  if (!user) return;

  let wordIndex = 0;
  let progress = 0;

  if (parsedText) {
    wordIndex = calculateWordIndex(parsedText, paragraph, word);
    const totalWords = parsedText.paragraphs?.flat()?.length || 1;
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
  }
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
  if (!user) return;

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching document:', error);
    return null;
  }

  return dbToSavedDocument(data as DatabaseDocument & { source?: string; file_type?: string });
}
