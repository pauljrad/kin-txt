import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KineticPlayer } from '@/components/KineticPlayer';
import { parseTextContent, processTextStyles, type ProcessedTextResult } from '@/lib/textParser';

function ArticlePlayer({ path, view }: { path: string; view: 'word' | 'page' }) {
  const [article, setArticle] = useState<ProcessedTextResult | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function loadArticle() {
      const response = await fetch(path, { signal: controller.signal });
      if (!response.ok) throw new Error('Guide unavailable');
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const paragraphs = Array.from(html.querySelectorAll('article [data-reader]'), node => node.textContent?.trim());
      if (!paragraphs.length) throw new Error('Missing article text');
      if (!controller.signal.aborted) {
        document.title = html.title;
        setArticle(processTextStyles(parseTextContent(paragraphs.join('\n\n'))));
      }
    }
    loadArticle().catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [path]);

  if (!article) return <main className="mx-auto max-w-lg px-6 py-16">
    <p role="status">{failed ? 'This guide could not be opened in the reader.' : 'Opening this guide…'}</p>
    <a className="underline" href={failed ? '/blog' : path}>{failed ? 'Browse the guides' : 'Read the article as text'}</a>
  </main>;

  function returnToGuide() {
    if (document.referrer && new URL(document.referrer).origin === location.origin &&
        new URL(document.referrer).pathname.replace(/\/$/, '') === path && history.length > 1) history.back();
    else location.replace(path);
  }
  return <div className="fixed inset-0 z-50 bg-background">
    <KineticPlayer parsedText={article.cleanedText} initialView={view} onBack={returnToGuide}
      emphasisWords={article.detectedEmphasis} whisperedWords={article.detectedWhispered} />
  </div>;
}

export default function GuideReader() {
  const [params] = useSearchParams();
  const slug = params.get('article') ?? '';
  const mode = params.get('mode');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (mode !== 'word' && mode !== 'page')) {
    return <main className="mx-auto max-w-lg px-6 py-16"><h1>Choose a guide to read</h1><a className="underline" href="/blog">Browse the guides</a></main>;
  }
  return <ArticlePlayer key={slug + mode} path={'/blog/' + slug} view={mode} />;
}
