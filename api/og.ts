// Vercel serverless function: generate 1200×630 PNG OG image per program
// GET /api/og?chain=mainnet&id=0
// Node.js runtime (not Edge) — viem + spawn og-runner.cjs both require Node.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { execFile } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fetchProgram } from './_chain.js';
import type { Chain } from './_chain.js';

function formatDeadline(ts: number): string {
  if (!ts) return '';
  return 'Deadline ' + new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const chain = ((req.query['chain'] as string) ?? 'mainnet') as Chain;
  const idParam = (req.query['id'] as string) ?? '0';
  const id = parseInt(idParam, 10);

  const prog = await fetchProgram(chain, isNaN(id) ? 0 : id);
  const name    = prog?.name        ?? 'GrantFlow Program';
  const poolUsdc = prog ? (Number(prog.poolRaw) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0';
  const sponsor = prog?.sponsorName || null;
  const deadline = prog?.subDeadline ? formatDeadline(prog.subDeadline) : '';

  // Build input file for og-runner.cjs
  const tmpDir   = join(tmpdir(), `og-fn-${Date.now()}`);
  const inputFile = join(tmpDir, 'input.json');
  mkdirSync(tmpDir, { recursive: true });

  // Locate og-runner.cjs: in Vercel functions, cwd() is /var/task (project root)
  const runnerCandidates = [
    join(process.cwd(), 'scripts', 'og-runner.cjs'),
    join(__dirname, '..', 'scripts', 'og-runner.cjs'),
  ];
  let runnerPath = runnerCandidates[0];
  for (const p of runnerCandidates) {
    if (existsSync(p)) { runnerPath = p; break; }
  }

  // Write a single-program input for the runner
  const projectRoot = runnerCandidates[0].replace('/scripts/og-runner.cjs', '');
  writeFileSync(inputFile, JSON.stringify({
    programs: [{ id, chain, name, poolUsdc, sponsor, deadline }],
    distDir: tmpDir,
    projectRoot,
  }));

  const pngBuffer = await new Promise<Buffer>((resolve, reject) => {
    execFile('node', [runnerPath, inputFile], { timeout: 12000 }, (err, stdout, stderr) => {
      if (err) { reject(new Error(stderr || err.message)); return; }
      try {
        const outPath = join(tmpDir, 'og', `${chain}-${id}.png`);
        resolve(readFileSync(outPath));
      } catch (e) {
        reject(new Error('PNG not written: ' + String(e)));
      }
    });
  });

  // Cleanup
  try { unlinkSync(inputFile); } catch { /* ignore */ }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(pngBuffer);
}
