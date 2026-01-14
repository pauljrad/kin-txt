import { ParsedText } from './textParser';

export interface Chapter {
  title: string;
  startParagraph: number;
  startWordIndex: number;
}

// Common chapter/section heading patterns - expanded for better book detection
const CHAPTER_PATTERNS = [
  // Standard chapter formats
  /^chapter\s+\d+/i,
  /^chapter\s+[ivxlcdm]+/i,
  /^chapter\s+\w+$/i,  // "Chapter One", "Chapter Twenty-Three"
  /^ch\.?\s*\d+/i,     // "Ch. 1" or "Ch1"
  // Parts and sections
  /^part\s+\d+/i,
  /^part\s+[ivxlcdm]+/i,
  /^part\s+\w+$/i,     // "Part One"
  /^section\s+\d+/i,
  /^book\s+\d+/i,
  /^book\s+[ivxlcdm]+/i,
  /^volume\s+\d+/i,
  /^act\s+\d+/i,
  /^scene\s+\d+/i,
  // Common structural elements
  /^prologue$/i,
  /^epilogue$/i,
  /^introduction$/i,
  /^preface$/i,
  /^foreword$/i,
  /^afterword$/i,
  /^conclusion$/i,
  /^appendix\s*[a-z]?$/i,
  /^acknowledgements?$/i,
  /^dedication$/i,
  /^contents$/i,
  // Numbered formats
  /^\d+\.\s+\w+/,       // "1. Title" format
  /^[ivxlcdm]+\.\s+\w+/i, // "I. Title" format
  /^\d+$/,              // Just a number "1", "2", etc.
  /^[ivxlcdm]+$/i,      // Just roman numerals "I", "II", etc.
  // Word-based chapter numbers (one through twenty common in literature)
  /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)$/i,
];

// Check if a paragraph looks like a heading (short, no ending punctuation)
function looksLikeHeading(words: string[]): boolean {
  if (words.length === 0 || words.length > 20) return false;
  
  const text = words.join(' ');
  const lastChar = text.slice(-1);
  
  // Headings typically don't end with certain punctuation
  if ([',', ';', ':'].includes(lastChar)) {
    return false;
  }
  
  // Period/exclamation/question are okay for short headings
  if (['.', '!', '?'].includes(lastChar) && words.length > 5) {
    return false;
  }
  
  return true;
}

// Check if text is primarily uppercase (common for chapter headings)
function isUppercaseHeading(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 2) return false;
  const uppercase = letters.replace(/[^A-Z]/g, '');
  return uppercase.length / letters.length > 0.7;
}

// Check if text matches chapter patterns
function matchesChapterPattern(text: string): boolean {
  return CHAPTER_PATTERNS.some(pattern => pattern.test(text.trim()));
}

export function detectChapters(parsedText: ParsedText): Chapter[] {
  const chapters: Chapter[] = [];
  let currentWordIndex = 0;
  
  for (let paraIndex = 0; paraIndex < parsedText.paragraphs.length; paraIndex++) {
    const words = parsedText.paragraphs[paraIndex];
    const paragraphText = words.join(' ');
    
    // Multiple conditions for chapter detection
    const isHeadingLength = looksLikeHeading(words);
    const matchesPattern = matchesChapterPattern(paragraphText);
    const isUppercase = isUppercaseHeading(paragraphText);

    // Chapter headings should be explicit (pattern) or strongly formatted (uppercase).
    // Avoid overly-aggressive heuristics (e.g. short capitalized paragraphs) that cause
    // frequent "chapter" pauses and make playback feel like it stalls.
    const isChapter = isHeadingLength && (matchesPattern || isUppercase);
    
    if (isChapter) {
      // Avoid adding duplicate or very close chapters
      const lastChapter = chapters[chapters.length - 1];
      if (!lastChapter || paraIndex - lastChapter.startParagraph >= 2) {
        chapters.push({
          title: paragraphText.length > 50 ? paragraphText.slice(0, 47) + '...' : paragraphText,
          startParagraph: paraIndex,
          startWordIndex: currentWordIndex,
        });
      }
    }
    
    currentWordIndex += words.length;
  }
  
  // If no chapters detected, create sections based on paragraph count
  if (chapters.length <= 1 && parsedText.paragraphs.length > 10) {
    chapters.length = 0; // Clear
    const sectionSize = Math.ceil(parsedText.paragraphs.length / 5);
    let wordIndex = 0;
    
    for (let i = 0; i < parsedText.paragraphs.length; i++) {
      if (i % sectionSize === 0) {
        const sectionNum = Math.floor(i / sectionSize) + 1;
        const previewWords = parsedText.paragraphs[i].slice(0, 5).join(' ');
        chapters.push({
          title: `Section ${sectionNum}: ${previewWords}...`,
          startParagraph: i,
          startWordIndex: wordIndex,
        });
      }
      wordIndex += parsedText.paragraphs[i].length;
    }
  }
  
  return chapters;
}

// Find which sentence boundaries exist and return positions for rewinding
export function findSentenceBoundaries(parsedText: ParsedText): number[] {
  const boundaries: number[] = [0]; // Start is always a boundary
  let wordIndex = 0;
  
  for (const paragraph of parsedText.paragraphs) {
    for (const word of paragraph) {
      if (/[.!?]$/.test(word)) {
        boundaries.push(wordIndex + 1); // Position after sentence end
      }
      wordIndex++;
    }
    // End of paragraph is also a boundary
    if (!boundaries.includes(wordIndex)) {
      boundaries.push(wordIndex);
    }
  }
  
  return boundaries;
}

// Get the word index to rewind to (2 sentences back)
export function getRewindPosition(
  currentWordIndex: number, 
  sentenceBoundaries: number[], 
  sentencesToRewind: number = 2
): number {
  // Find current position in boundaries
  let currentBoundaryIndex = 0;
  for (let i = 0; i < sentenceBoundaries.length; i++) {
    if (sentenceBoundaries[i] <= currentWordIndex) {
      currentBoundaryIndex = i;
    } else {
      break;
    }
  }
  
  // Go back by sentencesToRewind
  const targetIndex = Math.max(0, currentBoundaryIndex - sentencesToRewind);
  return sentenceBoundaries[targetIndex];
}
