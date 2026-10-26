// Vercel serverless function: inject per-program SEO meta into index.html
// Handles rewrites from: /programs/*, /testnet/programs/*
// Cache: s-maxage=300, stale-while-revalidate=600

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { fetchProgram, parseUrlPath, canonicalUrl, slugify, CANONICAL_BASE } from './_chain.js';

// ESM-safe path resolution — works in Vercel Node functions (/var/task/api/program-page.js)
const _dir = join(fileURLToPath(import.meta.url), '..');

function readIndexHtml(): string {
  // dist/index.html is bundled via includeFiles in vercel.json.
  // process.cwd() = /var/task on Vercel; _dir/../ is also /var/task.
  const candidates = [
    join(process.cwd(), 'dist', 'index.html'),
    join(_dir, '..', 'dist', 'index.html'),
  ];
  for (const p of candidates) {
    try { return readFileSync(p, 'utf8'); } catch { /* try next */ }
  }
  throw new Error('dist/index.html not found');
}

/**
 * Reconstruct the ORIGINAL request pathname from Vercel rewrite info.
 *
 * Vercel rewrites /programs/:path* → /api/program-page and injects:
 *   req.query.path  = ['grantflow-mainnet-launch-test-0']   (array)
 * The prefix (/programs or /testnet/programs) is in x-matched-path or
 * x-vercel-deployment-url headers, but the most reliable signal is the
 * 'x-now-route-matches' header (JSON of named capture groups).
 * Fallback: look at the original URL in x-invoke-path / x-vercel-forwarded-for,
 * or reconstruct from the rewrite source using the path segments.
 *
 * Strategy (most-to-least reliable):
 * 1. x-now-route-matches: JSON {path: 'testnet/programs/foo-4'} or similar
 * 2. x-matched-path header contains the original pattern with :path* filled
 * 3. x-invoke-path or x-vercel-forwarded-for
 * 4. Reconstruct from query.path + referer / x-vercel-ip-* (no prefix available)
 *    → check if path starts with 'testnet/' to decide prefix
 */
function getOriginalPathname(req: VercelRequest): string {
  // 1. x-now-route-matches — most reliable, Vercel sets this on rewrites
  const routeMatches = req.headers['x-now-route-matches'] as string | undefined;
  if (routeMatches) {
    try {
      const m = JSON.parse(decodeURIComponent(routeMatches)) as Record<string, string>;
      // m looks like { "path": "grantflow-mainnet-launch-test-0" } for /programs/:path*
      // or { "path": "testnet/programs/x-4" } — but actually Vercel strips the leading
      // matched prefix, so we need to infer it from x-matched-path.
      const matchedPath = req.headers['x-matched-path'] as string | undefined;
      if (matchedPath && m['path'] !== undefined) {
        // x-matched-path = "/programs/:path*" or "/testnet/programs/:path*"
        const prefix = matchedPath.replace(/\/:path\*$/, '').replace(/\/:[^/]+(\*?)$/g, '');
        const clean = prefix.replace(/\(.*?\)/g, '').replace(/\?$/, '');
        return clean + '/' + m['path'];
      }
    } catch { /* fall through */ }
  }

  // 2. x-matched-path alone — fill in path query segments
  const matchedPath = req.headers['x-matched-path'] as string | undefined;
  const pathSegs = req.query['path'];
  const segs = Array.isArray(pathSegs) ? pathSegs.join('/') : (pathSegs ?? '');
  if (matchedPath && segs) {
    const prefix = matchedPath.replace(/\/:path\*.*$/, '');
    if (prefix && !prefix.includes(':')) return prefix + '/' + segs;
  }

  // 3. x-invoke-path set by some Vercel edge configs
  const invokePath = req.headers['x-invoke-path'] as string | undefined;
  if (invokePath && invokePath !== '/api/program-page') return invokePath;

  // 4. Reconstruct from query.path segments + prefix detection
  if (segs) {
    if (segs.startsWith('testnet/programs/')) return '/' + segs;
    if (segs.startsWith('programs/'))         return '/' + segs;
    // segs is just the tail (e.g. 'grantflow-mainnet-launch-test-0')
    // We cannot know the prefix without another signal — use x-forwarded-host or referer
    const referer = req.headers['referer'] as string | undefined;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (refUrl.pathname && refUrl.pathname !== '/') return refUrl.pathname;
      } catch { /* ignore */ }
    }
    // Default assumption: mainnet /programs/ prefix
    return '/programs/' + segs;
  }

  // 5. Last resort: use req.url (will be /api/program-page — wrong, but we log it)
  return req.url?.split('?')[0] ?? '/';
}

