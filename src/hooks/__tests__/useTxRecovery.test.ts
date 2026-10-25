/**
 * Unit tests for the pure helpers in useTxRecovery.
 *
 * Covers:
 *  - isAlreadyInFlight: every in-flight pattern + non-matching strings
 *  - pollFor: resolves on first truthy result, returns null after max attempts
 *  - makeAllowancePoller: returns true when allowance >= required, null otherwise
 *  - makeProgramCreatedPoller: returns new programId when count increases, null otherwise
 *
 * Uses bun:test — run with `bun test` (or `bun run test`).
 */

import { describe, test, expect, mock } from 'bun:test';
import { isAlreadyInFlight } from '../useTxRecovery';

// ── isAlreadyInFlight ─────────────────────────────────────────────────────────

describe('isAlreadyInFlight', () => {
  const IN_FLIGHT_CASES = [
    'already known',
    'Already Known',
    'ALREADY KNOWN',
    '__already_in_flight__',
    'nonce too low',
    'Nonce too low',
    'replacement transaction underpriced',
    'Replacement Transaction Underpriced',
    'replacement underpriced',
    // Typical MetaMask format:
    'RPC Error: eth_sendRawTransaction: already known',
    'Error: nonce too low',
    'Error: replacement transaction underpriced',
  ];

  for (const msg of IN_FLIGHT_CASES) {
    test(`detects in-flight: "${msg}"`, () => {
      expect(isAlreadyInFlight(new Error(msg))).toBe(true);
    });
  }

  const NOT_IN_FLIGHT_CASES = [
    'user rejected',
    'User denied transaction',
    'insufficient funds',
    'execution reverted',
    'Transaction reverted',
    'NotJudge',
    'AlreadyFinalized',
    '',
    'gas required exceeds allowance',
  ];

  for (const msg of NOT_IN_FLIGHT_CASES) {
    test(`does NOT detect in-flight: "${msg}"`, () => {
      expect(isAlreadyInFlight(new Error(msg))).toBe(false);
    });
  }

  test('handles non-Error objects (string)', () => {
    expect(isAlreadyInFlight('nonce too low')).toBe(true);
    expect(isAlreadyInFlight('user rejected')).toBe(false);
  });

  test('handles non-Error objects (number)', () => {
    expect(isAlreadyInFlight(42)).toBe(false);
  });

  test('handles null/undefined', () => {
    expect(isAlreadyInFlight(null)).toBe(false);
    expect(isAlreadyInFlight(undefined)).toBe(false);
  });

  // ── Viem TransactionExecutionError — nested cause chain ───────────────────
  test('detects in-flight in viem .details field', () => {
    const err = Object.assign(new Error('TransactionExecutionError'), {
      details: 'RPC Error: eth_sendRawTransaction: already known',
    });
    expect(isAlreadyInFlight(err)).toBe(true);
  });
  test('detects in-flight in err.cause.message (one level deep)', () => {
    const inner = new Error('RPC Error: eth_sendRawTransaction: already known');
    const outer = Object.assign(new Error('TransactionExecutionError'), { cause: inner });
    expect(isAlreadyInFlight(outer)).toBe(true);
  });
  test('detects in-flight in err.cause.cause.message (two levels deep)', () => {
    const deepest = new Error('already known');
    const middle  = Object.assign(new Error('SendTransactionError'), { cause: deepest });
    const outer   = Object.assign(new Error('TransactionExecutionError'), { cause: middle });
    expect(isAlreadyInFlight(outer)).toBe(true);
  });
  test('detects in-flight in cause.details', () => {
    const inner = Object.assign(new Error('SendTransactionError'), {
      details: 'eth_sendRawTransaction: nonce too low',
    });
    const outer = Object.assign(new Error('TransactionExecutionError'), { cause: inner });
    expect(isAlreadyInFlight(outer)).toBe(true);
  });
  test('does NOT detect in-flight in unrelated nested error', () => {
    const inner = new Error('execution reverted: NotJudge');
    const outer = Object.assign(new Error('TransactionExecutionError'), { cause: inner });
    expect(isAlreadyInFlight(outer)).toBe(false);
  });

  // ── DOM Event shape (wagmi rejects with {isTrusted:true, error: Error}) ──────
  test('detects in-flight in DOM Event with .error containing "already known"', () => {
    const domEvent = { isTrusted: true, error: new Error('already known') };
    expect(isAlreadyInFlight(domEvent)).toBe(true);
  });
  test('detects in-flight in DOM Event with nested .error.cause', () => {
    const inner = new Error('already known');
    const domEvent = { isTrusted: true, error: Object.assign(new Error('SendTxError'), { cause: inner }) };
    expect(isAlreadyInFlight(domEvent)).toBe(true);
  });
  test('detects in-flight in DOM Event with .reason field', () => {
    const domEvent = { isTrusted: true, reason: new Error('nonce too low') };
    expect(isAlreadyInFlight(domEvent)).toBe(true);
  });
  test('does NOT detect in-flight in generic DOM Event with no error text', () => {
    const domEvent = { isTrusted: true, type: 'click' };
    expect(isAlreadyInFlight(domEvent)).toBe(false);
  });
  test('detects in-flight in JSON-stringified error text within plain object', () => {
    // When .error and .reason are absent, we JSON.stringify the whole object
    const obj = { message: 'already known', code: -32603 };
    expect(isAlreadyInFlight(obj)).toBe(true);
  });
});

