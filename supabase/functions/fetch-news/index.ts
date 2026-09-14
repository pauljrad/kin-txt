import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

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

interface RSSFeed {
  name: string;
  url: string;
  source: string;
  category: string;
}

// Global Voices only — CC-BY licensed, so its full text may be reformatted and
// displayed in the reader. Do not add mainstream/commercial news sources here;
// their content is not licensed for this use.
//
// The former Wikinews entries were removed on 2026-08-20: Wikimedia deleted
// Special:NewsFeed, so every one of those URLs now returns HTTP 404 ("No such
// special page") and contributed zero articles. Global Voices publishes topic
// feeds under /-/topics/<slug>/feed/ (the older /category/<slug>/feed/ form
// returns HTTP 410), each verified to return 15 items.
const RSS_FEEDS: RSSFeed[] = [
  { name: "Top Stories", url: "https://globalvoices.org/feed/", source: "Global Voices", category: "top" },
  { name: "Politics", url: "https://globalvoices.org/-/topics/politics/feed/", source: "Global Voices", category: "politics" },
  { name: "Science + Tech", url: "https://globalvoices.org/-/topics/technology/feed/", source: "Global Voices", category: "tech" },
  { name: "Business", url: "https://globalvoices.org/-/topics/economics-business/feed/", source: "Global Voices", category: "business" },
  { name: "Health", url: "https://globalvoices.org/-/topics/health/feed/", source: "Global Voices", category: "health" },
  { name: "Culture", url: "https://globalvoices.org/-/topics/arts-culture/feed/", source: "Global Voices", category: "arts" },
  { name: "Sports", url: "https://globalvoices.org/-/topics/sport/feed/", source: "Global Voices", category: "sports" },
  { name: "Environment", url: "https://globalvoices.org/-/topics/environment/feed/", source: "Global Voices", category: "environment" },
];

const CATEGORIES = [
  { id: "top", name: "Top Stories" },
  { id: "politics", name: "Politics" },
  { id: "tech", name: "Science + Tech" },
  { id: "business", name: "Business" },
  { id: "arts", name: "Culture" },
  { id: "health", name: "Health" },
  { id: "environment", name: "Environment" },
  { id: "sports", name: "Sports" },
];

const ALLOWED_CATEGORIES = CATEGORIES.map(c => c.id);

function stripTags(text: string): string {
  if (!text) return "";
  // First, unwrap CDATA if present
  let cleaned = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
  // Then remove HTML tags
  return cleaned.replace(/<[^>]*>/g, "").trim();
}

function extractContent(xml: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(pattern);
  if (!match) return "";
  let content = match[1];
  // Check for CDATA
  const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (cdataMatch) {
    // CDATA may still contain HTML entities (e.g. &nbsp; &#039;) — decode them
    content = parseEntity(cdataMatch[1]);
  } else {
    content = parseEntity(content);
  }
  return content;
}

function extractLink(xml: string): string {
  // Atom format
  const atomPattern = /<link[^>]*href=["']([^"']+)["'][^>]*\/>/i;
  let match = xml.match(atomPattern);
  if (match) return parseEntity(match[1]);

  // RSS format
  const rssPattern = /<link>([\s\S]*?)<\/link>/i;
  match = xml.match(rssPattern);
  return match ? parseEntity(stripTags(match[1])) : "";
}