/** Strip all default head meta that the SPA sets, keep only charset/viewport/icons */
function stripDefaultMeta(html: string): string {
  return html
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');
}

function buildMeta(prog: NonNullable<Awaited<ReturnType<typeof fetchProgram>>>): string {
  const url = canonicalUrl(prog.chain, prog.id, prog.version, prog.name);
  const ogImage = `${CANONICAL_BASE}/api/og?chain=${prog.chain}&id=${prog.id}`;
  const sponsor = prog.sponsorName || prog.sponsor.slice(0, 8) + '\u2026';
  const deadline = prog.subDeadline > 0
    ? ` \u00b7 closes ${new Date(prog.subDeadline * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';
  const desc = `${prog.pool} USDC prize pool by ${sponsor}${deadline}. ${prog.description.slice(0, 150)}`;
  const title = `${prog.name} \u2014 ${prog.pool} USDC \u00b7 GrantFlow`;

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
    `  <meta property="og:type"         content="website" />`,
    `  <meta property="og:title"        content="${title.replace(/"/g, '&quot;')}" />`,
    `  <meta property="og:description"  content="${desc.replace(/"/g, '&quot;')}" />`,
    `  <meta property="og:url"          content="${url}" />`,
    `  <meta property="og:image"        content="${ogImage}" />`,
    `  <meta property="og:image:width"  content="1200" />`,
    `  <meta property="og:image:height" content="630" />`,
    `  <meta property="og:image:type"   content="image/png" />`,
    `  <meta name="twitter:card"        content="summary_large_image" />`,
    `  <meta name="twitter:title"       content="${title.replace(/"/g, '&quot;')}" />`,
    `  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />`,
    `  <meta name="twitter:image"       content="${ogImage}" />`,
    `  <script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n');
}

function buildNotFoundMeta(pathname: string): string {
  const title = 'Program not found \u00b7 GrantFlow';
  const url   = `${CANONICAL_BASE}${pathname}`;
  return [
    `  <title>${title}</title>`,
    `  <meta name="robots" content="noindex" />`,
    `  <link rel="canonical" href="${url}" />`,
    `  <meta property="og:title" content="${title}" />`,
    `  <meta property="og:url"   content="${url}" />`,
  ].join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always tag the response so we can verify the function is reached.
  res.setHeader('x-gf-renderer', 'program-page');

  const pathname = getOriginalPathname(req);
  const parsed   = parseUrlPath(pathname);

  // Log everything useful for debugging
  console.log('[pp] raw url      :', req.url);
  console.log('[pp] pathname     :', pathname);
  console.log('[pp] x-matched    :', req.headers['x-matched-path'] ?? '(none)');
  console.log('[pp] x-route-match:', req.headers['x-now-route-matches'] ?? '(none)');
  console.log('[pp] query.path   :', JSON.stringify(req.query['path'] ?? null));
  console.log('[pp] parsed       :', JSON.stringify(parsed));

  if (!parsed) {
    // Path didn't match any program pattern — serve generic SPA shell
    console.log('[pp] no parse match → generic SPA');
    const html = readIndexHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).send(html);
  }

  const { chain, id, version } = parsed;
  console.log(`[pp] fetching chain=${chain} id=${id} version=${version}`);
  const prog = await fetchProgram(chain, id, version);
  console.log('[pp] prog:', prog ? `"${prog.name}" pool=${prog.pool}` : 'null (not found)');

  if (!prog) {
    // Program does not exist — 404-style page (SPA still boots for client-side nav)
    let html = readIndexHtml();
    html = stripDefaultMeta(html);
    html = html.replace('<head>', `<head>\n${buildNotFoundMeta(pathname)}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(404).send(html);
  }

  // Non-canonical slug → 301 to canonical
  const canonical     = canonicalUrl(chain, id, version, prog.name);
  const canonicalPath = new URL(canonical).pathname;
  const isCanonical   = pathname === canonicalPath || pathname === canonicalPath + '/';
  console.log(`[pp] canonical=${canonicalPath} isCanonical=${isCanonical}`);

  if (!isCanonical) {
    res.setHeader('Location', canonical);
    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    return res.status(301).send('');
  }

  let html = readIndexHtml();
  html = stripDefaultMeta(html);
  html = html.replace('<head>', `<head>\n${buildMeta(prog)}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}
