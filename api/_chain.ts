// Shared onchain reader for Vercel serverless functions.
// Runs on Node.js — can use full viem.
// arc-studio-allow-onchain-literal

import { createPublicClient, http } from 'viem';

// Arc published RPC endpoints — no rate limit documented; used server-side with s-maxage caching.
// arc-studio-allow-onchain-literal
const MAINNET_RPC = (() => {
  const proxyBase = process.env.RPC_PROXY_BASE_URL;
  const proxyToken = process.env.RPC_PROXY_TOKEN;
  const proxyChains = (process.env.RPC_PROXY_CHAINS ?? '').split(',');
  if (proxyBase && proxyToken && proxyChains.includes('Arc')) {
    return `${proxyBase}/api/rpc/Arc?_rpc_token=${proxyToken}`;
  }
  // arc-studio-allow-onchain-literal
  return 'https://rpc.mainnet.arc.io';
})();

// arc-studio-allow-onchain-literal
const TESTNET_RPC = (() => {
  const proxyBase = process.env.RPC_PROXY_BASE_URL;
  const proxyToken = process.env.RPC_PROXY_TOKEN;
  const proxyChains = (process.env.RPC_PROXY_CHAINS ?? '').split(',');
  if (proxyBase && proxyToken && proxyChains.includes('Arc_Testnet')) {
    return `${proxyBase}/api/rpc/Arc_Testnet?_rpc_token=${proxyToken}`;
  }
  // arc-studio-allow-onchain-literal
  return 'https://rpc.testnet.arc.io';
})();

// Deployed contract addresses — same values as VITE_ env vars, readable server-side.
// arc-studio-allow-onchain-literal
const MAINNET_V5 = process.env.VITE_GRANTFLOW_V5_ADDRESS_MAINNET ?? '0xe67ec49a6618cc205fab934fc76f8a271cc77c37';
// arc-studio-allow-onchain-literal
const TESTNET_V5 = process.env.VITE_GRANTFLOW_V5_ADDRESS ?? '0x23d26fb2661497c1e658e8d717df8a7dea2f62c0';
// arc-studio-allow-onchain-literal
const MAINNET_V4 = process.env.VITE_GRANTFLOW_V4_ADDRESS_MAINNET ?? '0x41ffdab65fca60bda9beb455285d29ab753c3d2e';
// arc-studio-allow-onchain-literal
const TESTNET_V4 = process.env.VITE_GRANTFLOW_V4_ADDRESS ?? '0x0754d3359f18be2079c6d3cea29658b464cfe946';
const MAINNET_CHAIN_ID = 5042;
const TESTNET_CHAIN_ID = 5042002;

export type Chain = 'mainnet' | 'testnet';

function getConfig(chain: Chain) {
  const isMainnet = chain === 'mainnet';
  return {
    rpc: isMainnet ? MAINNET_RPC : TESTNET_RPC,
    v5Address: isMainnet ? MAINNET_V5 : TESTNET_V5,
    v4Address: isMainnet ? MAINNET_V4 : TESTNET_V4,
    chainId: isMainnet ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID,
  };
}

// GrantFlowV5.getProgram — exact tuple order from GrantFlowV5.sol
// returns (name, description, sponsor, prizes[], totalDeposited,
//          submissionDeadline, judgingDeadline, programType, category,
//          exists, finalized, cancelled)
const V5_GET_PROGRAM_ABI = [{
  type: 'function',
  name: 'getProgram',
  stateMutability: 'view',
  inputs: [{ name: 'programId', type: 'uint256' }],
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
  ],
}] as const;

// GrantFlowV4.getProgram (legacy) — original flat tuple
const V4_GET_PROGRAM_ABI = [{
  type: 'function',
  name: 'getProgram',
  stateMutability: 'view',
  inputs: [{ name: 'programId', type: 'uint256' }],
  outputs: [
    { name: 'name',               type: 'string'  },
    { name: 'description',        type: 'string'  },
    { name: 'sponsor',            type: 'address' },
    { name: 'prizePool',          type: 'uint256' },
    { name: 'submissionDeadline', type: 'uint256' },
    { name: 'judgingDeadline',    type: 'uint256' },
    { name: 'finalized',          type: 'bool'    },
    { name: 'cancelled',          type: 'bool'    },
  ],
}] as const;

