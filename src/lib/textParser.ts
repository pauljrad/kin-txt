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

  // Base delay in milliseconds (300ms for comfortable reading)
  const baseDelay = 300 / safeSpeed;

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
    return paragraph.map(word => {
      let cleanWord = word;
      let lowerWord = cleanWord.toLowerCase();

      // 1. Handle KiN-TXT branding (case insensitive, robust to punctuation)
      if (lowerWord.includes('kin-txt')) {
        // Replace 'kin-txt' with 'KiN-TXT' preserving surrounding chars
        // We use a regex with 'ig' to catch all occurrences in the token
        cleanWord = cleanWord.replace(/kin-txt/gi, 'KiN-TXT');

        // Add to emphasis (strip common punctuation for the set key)
        // We push the "clean" version (KiN-TXT) lowercased -> 'kin-txt'
        // KineticPlayer strips [.,!?;:] so 'kin-txt' matches 'kin-txt'
        detectedEmphasis.push('kin-txt');

        // Recalculate lowerWord for subsequent checks (though we usually skip them)
        lowerWord = cleanWord.toLowerCase();
      }

      // 2. Handle Italics/Whisper (*word* or _word_)
      // Refunded logic: handle punctuation wrapping like (*word*), *word*, etc.
      // Regex explanation:
      // ^([^\w]*)   -> Group 1: Leading non-word chars (punctuation)
      // ([*_])      -> Group 2: The marker (* or _)
      // (.+?)       -> Group 3: The actual content (non-greedy)
      // \2          -> Match the same marker as Group 2
      // ([^\w]*)$   -> Group 4: Trailing non-word chars

      const italicMatch = cleanWord.match(/^([^\w\s]*)([*_])(.+?)(\2)([^\w\s]*)$/);

      if (italicMatch) {
        const prefix = italicMatch[1];  // e.g. "("
        const content = italicMatch[3]; // e.g. "whisper"
        const suffix = italicMatch[5];  // e.g. "),"

        // Reconstruct word without markers
        cleanWord = prefix + content + suffix;

        // Add core content to whispered set
        // textParser/KineticPlayer logic relies on stripping punctuation from the lookup key
        const contentClean = content.toLowerCase().replace(/[.,!?;:]/g, '');
        detectedWhispered.push(contentClean);
      }
      else if (!lowerWord.includes('kin-txt')) {
        // 3. Handle ALL CAPS (Emphasis) - only if not KiN-TXT
        // Must be >= 3 chars, all caps, and have at least one letter
        const wordNoPunct = cleanWord.replace(/[.,!?;:'"()[\]]/g, '');
        if (
          wordNoPunct.length >= 3 &&
          wordNoPunct === wordNoPunct.toUpperCase() &&
          /[A-Z]/.test(wordNoPunct)
        ) {
          detectedEmphasis.push(cleanWord.toLowerCase().replace(/[.,!?;:]/g, ''));
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
