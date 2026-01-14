import { ParsedText } from './textParser';

export type DocumentCategory = 'book' | 'article' | 'document';

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
  totalReadingTime: number; // Total reading time in seconds
  completed: boolean; // Whether the document has been marked as read
  startedAt: number; // When the user first started reading
  completedAt?: number; // When the user marked it complete
  createdAt: number;
  updatedAt: number;
}

// Detect category based on source and content characteristics
export function detectCategory(source: 'file' | 'paste' | 'url', title: string, wordCount: number): DocumentCategory {
  // URLs are typically news articles
  if (source === 'url') {
    return 'article';
  }
  
  // Check title for book indicators (epub, pdf books)
  const bookIndicators = /\.(epub|mobi|azw)$/i;
  if (bookIndicators.test(title)) {
    return 'book';
  }
  
  // Long content from files is likely a book
  if (source === 'file' && wordCount > 8000) {
    return 'book';
  }
  
  // Short content from paste is likely an article
  if (source === 'paste') {
    return wordCount > 5000 ? 'document' : 'article';
  }
  
  // PDF or DOCX files
  if (/\.(pdf|docx?)$/i.test(title)) {
    return 'document';
  }
  
  // Default based on word count
  if (wordCount > 10000) return 'book';
  if (wordCount < 2000) return 'article';
  return 'document';
}

const STORAGE_KEY = 'kintxt-documents';

export function getDocuments(): SavedDocument[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const docs = JSON.parse(stored);
    // Migrate old documents without new fields
    return docs.map((doc: SavedDocument) => {
      const wordCount = doc.parsedText?.paragraphs?.flat()?.length || 0;
      return {
        ...doc,
        totalReadingTime: doc.totalReadingTime ?? 0,
        completed: doc.completed ?? false,
        startedAt: doc.startedAt ?? doc.createdAt,
        completedAt: doc.completedAt ?? undefined,
        category: doc.category ?? detectCategory(doc.source, doc.title, wordCount),
      };
    });
  } catch {
    return [];
  }
}

export function saveDocument(doc: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt' | 'totalReadingTime' | 'completed' | 'startedAt' | 'completedAt' | 'category'>): SavedDocument {
  const documents = getDocuments();
  const now = Date.now();
  const wordCount = doc.parsedText?.paragraphs?.flat()?.length || 0;
  const newDoc: SavedDocument = {
    ...doc,
    id: crypto.randomUUID(),
    category: detectCategory(doc.source, doc.title, wordCount),
    totalReadingTime: 0,
    completed: false,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  documents.unshift(newDoc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents.slice(0, 50))); // Keep last 50
  return newDoc;
}

export function updateDocumentProgress(id: string, paragraph: number, word: number): void {
  const documents = getDocuments();
  const index = documents.findIndex(d => d.id === id);
  if (index !== -1) {
    documents[index].progress = { paragraph, word };
    documents[index].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }
}

export function updateDocumentReadingTime(id: string, newTotalSeconds: number): void {
  const documents = getDocuments();
  const index = documents.findIndex(d => d.id === id);
  if (index !== -1) {
    documents[index].totalReadingTime = newTotalSeconds;
    documents[index].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }
}

export function deleteDocument(id: string): void {
  const documents = getDocuments();
  const filtered = documents.filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function renameDocument(id: string, newTitle: string): void {
  const documents = getDocuments();
  const index = documents.findIndex(d => d.id === id);
  if (index !== -1) {
    documents[index].title = newTitle;
    documents[index].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }
}

export function markDocumentCompleted(id: string, completed: boolean = true): void {
  const documents = getDocuments();
  const index = documents.findIndex(d => d.id === id);
  if (index !== -1) {
    documents[index].completed = completed;
    documents[index].completedAt = completed ? Date.now() : undefined;
    documents[index].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }
}

export function getDocument(id: string): SavedDocument | null {
  const documents = getDocuments();
  return documents.find(d => d.id === id) || null;
}
