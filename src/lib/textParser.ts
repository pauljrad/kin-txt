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

export function getWordDelay(word: string, baseSpeed: number): number {
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

  // Longer pause for sentence-ending punctuation
  if (['.', '!', '?'].includes(lastChar)) {
    return clamp(baseDelay * 3);
  }

  // Medium pause for commas, semicolons, colons
  if ([',', ';', ':'].includes(lastChar)) {
    return clamp(baseDelay * 1.8);
  }

  // Slight pause for dashes and other punctuation
  if (['—', '–', '-', '...', '…'].some((p) => word.includes(p))) {
    return clamp(baseDelay * 1.5);
  }

  return clamp(baseDelay);
}