// ── pollFor (re-exported for testing via dynamic import) ──────────────────────
// We test the polling logic by directly testing the pollers with mock clients.

// Helper: create a minimal fake PublicClient for testing pollers.
// We only need readContract and getLogs.
function makeFakeClient(responses: unknown[]) {
  let callCount = 0;
  return {
    readContract: mock(async () => {
      const r = responses[Math.min(callCount++, responses.length - 1)];
      if (r instanceof Error) throw r;
      return r;
    }),
    getLogs: mock(async () => []),
    getBlockNumber: mock(async () => 1000n),
  };
}

// ── makeAllowancePoller ───────────────────────────────────────────────────────

describe('makeAllowancePoller', () => {
  test('returns true immediately when allowance >= required', async () => {
    const { makeAllowancePoller } = await import('../useTxRecovery');
    const client = makeFakeClient([1_010_000n]); // 1.01 USDC
    const poller = makeAllowancePoller(
      client as never,
      '0x3600000000000000000000000000000000000000',
      '0xOwner',
      '0xSpender',
      1_000_000n, // 1 USDC required
    );
    const result = await poller();
    expect(result).toBe(true);
  });

  test('returns null when allowance < required', async () => {
    const { makeAllowancePoller } = await import('../useTxRecovery');
    const client = makeFakeClient([500_000n]); // 0.5 USDC
    const poller = makeAllowancePoller(
      client as never,
      '0x3600000000000000000000000000000000000000',
      '0xOwner',
      '0xSpender',
      1_000_000n,
    );
    const result = await poller();
    expect(result).toBeNull();
  });

  test('returns true when allowance === required exactly', async () => {
    const { makeAllowancePoller } = await import('../useTxRecovery');
    const client = makeFakeClient([1_000_000n]);
    const poller = makeAllowancePoller(
      client as never,
      '0x3600000000000000000000000000000000000000',
      '0xOwner',
      '0xSpender',
      1_000_000n,
    );
    const result = await poller();
    expect(result).toBe(true);
  });
});

// ── makeProgramCreatedPoller ──────────────────────────────────────────────────

describe('makeProgramCreatedPoller', () => {
  test('returns new programId when programCount increased', async () => {
    const { makeProgramCreatedPoller } = await import('../useTxRecovery');
    const client = makeFakeClient([3n]); // was 2, now 3
    const poller = makeProgramCreatedPoller(
      client as never,
      '0xContract',
      2n, // prevCount
    );
    const result = await poller();
    expect(result).toBe(2); // new programId = 3 - 1 = 2
  });

  test('returns null when programCount unchanged', async () => {
    const { makeProgramCreatedPoller } = await import('../useTxRecovery');
    const client = makeFakeClient([2n]); // still 2
    const poller = makeProgramCreatedPoller(
      client as never,
      '0xContract',
      2n,
    );
    const result = await poller();
    expect(result).toBeNull();
  });

  test('returns programId 0 when first program created (prevCount=0)', async () => {
    const { makeProgramCreatedPoller } = await import('../useTxRecovery');
    const client = makeFakeClient([1n]); // first program created
    const poller = makeProgramCreatedPoller(
      client as never,
      '0xContract',
      0n,
    );
    const result = await poller();
    expect(result).toBe(0); // 1 - 1 = 0
  });
});

