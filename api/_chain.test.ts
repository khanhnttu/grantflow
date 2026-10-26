// Unit tests for _chain.ts helpers — no network, no viem client.
// Run with: bun test api/_chain.test.ts

import { describe, it, expect, mock, beforeAll } from 'bun:test';

// ---------- mock viem before importing _chain ----------
const mockReadContract = mock(async () => undefined as unknown);

mock.module('viem', () => ({
  createPublicClient: () => ({ readContract: mockReadContract }),
  http: () => ({}),
}));

// Import helpers after mock is in place
const { fetchProgram, parseUrlPath, slugify, canonicalUrl } = await import('./_chain.js');

// ---------- helpers ----------
describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('GrantFlow Mainnet Launch Test')).toBe('grantflow-mainnet-launch-test');
  });
  it('strips combining diacritics (NFD)', () => {
    // NFD strips combining marks; base letters are retained.
    // 'Tổ chức' → base letters 'To chuc' after NFD strip → 'to-chuc'
    expect(slugify('Tổ chức')).toBe('to-chuc');
    expect(slugify('Résumé')).toBe('resume');
  });
  it('caps at 60 chars', () => {
    expect(slugify('a'.repeat(80)).length).toBeLessThanOrEqual(60);
  });
});

describe('parseUrlPath', () => {
  it('mainnet v5', () => {
    expect(parseUrlPath('/programs/grantflow-0')).toEqual({ chain: 'mainnet', id: 0, version: 'v5' });
  });
  it('testnet v5', () => {
    expect(parseUrlPath('/testnet/programs/cancel-test-4')).toEqual({ chain: 'testnet', id: 4, version: 'v5' });
  });
  it('mainnet v4', () => {
    expect(parseUrlPath('/programs/v4/foo-bar-12')).toEqual({ chain: 'mainnet', id: 12, version: 'v4' });
  });
  it('testnet v4', () => {
    expect(parseUrlPath('/testnet/programs/v4/foo-3')).toEqual({ chain: 'testnet', id: 3, version: 'v4' });
  });
  it('non-canonical slug still parses id', () => {
    expect(parseUrlPath('/programs/whatever-0')).toEqual({ chain: 'mainnet', id: 0, version: 'v5' });
  });
  it('returns null for unknown paths', () => {
    expect(parseUrlPath('/about')).toBeNull();
    expect(parseUrlPath('/api/og')).toBeNull();
  });
});

describe('canonicalUrl', () => {
  it('mainnet v5', () => {
    expect(canonicalUrl('mainnet', 0, 'v5', 'GrantFlow Mainnet Launch Test'))
      .toBe('https://grantflowapp.vercel.app/programs/grantflow-mainnet-launch-test-0');
  });
  it('testnet v5', () => {
    expect(canonicalUrl('testnet', 4, 'v5', 'Cancel Test'))
      .toBe('https://grantflowapp.vercel.app/testnet/programs/cancel-test-4');
  });
});

// ---------- fetchProgram: mocked onchain reads ----------
// V5 tuple order: [name, description, sponsor, prizes[], totalDeposited,
//   submissionDeadline, judgingDeadline, programType, category,
//   exists, finalized, cancelled]

describe('fetchProgram v5', () => {
  it('returns ProgramInfo for an existing program', async () => {
    mockReadContract.mockResolvedValueOnce([
      'My Grant',                         // name
      '{"__gf":1,"description":"A desc","sponsorName":"Acme","sponsorWebsite":"https://acme.com"}',
      '0x1234567890123456789012345678901234567890', // sponsor
      [500_000n, 300_000n],               // prizes[]  (0.5 + 0.3 USDC)
      800_000n,                           // totalDeposited (0.8 USDC)
      1_800_000_000n,                     // submissionDeadline
      1_900_000_000n,                     // judgingDeadline
      0,                                  // programType
      0,                                  // category
      true,                               // exists
      false,                              // finalized
      false,                              // cancelled
    ]);

    const prog = await fetchProgram('mainnet', 7, 'v5');
    expect(prog).not.toBeNull();
    expect(prog!.name).toBe('My Grant');
    expect(prog!.pool).toBe('0.8');          // totalDeposited wins
    expect(prog!.exists).toBeUndefined();    // not exposed on ProgramInfo
    expect(prog!.sponsorName).toBe('Acme');
    expect(prog!.finalized).toBe(false);
    expect(prog!.cancelled).toBe(false);
  });

  it('returns ProgramInfo for a cancelled program (exists=true)', async () => {
    mockReadContract.mockResolvedValueOnce([
      'Cancelled Grant', '', '0x0000000000000000000000000000000000000001',
      [], 0n, 0n, 0n, 0, 0,
      true,   // exists — cancelled program still exists
      false, true,
    ]);
    const prog = await fetchProgram('testnet', 2, 'v5');
    expect(prog).not.toBeNull();
    expect(prog!.cancelled).toBe(true);
    expect(prog!.pool).toBe('0');
  });

  it('returns null when exists=false', async () => {
    mockReadContract.mockResolvedValueOnce([
      '', '', '0x0000000000000000000000000000000000000000',
      [], 0n, 0n, 0n, 0, 0,
      false,  // does not exist
      false, false,
    ]);
    const prog = await fetchProgram('mainnet', 999, 'v5');
    expect(prog).toBeNull();
  });

  it('uses sum of prizes[] when totalDeposited is 0', async () => {
    mockReadContract.mockResolvedValueOnce([
      'Prize-only Grant', '', '0x0000000000000000000000000000000000000001',
      [1_000_000n, 500_000n], // prizes: 1 + 0.5 USDC
      0n,                     // totalDeposited = 0 → use prizes sum
      0n, 0n, 0, 0, true, false, false,
    ]);
    const prog = await fetchProgram('testnet', 0, 'v5');
    expect(prog!.pool).toBe('1.5');
  });
});

describe('fetchProgram v4', () => {
  it('returns ProgramInfo for a V4 program', async () => {
    mockReadContract.mockResolvedValueOnce([
      'Old Grant', 'A description',
      '0x0000000000000000000000000000000000000002',
      2_000_000n,             // prizePool 2 USDC
      1_700_000_000n, 1_800_000_000n,
      false, false,
    ]);
    const prog = await fetchProgram('mainnet', 5, 'v4');
    expect(prog).not.toBeNull();
    expect(prog!.pool).toBe('2');
    expect(prog!.version).toBe('v4');
  });

  it('returns null when name is empty string (V4 not-found)', async () => {
    mockReadContract.mockResolvedValueOnce([
      '', '', '0x0000000000000000000000000000000000000000',
      0n, 0n, 0n, false, false,
    ]);
    expect(await fetchProgram('mainnet', 999, 'v4')).toBeNull();
  });
});
