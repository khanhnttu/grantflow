/**
 * OG image generator — delegates to scripts/og-runner.js run under plain node.
 * This avoids bun's module resolver treating satori as ESM, which causes
 * per-character "NO GLYPH" boxes instead of rendered text.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

export interface OgProgram {
  id: number;
  chain: 'mainnet' | 'testnet';
  name: string;
  poolUsdc: string;
  sponsor: string | null;
  /** Unix timestamp (number) or pre-formatted string */
  deadline: string | number;
}

export async function writeOgImages(programs: OgProgram[], distDir: string): Promise<void> {
  console.log('[og] Rendering PNGs via og-runner (node)...');

  const inputFile = path.join(PROJECT_ROOT, 'dist', '.og-input.json');
  fs.writeFileSync(inputFile, JSON.stringify({ programs, distDir, projectRoot: PROJECT_ROOT }));

  const runnerPath = path.join(__dirname, 'og-runner.cjs');

  // Pass NODE_PATH so `node` can find CJS modules regardless of package manager layout
  // (bun uses a hardlink store — node_modules/ symlinks may not be direct folders).
  const nodePath = path.join(PROJECT_ROOT, 'node_modules');
  await new Promise<void>((resolve, reject) => {
    const child = cp.spawn('node', [runnerPath, inputFile], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_PATH: nodePath },
    });
    child.on('exit', code => {
      try { fs.unlinkSync(inputFile); } catch { /* ignore */ }
      if (code === 0) resolve(); else reject(new Error(`og-runner exited ${code}`));
    });
    child.on('error', reject);
  });
}