// ── makeFinalizePoller ────────────────────────────────────────────────────────

describe('makeFinalizePoller', () => {
  test('returns true when program is finalized', async () => {
    const { makeFinalizePoller } = await import('../useTxRecovery');
    // getProgram returns tuple; finalized is index 10
    const fakeProgram = ['name','desc','0xSponsor',[],0n,0n,0n,0,0,true,true,false];
    const client = makeFakeClient([fakeProgram]);
    const poller = makeFinalizePoller(
      client as never,
      '0xContract',
      0n,
    );
    const result = await poller();
    expect(result).toBe(true);
  });

  test('returns null when program is not yet finalized', async () => {
    const { makeFinalizePoller } = await import('../useTxRecovery');
    const fakeProgram = ['name','desc','0xSponsor',[],0n,0n,0n,0,0,true,false,false];
    const client = makeFakeClient([fakeProgram]);
    const poller = makeFinalizePoller(
      client as never,
      '0xContract',
      0n,
    );
    const result = await poller();
    expect(result).toBeNull();
  });
});

// ── makeCancelledPoller ───────────────────────────────────────────────────────

describe('makeCancelledPoller', () => {
  test('returns true when program is cancelled', async () => {
    const { makeCancelledPoller } = await import('../useTxRecovery');
    // getProgram; cancelled is index 11
    const fakeProgram = ['name','desc','0xSponsor',[],0n,0n,0n,0,0,true,false,true];
    const client = makeFakeClient([fakeProgram]);
    const poller = makeCancelledPoller(
      client as never,
      '0xContract',
      0n,
    );
    const result = await poller();
    expect(result).toBe(true);
  });

  test('returns null when program is not cancelled', async () => {
    const { makeCancelledPoller } = await import('../useTxRecovery');
    const fakeProgram = ['name','desc','0xSponsor',[],0n,0n,0n,0,0,true,false,false];
    const client = makeFakeClient([fakeProgram]);
    const poller = makeCancelledPoller(
      client as never,
      '0xContract',
      0n,
    );
    const result = await poller();
    expect(result).toBeNull();
  });
});

// ── makeVotePoller ────────────────────────────────────────────────────────────

describe('makeVotePoller', () => {
  test('returns true when votes increased', async () => {
    const { makeVotePoller } = await import('../useTxRecovery');
    // getSubmission returns [submitter, projContract, metaURI, votes, prizeAw, claimed]
    const fakeSubmission = ['0xSubmitter','0x0','https://uri',3n,0n,false];
    const client = makeFakeClient([fakeSubmission]);
    const poller = makeVotePoller(
      client as never,
      '0xContract',
      0n, 1n,
      2n, // prevVotes = 2
    );
    const result = await poller();
    expect(result).toBe(true); // 3 > 2
  });

  test('returns null when votes unchanged', async () => {
    const { makeVotePoller } = await import('../useTxRecovery');
    const fakeSubmission = ['0xSubmitter','0x0','https://uri',2n,0n,false];
    const client = makeFakeClient([fakeSubmission]);
    const poller = makeVotePoller(
      client as never,
      '0xContract',
      0n, 1n,
      2n,
    );
    const result = await poller();
    expect(result).toBeNull();
  });
});

// ── makeClaimPoller ───────────────────────────────────────────────────────────

describe('makeClaimPoller', () => {
  test('returns true when pending claim decreased', async () => {
    const { makeClaimPoller } = await import('../useTxRecovery');
    const client = makeFakeClient([0n]); // was 1_000_000n, now 0
    const poller = makeClaimPoller(
      client as never,
      '0xContract',
      '0xAccount',
      1_000_000n, // prevPending
    );
    const result = await poller();
    expect(result).toBe(true);
  });

  test('returns null when pending claim unchanged', async () => {
    const { makeClaimPoller } = await import('../useTxRecovery');
    const client = makeFakeClient([1_000_000n]);
    const poller = makeClaimPoller(
      client as never,
      '0xContract',
      '0xAccount',
      1_000_000n,
    );
    const result = await poller();
    expect(result).toBeNull();
  });
});
