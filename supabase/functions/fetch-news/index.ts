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

const RSS_FEEDS: RSSFeed[] = [
  { name: "Top Stories", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Published&notcategories=No%20publish%7CArchived%7CAutoArchived%7Cdisputed&namespace=0&count=30", source: "Wikinews", category: "top" },
  { name: "Global Voices", url: "https://globalvoices.org/feed/", source: "Global Voices", category: "top" },
  { name: "Politics", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Politics_and_conflicts", source: "Wikinews", category: "politics" },
  { name: "Science + Tech", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Science_and_technology", source: "Wikinews", category: "tech" },
  { name: "Business", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Economy_and_business", source: "Wikinews", category: "business" },
  { name: "Health", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Health", source: "Wikinews", category: "health" },
  { name: "Culture", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Culture_and_entertainment", source: "Wikinews", category: "arts" },
  { name: "Sports", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Sports", source: "Wikinews", category: "sports" },
  { name: "Environment", url: "https://en.wikinews.org/w/index.php?title=Special:NewsFeed&feed=rss&categories=Environment", source: "Wikinews", category: "environment" },
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

async function fetchRSSFeed(feed: RSSFeed): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KiN-Bot/1.0)",
        "Accept": "application/atom+xml, application/xml, text/xml, */*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`${feed.source}: HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
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
    clearTimeout(timeout);
    console.error(`${feed.source} error:`, err instanceof Error ? err.message : err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Auth error: No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Pass the JWT explicitly (more reliable than relying on global headers)
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error (getUser):', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

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

    // Filter feeds by category if specified
    const feedsToFetch = categoryFilter
      ? RSS_FEEDS.filter(f => f.category === categoryFilter)
      : RSS_FEEDS.filter(f => f.category === "top"); // Default to top stories only

    const results = await Promise.all(feedsToFetch.map(fetchRSSFeed));

    // Dedupe by link to avoid duplicate articles across feeds
    const seen = new Set<string>();
    const allNews = results.flat()
      .filter(item => {
        if (seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime() || 0;
        const dateB = new Date(b.pubDate).getTime() || 0;
        return dateB - dateA;
      });

    console.log(`Category: ${categoryFilter || 'top'}, Total: ${allNews.length} news items`);

    return new Response(
      JSON.stringify({
        success: true,
        news: allNews,
        categories: CATEGORIES,
        sources: RSS_FEEDS.map(f => ({ name: f.name, source: f.source }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-news error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch news" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
