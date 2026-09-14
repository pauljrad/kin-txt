import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ParsedText, parseTextContent } from '@/lib/textParser';
import { toast } from 'sonner';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
  author?: string; // Added author
  content?: string; // Added full html content
}

interface Category {
  id: string;
  name: string;
}

interface NewsLibraryProps {
  onSelectArticle: (parsed: ParsedText, title: string, meta: { link: string; source: string; author?: string }) => void;
  isPro?: boolean;
  onUpgrade?: () => void;
}

const FREE_DAILY_NEWS_LIMIT = 1;

function getNewsReadsToday(): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem('kinxt-news-reads');
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (data.date !== today) return [];
    return data.ids || [];
  } catch { return []; }
}

const NEWS_CACHE_PREFIX = 'kinxt-news-cache-';

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
    localStorage.setItem(
      NEWS_CACHE_PREFIX + category,
      JSON.stringify({ items, at: Date.now() }),
    );
  } catch {
    // Storage full or unavailable — caching is best-effort.
  }
}

function recordNewsRead(articleId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = getNewsReadsToday();
  if (!existing.includes(articleId)) existing.push(articleId);
  localStorage.setItem('kinxt-news-reads', JSON.stringify({ date: today, ids: existing }));
}

export function NewsLibrary({ onSelectArticle, isPro = false, onUpgrade }: NewsLibraryProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('top');
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // NOTE: filtering by source removed as we only have source="conversation" now mostly.
  // Keeping activeSource state structure if needed later but removing UI filters for now.

  const fetchNews = useCallback(async (category: string = 'top') => {
    setIsLoading(true);
    setError(null);

    // The Global Voices feed is often very slow, so the server sometimes comes
    // back with an empty list. Try once more, then fall back to the last set of
    // articles we saw, so the page never ends up blank.
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

      if (!data.news?.length) {
        data = await load();
      }

      if (data.categories && categories.length === 0) {
        setCategories(data.categories);
      }

      if (data.news?.length) {
        setNews(data.news);
        writeCachedNews(category, data.news);
      } else {
        const cached = readCachedNews(category);
        if (cached.length) {
          console.warn('news: feed returned nothing, showing cached articles');
          setNews(cached);
        } else {
          setNews([]);
        }
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      const cached = readCachedNews(category);
      if (cached.length) {
        setNews(cached);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch news');
      }
    } finally {
      setIsLoading(false);
    }
  }, [categories.length]);

  useEffect(() => {
    fetchNews(activeCategory);
  }, [activeCategory]);

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
      // THE CONVERSATION provided content is often a summary/atom entry.
      // User requested "whole article", so we FORCE a scrape of the link even if content exists.

      // Global Voices puts the whole article in the feed's content:encoded
      // (typically 5–10k characters), so when that text is already substantial
      // there is nothing to gain from scraping the page — and scraping it is
      // actively worse, since their server's unstable HTTP/2 makes the request
      // fail and the reader wait. Only scrape when the feed copy looks partial.
      const feedText = (article.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const feedHasFullArticle = feedText.length >= 1200;

      let data: { success?: boolean; text?: string; error?: string } | null = null;
      if (!feedHasFullArticle) {
        try {
          const res = await supabase.functions.invoke('scrape-url', {
            body: { url: article.link },
          });
          if (res.error) {
            console.warn('scrape-url failed, using feed content:', res.error);
          } else {
            data = res.data;
          }
        } catch (scrapeErr) {
          console.warn('scrape-url threw, using feed content:', scrapeErr);
        }
      }

      if (!data?.success || !data?.text) {
        // Fallback to existing content if scraping fails but content exists
        if (article.content) {
          const cleanText = article.content
            .replace(/<p>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, ' ');
          const parsed = parseTextContent(cleanText);
          recordNewsRead(article.id);
          onSelectArticle(parsed, article.title, {
            link: article.link,
            source: article.source,
            author: article.author,
            // @ts-ignore
            rawHtml: article.content
          });
          return;
        }
        throw new Error(data?.error || 'Failed to fetch article content');
      }

      // Parse the scraped text (Full Article)
      const parsed = parseTextContent(data.text);
      recordNewsRead(article.id);
      onSelectArticle(parsed, article.title, {
        link: article.link,
        source: article.source,
        author: article.author,
        // If we have rawHtml from the original article (for pixel tracking), pass it along
        // @ts-ignore
        rawHtml: article.content
      });
    } catch (err) {
      console.error('Error loading article:', err);
      toast.error(err instanceof Error ? err.message : 'Could not load article');
    } finally {
      setLoadingId(null);
    }
  }, [onSelectArticle, isPro, supabase.auth, supabase.functions]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, []);

  const filteredNews = news;

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading news...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">{error}</p>
        <motion.button
          onClick={() => fetchNews(activeCategory)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </motion.button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-3"
    >
      {/* Category tabs */}
      <div className="mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
                }`}
            >
              {cat.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Refresh button only, no source filters */}
      <div className="flex items-center justify-end mb-4">
        <motion.button
          onClick={() => fetchNews(activeCategory)}
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
          title="Refresh news"
        >
          <RefreshCw className="w-4 h-4" />
        </motion.button>
      </div>

      {/* News grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredNews.map((article, index) => (
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
                {/* Source & Time Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    {article.source}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatTime(article.pubDate)}
                  </span>
                </div>

                {/* Headline - KiN-TXT Font */}
                <h3 className="font-display font-medium text-lg leading-snug text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-4">
                  {article.title}
                </h3>
              </div>

              {/* Author Attribution */}
              <div className="mt-2 pt-3 border-t border-border/40">
                <p className="text-[11px] text-muted-foreground font-medium truncate">
                  By <span className="text-foreground/90">{article.author}</span>
                </p>
              </div>

              {/* Loading overlay */}
              {loadingId === article.id && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading Article...</span>
                  </div>
                </div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12">
          <Newspaper className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No news articles available</p>
        </div>
      )}
      {/* Daily limit dialog for free users */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border">
          <DialogTitle className="text-lg font-display tracking-tight text-center pt-2">
            Daily News Limit Reached
          </DialogTitle>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center leading-relaxed px-4">
              Free users can read {FREE_DAILY_NEWS_LIMIT} news article per day. Sign up to Pro for unlimited access to news and many more KiN-Pro features.
            </p>
            <div className="flex flex-col gap-3 px-4 pb-2">
              {onUpgrade && (
                <Button
                  onClick={() => { setShowLimitDialog(false); onUpgrade(); }}
                  className="w-full h-11 font-bold tracking-tight rounded-xl"
                >
                  Sign Up to Pro
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setShowLimitDialog(false)}
                className="w-full h-11 text-muted-foreground hover:text-foreground font-medium rounded-xl"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
