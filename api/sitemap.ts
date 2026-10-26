// Vercel serverless function: dynamic sitemap.xml
// GET /sitemap.xml → lists home, explore, all mainnet V5 programs
// Cache: s-maxage=3600

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchProgram, fetchProgramCount, canonicalUrl, CANONICAL_BASE } from './_chain.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const count = await fetchProgramCount('mainnet', 'v5');

  const programUrls: string[] = [];
  const ids = Array.from({ length: count }, (_, i) => i);
  const results = await Promise.allSettled(ids.map(id => fetchProgram('mainnet', id)));
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      const prog = r.value;
      programUrls.push(canonicalUrl('mainnet', prog.id, 'v5', prog.name));
    }
  }

  const staticUrls = [
    { loc: `${CANONICAL_BASE}/`,            priority: '1.0', changefreq: 'weekly'  },
    { loc: `${CANONICAL_BASE}/#v4-explore`, priority: '0.9', changefreq: 'hourly'  },
    { loc: `${CANONICAL_BASE}/how-it-works`,priority: '0.7', changefreq: 'monthly' },
    { loc: `${CANONICAL_BASE}/about`,       priority: '0.6', changefreq: 'monthly' },
    { loc: `${CANONICAL_BASE}/docs`,        priority: '0.6', changefreq: 'monthly' },
  ];

  const programEntries = programUrls.map(loc =>
    `  <url><loc>${loc}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
  ).join('\n');

  const staticEntries = staticUrls.map(u =>
    `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${programEntries}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).send(xml);
}
