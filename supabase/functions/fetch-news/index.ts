import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
}

interface RSSFeed {
  name: string;
  url: string;
  source: string;
  category: string;
}

const RSS_FEEDS: RSSFeed[] = [
  // Top Stories / General
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", source: "bbc", category: "top" },
  { name: "The Guardian", url: "https://www.theguardian.com/uk/rss", source: "guardian", category: "top" },
  { name: "Sky News", url: "https://feeds.skynews.com/feeds/rss/home.xml", source: "sky", category: "top" },
  // Politics
  { name: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", source: "bbc", category: "politics" },
  { name: "Guardian Politics", url: "https://www.theguardian.com/politics/rss", source: "guardian", category: "politics" },
  // Business
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "bbc", category: "business" },
  { name: "Guardian Business", url: "https://www.theguardian.com/uk/business/rss", source: "guardian", category: "business" },
  // Technology
  { name: "BBC Tech", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "bbc", category: "tech" },
  { name: "Guardian Tech", url: "https://www.theguardian.com/uk/technology/rss", source: "guardian", category: "tech" },
  // Sports
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "bbc", category: "sports" },
  { name: "Guardian Sport", url: "https://www.theguardian.com/uk/sport/rss", source: "guardian", category: "sports" },
  // Entertainment
  { name: "BBC Entertainment", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", source: "bbc", category: "entertainment" },
  { name: "Guardian Culture", url: "https://www.theguardian.com/uk/culture/rss", source: "guardian", category: "entertainment" },
  // Science
  { name: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "bbc", category: "science" },
  { name: "Guardian Science", url: "https://www.theguardian.com/science/rss", source: "guardian", category: "science" },
];

const CATEGORIES = [
  { id: "top", name: "Top Stories" },
  { id: "politics", name: "Politics" },
  { id: "business", name: "Business" },
  { id: "tech", name: "Technology" },
  { id: "sports", name: "Sports" },
  { id: "entertainment", name: "Entertainment" },
  { id: "science", name: "Science" },
];

const ALLOWED_CATEGORIES = CATEGORIES.map(c => c.id);

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function extractContent(xml: string, tag: string): string {
  // Handle CDATA wrapped content
  const cdataPattern = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return stripTags(decodeEntities(cdataMatch[1].trim()));
  
  // Handle regular content  
  const regularPattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const regularMatch = xml.match(regularPattern);
  if (regularMatch) return stripTags(decodeEntities(regularMatch[1].trim()));
  
  // Handle escaped CDATA (like &lt;![CDATA[)
  const escapedPattern = new RegExp(`<${tag}[^>]*>&lt;!\\[CDATA\\[([\\s\\S]*?)\\]\\]&gt;</${tag}>`, "i");
  const escapedMatch = xml.match(escapedPattern);
  if (escapedMatch) return stripTags(decodeEntities(escapedMatch[1].trim()));
  
  return "";
}

function extractLink(xml: string): string {
  // Try getting link content
  const linkPattern = /<link[^>]*>([^<]+)<\/link>/i;
  const linkMatch = xml.match(linkPattern);
  if (linkMatch) return decodeEntities(linkMatch[1].trim());
  
  // Sometimes link is just text without closing tag properly
  const simplePattern = /<link>([^\n<]+)/i;
  const simpleMatch = xml.match(simplePattern);
  if (simpleMatch) return decodeEntities(simpleMatch[1].trim());
  
  // Self-closing link with href
  const hrefPattern = /<link[^>]+href=["']([^"']+)["']/i;
  const hrefMatch = xml.match(hrefPattern);
  if (hrefMatch) return decodeEntities(hrefMatch[1]);
  
  return "";
}

function extractImage(xml: string): string | undefined {
  // media:thumbnail (used by BBC)
  {
    const thumbPattern = /<media:thumbnail[^>]+url=["']([^"']+)["']/i;
    const thumbMatch = xml.match(thumbPattern);
    if (thumbMatch) return decodeEntities(thumbMatch[1]);
  }

  // Prefer media:content that is explicitly an image (Guardian often uses this)
  const mediaContentRegex = /<media:content[^>]+url=["']([^"']+)["'][^>]*>/gi;
  const mediaMatches = Array.from(xml.matchAll(mediaContentRegex));
  if (mediaMatches.length) {
    // Try first: tags that declare image type/medium
    for (const m of mediaMatches) {
      const fullTag = m[0] || '';
      if (/(?:type=["']image\/|medium=["']image["'])/i.test(fullTag)) {
        return decodeEntities(m[1]);
      }
    }
    // Fallback: first media:content url
    return decodeEntities(mediaMatches[0][1]);
  }

  // enclosure with image type
  const encPattern = /<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i;
  const encMatch = xml.match(encPattern);
  if (encMatch) return decodeEntities(encMatch[1]);

  // Look for image in description (some feeds embed img tags)
  const imgInDescPattern = /<img[^>]+src=["']([^"']+)["']/i;
  const imgMatch = xml.match(imgInDescPattern);
  if (imgMatch) return decodeEntities(imgMatch[1]);

  return undefined;
}

async function fetchRSSFeed(feed: RSSFeed): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error(`${feed.source}: HTTP ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const items: NewsItem[] = [];
    
    // Split by <item> tags
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    let count = 0;
    
    while ((match = itemRegex.exec(xml)) !== null && count < 10) {
      const itemXml = match[1];
      
      const title = extractContent(itemXml, "title");
      const link = extractLink(itemXml);
      
      if (!title || !link) continue;
      
      const description = extractContent(itemXml, "description");
      const pubDate = extractContent(itemXml, "pubDate") || extractContent(itemXml, "pubdate");
      const imageUrl = extractImage(itemXml);
      
      items.push({
        id: `${feed.source}-${count}-${Date.now()}`,
        title,
        description: description.length > 180 ? description.slice(0, 180) + "..." : description,
        link,
        pubDate: pubDate || new Date().toISOString(),
        source: feed.source,
        imageUrl,
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
    return new Response(null, { headers: corsHeaders });
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
