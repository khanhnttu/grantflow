/**
 * generate-og.ts — generates static OG images for each program as SVG (rendered as PNG via sharp).
 * Falls back to SVG-only if sharp is unavailable.
 * Writes to dist/og/<chain>-<id>.svg (and .png if sharp available).
 *
 * The prerender script calls this to populate dist/og/.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DIST = join(process.cwd(), 'dist');
const OG_DIR = join(DIST, 'og');

export interface OgData {
  id:          number;
  chain:       'mainnet' | 'testnet';
  name:        string;
  pool:        string;
  sponsorName: string;
  subDeadline: number;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

export function buildOgSvg(data: OgData): string {
  const { name, pool, sponsorName, subDeadline, chain } = data;
  const deadlineStr = subDeadline > 0
    ? `Deadline: ${new Date(subDeadline * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';
  const chainLabel = chain === 'testnet' ? 'Arc Testnet' : 'Arc Mainnet';
  const shortSponsor = sponsorName ? truncate(sponsorName, 30) : '';

  const accentColor = '#6366f1'; // indigo — matches GrantFlow brand
  const bg1 = '#0f0f1a';
  const bg2 = '#1a1a2e';

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="pill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Accent bar top -->
  <rect x="0" y="0" width="1200" height="6" fill="url(#pill)"/>

  <!-- GrantFlow wordmark -->
  <text x="80" y="80" font-family="system-ui,sans-serif" font-size="22" font-weight="700"
    fill="${accentColor}" letter-spacing="2">GRANTFLOW</text>
  <text x="80" y="102" font-family="system-ui,sans-serif" font-size="13" fill="#6b7280">
    Onchain grants · USDC prizes · ${esc(chainLabel)}
  </text>

  <!-- Chain badge -->
  <rect x="1060" y="54" width="${chain === 'testnet' ? 120 : 110}" height="28" rx="14"
    fill="${chain === 'testnet' ? '#f59e0b22' : accentColor + '33'}"/>
  <text x="${chain === 'testnet' ? 1074 : 1077}" y="73"
    font-family="system-ui,sans-serif" font-size="12" font-weight="600"
    fill="${chain === 'testnet' ? '#f59e0b' : accentColor}">${esc(chainLabel)}</text>

  <!-- Divider -->
  <line x1="80" y1="130" x2="1120" y2="130" stroke="#ffffff18" stroke-width="1"/>

  <!-- Program name (large) -->
  <text x="80" y="230" font-family="system-ui,sans-serif" font-size="52" font-weight="800"
    fill="#ffffff" text-anchor="start">${esc(truncate(name, 38))}</text>

  <!-- Prize pool -->
  <text x="80" y="310" font-family="system-ui,sans-serif" font-size="38" font-weight="700"
    fill="${accentColor}">${esc(pool)} USDC</text>
  <text x="${80 + pool.length * 22 + 110}" y="310"
    font-family="system-ui,sans-serif" font-size="18" fill="#9ca3af">prize pool</text>

  <!-- Bottom row: sponsor + deadline -->
  ${shortSponsor ? `<text x="80" y="430" font-family="system-ui,sans-serif" font-size="20"
    fill="#d1d5db">by ${esc(shortSponsor)}</text>` : ''}
  ${deadlineStr ? `<text x="${shortSponsor ? 400 : 80}" y="430"
    font-family="system-ui,sans-serif" font-size="18" fill="#6b7280">${esc(deadlineStr)}</text>` : ''}

  <!-- Bottom CTA bar -->
  <rect x="0" y="570" width="1200" height="60" fill="#ffffff08"/>
  <text x="80" y="607" font-family="system-ui,sans-serif" font-size="16" fill="#9ca3af">
    grantflowapp.vercel.app · Auto-payout · Team splits · Built on Arc
  </text>
  <text x="1120" y="607" font-family="system-ui,sans-serif" font-size="16" fill="${accentColor}"
    text-anchor="end">Apply →</text>
</svg>`;
}

export async function writeOgImages(programs: OgData[]): Promise<void> {
  mkdirSync(OG_DIR, { recursive: true });

  // Try to load sharp for SVG→PNG conversion
  let sharpFn: ((buf: Buffer) => Promise<Buffer>) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as (input: Buffer) => {
      png: () => { toBuffer: () => Promise<Buffer> };
    };
    sharpFn = (buf) => sharp(buf).png().toBuffer();
    console.log('[og] sharp loaded — writing PNG');
  } catch {
    console.warn('[og] sharp unavailable — writing SVG only');
  }

  for (const p of programs) {
    const svg = buildOgSvg(p);
    const filename = `${p.chain}-${p.id}`;

    if (sharpFn) {
      try {
        const png = await sharpFn(Buffer.from(svg));
        writeFileSync(join(OG_DIR, `${filename}.png`), png);
        console.log(`[og] Wrote og/${filename}.png`);
        continue;
      } catch (e) {
        console.warn(`[og] sharp failed for ${filename}, falling back to SVG:`, (e as Error).message);
      }
    }
    // SVG fallback
    writeFileSync(join(OG_DIR, `${filename}.svg`), svg, 'utf8');
    console.log(`[og] Wrote og/${filename}.svg`);
  }
  console.log(`[og] Done. ${programs.length} OG images written to dist/og/`);
}
