import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

interface Guide {
  title: string;
  description: string;
  category: string;
  date: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  sources: { label: string; url: string }[];
}

const origin = 'https://kin-txt.com';
const directory = 'content/guides';
const escape = (value: string) => value.replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(new Date(date + 'T12:00:00Z'));

function renderPage(title: string, description: string, path: string, main: string, article?: Guide) {
  const structured = article ? { '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: title, description, datePublished: article.date,
    mainEntityOfPage: origin + path, author: { '@type': 'Organization', name: 'KiN-TXT', url: origin } } : null;
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} | KiN-TXT Guides</title><meta name="description" content="${escape(description)}">
<link rel="canonical" href="${origin + path}"><meta property="og:url" content="${origin + path}"><meta property="og:type" content="${article ? 'article' : 'website'}">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:site_name" content="KiN-TXT">
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/guide-assets/guides.css">
${structured ? '<script type="application/ld+json">' + JSON.stringify(structured).replaceAll('<','\\u003c') + '</script>' : ''}
<script defer src="/guide-assets/analytics.js"></script></head>
<body><header><nav aria-label="Main"><a class="brand" href="/">KiN-TXT</a><a href="/blog">Guides</a></nav></header>
<main>${main}</main><footer><a href="/blog">All guides</a><a href="/submissions">Write for KiN-TXT</a><a href="/privacy">Privacy</a></footer></body></html>`;
}

function renderGuides() {
  const pages = new Map<string, string>();
  const entries = readdirSync(directory).filter(name => name.endsWith('.json')).map(file => {
    const slug = file.slice(0, -5);
    const guide: Guide = JSON.parse(readFileSync(join(directory, file), 'utf8'));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^\d{4}-\d{2}-\d{2}$/.test(guide.date) ||
        !guide.sections.length || !guide.sources.length || !guide.title || !guide.description || !guide.intro) {
      throw new Error('Invalid guide: ' + file);
    }
    return { guide, slug, path: '/blog/' + slug };
  }).sort((a, b) => b.guide.date.localeCompare(a.guide.date) || a.guide.title.localeCompare(b.guide.title));

  for (const { guide, slug, path } of entries) {
    const sections = guide.sections.map(section => `<h2 data-reader>${escape(section.heading)}</h2>
      ${section.paragraphs.map(p => '<p data-reader>' + escape(p) + '</p>').join('\n')}`).join('\n');
    const sources = guide.sources.map(source => {
      if (new URL(source.url).protocol !== 'https:') throw new Error('Invalid source: ' + slug);
      return `<li><a href="${escape(source.url)}">${escape(source.label)}</a></li>`;
    }).join('');
    const modes = ['word', 'page'].map(mode =>
      `<a class="button" href="/guide-reader?article=${slug}&amp;mode=${mode}" data-event="guide_reader_open" data-mode="${mode}">View in kinetic ${mode} mode</a>`).join('');
    const cta = `<aside class="invitation"><h2>Read with KiN-TXT</h2>
      <p>Read classics, articles or your own material on the web and iOS.</p>
      <div class="actions"><a class="button filled" href="/home" data-event="reader_entry_click">Use KiN-TXT for free</a>
      <a class="button" href="/pricing" data-event="trial_cta_click">Try Pro free for 7 days</a></div>
      <p class="terms">After the trial, Pro costs £3.99/month or £30/year, depending on the plan you choose. Cancel before the trial ends to avoid being charged.</p></aside>`;
    const main = `<article><div class="meta">${escape(guide.category)} · <time datetime="${guide.date}">${dateLabel(guide.date)}</time> · KiN-TXT</div>
      <h1 data-reader>${escape(guide.title)}</h1><div class="actions modes" aria-label="Read this article in KiN-TXT">${modes}</div>
      <div class="copy"><p class="intro" data-reader>${escape(guide.intro)}</p>${sections}</div>
      <section class="sources"><h2>Sources and further reading</h2><ul>${sources}</ul></section></article>${cta}`;
    pages.set(path, renderPage(guide.title, guide.description, path, main, guide));
  }

  const cards = entries.map(({ guide, path }) => `<li><div class="meta">${escape(guide.category)} · <time datetime="${guide.date}">${dateLabel(guide.date)}</time></div>
    <h2><a href="${path}">${escape(guide.title)}</a></h2><p>${escape(guide.description)}</p></li>`).join('');
  pages.set('/blog', renderPage('Reading and writing guides', 'Practical guides to finding ebooks, reading online and publishing original writing.',
    '/blog', '<h1>Reading and writing guides</h1><ul class="catalogue">' + cards + '</ul>'));
  pages.set('/blog/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    entries.map(({ path, guide }) => `<url><loc>${origin + path}</loc><lastmod>${guide.date}</lastmod></url>`).join('\n') + '</urlset>');
  return pages;
}

export function guidePages(): Plugin {
  return {
    name: 'kin-txt-guides',
    generateBundle() {
      for (const [path, source] of renderGuides()) {
        const fileName = path.slice(1) + (path.endsWith('.xml') ? '' : '/index.html');
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0].replace(/\/$/, '');
        if (path !== '/blog' && !path.startsWith('/blog/')) return next();
        const html = renderGuides().get(path);
        res.statusCode = html ? 200 : 404;
        res.setHeader('Content-Type', path.endsWith('.xml') ? 'application/xml' : 'text/html; charset=utf-8');
        res.end(html ?? 'Guide not found');
      });
    },
  };
}