function parseEntity(str: string): string {
  if (!str) return '';
  return str
    // Common named entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&hellip;/gi, '\u2026')
    .replace(/&mdash;/gi, '\u2014')
    .replace(/&ndash;/gi, '\u2013')
    .replace(/&laquo;/gi, '\u00AB')
    .replace(/&raquo;/gi, '\u00BB')
    .replace(/&ldquo;/gi, '\u201C')
    .replace(/&rdquo;/gi, '\u201D')
    .replace(/&lsquo;/gi, '\u2018')
    .replace(/&rsquo;/gi, '\u2019')
    .replace(/&trade;/gi, '\u2122')
    .replace(/&copy;/gi, '\u00A9')
    .replace(/&reg;/gi, '\u00AE')
    // Numeric decimal entities e.g. &#039; &#8211;
    .replace(/&#0*(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // Numeric hex entities e.g. &#x27;
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractAuthor(xml: string, source: string, content?: string): string {
  // If Global Voices, try to find "Written by" in the content first
  if (source === "Global Voices" && content) {
    const writtenByMatch = content.match(/Written by\s*<a[^>]*>([\s\S]*?)<\/a>/i) ||
      content.match(/Written by\s*([^<.\n]+)/i);
    if (writtenByMatch) {
      const name = stripTags(writtenByMatch[1]);
      if (name && name.length < 100) return name;
    }
  }

  // Try dc:creator first (common in RSS) - check both with and without CDATA
  const dcCreatorMatch = xml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i);
  if (dcCreatorMatch) {
    const name = stripTags(dcCreatorMatch[1]);
    // For Global Voices, dc:creator often has the translator. 
    // If we're here and it's Global Voices, we already tried content check.
    if (name && !["Wikinews", "Global Voices", "The Conversation"].includes(name)) {
      return name;
    }
  }

  // Try Atom format <author><name>
  const authorMatch = xml.match(/<author>([\s\S]*?)<\/author>/i);
  if (authorMatch) {
    const nameMatch = authorMatch[1].match(/<name>([\s\S]*?)<\/name>/i);
    if (nameMatch) {
      const name = stripTags(nameMatch[1]);
      if (name && !["Wikinews", "Global Voices", "The Conversation"].includes(name)) {
        return name;
      }
    }
    // Some feeds have <author>Author Name</author> directly
    const directName = stripTags(authorMatch[1]);
    if (directName && directName.length < 100 && !["Wikinews", "Global Voices", "The Conversation"].includes(directName)) {
      return directName;
    }
  }

  // Fallback for specific sources if no individual author found
  if (source === "Wikinews") return "Wikinews Contributors";
  if (source === "Global Voices") return "Global Voices Contributors";

  return "";
}

// Global Voices is intermittently slow — it regularly needs well over 8s to
// respond. Aborting early was returning an empty list and rendering the news
// page blank, so allow a much more generous window.
const FEED_TIMEOUT_MS = 25000;

// Cached results per category.
//
// Two layers. The in-memory map is fast but only helps within one warm isolate,
// and Supabase spreads requests across many — a category cached on isolate A is
// a miss on isolate B, which is why earlier attempts still left readers waiting
// on the feed. Storage is genuinely shared, so it is the layer that makes the
// news page reliably fast.
const lastGood = new Map<string, { items: NewsItem[]; at: number }>();
const FRESH_MS = 15 * 60 * 1000;        // serve without refetching
const STALE_OK_MS = 24 * 60 * 60 * 1000; // serve stale rather than show nothing
const CACHE_BUCKET = "news-cache";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

let bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  try {
    const { error } = await admin().storage.createBucket(CACHE_BUCKET, { public: false });
    // "already exists" is the normal case after the first ever run.
    if (error && !/exist/i.test(error.message)) console.error("bucket create:", error.message);
  } catch (err) {
    console.error("bucket create threw:", err);
  }
  bucketReady = true;
}

type Cached = { items: NewsItem[]; at: number };

async function readCache(category: string): Promise<Cached | null> {
  const mem = lastGood.get(category);
  if (mem) return mem;

  try {
    await ensureBucket();
    const { data, error } = await admin().storage.from(CACHE_BUCKET).download(`${category}.json`);
    if (error || !data) return null;
    const body = JSON.parse(await data.text());
    if (!Array.isArray(body?.items) || body.items.length === 0 || !body?.at) return null;
    const hit: Cached = { items: body.items, at: body.at };
    lastGood.set(category, hit);
    return hit;
  } catch (err) {
    console.error("cache read failed:", err);
    return null;
  }
}

async function writeCache(category: string, items: NewsItem[]): Promise<void> {
  const at = Date.now();
  lastGood.set(category, { items, at });
  try {
    await ensureBucket();
    const body = new Blob([JSON.stringify({ items, at })], { type: "application/json" });
    const { error } = await admin().storage
      .from(CACHE_BUCKET)
      .upload(`${category}.json`, body, { upsert: true, contentType: "application/json" });
    if (error) console.error("cache write failed:", error.message);
  } catch (err) {
    console.error("cache write threw:", err);
  }
}

// Refresh a category from the feed and store the result. Used both inline (on a
// cold cache) and in the background (stale-while-revalidate).
async function refreshCategory(category: string): Promise<NewsItem[]> {
  const feeds = RSS_FEEDS.filter((f) => f.category === category);
  const results = await Promise.all(feeds.map(fetchRSSFeed));
  const seen = new Set<string>();
  const items = results.flat()
    .filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    })
    .sort((a, b) => (new Date(b.pubDate).getTime() || 0) - (new Date(a.pubDate).getTime() || 0));

  if (items.length > 0) await writeCache(category, items);
  return items;
}

