#!/usr/bin/env node
/**
 * OG image runner — plain CJS, invoked from generate-og.ts via child_process.spawn('node').
 * Uses satori (JSX-like → SVG with embedded glyph paths) + sharp (→ PNG).
 * Must be .cjs because package.json has "type":"module".
 */
'use strict';
const fs     = require('fs');
const path   = require('path');
const satori = require('satori');
const sharp  = require('sharp');

const W = 1200;
const H = 630;

function loadFonts(projectRoot) {
  const base = path.join(projectRoot, 'node_modules/@fontsource/inter/files');
  // Use latin subset — latin-ext woff has encoding satori 0.33.x cannot parse (renders "NO GLYPH")
  // Latin covers all ASCII + western European characters needed for program names and USDC amounts.
  // Vietnamese program names will use unicode fallback boxes (acceptable for OG images).
  for (const [r, b] of [
    ['inter-latin-400-normal.woff', 'inter-latin-700-normal.woff'],
  ]) {
    const rp = path.join(base, r);
    const bp = path.join(base, b);
    if (fs.existsSync(rp) && fs.existsSync(bp)) return { regular: fs.readFileSync(rp), bold: fs.readFileSync(bp) };
  }
  throw new Error('Inter woff not found. Run: bun add @fontsource/inter');
}

// Text node: a div that renders a text string.
// RULE: any div that contains a string as children must NOT have display:flex.
//       Wrap it in a display:flex div instead so it is positioned correctly.
function textNode(text, style) {
  return { type: 'div', props: { style, children: text } };
}

// Row: outer positioning div (display:flex) wrapping a textNode
function row(outerStyle, textStyle, text) {
  return { type: 'div', props: { style: { display: 'flex', ...outerStyle }, children: textNode(text, textStyle) } };
}

function buildCard(name, pool, sponsor, deadline, isHome) {
  let line1 = name, line2 = '';
  if (!isHome && name.length > 30) {
    const cut = name.lastIndexOf(' ', 30);
    if (cut > 0) { line1 = name.slice(0, cut); line2 = name.slice(cut + 1); }
    else { line1 = name.slice(0, 30) + '…'; }
  }
  const titleSz = isHome ? 72 : (line2 ? 62 : 68);
  const poolTxt = isHome ? 'Powered by USDC on Arc' : `${pool} prize pool`;
  const subTxt  = isHome ? 'Team splits · Push payout · USDC' : deadline;

  // Badge row items — always exactly 1 item (no sponsor in badge to avoid variable-length array)
  // Sponsor shown in title area instead to keep badge row single-child
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
          children: textNode('GrantFlow', { fontSize: 22, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.04em' }),
        },
      },
    },
  };

  // Sponsor sub-label (shown as second line after badge, same row as "by X")
  const sponsorRow = (sponsor && !isHome)
    ? row({ marginBottom: 16 }, { fontSize: 22, color: 'rgba(255,255,255,0.45)' }, `by ${sponsor}`)
    : null;

  const children = [
    badgeRow,
    ...(sponsorRow ? [sponsorRow] : []),
    // Title line 1
    row({ marginBottom: line2 ? 6 : 0 },
      { fontSize: titleSz, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 },
      line1),
    // Title line 2 (optional)
    ...(line2 ? [row({}, { fontSize: 62, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }, line2)] : []),
    // Flex spacer
    { type: 'div', props: { style: { display: 'flex', flex: 1 } } },
    // Prize pool
    row({ marginBottom: 20 },
      { fontSize: 52, fontWeight: 700, color: '#34d399', lineHeight: 1, letterSpacing: '-0.01em' },
      poolTxt),
    // Bottom row
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

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) { console.error('Usage: og-runner.cjs <input.json>'); process.exit(1); }

  const { programs, distDir, projectRoot } = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const { regular, bold } = loadFonts(projectRoot);
  const fonts = [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: bold,    weight: 700, style: 'normal' },
  ];

  async function render(name, pool, sponsor, deadline, isHome) {
    const svg = await satori.default(buildCard(name, pool, sponsor, deadline, isHome), { width: W, height: H, fonts });
    return await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer();
  }

  const ogDir = path.join(distDir, 'og');
  fs.mkdirSync(ogDir, { recursive: true });

  try {
    fs.writeFileSync(path.join(distDir, 'og-image.png'), await render('GrantFlow', '', null, '', true));
    console.log('[og] Wrote og-image.png (homepage)');
  } catch (e) { console.error('[og] homepage failed:', e.message); }

  for (const p of programs) {
    try {
      // Format deadline: if it's a number treat as Unix timestamp, if string use as-is
      let deadlineStr = p.deadline;
      if (typeof deadlineStr === 'number') {
        const d = new Date(deadlineStr * 1000);
        deadlineStr = 'Deadline ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } else if (!deadlineStr) {
        deadlineStr = '';
      }
      const buf  = await render(p.name, String(p.poolUsdc || ''), p.sponsor ? String(p.sponsor) : null, String(deadlineStr), false);
      fs.writeFileSync(path.join(ogDir, `${p.chain}-${p.id}.png`), buf);
      console.log(`[og] Wrote og/${p.chain}-${p.id}.png — "${p.name}"`);
    } catch (e) { console.error(`[og] ${p.chain}-${p.id} failed:`, e.message); }
  }
  console.log(`[og] Done. ${programs.length + 1} PNGs.`);
}

main().catch(e => { console.error('[og] Fatal:', e.message); process.exit(1); });
