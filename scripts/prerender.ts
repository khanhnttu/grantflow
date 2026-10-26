/**
 * prerender.ts — post-build SSG script for GrantFlow.
 *
 * Runs after `vite build`. For every V5 program on mainnet:
 *  1. Fetches program data via viem public client.
 *  2. Writes dist/programs/<slug>-<id>/index.html with per-program
 *     <title>, meta description, og:*, twitter:*, JSON-LD.
 *  3. Also handles /testnet/programs/<slug>-<id>/ for testnet programs.
 * Also writes:
 *  - dist/sitemap.xml   (home + explore + all mainnet programs)
 *  - dist/robots.txt    (allow all, point to sitemap)
 *
 * Browsers get the SPA via the Vercel rewrite — the per-program
 * index.html is only served when the client requests the exact path,
 * which is what crawlers (Googlebot, Twitterbot, Discordbot) do.
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { writeOgImages } from './generate-og';

// ── Config ────────────────────────────────────────────────────────────────────

const CANONICAL_BASE = 'https://grantflowapp.vercel.app';
const DIST = join(process.cwd(), 'dist');

const MAINNET_V5  = '0xe67ec49a6618cc205fab934fc76f8a271cc77c37' as const;
const TESTNET_V5  = '0x23d26fb2661497c1e658e8d717df8a7dea2f62c0' as const;
const MAINNET_RPC = 'https://rpc.mainnet.arc.io';
const TESTNET_RPC = 'https://rpc.testnet.arc.io';
const USDC_DEC    = 6;
const DEFAULT_OG  = `${CANONICAL_BASE}/og-image.png`;

// Minimal ABI for prerender
const ABI = [
  { name: 'programCount', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getProgram',   type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [
      { name: 'name',               type: 'string'    },
      { name: 'description',        type: 'string'    },
      { name: 'sponsor',            type: 'address'   },
      { name: 'prizes',             type: 'uint256[]' },
      { name: 'totalDeposited',     type: 'uint256'   },
      { name: 'submissionDeadline', type: 'uint256'   },
      { name: 'judgingDeadline',    type: 'uint256'   },
      { name: 'programType',        type: 'uint8'     },
      { name: 'category',           type: 'uint8'     },
      { name: 'exists',             type: 'bool'      },
      { name: 'finalized',          type: 'bool'      },
      { name: 'cancelled',          type: 'bool'      },
    ]},
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  const ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function parseSponsorMeta(desc: string) {
  try {
    const j = JSON.parse(desc) as Record<string, unknown>;
    return {
      desc:        typeof j['desc']        === 'string' ? j['desc']        : desc,
      sponsorName: typeof j['sponsorName'] === 'string' ? j['sponsorName'] : '',
      website:     typeof j['website']     === 'string' ? j['website']     : '',
      logo:        typeof j['logo']        === 'string' ? j['logo']        : '',
    };
  } catch {
    return { desc, sponsorName: '', website: '', logo: '' };
  }
}

function buildUrl(chain: 'mainnet' | 'testnet', id: number, name: string): string {
  const slug = `${slugify(name)}-${id}`;
  if (chain === 'testnet') return `${CANONICAL_BASE}/testnet/programs/${slug}`;
  return `${CANONICAL_BASE}/programs/${slug}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildHtml(
  indexTemplate: string,
  opts: {
    title:       string;
    description: string;
    canonicalUrl: string;
    ogTitle:     string;
    ogDesc:      string;
    ogImage:     string;
    jsonLd:      string;
  }
): string {
  const { title, description, canonicalUrl, ogTitle, ogDesc, ogImage, jsonLd } = opts;
  const metaBlock = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title"       content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDesc)}" />
  <meta property="og:image"       content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
  <meta name="twitter:image"       content="${escapeHtml(ogImage)}" />
  <script type="application/ld+json">${jsonLd}</script>`;

  if (!indexTemplate.includes('</head>')) return indexTemplate;
  // Strip all default meta before injecting program-specific meta
  let stripped = indexTemplate
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');
  return stripped.replace('</head>', metaBlock + '\n  </head>');
}

// ── Fetch programs ────────────────────────────────────────────────────────────

interface ProgramMeta {
  id:          number;
  name:        string;
  desc:        string;
  sponsorName: string;
  pool:        string;
  prizeCount:  number;
  subDeadline: number;
  chain:       'mainnet' | 'testnet';
  url:         string;
}

async function fetchPrograms(
  chain: 'mainnet' | 'testnet',
  address: `0x${string}`,
  rpc: string
): Promise<ProgramMeta[]> {
  const client = createPublicClient({ transport: http(rpc) });
  let count: number;
  try {
    const raw = await client.readContract({
      address, abi: ABI, functionName: 'programCount',
    });
    count = Number(raw);
  } catch (e) {
    console.warn(`[prerender] Could not fetch programCount for ${chain}: ${String(e)}`);
    return [];
  }
  if (count === 0) return [];

  const results: ProgramMeta[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const r = await client.readContract({
        address, abi: ABI, functionName: 'getProgram', args: [BigInt(i)],
      }) as readonly [string, string, string, readonly bigint[], bigint, bigint, bigint, number, number, boolean, boolean, boolean];
      const [name, description, , prizes, totalDeposited] = r;
      const subDeadline = Number(r[5]);
      const meta = parseSponsorMeta(description);
      results.push({
        id: i,
        name,
        desc:        meta.desc,
        sponsorName: meta.sponsorName,
        pool:        formatUnits(totalDeposited, USDC_DEC),
        prizeCount:  prizes.length,
        subDeadline,
        chain,
        url: buildUrl(chain, i, name),
      });
    } catch (e) {
      console.warn(`[prerender] Could not fetch program ${i} on ${chain}: ${String(e)}`);
    }
  }
  return results;
}

// ── Write per-program HTML ────────────────────────────────────────────────────

function writeProgramPage(indexTemplate: string, prog: ProgramMeta): string {
  const title = `${prog.name} — ${prog.pool} USDC · GrantFlow`;
  const sponsor = prog.sponsorName ? ` by ${prog.sponsorName}` : '';
  const deadline = prog.subDeadline > 0
    ? ` · deadline ${new Date(prog.subDeadline * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';
  const description = `${prog.pool} USDC prize pool${sponsor}${deadline}. ${prog.desc.slice(0, 120)}`;
  const ogImage = `${CANONICAL_BASE}/og/${prog.chain}-${prog.id}.png`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: prog.name,
    description: prog.desc.slice(0, 300),
    url: prog.url,
    organizer: prog.sponsorName ? { '@type': 'Organization', name: prog.sponsorName } : undefined,
    offers: {
      '@type': 'Offer',
      price: prog.pool,
      priceCurrency: 'USDC',
      availability: 'https://schema.org/InStock',
    },
  });

  // Determine output path
  // mainnet: dist/programs/<slug>-<id>/index.html
  // testnet: dist/testnet/programs/<slug>-<id>/index.html
  const slug = `${slugify(prog.name)}-${prog.id}`;
  const relPath = prog.chain === 'testnet'
    ? `testnet/programs/${slug}`
    : `programs/${slug}`;
  const dir = join(DIST, relPath);
  mkdirSync(dir, { recursive: true });
  const html = buildHtml(indexTemplate, {
    title,
    description,
    canonicalUrl: prog.url,
    ogTitle: title,
    ogDesc: description,
    ogImage,
    jsonLd,
  });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
  console.log(`[prerender] Wrote ${relPath}/index.html`);
  return relPath;
}

// ── Sitemap ───────────────────────────────────────────────────────────────────

function writeSitemap(programs: ProgramMeta[]): void {
  const now = new Date().toISOString().slice(0, 10);
  const static_urls = [
    { loc: CANONICAL_BASE + '/',           changefreq: 'weekly',  priority: '1.0' },
    { loc: CANONICAL_BASE + '/#v4-explore', changefreq: 'hourly', priority: '0.9' },
    { loc: CANONICAL_BASE + '/how-it-works', changefreq: 'monthly', priority: '0.7' },
    { loc: CANONICAL_BASE + '/about',       changefreq: 'monthly', priority: '0.6' },
    { loc: CANONICAL_BASE + '/docs',        changefreq: 'monthly', priority: '0.6' },
  ];

  const prog_urls = programs.map(p => ({
    loc: p.url,
    changefreq: p.subDeadline * 1000 > Date.now() ? 'hourly' : 'monthly',
    priority: p.chain === 'mainnet' ? '0.8' : '0.5',
  }));

  const all = [...static_urls, ...prog_urls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf8');
  console.log(`[prerender] Wrote sitemap.xml (${all.length} URLs)`);
}

// ── Robots ────────────────────────────────────────────────────────────────────

function writeRobots(): void {
  const txt = `User-agent: *
Allow: /

Sitemap: ${CANONICAL_BASE}/sitemap.xml
`;
  writeFileSync(join(DIST, 'robots.txt'), txt, 'utf8');
  console.log('[prerender] Wrote robots.txt');
}

// ── Homepage meta injection ───────────────────────────────────────────────────

function writeHomepageMeta(indexTemplate: string): void {
  const html = buildHtml(indexTemplate, {
    title:       'GrantFlow — Onchain grants and bounties paid in USDC',
    description: 'Create onchain grant programs and bounties. Winners and team members receive USDC prizes automatically at finalize. Built on Arc — USDC is native gas.',
    canonicalUrl: CANONICAL_BASE + '/',
    ogTitle:     'GrantFlow — Onchain grants and bounties paid in USDC',
    ogDesc:      'Create, submit, judge, and payout onchain grant programs. Prizes push directly to winners. Built on Arc with USDC as native gas.',
    ogImage:     DEFAULT_OG,
    jsonLd:      JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'GrantFlow',
      url: CANONICAL_BASE,
      description: 'Onchain grant management platform. USDC prize payouts on Arc.',
      applicationCategory: 'FinanceApplication',
    }),
  });
  writeFileSync(join(DIST, 'index.html'), html, 'utf8');
  console.log('[prerender] Updated index.html with homepage meta');
}

// ── vercel.json update ────────────────────────────────────────────────────────

function writeVercelConfig(_programs: ProgramMeta[]): void {
  const config = {
    headers: [
      {
        source: '/og/(.*)\\.png',
        headers: [
          { key: 'Cache-Control',  value: 's-maxage=300, stale-while-revalidate=600' },
          { key: 'Content-Type',   value: 'image/png' },
        ],
      },
      {
        source: '/og/(.*)',
        headers: [{ key: 'Cache-Control', value: 's-maxage=300, stale-while-revalidate=600' }],
      },
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 's-maxage=3600' }],
      },
    ],
    redirects: [
      { source: '/p/v5-mainnet/:id', destination: '/programs/program-:id', statusCode: 308 },
      { source: '/p/v5-testnet/:id', destination: '/testnet/programs/program-:id', statusCode: 308 },
    ],
    rewrites: [{ source: '/(.*)', destination: '/index.html' }],
  };

  writeFileSync(join(DIST, 'vercel.json'), JSON.stringify(config, null, 2), 'utf8');
  console.log('[prerender] Updated vercel.json with cache headers');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[prerender] Starting...');

  // Read the Vite-built index.html as the template
  const indexTemplate = readFileSync(join(DIST, 'index.html'), 'utf8');

  // Fetch programs from mainnet + testnet in parallel
  const [mainnetProgs, testnetProgs] = await Promise.all([
    fetchPrograms('mainnet', MAINNET_V5, MAINNET_RPC),
    fetchPrograms('testnet', TESTNET_V5, TESTNET_RPC),
  ]);

  console.log(`[prerender] Found ${mainnetProgs.length} mainnet + ${testnetProgs.length} testnet V5 programs`);

  const all = [...mainnetProgs, ...testnetProgs];

  // Write per-program index.html files
  for (const prog of all) {
    writeProgramPage(indexTemplate, prog);
  }

  // Write sitemap (mainnet programs only for canonical SEO)
  writeSitemap(mainnetProgs);

  // Write robots.txt
  writeRobots();

  // Generate OG images (PNG via sharp, SVG fallback)
  await writeOgImages(
    all.map(p => ({
      id:       p.id,
      chain:    p.chain,
      name:     p.name,
      poolUsdc: p.pool,
      sponsor:  p.sponsorName ?? null,
      deadline: p.subDeadline,
    })),
    DIST,
  );

  // Update homepage meta in dist/index.html
  writeHomepageMeta(indexTemplate);

  // Write dist/vercel.json with headers, 301 redirects, and SPA rewrite
  writeVercelConfig(all);

  console.log(`[prerender] Done. ${all.length} program pages, sitemap, robots.txt, OG images.`);
}

main().catch(e => {
  console.error('[prerender] Fatal:', e);
  process.exit(1);
});
