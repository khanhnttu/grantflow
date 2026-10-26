// Vercel serverless function: inject per-program SEO meta into index.html
// Handles: /programs/*, /testnet/programs/*
// Cache: s-maxage=300, stale-while-revalidate=600

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchProgram, parseUrlPath, canonicalUrl, CANONICAL_BASE, slugify } from './_chain.js';

function readIndexHtml(): string {
  // __dirname in ESM Vercel functions is the function's own directory; dist/ is at project root.
  // Vercel deploys the whole project, so dist/index.html is at <root>/dist/index.html.
  const paths = [
    join(process.cwd(), 'dist', 'index.html'),
    join(__dirname, '..', 'dist', 'index.html'),
  ];
  for (const p of paths) {
    try { return readFileSync(p, 'utf8'); } catch { /* try next */ }
  }
  throw new Error('index.html not found');
}

/** Strip all default head meta that the SPA sets, keep only charset/viewport/icons */
function stripDefaultMeta(html: string): string {
  return html
    // Remove all <title> tags
    .replace(/<title>[^<]*<\/title>/gi, '')
    // Remove all <meta name="description"> tags
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    // Remove all <meta property="og:..."> tags
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    // Remove all <meta name="twitter:..."> tags
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    // Remove all <link rel="canonical"> tags
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    // Remove all <script type="application/ld+json"> blocks
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');
}

function buildMeta(prog: NonNullable<Awaited<ReturnType<typeof fetchProgram>>>): string {
  const url = canonicalUrl(prog.chain, prog.id, prog.version, prog.name);
  const ogImage = `${CANONICAL_BASE}/api/og?chain=${prog.chain}&id=${prog.id}`;
  const sponsor = prog.sponsorName || prog.sponsor.slice(0, 8) + '…';
  const deadline = prog.subDeadline > 0
    ? ` · closes ${new Date(prog.subDeadline * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';
  const desc = `${prog.pool} USDC prize pool by ${sponsor}${deadline}. ${prog.description.slice(0, 150)}`;
  const title = `${prog.name} — ${prog.pool} USDC · GrantFlow`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: prog.name,
    description: prog.description.slice(0, 500),
    url,
    organizer: { '@type': 'Organization', name: sponsor },
    offers: {
      '@type': 'Offer',
      price: prog.pool,
      priceCurrency: 'USDC',
      availability: prog.cancelled
        ? 'https://schema.org/Discontinued'
        : prog.finalized
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
    },
    ...(prog.subDeadline > 0 ? {
      endDate: new Date(prog.subDeadline * 1000).toISOString(),
    } : {}),
  });

  return [
    `  <title>${title}</title>`,
    `  <meta name="description" content="${desc.replace(/"/g, '&quot;')}" />`,
    `  <link rel="canonical" href="${url}" />`,
    `  <meta property="og:type"        content="website" />`,
    `  <meta property="og:title"       content="${title.replace(/"/g, '&quot;')}" />`,
    `  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />`,
    `  <meta property="og:url"         content="${url}" />`,
    `  <meta property="og:image"       content="${ogImage}" />`,
    `  <meta property="og:image:width"  content="1200" />`,
    `  <meta property="og:image:height" content="630" />`,
    `  <meta property="og:image:type"  content="image/png" />`,
    `  <meta name="twitter:card"       content="summary_large_image" />`,
    `  <meta name="twitter:title"      content="${title.replace(/"/g, '&quot;')}" />`,
    `  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />`,
    `  <meta name="twitter:image"      content="${ogImage}" />`,
    `  <script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = req.url?.split('?')[0] ?? '/';
  const parsed = parseUrlPath(pathname);

  if (!parsed) {
    // Not a program URL — serve plain index.html
    const html = readIndexHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).send(html);
  }

  const { chain, id, version } = parsed;
  const prog = await fetchProgram(chain, id, version);

  if (!prog) {
    // Program not found — still serve index.html so SPA can show 404
    const html = readIndexHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(200).send(html);
  }

  // Check if the slug in the URL matches the canonical slug; if not, 301 redirect
  const canonical = canonicalUrl(chain, id, version, prog.name);
  const canonicalPath = new URL(canonical).pathname;
  if (pathname !== canonicalPath && pathname !== canonicalPath + '/') {
    res.setHeader('Location', canonical);
    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    return res.status(301).send('');
  }

  let html = readIndexHtml();
  html = stripDefaultMeta(html);
  const meta = buildMeta(prog);
  // Inject immediately after <head>
  html = html.replace('<head>', `<head>\n${meta}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}
