// Vercel serverless function: inject per-program SEO meta into index.html
// Handles rewrites from: /programs/*, /testnet/programs/*
// Cache: s-maxage=300, stale-while-revalidate=600

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { fetchProgram, parseUrlPath, canonicalUrl, CANONICAL_BASE } from './_chain.js';

// ESM-safe path resolution — /var/task/api/program-page.js on Vercel
const _dir = join(fileURLToPath(import.meta.url), '..');

function readIndexHtml(): string {
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
 * Recover the original request path from Vercel rewrite context.
 *
 * When Vercel rewrites /programs/:path* → /api/program-page, it keeps the
 * ORIGINAL URL in req.url (the path the browser sent), NOT the rewrite target.
 * Confirmed in Vercel Node runtime logs: req.url = '/testnet/programs/x-4?path=x-4'
 *
 * Strategy (most-to-least reliable):
 * 1. req.url pathname — already correct if Vercel preserves original URL (it does)
 * 2. x-now-route-matches JSON + x-matched-path prefix
 * 3. query.chain + query.path (injected by vercel.json rewrite destination)
 * 4. query.path segments with testnet prefix detection
 */
function getOriginalPathname(req: VercelRequest): string {
  // 1. req.url — Vercel Node runtime sets this to the ORIGINAL request URL
  //    e.g. '/testnet/programs/x-4?path=x-4'  or  '/programs/whatever-0'
  if (req.url) {
    const p = req.url.split('?')[0];
    if (p && p !== '/api/program-page' && p !== '/api/program-page/') {
      console.log('[pp] path from req.url:', p);
      return p;
    }
  }

  // 2. x-now-route-matches JSON + x-matched-path prefix
  const routeMatches = req.headers['x-now-route-matches'] as string | undefined;
  const matchedPath  = req.headers['x-matched-path']     as string | undefined;
  if (routeMatches && matchedPath) {
    try {
      const m = JSON.parse(decodeURIComponent(routeMatches)) as Record<string, string>;
      const prefix = matchedPath.replace(/\/:path\*.*$/, '').replace(/\([^)]*\)/g, '').replace(/\?$/, '');
      if (prefix && !prefix.includes(':') && m['path'] !== undefined) {
        const p = prefix + '/' + m['path'];
        console.log('[pp] path from x-now-route-matches:', p);
        return p;
      }
    } catch { /* fall through */ }
  }

  // 3. chain + path from query (if vercel.json injects them explicitly)
  const qChain = req.query['chain'] as string | undefined;
  const pathSegs = req.query['path'];
  const segs = Array.isArray(pathSegs) ? pathSegs.join('/') : (pathSegs ?? '');
  if (segs) {
    if (qChain === 'testnet') {
      const p = '/testnet/programs/' + segs;
      console.log('[pp] path from chain+path query:', p);
      return p;
    }
    if (qChain === 'mainnet') {
      const p = '/programs/' + segs;
      console.log('[pp] path from chain+path query:', p);
      return p;
    }
    // 4. Infer from path content
    if (segs.startsWith('testnet/programs/')) { return '/' + segs; }
    if (segs.startsWith('programs/'))         { return '/' + segs; }
    // Bare tail — default mainnet
    const p = '/programs/' + segs;
    console.log('[pp] path inferred (mainnet default):', p);
    return p;
  }

  console.log('[pp] path fallback: req.url =', req.url);
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

function buildNotFoundMeta(): string {
  const title = 'Program not found \u00b7 GrantFlow';
  return [
    `  <title>${title}</title>`,
    `  <meta name="robots" content="noindex,nofollow" />`,
    `  <link rel="canonical" href="${CANONICAL_BASE}/" />`,
    `  <meta property="og:title" content="${title}" />`,
    `  <meta property="og:url"   content="${CANONICAL_BASE}/" />`,
  ].join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always tag so we can verify the function is reached
  res.setHeader('x-gf-renderer', 'program-page');

  const pathname = getOriginalPathname(req);
  const parsed   = parseUrlPath(pathname);

  console.log('[pp] raw req.url  :', req.url);
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
  console.log('[pp] prog:', prog ? `"${prog.name}" pool=${prog.pool} cancelled=${prog.cancelled} finalized=${prog.finalized}` : 'null (not found)');

  if (!prog) {
    // Program does not exist (exists=false from contract)
    let html = readIndexHtml();
    html = stripDefaultMeta(html);
    html = html.replace('<head>', `<head>\n${buildNotFoundMeta()}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(404).send(html);
  }

  // Non-canonical slug → 301 to canonical URL
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
