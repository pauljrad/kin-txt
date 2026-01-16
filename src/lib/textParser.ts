import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedText {
  paragraphs: string[][];
}

export async function parseFile(file: File): Promise<ParsedText> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
      return parseTxt(file);
    case 'docx':
    case 'doc':
      return parseDocx(file);
    case 'pdf':
      return parsePdf(file);
    case 'epub':
      return parseEpub(file);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

async function parseTxt(file: File): Promise<ParsedText> {
  const text = await file.text();
  return parseTextContent(text);
}

async function parseDocx(file: File): Promise<ParsedText> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return parseTextContent(result.value);
}

async function parsePdf(file: File): Promise<ParsedText> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return parseTextContent(fullText);
}

async function parseEpub(file: File): Promise<ParsedText> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);

  await book.ready;

  const spine = book.spine as any;
  let fullText = '';

  for (const item of spine.items) {
    if (item.href) {
      try {
        const doc = await book.load(item.href);
        if (doc && typeof doc === 'object' && 'documentElement' in doc) {
          const textContent = (doc as Document).body?.textContent || '';
          fullText += textContent + '\n\n';
        }
      } catch (e) {
        // Skip items that can't be loaded
      }
    }
  }

  return parseTextContent(fullText);
}

export function parseTextContent(text: string): ParsedText {
  // Split by double newlines or multiple newlines to get paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(paragraph => {
      // Split paragraph into words, preserving punctuation attached to words
      return paragraph
        .split(/\s+/)
        .filter(word => word.length > 0);
    })
    .filter(words => words.length > 0);

  return { paragraphs };
}

export type WordDelayMode = 'normal' | 'rhythm';

export function getWordDelay(word: string, baseSpeed: number, mode: WordDelayMode = 'normal'): number {
  // Guard against invalid speeds causing Infinity/NaN delays
  const safeSpeed = Number.isFinite(baseSpeed) && baseSpeed > 0 ? baseSpeed : 1;

  // Base delay in milliseconds (250ms for faster 1.2x pace per user request)
  const baseDelay = 250 / safeSpeed;

  // Ensure baseDelay is valid
  if (!Number.isFinite(baseDelay) || baseDelay <= 0) {
    return 300;
  }

  // Check for punctuation at the end of the word
  const lastChar = word.slice(-1);

  const clamp = (ms: number) => {
    const result = Math.max(60, Math.min(2500, ms));
    return Number.isFinite(result) ? result : 300;
  };

  // Punctuation weighting:
  // In rhythm mode we already slow down around punctuation via per-word speed heuristics,
  // so we keep these multipliers lighter to avoid a "double penalty" that can feel like stalling.
  const sentenceEndMult = mode === 'rhythm' ? 1.7 : 3;
  const clauseMult = mode === 'rhythm' ? 1.3 : 1.8;
  const dashMult = mode === 'rhythm' ? 1.2 : 1.5;

  // Longer pause for sentence-ending punctuation
  if (['.', '!', '?'].includes(lastChar)) {
    return clamp(baseDelay * sentenceEndMult);
  }

  // Medium pause for commas, semicolons, colons
  if ([',', ';', ':'].includes(lastChar)) {
    return clamp(baseDelay * clauseMult);
  }

  // Slight pause for dashes and other punctuation
  if (['—', '–', '-', '...', '…'].some((p) => word.includes(p))) {
    return clamp(baseDelay * dashMult);
  }

  return clamp(baseDelay);
}

export interface ProcessedTextResult {
  cleanedText: ParsedText;
  detectedWhispered: string[];
  detectedEmphasis: string[];
}

export function processTextStyles(parsed: ParsedText): ProcessedTextResult {
  const detectedWhispered: string[] = [];
  const detectedEmphasis: string[] = [];

  const cleanedParagraphs = parsed.paragraphs.map(paragraph => {
    // Track italics state across words in the same paragraph
    let inItalics = false;
    const AUTO_WHISPER_WORDS = new Set(['whisper', 'whispers', 'mouse', 'mice', 'tiny', 'quiet', 'quietly', 'silence', 'silent', 'soft', 'softly']);

    return paragraph.map(word => {
      let cleanWord = word;
      let lowerWord = cleanWord.toLowerCase();
      // Look up key without punctuation for auto-detection
      const lookupKey = lowerWord.replace(/[.,!?;:'"()[\]]/g, '');

      // 1. Handle KiN-TXT branding (case insensitive, robust to punctuation)
      if (lowerWord.includes('kin-txt')) {
        cleanWord = cleanWord.replace(/kin-txt/gi, 'KiN-TXT');
        detectedEmphasis.push('kin-txt');
        // Update lowerWord in case we fall through (unlikely to matter for KiN-TXT)
        lowerWord = cleanWord.toLowerCase();
      }

      // 2. Handle Italics/Whisper
      // Check for simple single-word wrapper first: *word*
      const singleWordMatch = cleanWord.match(/^([^\w\s]*)([*_])(.+?)(\2)([^\w\s]*)$/);

      if (singleWordMatch) {
        const prefix = singleWordMatch[1];
        const content = singleWordMatch[3];
        const suffix = singleWordMatch[5];
        cleanWord = prefix + content + suffix;
        const contentClean = content.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '');
        detectedWhispered.push(contentClean);
      }
      else if (AUTO_WHISPER_WORDS.has(lookupKey)) {
        // AUTOMATIC WHISPER DETECTION
        detectedWhispered.push(lookupKey);
      }
      else {
        // Multi-word handling
        // Check start: *word (and not inside italics already)
        if (!inItalics && /^([^\w\s]*)([*_])/.test(cleanWord)) {
          // It starts with * or _
          inItalics = true;
          // Strip the leading marker
          cleanWord = cleanWord.replace(/^([^\w\s]*)([*_])/, '$1');
        }

        // Processing if in italics (newly started or continuing)
        if (inItalics) {
          // Check for end: word* (trailing marker)
          if (/([*_])([^\w\s]*)$/.test(cleanWord)) {
            inItalics = false;
            // Strip trailing marker
            cleanWord = cleanWord.replace(/([*_])([^\w\s]*)$/, '$2');
          }

          // Register this word as whispered
          const contentClean = cleanWord.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '');
          detectedWhispered.push(contentClean);
        }
      }

      // 3. Handle ALL CAPS (Emphasis) - only if not KiN-TXT and not Whisper
      if (!lowerWord.includes('kin-txt') && !detectedWhispered.includes(lookupKey) && !AUTO_WHISPER_WORDS.has(lookupKey)) {
        const wordNoPunct = cleanWord.replace(/[.,!?;:'"()[\]]/g, '');
        if (
          wordNoPunct.length >= 3 &&
          wordNoPunct === wordNoPunct.toUpperCase() &&
          /[A-Z]/.test(wordNoPunct)
        ) {
          detectedEmphasis.push(cleanWord.toLowerCase().replace(/[.,!?;:'"()[\]]/g, ''));
        }
      }

      return cleanWord;
    });
  });

  return {
    cleanedText: { paragraphs: cleanedParagraphs },
    detectedWhispered,
    detectedEmphasis
  };
}