const PROGRAM_COUNT_ABI = [{
  type: 'function',
  name: 'programCount',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

export interface ProgramInfo {
  id: number;
  chain: Chain;
  version: 'v5' | 'v4';
  name: string;
  description: string;
  sponsor: string;
  pool: string;
  poolRaw: string; // raw USDC 6-decimal integer as string
  subDeadline: number;
  judgeDeadline: number;
  finalized: boolean;
  cancelled: boolean;
  sponsorName: string;
  sponsorWebsite: string;
}

function parseSponsorMeta(description: string): { sponsorName: string; sponsorWebsite: string; desc: string } {
  try {
    const env = JSON.parse(description) as Record<string, unknown>;
    if (env.__gf === 1) {
      return {
        sponsorName: String(env.sponsorName ?? ''),
        sponsorWebsite: String(env.sponsorWebsite ?? ''),
        desc: String(env.description ?? ''),
      };
    }
  } catch { /* plain text description */ }
  return { sponsorName: '', sponsorWebsite: '', desc: description };
}

function formatUsdc(raw: bigint): string {
  const n = Number(raw) / 1e6;
  if (n === Math.floor(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function makeClient(chain: Chain) {
  const cfg = getConfig(chain);
  return createPublicClient({
    transport: http(cfg.rpc, { timeout: 8000 }),
    chain: {
      id: cfg.chainId,
      name: chain === 'mainnet' ? 'Arc' : 'Arc Testnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
      rpcUrls: { default: { http: [cfg.rpc] } },
    },
  });
}

export async function fetchProgram(chain: Chain, id: number, version: 'v5' | 'v4' = 'v5'): Promise<ProgramInfo | null> {
  const cfg = getConfig(chain);
  const address = (version === 'v5' ? cfg.v5Address : cfg.v4Address) as `0x${string}`;
  const client = makeClient(chain);

  try {
    if (version === 'v5') {
      const result = await client.readContract({
        address,
        abi: V5_GET_PROGRAM_ABI,
        functionName: 'getProgram',
        args: [BigInt(id)],
      });
      // result is typed as a readonly tuple by viem's const ABI inference
      const { name, description, sponsor, prizes, totalDeposited, submissionDeadline, judgingDeadline, exists, finalized, cancelled } = result;
      console.log(`[chain] v5 raw: exists=${exists} name="${name}" prizes=${JSON.stringify(prizes?.map(String))} totalDeposited=${totalDeposited}`);
      if (!exists) return null;

      // Prize pool: totalDeposited if > 0, else sum of prizes[]
      const pool = totalDeposited > 0n
        ? totalDeposited
        : (prizes ?? []).reduce((acc: bigint, p: bigint) => acc + p, 0n);
      const { sponsorName, sponsorWebsite, desc } = parseSponsorMeta(description);
      return {
        id, chain, version,
        name,
        description: desc || description,
        sponsor,
        pool: formatUsdc(pool),
        poolRaw: pool.toString(),
        subDeadline: Number(submissionDeadline),
        judgeDeadline: Number(judgingDeadline),
        finalized,
        cancelled,
        sponsorName,
        sponsorWebsite,
      };
    } else {
      // V4
      const result = await client.readContract({
        address,
        abi: V4_GET_PROGRAM_ABI,
        functionName: 'getProgram',
        args: [BigInt(id)],
      });
      const { name, description, sponsor, prizePool, submissionDeadline, judgingDeadline, finalized, cancelled } = result;
      console.log(`[chain] v4 raw: name="${name}" pool=${prizePool}`);
      if (!name) return null;
      const { sponsorName, sponsorWebsite, desc } = parseSponsorMeta(description);
      return {
        id, chain, version,
        name,
        description: desc || description,
        sponsor,
        pool: formatUsdc(prizePool),
        poolRaw: prizePool.toString(),
        subDeadline: Number(submissionDeadline),
        judgeDeadline: Number(judgingDeadline),
        finalized,
        cancelled,
        sponsorName,
        sponsorWebsite,
      };
    }
  } catch (err) {
    console.error(`[chain] fetchProgram error chain=${chain} id=${id} version=${version}:`, err);
    return null;
  }
}

export async function fetchProgramCount(chain: Chain, version: 'v5' | 'v4' = 'v5'): Promise<number> {
  const cfg = getConfig(chain);
  const address = (version === 'v5' ? cfg.v5Address : cfg.v4Address) as `0x${string}`;
  const client = makeClient(chain);
  try {
    const count = await client.readContract({
      address,
      abi: PROGRAM_COUNT_ABI,
      functionName: 'programCount',
    });
    return Number(count);
  } catch {
    return 0;
  }
}

export function slugify(str: string): string {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Extract chain, id, and version from URL path patterns. */
export function parseUrlPath(pathname: string): { chain: Chain; id: number; version: 'v5' | 'v4' } | null {
  // /programs/v4/<slug>-<id>
  const v4m = pathname.match(/^\/programs\/v4\/(?:.+-)?(\d+)\/?$/);
  if (v4m) return { chain: 'mainnet', id: parseInt(v4m[1], 10), version: 'v4' };
  // /programs/<slug>-<id>  mainnet v5
  const mn = pathname.match(/^\/programs\/(?:.+-)?(\d+)\/?$/);
  if (mn) return { chain: 'mainnet', id: parseInt(mn[1], 10), version: 'v5' };
  // /testnet/programs/v4/<slug>-<id>
  const v4t = pathname.match(/^\/testnet\/programs\/v4\/(?:.+-)?(\d+)\/?$/);
  if (v4t) return { chain: 'testnet', id: parseInt(v4t[1], 10), version: 'v4' };
  // /testnet/programs/<slug>-<id>
  const tn = pathname.match(/^\/testnet\/programs\/(?:.+-)?(\d+)\/?$/);
  if (tn) return { chain: 'testnet', id: parseInt(tn[1], 10), version: 'v5' };
  return null;
}

export const CANONICAL_BASE = 'https://grantflowapp.vercel.app';

export function canonicalUrl(chain: Chain, id: number, version: string, name: string): string {
  const slug = slugify(name);
  if (version === 'v4') {
    if (chain === 'mainnet') return `${CANONICAL_BASE}/programs/v4/${slug}-${id}`;
    return `${CANONICAL_BASE}/testnet/programs/v4/${slug}-${id}`;
  }
  if (chain === 'mainnet') return `${CANONICAL_BASE}/programs/${slug}-${id}`;
  return `${CANONICAL_BASE}/testnet/programs/${slug}-${id}`;
}
