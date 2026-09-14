import { ParsedText, parseTextContent } from '@/lib/textParser';

export interface CreatorParsedText {
  parsedText: ParsedText;
  emphasisWords: string[];
  whisperedWords: string[];
}

const punctuation = /[.,!?;:'"()[\]{}]/g;

function keyFor(word: string): string {
  return word.toLowerCase().replace(punctuation, '');
}

export function parseCreatorMarkup(source: string): CreatorParsedText {
  const parsed = parseTextContent(source);
  const emphasis = new Set<string>();
  const whispered = new Set<string>();

  const paragraphs = parsed.paragraphs.map((paragraph) => {
    let inItalics = false;

    return paragraph.map((rawWord) => {
      let word = rawWord;
      let startsItalic = false;
      let endsItalic = false;

      if (!inItalics && /^([^\w\s]*)([*_])/.test(word)) {
        startsItalic = true;
        inItalics = true;
        word = word.replace(/^([^\w\s]*)([*_])/, '$1');
      }

      if (inItalics && /([*_])([^\w\s]*)$/.test(word)) {
        endsItalic = true;
        word = word.replace(/([*_])([^\w\s]*)$/, '$2');
      }

      const cleanKey = keyFor(word);
      if (inItalics || startsItalic) {
        if (cleanKey) whispered.add(cleanKey);
      }

      const withoutPunctuation = word.replace(punctuation, '');
      const isAllCaps =
        withoutPunctuation.length >= 3 &&
        /[A-Z]/.test(withoutPunctuation) &&
        withoutPunctuation === withoutPunctuation.toUpperCase();

      if (isAllCaps && cleanKey && !whispered.has(cleanKey)) {
        emphasis.add(cleanKey);
      }

      if (endsItalic) inItalics = false;
      return word;
    });
  });

  return {
    parsedText: { paragraphs },
    emphasisWords: Array.from(emphasis),
    whisperedWords: Array.from(whispered),
  };
}

function walkNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(walkNode).join('');

  if (tag === 'br') return '\n';
  if (tag === 'em' || tag === 'i') return `*${inner}*`;
  if (['p', 'div', 'li', 'h1', 'h2', 'h3', 'blockquote'].includes(tag)) {
    return `${inner}\n\n`;
  }
  return inner;
}

export function richHtmlToCreatorMarkup(html: string): string {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return walkNode(doc.body)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainTextToEditorHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
