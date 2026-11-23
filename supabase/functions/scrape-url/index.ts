import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseHTML } from "npm:linkedom@0.18.12";
import { Readability } from "npm:@mozilla/readability@0.6.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const PAGE_MAX = 4 * 1024 * 1024;
const TEXT_MAX = 250000;
const MIN_TEXT = 130;

class ImportError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
function reply(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
function publicUrl(input: string): URL {
  if (typeof input !== "string" || !input.trim())
    throw new ImportError("Please enter a webpage URL.", 400);
  const raw = input.trim();
  if (raw.length > 2048 || /[\x00-\x1f\x7f]/.test(raw))
    throw new ImportError("The URL contains invalid characters or is too long.", 400);
  const candidate = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
  let url: URL;
  try { url = new URL(candidate); }
  catch { throw new ImportError("Please enter a valid HTTP or HTTPS URL.", 400); }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new ImportError("Only HTTP and HTTPS webpages are supported.", 400);
  if (url.username || url.password)
    throw new ImportError("Links containing login credentials are not supported.", 400);
  if (url.port && url.port !== "80" && url.port !== "443")
    throw new ImportError("Non-standard web ports are not supported.", 400);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // URL() canonicalises hex, octal and integer IPv4 hosts to dotted notation.
  // No raw IP addresses, intranet or special-use domains can be fetched.
  if (!host.includes(".") || /^\[/.test(host) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      /\.(local|localhost|internal|test|invalid|onion)$/.test(host) ||
      host.startsWith("metadata.") || host.includes("%"))
    throw new ImportError("Use a public website address, not an internal network address.", 400);
  url.hash = "";
  return url;
}
function cleanText(input: string): string {
  return String(input || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim().slice(0, TEXT_MAX);
}
function readable(text: string): boolean {
  const cleaned = cleanText(text);
  const words = cleaned.match(/[\p{L}\p{N}]+/gu) || [];
  if (cleaned.length < MIN_TEXT || words.length < 25) return false;
  const bot = /checking your browser|verify (?:you are|that you are) human|enable javascript and cookies|captcha|cloudflare ray id|subscribe to continue reading|access denied/i;
  return !(cleaned.length < 4000 && bot.test(cleaned));
}
function titleFrom(text: unknown): string {
  return cleanText(String(text || ""))
    .replace(/\s+\|\s+[^|]+$/, "").slice(0, 220) || "Imported webpage";
}

function extractHtml(html: string): { text: string; title: string; method: string } | null {
  const { document } = parseHTML(html);
  const title = titleFrom(
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
    document.title || document.querySelector("h1")?.textContent
  );
  const ignored = "script,style,noscript,nav,header,footer,aside,form,button,iframe,svg,canvas,video,audio,[hidden],[aria-hidden='true']";
  try {
    const readerDoc = document.cloneNode(true) as Document;
    readerDoc.querySelectorAll(ignored).forEach(el => el.remove());
    const article = new Readability(readerDoc, { charThreshold: 100 }).parse();
    if (article?.textContent && readable(article.textContent)) {
      return { text: cleanText(article.textContent), title: titleFrom(article.title || title), method: "readability" };
    }
  } catch (err) {
    console.warn("Readability parser fallback:", err instanceof Error ? err.message : String(err));
  }

  document.querySelectorAll(ignored).forEach(el => el.remove());
  // For generic webpages that are not editorial articles, use a likely
  // primary container; avoid pulling the entire document head/navigation.
  const selectors = [
    "[itemprop='articleBody']", "article", "main", "[role='main']",
    ".article-body", ".article-content", ".post-content", ".entry-content",
    ".content-body", ".story-body", "#content", "body"
  ];
  let best = "";
  let bestScore = -Infinity;
  for (const selector of selectors) {
    for (const el of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
      const clone = el.cloneNode(true) as Element;
      clone.querySelectorAll("nav,aside,footer,form,script,style,[class*='newsletter'],[class*='advert'],[class*='social-share']").forEach(x => x.remove());
      clone.querySelectorAll("p,li,blockquote,h1,h2,h3,h4,h5,h6,br,section,div").forEach((node) => {
        if (node.tagName === "BR") node.replaceWith(document.createTextNode("\n"));
        else node.prepend(document.createTextNode("\n"));
      });
      const text = cleanText(clone.textContent || "");
      if (!readable(text)) continue;
      const linkedChars = Array.from(el.querySelectorAll("a")).reduce((n, a) => n + (a.textContent?.length || 0), 0);
      const score = text.length + Math.min(20, (text.match(/\n/g) || []).length) * 40 - linkedChars * 1.5;
      if (score > bestScore) { bestScore = score; best = text; }
    }
  }
  return best ? { title, text: best, method: "main-content" } : null;
}

async function limitedBody(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length") || "0") > PAGE_MAX)
    throw new ImportError("The page is too large to import.", 413);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > PAGE_MAX) throw new ImportError("The page is too large to import.", 413);
      parts.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(total);
  let index = 0;
  for (const part of parts) { bytes.set(part, index); index += part.byteLength; }
  const charset = response.headers.get("content-type")?.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1];
  try { return new TextDecoder(charset || "utf-8").decode(bytes); }
  catch { return new TextDecoder("utf-8").decode(bytes); }
}

async function fetchDirect(initial: URL): Promise<{ url: URL; html: string; type: string }> {
  let url = initial;
  for (let hops = 0; hops <= 5; hops++) {
    url = publicUrl(url.href);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url.href, {
        signal: controller.signal, redirect: "manual",
        headers: {
          "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "Accept-Language": "en-GB,en;q=0.9",
          "User-Agent": "Mozilla/5.0 (compatible; KiN-TXT Reading/1.0)",
        },
      });
      if ([301,302,303,307,308].includes(response.status)) {
        const target = response.headers.get("location");
        if (!target || hops === 5) throw new ImportError("This page redirects too many times.");
        url = publicUrl(new URL(target, url).href);
        await response.body?.cancel().catch(() => {});
        continue;
      }
      if ([401,403,429].includes(response.status))
        throw new ImportError("This website restricts automated access. Try a public page or paste the text.", 422);
      if (!response.ok)
        throw new ImportError("Website returned HTTP " + response.status + ". Check the URL.", response.status === 404 ? 404 : 502);
      const type = response.headers.get("content-type")?.toLowerCase() || "";
      if (/pdf|octet-stream|zip|image\/|video\/|audio\//.test(type) ||
          /\.(pdf|epub|docx?|zip)$/i.test(url.pathname))
        throw new ImportError("This is a downloadable file. Download it and choose Upload File instead.", 415);
      if (type && !/html|xml|text\/plain|markdown/.test(type))
        throw new ImportError("This link is not a supported webpage.", 415);
      return { url, type, html: await limitedBody(response) };
    } finally { clearTimeout(timer); }
  }
  throw new ImportError("This page redirects too many times.");
}

