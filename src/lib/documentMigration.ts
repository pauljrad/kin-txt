import { supabase } from '@/integrations/supabase/client';
import { getDocuments as getLocalDocuments, SavedDocument as LocalSavedDocument } from '@/lib/documentStorage';
import { ParsedText } from '@/lib/textParser';

function calculateWordIndex(parsedText: ParsedText, paragraph: number, word: number): number {
  let index = 0;
  for (let p = 0; p < paragraph && p < parsedText.paragraphs.length; p++) {
    index += parsedText.paragraphs[p].length;
  }
  return index + word;
}

function getPreview(parsedText: ParsedText): string {
  return parsedText.paragraphs?.[0]?.slice(0, 20).join(' ') || '';
}

/**
 * One-time import of local (device) documents into the backend so they can be seen on all devices.
 * We gate this with a localStorage flag per-user to avoid re-importing.
 */
export async function migrateLocalDocumentsToAccount(userId: string): Promise<{ imported: number }> {
  const flagKey = `kintxt-migrated-${userId}`;
  if (localStorage.getItem(flagKey) === 'true') {
    return { imported: 0 };
  }

  const localDocs = getLocalDocuments();
  if (!localDocs.length) {
    localStorage.setItem(flagKey, 'true');
    return { imported: 0 };
  }

  const rows = localDocs.map((doc: LocalSavedDocument) => {
    const parsedText = doc.parsedText;
    const wordCount = parsedText.paragraphs?.flat()?.length || 0;
    const currentWordIndex = calculateWordIndex(parsedText, doc.progress.paragraph, doc.progress.word);
    const progress = wordCount ? Math.round((currentWordIndex / wordCount) * 100) : 0;

    return {
      // Preserve ID so picking up where you left off still matches this doc
      id: doc.id,
      user_id: userId,
      title: doc.title,
      content: JSON.stringify(parsedText),
      preview: getPreview(parsedText),
      word_count: wordCount,
      progress,
      current_word_index: currentWordIndex,
      is_completed: doc.completed ?? false,
      completed_at: doc.completedAt ? new Date(doc.completedAt).toISOString() : null,
      emphasis_words: [],
      whispered_words: [],
      total_reading_time: doc.totalReadingTime ?? 0,
      // let server defaults handle created_at/updated_at
    };
  });

  const { error } = await supabase
    .from('documents')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Migration error:', error);
    // Don't set flag; allow retry
    return { imported: 0 };
  }

  localStorage.setItem(flagKey, 'true');
  return { imported: rows.length };
}
