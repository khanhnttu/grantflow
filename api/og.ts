// Vercel Edge function: generate 1200×630 PNG OG image per program.
// Uses @vercel/og (ImageResponse) which bundles its own satori + wasm + fonts.
// GET /api/og?chain=mainnet&id=0
// Note: plain object notation (no JSX) so the file parses correctly in all tools.

import { ImageResponse } from '@vercel/og';
import { fetchProgram } from './_chain.js';
import type { Chain } from './_chain.js';

export const config = { runtime: 'edge' };

const W = 1200;
const H = 630;

function formatDeadline(ts: number): string {
  if (!ts) return '';
  return 'Deadline ' + new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ---- card builder (plain objects, @vercel/og accepts these directly) ----

type Style = Record<string, unknown>;

function div(style: Style, ...children: unknown[]) {
  return { type: 'div', props: { style, children: children.length === 1 ? children[0] : children } };
}
function span(style: Style, text: string) {
  return { type: 'span', props: { style, children: text } };
}

const ROOT_STYLE: Style = {
  display: 'flex', flexDirection: 'column',
  width: W, height: H,
  background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0d1f3c 100%)',
  padding: '56px 72px', fontFamily: 'Inter',
};

function buildCard(name: string, poolUsdc: string, sponsor: string | null, deadline: string) {
  let line1 = name, line2 = '';
  if (name.length > 30) {
    const cut = name.lastIndexOf(' ', 30);
    if (cut > 0) { line1 = name.slice(0, cut); line2 = name.slice(cut + 1); }
    else          { line1 = name.slice(0, 30) + '\u2026'; }
  }
  const titleSz = line2 ? 62 : 68;

  const badge = div(
    { display: 'flex', alignItems: 'center', marginBottom: 28 },
    div(
      { display: 'flex', alignItems: 'center', background: 'rgba(99,102,241,0.25)',
        border: '1px solid rgba(99,102,241,0.5)', borderRadius: 20, padding: '6px 18px' },
      span({ fontSize: 22, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.04em' }, 'GrantFlow'),
    ),
  );

  const sponsorRow = sponsor
    ? div({ display: 'flex', marginBottom: 16 },
        span({ fontSize: 22, color: 'rgba(255,255,255,0.45)' }, `by ${sponsor}`))
    : null;

  const title1 = div({ display: 'flex', marginBottom: line2 ? 6 : 0 },
    span({ fontSize: titleSz, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }, line1));

  const title2 = line2
    ? div({ display: 'flex' },
        span({ fontSize: 62, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }, line2))
    : null;

  const spacer = div({ display: 'flex', flex: 1 });

  const pool = div({ display: 'flex', marginBottom: 20 },
    span({ fontSize: 52, fontWeight: 700, color: '#34d399', lineHeight: 1, letterSpacing: '-0.01em' },
      `${poolUsdc} USDC prize pool`));

  const bottom = div(
    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
    span({ fontSize: 28, color: 'rgba(255,255,255,0.55)' }, deadline),
    span({ fontSize: 24, color: 'rgba(255,255,255,0.35)' }, 'grantflowapp.vercel.app'),
  );

  const children = [
    badge,
    ...(sponsorRow ? [sponsorRow] : []),
    title1,
    ...(title2 ? [title2] : []),
    spacer,
    pool,
    bottom,
  ];

  return div(ROOT_STYLE, ...children);
}

export default async function handler(req: Request) {
  const url    = new URL(req.url);
  const chain  = (url.searchParams.get('chain') ?? 'mainnet') as Chain;
  const idStr  = url.searchParams.get('id') ?? '0';
  const id     = isNaN(parseInt(idStr, 10)) ? 0 : parseInt(idStr, 10);

  console.log(`[og] chain=${chain} id=${id}`);

  const prog     = await fetchProgram(chain, id);
  const name     = prog?.name ?? 'GrantFlow Program';
  const poolUsdc = prog
    ? (Number(prog.poolRaw) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '0';
  const sponsor  = prog?.sponsorName || null;
  const deadline = prog?.subDeadline ? formatDeadline(prog.subDeadline) : '';

  console.log(`[og] prog=${prog ? prog.name : 'null'} pool=${poolUsdc}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ImageResponse(buildCard(name, poolUsdc, sponsor, deadline) as any, {
    width: W, height: H,
  });
}
