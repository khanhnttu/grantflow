// Vercel serverless function: generate 1200×630 PNG OG image per program
// GET /api/og?chain=mainnet&id=0
// Node.js runtime — satori + sharp inlined (no child_process).
// Font files are bundled via includeFiles in vercel.json.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import sharp from 'sharp';
import { fetchProgram } from './_chain.js';
import type { Chain } from './_chain.js';

// ESM-safe path resolution.
// In Vercel functions the file lives at /var/task/api/og.js after build.
// Fonts are bundled beside it via includeFiles.
const _dir = join(fileURLToPath(import.meta.url), '..');
const FONTS_BASE = join(_dir, '..', 'node_modules', '@fontsource', 'inter', 'files');

const W = 1200;
const H = 630;

function loadFonts(): { regular: Buffer; bold: Buffer } {
  // Latin subset WOFF — latin-ext has an encoding satori 0.33.x cannot parse.
  const regular = readFileSync(join(FONTS_BASE, 'inter-latin-400-normal.woff'));
  const bold    = readFileSync(join(FONTS_BASE, 'inter-latin-700-normal.woff'));
  return { regular, bold };
}

// Text leaf: a div with a string child.  Must NOT have display:flex (satori rule).
function textNode(text: string, style: Record<string, unknown>) {
  return { type: 'div', props: { style, children: text } };
}

// Positioned row: outer flex div → inner text leaf.
function row(outerStyle: Record<string, unknown>, textStyle: Record<string, unknown>, text: string) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', ...outerStyle },
      children: textNode(text, textStyle),
    },
  };
}

function buildCard(
  name: string,
  poolUsdc: string,
  sponsor: string | null,
  deadline: string,
  isHome: boolean,
) {
  let line1 = name, line2 = '';
  if (!isHome && name.length > 30) {
    const cut = name.lastIndexOf(' ', 30);
    if (cut > 0) { line1 = name.slice(0, cut); line2 = name.slice(cut + 1); }
    else          { line1 = name.slice(0, 30) + '\u2026'; }
  }
  const titleSz = isHome ? 72 : (line2 ? 62 : 68);
  const poolTxt = isHome ? 'Powered by USDC on Arc' : `${poolUsdc} USDC prize pool`;
  const subTxt  = isHome ? 'Team splits \u00b7 Push payout \u00b7 USDC' : deadline;

  const badgeRow = {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'center', marginBottom: 28 },
      children: {
        type: 'div',
        props: {
          style: {
            display: 'flex', alignItems: 'center',
            background: 'rgba(99,102,241,0.25)',
            border: '1px solid rgba(99,102,241,0.5)',
            borderRadius: 20, padding: '6px 18px',
          },
          children: textNode('GrantFlow', {
            fontSize: 22, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.04em',
          }),
        },
      },
    },
  };

  const sponsorRow = (sponsor && !isHome)
    ? row({ marginBottom: 16 },
        { fontSize: 22, color: 'rgba(255,255,255,0.45)' },
        `by ${sponsor}`)
    : null;

  const children = [
    badgeRow,
    ...(sponsorRow ? [sponsorRow] : []),
    row(
      { marginBottom: line2 ? 6 : 0 },
      { fontSize: titleSz, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 },
      line1,
    ),
    ...(line2 ? [row(
      {},
      { fontSize: 62, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 },
      line2,
    )] : []),
    { type: 'div', props: { style: { display: 'flex', flex: 1 } } },
    row(
      { marginBottom: 20 },
      { fontSize: 52, fontWeight: 700, color: '#34d399', lineHeight: 1, letterSpacing: '-0.01em' },
      poolTxt,
    ),
    {
      type: 'div',
      props: {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
        children: [
          { type: 'div', props: { style: { display: 'flex' },
            children: textNode(subTxt, { fontSize: 28, color: 'rgba(255,255,255,0.55)' }) } },
          { type: 'div', props: { style: { display: 'flex' },
            children: textNode('grantflowapp.vercel.app', { fontSize: 24, color: 'rgba(255,255,255,0.35)' }) } },
        ],
      },
    },
  ];

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column',
        width: W, height: H,
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0d1f3c 100%)',
        padding: '56px 72px', fontFamily: 'Inter',
      },
      children,
    },
  };
}

// Cache fonts across warm invocations
let _fonts: Array<{ name: string; data: Buffer; weight: number; style: 'normal' }> | null = null;
function getFonts() {
  if (!_fonts) {
    const { regular, bold } = loadFonts();
    _fonts = [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: bold,    weight: 700, style: 'normal' },
    ];
  }
  return _fonts;
}

async function renderPng(
  name: string, poolUsdc: string, sponsor: string | null, deadline: string, isHome: boolean,
): Promise<Buffer> {
  const card = buildCard(name, poolUsdc, sponsor, deadline, isHome);
  // satori types its node param as React.ReactNode; cast through unknown.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await satori(card as any, {
    width: W, height: H, fonts: getFonts(),
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer();
}

function formatDeadline(ts: number): string {
  if (!ts) return '';
  return 'Deadline ' + new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const chain  = ((req.query['chain'] as string) ?? 'mainnet') as Chain;
  const idStr  = (req.query['id'] as string) ?? '0';
  const id     = isNaN(parseInt(idStr, 10)) ? 0 : parseInt(idStr, 10);

  const prog     = await fetchProgram(chain, id);
  const name     = prog?.name ?? 'GrantFlow Program';
  const poolUsdc = prog ? (Number(prog.poolRaw) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0';
  const sponsor  = prog?.sponsorName || null;
  const deadline = prog?.subDeadline ? formatDeadline(prog.subDeadline) : '';

  try {
    const buf = await renderPng(name, poolUsdc, sponsor, deadline, false);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(buf);
  } catch (err) {
    console.error('[og] render error', err);
    res.status(500).send('OG render failed');
  }
}