// One attempt at the feed, aborted after `timeoutMs`.
async function fetchFeedText(feed: RSSFeed, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KiN-Bot/1.0)",
        "Accept": "application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

// Global Voices response time swings wildly — the same feed can answer in 0.4s
// or hang past 25s. Rather than ride out a slow connection, start a second
// attempt after HEDGE_DELAY_MS and take whichever finishes first. This costs at
// most one extra request and collapses the slow tail.
const HEDGE_DELAY_MS = 4000;

async function fetchRSSFeed(feed: RSSFeed): Promise<NewsItem[]> {
  try {
    const primary = fetchFeedText(feed, FEED_TIMEOUT_MS);
    const hedged = (async () => {
      await new Promise((r) => setTimeout(r, HEDGE_DELAY_MS));
      return await fetchFeedText(feed, FEED_TIMEOUT_MS - HEDGE_DELAY_MS);
    })();

    // Promise.any resolves with the first attempt to succeed, and only rejects
    // if both fail.
    const xml = await Promise.any([primary, hedged]);
    const items: NewsItem[] = [];

    // Split by <entry> (Atom) or <item> (RSS)
    const entries = xml.includes('<entry>') ? xml.split('<entry>') : xml.split('<item>');
    entries.shift(); // Skip header

    let count = 0;
    for (const entryXml of entries) {
      if (count >= 15) break;

      const title = stripTags(extractContent(entryXml, "title"));
      const link = extractLink(entryXml);

      if (!title || !link) continue;

      const summary = stripTags(extractContent(entryXml, "description") || extractContent(entryXml, "summary"));
      const published = extractContent(entryXml, "pubDate") || extractContent(entryXml, "published");
      const fullContent = extractContent(entryXml, "content:encoded") || extractContent(entryXml, "content") || summary;
      const author = extractAuthor(entryXml, feed.source, fullContent) || feed.source;

      items.push({
        id: `${feed.source.toLowerCase().replace(/ /g, '-')}-${count}-${Date.now()}`,
        title,
        description: summary,
        link,
        pubDate: published || new Date().toISOString(),
        source: feed.source,
        imageUrl: undefined,
        author,
        content: fullContent
      });

      count++;
    }

    console.log(`${feed.source}: ${items.length} items`);
    return items;

  } catch (err) {
    // Promise.any throws AggregateError when both attempts fail.
    const detail = err instanceof AggregateError
      ? err.errors.map((e) => (e instanceof Error ? e.message : String(e))).join('; ')
      : err instanceof Error ? err.message : String(err);
    console.error(`${feed.source} (${feed.category}) error:`, detail);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth is optional — news is available on the free tier too.
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(jwt);
      console.log('Fetching news for:', user?.id ?? 'guest');
    }

    // Parse optional category filter from request body
    let categoryFilter: string | null = null;
    try {
      const body = await req.json();
      categoryFilter = body?.category || null;

      // Validate category input
      if (categoryFilter && !ALLOWED_CATEGORIES.includes(categoryFilter)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid category' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      // No body or invalid JSON, fetch all
    }

    const category = categoryFilter || 'top';

    const respond = (items: NewsItem[], how: string) => {
      console.log(`Category: ${category}, ${items.length} items (${how})`);
      return new Response(
        JSON.stringify({
          success: true,
          news: items,
          categories: CATEGORIES,
          sources: RSS_FEEDS.map(f => ({ name: f.name, source: f.source }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    };

    // Stale-while-revalidate. Global Voices routinely needs 15–25s, so waiting
    // on it per request is what made the page feel broken. Anything cached is
    // returned straight away; if it has aged past FRESH_MS the refresh happens
    // in the background so the next reader gets newer articles without this one
    // paying for it.
    const cached = await readCache(category);
    if (cached) {
      const age = Date.now() - cached.at;
      if (age > FRESH_MS && age < STALE_OK_MS) {
        const bg = refreshCategory(category).catch((err) => console.error("bg refresh:", err));
        // deno-lint-ignore no-explicit-any
        const rt = (globalThis as any).EdgeRuntime;
        if (rt?.waitUntil) rt.waitUntil(bg);
      }
      return respond(cached.items, age > FRESH_MS ? "cached, refreshing" : "cached");
    }

    // Nothing cached for this category yet — this is the only path that waits.
    const items = await refreshCategory(category);
    if (items.length > 0) return respond(items, "live");

    const stale = await readCache(category);
    return respond(stale?.items ?? [], stale ? "stale fallback" : "empty");
  } catch (error) {
    console.error("fetch-news error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch news" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
