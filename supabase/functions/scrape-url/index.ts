import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

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

// Readability-inspired content extraction from markdown
// Based on how Firefox Reader Mode and Safari Reader work
function extractReadableContent(markdown: string, title?: string): string {
  // Step 1: Remove all markdown formatting artifacts first
  let text = markdown
    // Remove markdown image syntax completely
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]/g, '')
    // Remove reference-style images
    .replace(/^\[[^\]]*\]:\s*\S+.*$/gm, '')
    // Remove markdown links but keep the text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    // Remove standalone URLs
    .replace(/(?:^|\s)https?:\/\/\S+/g, ' ')
    // Remove markdown header markers but keep text
    .replace(/^#{1,6}\s+/gm, '')
    // Remove emphasis markers
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/___([^_]+)___/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove blockquotes markers
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '\n')
    // Remove list markers but keep content
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Clean up HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-zA-Z0-9#]+;/g, ' ');

  // Step 2: Split into paragraphs and analyze each one
  const paragraphs = text.split(/\n\s*\n/);

  // Patterns that indicate non-content (navigation, metadata, ads, etc.)
  const nonContentPatterns = [
    // Navigation and UI
    /^(home|menu|search|sign in|log in|sign up|register|subscribe|follow us|share|comment|comments|like|reply|load more|show more|see more|read more|continue reading|click here|tap here|learn more)/i,
    // Social media
    /^(share on|share via|follow on|tweet|facebook|twitter|linkedin|instagram|pinterest|whatsapp|email this|print this)/i,
    // Metadata patterns (but allow longer author lines that might be content)
    /^(posted\s|published\s|updated\s|written by|author:|date:|time:|\d+\s*(min|minute|hour|day|week|month|year)s?\s*(ago|read)$|reading time)/i,
    // Timestamps only (not content with timestamps)
    /^\d{1,2}[:\-\/]\d{1,2}([:\-\/]\d{2,4})?(\s*(am|pm))?$/i,
    // Copyright and legal
    /^(copyright|©|\(c\)|all rights reserved|terms of|privacy policy|cookie policy|disclaimer)/i,
    // Media credits (short ones)
    /^(image|photo|photograph|video|audio|picture|illustration|graphic|chart|figure)\s*(:|source|credit|courtesy|by|via|from)/i,
    // Advertisements
    /^(advertisement|sponsored|promoted|ad:|promo:|special offer|limited time)/i,
    // Related content sections
    /^(related|you may also|you might also|recommended|trending|popular|most read|top stories|more from|also read|see also|don't miss)/i,
    // Newsletter/subscription prompts
    /^(newsletter|subscribe to|sign up for|get our|join our|enter your email|your email)/i,
    // Cookie notices
    /^(we use cookies|this site uses|accept cookies|cookie settings|manage preferences)/i,
    // App prompts
    /^(download our|get the app|open in app|continue in app)/i,
    // Empty-ish lines
    /^[\s\-–—•·]+$/,
    // Just numbers
    /^\d+$/,
    // Section markers without content
    /^(breaking|exclusive|opinion|analysis|feature|live|update|watch|listen|video|podcast|gallery|slideshow)$/i,
    // Guardian-specific patterns
    /^(key events|show key events only|filter|turn on|turn off|get in touch|email|contact)/i,
    /^(quick guide|show|hide|what happened|summary)/i,
  ];

  // Filter and score paragraphs using readability heuristics
  const scoredParagraphs = paragraphs.map(para => {
    const trimmed = para.trim();

    // Empty paragraph - keep for spacing
    if (trimmed.length === 0) {
      return { text: '', score: 0, keep: false };
    }

    // Check against non-content patterns
    for (const pattern of nonContentPatterns) {
      if (pattern.test(trimmed)) {
        return { text: trimmed, score: -100, keep: false };
      }
    }

    // Calculate readability score (inspired by Readability.js)
    let score = 0;

    // Longer paragraphs are more likely to be content
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount >= 25) score += 40;
    else if (wordCount >= 15) score += 25;
    else if (wordCount >= 8) score += 10;
    else if (wordCount < 4) score -= 15;

    // Sentences (ending with punctuation) are good indicators
    const sentenceEndings = (trimmed.match(/[.!?]["']?\s|[.!?]["']?$/g) || []).length;
    score += sentenceEndings * 12;

    // Commas indicate complex sentences - usually content
    const commaCount = (trimmed.match(/,/g) || []).length;
    score += Math.min(commaCount * 4, 20);

    // Multiple sentences in a paragraph is strong content signal
    if (sentenceEndings >= 2) score += 25;

    // Very short lines without punctuation are suspicious
    if (trimmed.length < 50 && !/[.!?]$/.test(trimmed)) {
      score -= 20;
    }

    // Penalize lines with too many special characters
    const specialCharRatio = (trimmed.match(/[^a-zA-Z0-9\s.,!?'"()-]/g) || []).length / trimmed.length;
    if (specialCharRatio > 0.15) score -= 25;

    // Penalize lines that are mostly uppercase (often headers/buttons)
    const letters = trimmed.match(/[a-zA-Z]/g) || [];
    const uppercaseRatio = letters.length > 0 ? (trimmed.match(/[A-Z]/g) || []).length / letters.length : 0;
    if (uppercaseRatio > 0.6 && trimmed.length < 60) score -= 20;

    // Skip if it starts with common non-content starters
    if (/^(skip|jump|go to|back to|return to|view all|show all|hide|expand|collapse|more|less|next|previous|first|last)\b/i.test(trimmed)) {
      score -= 40;
    }

    // Skip lines that are just author attributions (short ones)
    if (/^(by|from|via|source:|credit:)\s+[a-z\s,]+$/i.test(trimmed) && trimmed.length < 50) {
      score -= 50;
    }

    // Skip lines that look like tags/categories
    if (/^(tags?:|categor(y|ies):|topics?:|filed under:|in:)/i.test(trimmed)) {
      score -= 60;
    }

    // Skip lines that are just social stats
    if (/^\d+\s*(likes?|shares?|comments?|views?|reactions?)/i.test(trimmed)) {
      score -= 60;
    }

    // Skip Guardian live blog UI elements
    if (/^(all times|gmt|bst|et|pt|cet)\b/i.test(trimmed) && trimmed.length < 30) {
      score -= 50;
    }

    // Keep lines that look like actual sports/news updates (have a time prefix but substantial content)
    if (/^\d{1,2}[:.]\d{2}\s+.{50,}/.test(trimmed)) {
      score += 20; // Timestamped updates with content
    }

    return { text: trimmed, score, keep: score > 5 };
  });

  // Keep paragraphs with positive scores
  const contentParagraphs = scoredParagraphs
    .filter(p => p.keep && p.text.length > 0)
    .map(p => p.text);

  // If we filtered too aggressively, fall back to length-based filtering
  if (contentParagraphs.length < 2) {
    const fallbackParagraphs = paragraphs
      .map(p => p.trim())
      .filter(p => {
        if (p.length === 0) return false;
        return p.length >= 100 || (p.length >= 50 && /[.!?]$/.test(p));
      });

    if (fallbackParagraphs.length > contentParagraphs.length) {
      return fallbackParagraphs.join('\n\n').trim();
    }
  }

  // Join paragraphs with proper spacing
  let result = contentParagraphs.join('\n\n');

  // Final cleanup
  result = result
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\[\s*\]/g, '')
    .replace(/\(\s*\)/g, '')
    .trim();

  return result;
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
    .replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Apply readability filtering to the extracted text
  const cleanedBody = extractReadableContent(text, title);

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
          const cleanedText = extractReadableContent(markdown, title);

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
    console.log('Fetching URL with basic scraping:', formattedUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(formattedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
        throw new Error('Content too large');
      }

      const html = await response.text();

      if (html.length > 1024 * 1024) {
        throw new Error('Content too large to process');
      }

      const { title, body } = extractFromHtml(html);

      // Prepend headline to the body text
      const fullText = title + '\n\n' + body;

      console.log('Basic scraping extracted title:', title);
      console.log('Basic scraping extracted body length:', body.length);

      return new Response(
        JSON.stringify({
          success: true,
          text: fullText,
          title: title
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
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
