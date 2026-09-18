import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, Loader2, RefreshCw, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreatorJournalFeed } from '@/components/CreatorJournalFeed';
import { supabase } from '@/integrations/supabase/client';
import { ParsedText, parseTextContent } from '@/lib/textParser';
import { toast } from 'sonner';
import type { CreatorExperience } from '@/lib/creatorExperience';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
  author?: string;
  content?: string;
}

interface Category {
  id: string;
  name: string;
}

interface ArticleMeta {
  link: string;
  source: string;
  author?: string;
  rawHtml?: string;
  publicationId?: string;
  emphasisWords?: string[];
  whisperedWords?: string[];
  creatorExperience?: CreatorExperience;
}

interface NewsLibraryProps {
  onSelectArticle: (parsed: ParsedText, title: string, meta: ArticleMeta) => void;
  isPro?: boolean;
  onUpgrade?: () => void;
}

const FREE_DAILY_NEWS_LIMIT = 1;
const NEWS_CACHE_PREFIX = 'kinxt-news-cache-';

function getNewsReadsToday(): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem('kinxt-news-reads');
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (data.date !== today) return [];
    return data.ids || [];
  } catch {
    return [];
  }
}

function recordNewsRead(articleId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = getNewsReadsToday();
  if (!existing.includes(articleId)) existing.push(articleId);
  localStorage.setItem('kinxt-news-reads', JSON.stringify({ date: today, ids: existing }));
}

function readCachedNews(category: string): NewsItem[] {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_PREFIX + category);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeCachedNews(category: string, items: NewsItem[]) {
  try {
    localStorage.setItem(NEWS_CACHE_PREFIX + category, JSON.stringify({ items, at: Date.now() }));
  } catch {
    // Best-effort cache.
  }
}

export function NewsLibrary({ onSelectArticle, isPro = false, onUpgrade }: NewsLibraryProps) {
  const [section, setSection] = useState<'global' | 'creators'>('global');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('top');
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const fetchNews = useCallback(async (category: string = 'top') => {
    setIsLoading(true);
    setError(null);

    const load = async () => {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-news', {
        body: { category },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch news');
      return data;
    };

    try {
      let data = await load();
      if (!data.news?.length) data = await load();

      if (data.categories && categories.length === 0) setCategories(data.categories);

      if (data.news?.length) {
        setNews(data.news);
        writeCachedNews(category, data.news);
      } else {
        setNews(readCachedNews(category));
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      const cached = readCachedNews(category);
      if (cached.length) setNews(cached);
      else setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setIsLoading(false);
    }
  }, [categories.length]);

  useEffect(() => {
    if (section === 'global') fetchNews(activeCategory);
  }, [activeCategory, section, fetchNews]);

  const handleSelectArticle = useCallback(async (article: NewsItem) => {
    if (!isPro) {
      const reads = getNewsReadsToday();
      if (reads.length >= FREE_DAILY_NEWS_LIMIT && !reads.includes(article.id)) {
        setShowLimitDialog(true);
        return;
      }
    }

    setLoadingId(article.id);
    try {
      const feedText = (article.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const feedHasFullArticle = feedText.length >= 1200;

      let data: { success?: boolean; text?: string; error?: string } | null = null;
      if (!feedHasFullArticle) {
        try {
          const res = await supabase.functions.invoke('scrape-url', { body: { url: article.link } });
          if (!res.error) data = res.data;
          else console.warn('scrape-url failed, using feed content:', res.error);
        } catch (scrapeErr) {
          console.warn('scrape-url threw, using feed content:', scrapeErr);
        }
      }

      if (!data?.success || !data?.text) {
        if (!article.content) throw new Error(data?.error || 'Failed to fetch article content');
        const cleanText = article.content
          .replace(/<p>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, ' ');
        recordNewsRead(article.id);
        onSelectArticle(parseTextContent(cleanText), article.title, {
          link: article.link,
          source: article.source,
          author: article.author,
          rawHtml: article.content,
        });
        return;
      }

      recordNewsRead(article.id);
      onSelectArticle(parseTextContent(data.text), article.title, {
        link: article.link,
        source: article.source,
        author: article.author,
        rawHtml: article.content,
      });
    } catch (err) {
      console.error('Error loading article:', err);
      toast.error(err instanceof Error ? err.message : 'Could not load article');
    } finally {
      setLoadingId(null);
    }
  }, [onSelectArticle, isPro]);

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
      const diffHours = Math.floor(diffMins / 60);
      if (diffMins < 60) return `${Math.max(0, diffMins)}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const sectionTabs = (
    <div className="mb-6">
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setSection('global')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${section === 'global' ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
        >
          <Newspaper className="w-4 h-4" /> Global Voices
        </button>
        <button
          onClick={() => setSection('creators')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${section === 'creators' ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
        >
          <Users className="w-4 h-4" /> KiN-Creators
        </button>
      </div>
    </div>
  );

  if (section === 'creators') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto mt-3">
        <div className="text-center mb-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Journal</p>
        </div>
        {sectionTabs}
        <CreatorJournalFeed
          onSelectArticle={(parsed, title, meta) => onSelectArticle(parsed, title, {
            link: '',
            source: 'KiN-Creators',
            author: meta.creatorName,
            publicationId: meta.publicationId,
            emphasisWords: meta.emphasisWords,
            whisperedWords: meta.whisperedWords,
            creatorExperience: meta.creatorExperience,
          })}
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-4xl mx-auto mt-3">
      <div className="text-center mb-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Journal</p>
      </div>
      {sectionTabs}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading Global Voices…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={() => fetchNews(activeCategory)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end mb-4">
            <motion.button onClick={() => fetchNews(activeCategory)} whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80" title="Refresh Global Voices">
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {news.map((article, index) => (
                <motion.button
                  key={article.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleSelectArticle(article)}
                  disabled={loadingId !== null}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative glass-panel p-5 text-left transition-all duration-300 hover:ring-2 hover:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col h-full justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{article.source}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(article.pubDate)}</span>
                    </div>
                    <h3 className="font-display font-medium text-lg leading-snug text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-4">{article.title}</h3>
                  </div>
                  <div className="mt-2 pt-3 border-t border-border/40">
                    <p className="text-[11px] text-muted-foreground font-medium truncate">By <span className="text-foreground/90">{article.author}</span></p>
                  </div>
                  {loadingId === article.id && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          {!news.length && (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No Global Voices articles available</p>
            </div>
          )}
        </>
      )}

      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border">
          <DialogTitle className="text-lg font-display tracking-tight text-center pt-2">Daily Journal Limit Reached</DialogTitle>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center leading-relaxed px-4">
              Free users can read {FREE_DAILY_NEWS_LIMIT} Global Voices article per day. Sign up to Pro for unlimited access.
            </p>
            <div className="flex flex-col gap-3 px-4 pb-2">
              {onUpgrade && <Button onClick={() => { setShowLimitDialog(false); onUpgrade(); }} className="w-full h-11 font-bold tracking-tight rounded-xl">Sign Up to Pro</Button>}
              <Button variant="ghost" onClick={() => setShowLimitDialog(false)} className="w-full h-11 text-muted-foreground hover:text-foreground font-medium rounded-xl">Maybe Later</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
