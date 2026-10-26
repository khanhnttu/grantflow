// Vercel serverless function: generate 1200×630 PNG OG image per program
// GET /api/og?chain=mainnet&id=0
// arc-studio-allow-onchain-literal

import { ImageResponse } from '@vercel/og';
import type { VercelRequest } from '@vercel/node';
import { fetchProgram } from './_chain.js';
import type { Chain } from './_chain.js';

export const config = { runtime: 'edge' };

export default async function handler(req: VercelRequest) {
  const url = new URL(req.url ?? '', 'https://grantflowapp.vercel.app');
  const chain = (url.searchParams.get('chain') ?? 'mainnet') as Chain;
  const idParam = url.searchParams.get('id') ?? '0';
  const id = parseInt(idParam, 10);

  const prog = await fetchProgram(chain, isNaN(id) ? 0 : id);
  const name    = prog?.name        ?? 'GrantFlow Program';
  const pool    = prog?.pool        ?? '—';
  const sponsor = prog?.sponsorName || (prog ? prog.sponsor.slice(0, 6) + '…' + prog.sponsor.slice(-4) : '');
  const phase   = prog?.finalized ? 'Finalized' : prog?.cancelled ? 'Cancelled' : 'Open';
  const network = chain === 'mainnet' ? 'Arc Mainnet' : 'Arc Testnet';

  const resp = new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
          padding: '60px 72px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        children: [
          // Header row
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: '12px' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: '800', fontSize: '18px',
                          },
                          children: 'G',
                        },
                      },
                      { type: 'span', props: { style: { color: 'white', fontWeight: '700', fontSize: '20px' }, children: 'GrantFlow' } },
                    ],
                  },
                },
                // Phase pill
                {
                  type: 'div',
                  props: {
                    style: {
                      background: phase === 'Open' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                      border: `1px solid ${phase === 'Open' ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.4)'}`,
                      borderRadius: '20px', padding: '6px 16px',
                      color: phase === 'Open' ? '#4ade80' : '#a5b4fc',
                      fontSize: '14px', fontWeight: '600',
                    },
                    children: `${phase} · ${network}`,
                  },
                },
              ],
            },
          },
          // Program name
          {
            type: 'div',
            props: {
              style: {
                color: 'white',
                fontSize: name.length > 40 ? '48px' : '64px',
                fontWeight: '800',
                lineHeight: '1.1',
                maxWidth: '900px',
                letterSpacing: '-1px',
              },
              children: name,
            },
          },
          // Footer row: pool + sponsor
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
              children: [
                // Prize pool
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', gap: '4px' },
                    children: [
                      { type: 'span', props: { style: { color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }, children: 'Prize Pool' } },
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', alignItems: 'baseline', gap: '6px' },
                          children: [
                            { type: 'span', props: { style: { color: '#fbbf24', fontSize: '52px', fontWeight: '800', lineHeight: '1' }, children: pool } },
                            { type: 'span', props: { style: { color: '#fbbf24', fontSize: '24px', fontWeight: '700' }, children: 'USDC' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                // Sponsor
                sponsor ? {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' },
                    children: [
                      { type: 'span', props: { style: { color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }, children: 'Sponsor' } },
                      { type: 'span', props: { style: { color: 'rgba(255,255,255,0.85)', fontSize: '22px', fontWeight: '600' }, children: sponsor } },
                    ],
                  },
                } : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630 }
  );

  // Add cache headers
  const headers = new Headers(resp.headers);
  headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return new Response(resp.body, { status: resp.status, headers });
}
