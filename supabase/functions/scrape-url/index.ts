import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Decode all common HTML entities to plain text
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
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
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Any remaining unknown named entities — drop silently
    .replace(/&[a-zA-Z][a-zA-Z0-9]*;/g, '');
}

// Validate URL to prevent SSRF attacks
function validateUrl(urlString: string): void {
  const url = new URL(urlString);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols are allowed');
  }

  const hostname = url.hostname.toLowerCase();

  if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'].includes(hostname)) {
    throw new Error('Access to localhost is not allowed');
  }

  if (hostname === '169.254.169.254' || hostname.startsWith('metadata.')) {
    throw new Error('Access to metadata endpoints is not allowed');
  }

  if (/^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname)) {
    throw new Error('Access to private networks is not allowed');
  }

  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Access to internal domains is not allowed');
  }
}

// Filter and score paragraphs using readability heuristics
function extractReadableContent(textInput: string, allowLowScore: boolean = false): string {
  // Simple check: is this HTML? If so, strip tags but preserve structure hints
  let text = textInput;
  if (text.includes('<') && text.includes('>')) {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<p[^>]*>/gi, '\n\n')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<h[1-6][^>]*>/gi, '\n\n# ')
      .replace(/<[^>]+>/g, ' ');
  }

  const paragraphs = text.split(/\n\s*\n/);
  const scoredParagraphs = paragraphs.map(para => {
    const trimmed = decodeHtmlEntities(para.trim());
    if (trimmed.length === 0) return { text: '', score: 0, keep: false };

    // Basic scoring logic...
    let score = 0;
    const wordCount = trimmed.split(/\s+/).length;
    const sentenceEndings = (trimmed.match(/[.!?]["']?\s|[.!?]["']?$/g) || []).length;

    score += wordCount * 1;
    score += sentenceEndings * 10;

    // Reject very short snippets that look like UI/Metadata
    if (!allowLowScore && score < 30) return { text: trimmed, score, keep: false };
    if (allowLowScore && score < 10) return { text: trimmed, score, keep: false };

    return { text: trimmed, score, keep: true };
  });

  return scoredParagraphs
    .filter(p => p.keep)
    .map(p => p.text)
    .join('\n\n');
}

// Fallback: Basic HTML extraction for when Firecrawl is unavailable
function extractFromHtml(html: string): { title: string; body: string } {
  // Extract title
  const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  let title = ogTitleMatch?.[1] || h1Match?.[1] || titleMatch?.[1] || 'Untitled Article';
  title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim();

  // Try to find the article container
  let articleHtml = html;

  // Priority order for content containers
  const contentSelectors = [
    /<article[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*content-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const selector of contentSelectors) {
    const match = html.match(selector);
    if (match) {
      articleHtml = match[1];
      break;
    }
  }

  // Remove non-content elements aggressively
  let cleanHtml = articleHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, '')
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, '')
    .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '')
    .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<input[^>]*>/gi, '')
    .replace(/<select[^>]*>[\s\S]*?<\/select>/gi, '')
    .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove divs with ad/social/share classes
    .replace(/<div[^>]*class="[^"]*(?:ad-|ads-|advert|social|share|related|recommend|newsletter|signup|promo|sidebar|widget)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    // Remove elements with data attributes indicating non-content
    .replace(/<[^>]*data-(?:ad|tracking|analytics|component="(?:share|social|ad|related)")[^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    // Remove image tags
    .replace(/<img[^>]*>/gi, '');

  // Convert to text preserving paragraph structure
  let text = cleanHtml
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  // Decode all HTML entities in one pass
  text = decodeHtmlEntities(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Apply readability filtering to the extracted text
  // We allow a slightly lower score here because we've already done some HTML-specific filtering
  const cleanedBody = extractReadableContent(text, true);

  return { title, body: cleanedBody };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
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

    // Pass the JWT explicitly (edge functions don't have auth storage)
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error (getUser):', userError?.message || 'No user');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Validating URL:', formattedUrl);

    try {
      validateUrl(formattedUrl);
    } catch (validationError) {
      console.error('URL validation failed:', validationError);
      const message = validationError instanceof Error ? validationError.message : 'Invalid URL';
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Firecrawl first (handles JS rendering, paywalls better)
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (firecrawlApiKey) {
      console.log('Using Firecrawl for:', formattedUrl);

      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000, // Wait for JS to render
          }),
        });

        const firecrawlData = await firecrawlResponse.json();

        if (firecrawlResponse.ok && firecrawlData.success) {
          const markdown = firecrawlData.data?.markdown || firecrawlData.markdown || '';
          const metadata = firecrawlData.data?.metadata || firecrawlData.metadata || {};

          let title = metadata.title || metadata.ogTitle || 'Untitled Article';
          title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim();

          // Apply readability extraction to the markdown
          const cleanedText = extractReadableContent(markdown, true); // Allow low score for Firecrawl output

          // Prepend headline to the body text
          const fullText = title + '\n\n' + cleanedText;

          console.log('Firecrawl extracted title:', title);
          console.log('Firecrawl raw markdown length:', markdown.length);
          console.log('Firecrawl cleaned body length:', cleanedText.length);

          return new Response(
            JSON.stringify({
              success: true,
              text: fullText,
              title: title
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.warn('Firecrawl failed, falling back to basic scraping:', firecrawlData.error);
        }
      } catch (firecrawlError) {
        console.warn('Firecrawl error, falling back to basic scraping:', firecrawlError);
      }
    } else {
      console.log('Firecrawl API key not configured, using basic scraping');
    }

    // Fallback: Basic HTTP fetch
    console.log(`[scraper] Fetching URL: ${formattedUrl}`);

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`[scraper] Fetch failed with status: ${response.status}`);
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[scraper] Received HTML length: ${html.length}`);

    // Extract title from HTML
    const { title: pageTitle } = extractFromHtml(html);
    console.log(`[scraper] Extracted Page Title: ${pageTitle}`);

    // Step 1: Use Readability-style extraction
    console.log('[scraper] Attempting Stage 1: Smart Extraction');
    let extractedText = extractReadableContent(html);
    console.log(`[scraper] Stage 1 result length: ${extractedText.length}`);

    // Case 1: Success (enough content)
    if (extractedText.length > 500) {
      console.log('[scraper] Stage 1 SUCCESS (extractedText > 500 chars)');
      return new Response(
        JSON.stringify({
          success: true,
          text: extractedText,
          title: pageTitle,
          method: 'smart'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Case 2: Fallback (low content)
    console.log('[scraper] content too short, attempting Stage 2: Wide-net Fallback');
    const fallbackText = extractReadableContent(html, true); // True for "allow low score"
    console.log(`[scraper] Stage 2 result length: ${fallbackText.length}`);

    if (fallbackText.length > 100) {
      console.log('[scraper] Stage 2 SUCCESS (fallbackText > 100 chars)');
      return new Response(
        JSON.stringify({
          success: true,
          text: fallbackText,
          title: pageTitle,
          method: 'fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.warn('[scraper] All extraction methods returned insufficient content.');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Could not extract enough readable content from this page.',
        title: pageTitle,
        debug_lengths: { smart: extractedText.length, fallback: fallbackText.length }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-url function:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