function fromMarkdown(markdown: string): string {
  return cleanText(markdown
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\((?:https?:\/\/|\/)[^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_]{2,}/g, "")
  );
}

async function renderedFallback(url: URL): Promise<{ title: string; text: string; method: string } | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST", signal: controller.signal,
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.href, formats: ["markdown"], onlyMainContent: true, waitFor: 2000 }),
    });
    if (!response.ok) {
      console.warn("Rendering provider status:", response.status);
      return null;
    }
    const result = JSON.parse(await limitedBody(response));
    if (!result?.success) return null;
    const data = result.data || result;
    const text = fromMarkdown(data.markdown || "");
    if (!readable(text)) return null;
    return { title: titleFrom(data.metadata?.title || data.metadata?.ogTitle), text, method: "rendered" };
  } catch (err) {
    console.warn("Rendering fallback unavailable:", err instanceof Error ? err.message : String(err));
    return null;
  } finally { clearTimeout(timer); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ success: false, error: "Use POST to import a URL." }, 405);
  let url: URL;
  try {
    const body = await req.json().catch(() => null);
    url = publicUrl(body?.url);
  } catch (err) {
    return reply({ success: false, error: err instanceof Error ? err.message : "Invalid URL" },
      err instanceof ImportError ? err.status : 400);
  }

  let firstError: Error | null = null;
  try {
    const page = await fetchDirect(url);
    const extracted = /text\/plain|markdown/.test(page.type)
      ? (readable(page.html) ? { text: cleanText(page.html), title: page.url.hostname, method: "plain-text" } : null)
      : extractHtml(page.html);
    if (extracted && readable(extracted.text)) {
      return reply({ success: true, ...extracted });
    }
    firstError = new ImportError("No readable article text was found on this page.");
  } catch (err) {
    firstError = err instanceof Error ? err : new ImportError("Failed to load this webpage.");
    console.warn("Direct import failed:", firstError.message);
    if (firstError instanceof ImportError && [400,404,413,415].includes(firstError.status))
      return reply({ success: false, error: firstError.message }, firstError.status);
  }

  // Only use the configured JS-rendering provider when ordinary HTML fails,
  // reducing both cost and latency for publicly readable articles.
  const rendered = await renderedFallback(url);
  if (rendered) return reply({ success: true, ...rendered });
  return reply({
    success: false,
    error: firstError?.message || "Could not extract readable text. Try the public article URL or Paste Text.",
  }, firstError instanceof ImportError ? firstError.status : 422);
});
