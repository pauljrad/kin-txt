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
  { name: "The Conversation", url: "https://theconversation.com/uk/articles.atom", source: "conversation", category: "top" },
  { name: "Technology", url: "https://theconversation.com/uk/technology/articles.atom", source: "conversation", category: "tech" },
  { name: "Business", url: "https://theconversation.com/uk/business/articles.atom", source: "conversation", category: "business" },
  { name: "Science", url: "https://theconversation.com/uk/politics/articles.atom", source: "conversation", category: "politics" },
  { name: "Environment", url: "https://theconversation.com/uk/environment/articles.atom", source: "conversation", category: "science" },
  { name: "Health", url: "https://theconversation.com/uk/health/articles.atom", source: "conversation", category: "science" },
  { name: "Arts", url: "https://theconversation.com/uk/arts/articles.atom", source: "conversation", category: "entertainment" },
];

function extractAtomContent(xml: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(pattern);
  return match ? decodeEntities(stripTags(match[1])) : "";
}

function extractAtomLink(xml: string): string {
  const pattern = /<link[^>]*href=["']([^"']+)["'][^>]*\/>/i;
  const match = xml.match(pattern);
  return match ? parseEntity(match[1]) : "";
}

function parseEntity(str: string): string {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function extractAtomAuthor(xml: string): string {
  const pattern = /<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/i;
  const match = xml.match(pattern);
  return match ? parseEntity(match[1].trim()) : "The Conversation";
}

// Extract full HTML content (preserving tags for pixel) but cleaning mostly
function extractAtomHtmlContent(xml: string): string {
  const pattern = /<content\s+type="html">([\s\S]*?)<\/content>/i;
  const match = xml.match(pattern);
  if (!match) return "";

  // The content is already HTML escaped in XML usually, or CDATA
  let content = match[1];

  // Check for CDATA
  const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (cdataMatch) {
    content = cdataMatch[1];
  } else {
    content = parseEntity(content);
  }

  return content;
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

    // Split by <entry> tags for Atom
    const entries = xml.split('<entry>');
    // Skip the first split part (header)
    entries.shift();

    let count = 0;
    for (const entryXml of entries) {
      if (count >= 15) break; // Limit items per feed

      const title = extractAtomContent(entryXml, "title");
      const link = extractAtomLink(entryXml);

      if (!title || !link) continue;

      const summary = extractAtomContent(entryXml, "summary");
      const published = extractAtomContent(entryXml, "published");
      const author = extractAtomAuthor(entryXml);
      const fullContent = extractAtomHtmlContent(entryXml);

      // We need to keep the 1x1 pixel image.
      // Usually it's at the end or beginning.
      // We will pass the RAW HTML (cleaned somewhat) to the frontend or parse it there.
      // For now, let's store the full HTML in `description` or a new field.
      // Since `NewsItem` interface needs update, we'll assume `description` holds the summary, 
      // and we return raw content via a different mechanism or update the interface.
      // Actually, let's just use the `description` for summary. 
      // We need to send `content` to frontend.

      // IMPORTANT: The existing NewsItem interface doesn't have `content` or `author`.
      // I need to add them. But I can't modify the interface *inside* this function replacement easily if it's defined above.
      // Wait, the interface IS defined above line 27. I should have updated it.
      // I will update the interface in a separate call or overlapping call. 
      // For now, I'll shove it into the object and cast it or hope TS is loose (it is Deno, so TS is strict).

      // I'll update the return type logic below.

      items.push({
        id: `${feed.source}-${count}-${Date.now()}`,
        title,
        description: summary, // Use summary for the card
        link,
        pubDate: published || new Date().toISOString(),
        source: feed.source,
        imageUrl: undefined, // No images allowed
        // @ts-ignore
        author,
        // @ts-ignore
        content: fullContent
      } as NewsItem);

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
