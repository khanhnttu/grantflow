/**
 * useTxRecovery — shared helper for all GrantFlowV4 transaction buttons.
 *
 * Problem: MetaMask sometimes throws "already known" / "nonce too low" /
 * "replacement transaction underpriced" after a tx has already been broadcast.
 * The tx is in-flight (or already mined), not failed. Showing "Transaction
 * failed" is wrong and confusing.
 *
 * Solution: catch those wallet errors, then poll for the specific onchain
 * effect for up to 30 s. If the effect appears, treat it as success. If it
 * doesn't appear within the timeout, surface a clear "check your wallet" message.
 *
 * Usage:
 *   const { sendWithRecovery } = useTxRecovery();
 *   await sendWithRecovery(
 *     () => write.createProgram(args),        // the wagmi/viem write call
 *     pollProgramCreated(appClient, v4Addr, account, prevCount),  // effect poller
 *     { onSuccess: (id) => navigate(id) },
 *   );
 */

import { useCallback } from 'react';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import type { PublicClient } from 'viem';
import { parseAbiItem } from 'viem';
import { GRANTFLOW_V4_ABI, ERC20_ABI } from '@/lib/grantflowV4';

// ── "already in flight" detection ────────────────────────────────────────────

/** Strings that indicate the wallet re-broadcast an already-submitted tx. */
const IN_FLIGHT_PATTERNS = [
  'already known',
  '__already_in_flight__',
  'nonce too low',
  'replacement transaction underpriced',
  'replacement underpriced',
];

/** Extract all searchable text from any thrown value, however deeply nested. */
function extractErrorText(err: unknown): string {
  const parts: string[] = [];

  // Wagmi sometimes rejects with a DOM Event (isTrusted:true) wrapping the
  // real error. Unwrap it first.
  if (err !== null && typeof err === 'object' && !(err instanceof Error)) {
    const ev = err as Record<string, unknown>;
    // Try known event-like properties that carry the actual error
    const inner = ev['error'] ?? ev['reason'] ?? ev['cause'];
    if (inner) parts.push(...extractErrorText(inner).split('\n'));
    // Also JSON-stringify the whole object so we catch any nested "already known"
    try { parts.push(JSON.stringify(err)); } catch { /* ignore */ }
    return parts.join('\n');
  }

  if (err instanceof Error) {
    parts.push(err.message);
    // viem TransactionExecutionError exposes .details (the raw RPC error string)
    const e = err as Error & { details?: string; cause?: unknown };
    if (typeof e.details === 'string') parts.push(e.details);
    // Walk up to three levels of .cause
    let cause = e.cause;
    for (let i = 0; i < 3; i++) {
      if (cause instanceof Error) {
        parts.push(cause.message);
        const c = cause as Error & { details?: string; cause?: unknown };
        if (typeof c.details === 'string') parts.push(c.details);
        cause = c.cause;
      } else if (cause !== null && cause !== undefined) {
        parts.push(...extractErrorText(cause).split('\n'));
        break;
      } else {
        break;
      }
    }
  } else {
    parts.push(String(err));
  }
  return parts.join('\n');
}

export function isAlreadyInFlight(err: unknown): boolean {
  const haystack = extractErrorText(err).toLowerCase();
  return IN_FLIGHT_PATTERNS.some(p => haystack.includes(p.toLowerCase()));
}

// ── Generic poller ────────────────────────────────────────────────────────────

/** Poll at 2 s intervals for up to 30 s, calling `check()` each time.
 *  Returns the result of `check()` on first truthy value, or null on timeout. */
async function pollFor<T>(check: () => Promise<T | null | undefined>): Promise<T | null> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise<void>(r => setTimeout(r, 2000));
    try {
      const result = await check();
      if (result !== null && result !== undefined) return result;
    } catch { /* keep polling */ }
  }
  return null;
}

// ── Per-action effect pollers ─────────────────────────────────────────────────
// Each returns a `() => Promise<T | null>` suitable for pollFor().

/** createProgram: poll for programCount > prevCount, return new programId. */
export function makeProgramCreatedPoller(
  client: PublicClient,
  v4Address: `0x${string}`,
  prevCount: bigint,
): () => Promise<number | null> {
  return async () => {
    const count = await client.readContract({
      address: v4Address, abi: GRANTFLOW_V4_ABI, functionName: 'programCount',
    });
    if (count > prevCount) return Number(count) - 1;
    return null;
  };
}

/** submit: poll for submissionCount > prevCount on a program. */
export function makeSubmissionPoller(
  client: PublicClient,
  v4Address: `0x${string}`,
  programId: bigint,
  prevCount: bigint,
): () => Promise<boolean | null> {
  return async () => {
    const count = await client.readContract({
      address: v4Address, abi: GRANTFLOW_V4_ABI, functionName: 'submissionCount',
      args: [programId],
    });
    return count > prevCount ? true : null;
  };
}

/** vote: poll for submissionVotes > prevVotes. */
export function makeVotePoller(
  client: PublicClient,
  v4Address: `0x${string}`,
  programId: bigint,
  submissionId: bigint,
  prevVotes: bigint,
): () => Promise<boolean | null> {
  return async () => {
    const [, , , votes] = await client.readContract({
      address: v4Address, abi: GRANTFLOW_V4_ABI, functionName: 'getSubmission',
      args: [programId, submissionId],
    });
    return votes > prevVotes ? true : null;
  };
}

/** finalize: poll for program.finalized === true. */
export function makeFinalizePoller(
  client: PublicClient,
  v4Address: `0x${string}`,
  programId: bigint,
): () => Promise<boolean | null> {
  return async () => {
    const result = await client.readContract({
      address: v4Address, abi: GRANTFLOW_V4_ABI, functionName: 'getProgram',
      args: [programId],
    });
    const finalized = result[10];
    return finalized ? true : null;
  };
}

/** claim: poll for pendingClaims[account] === 0 (was non-zero before). */
export function makeClaimPoller(
  client: PublicClient,
  v4Address: `0x${string}`,
  account: `0x${string}`,
  prevPending: bigint,
): () => Promise<boolean | null> {
  return async () => {
    const pending = await client.readContract({
      address: v4Address, abi: GRANTFLOW_V4_ABI, functionName: 'pendingClaims',
      args: [account],
    });
    return pending < prevPending ? true : null;
  };
}

/** reclaim / cancel: poll for program.cancelled or USDC balance change.
 *  Uses a ProgramCreated-like approach: check programme state. */
export function makeCancelledPoller(
  client: PublicClient,
  v4Address: `0x${string}`,
  programId: bigint,
): () => Promise<boolean | null> {
  return async () => {
    const result = await client.readContract({
      address: v4Address, abi: GRANTFLOW_V4_ABI, functionName: 'getProgram',
      args: [programId],
    });
    const cancelled = result[11];
    return cancelled ? true : null;
  };
}

/** reclaim: poll for Reclaimed event by checking sponsor USDC balance increase. */
export function makeReclaimPoller(
  client: PublicClient,
  v4Address: `0x${string}`,
  usdcAddress: `0x${string}`,
  programId: bigint,
  sponsor: `0x${string}`,
  prevBalance: bigint,
): () => Promise<boolean | null> {
  return async () => {
    // Poll by checking if a Reclaimed event appeared for this programId
    const RECLAIMED_EVENT = parseAbiItem(
      'event Reclaimed(uint256 indexed programId, address indexed sponsor, uint256 amount)',
    );
    const head = await client.getBlockNumber();
    const from = head > 500n ? head - 500n : 0n;
    const logs = await client.getLogs({
      address: v4Address, event: RECLAIMED_EVENT,
      args: { programId, sponsor }, fromBlock: from, toBlock: 'latest',
    });
    if (logs.length > 0) return true;
    // Fallback: balance increased
    const balance = await client.readContract({
      address: usdcAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [sponsor],
    });
    return balance > prevBalance ? true : null;
  };
}

/** approve: poll for allowance >= required. */
export function makeAllowancePoller(
  client: PublicClient,
  usdcAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  required: bigint,
): () => Promise<boolean | null> {
  return async () => {
    const allowed = await client.readContract({
      address: usdcAddress, abi: ERC20_ABI, functionName: 'allowance', args: [owner, spender],
    });
    return allowed >= required ? true : null;
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface TxRecoveryOptions<T> {
  /** Called on clean success with the tx hash. */
  onSuccess?: (hash: `0x${string}`, pollResult?: T) => void;
  /** Status setter — receives human-readable progress strings. */
  setStatus?: (msg: string) => void;
  /** Error setter — receives a human-readable error string. */
  setError?: (msg: string) => void;
}

export function useTxRecovery() {
  const { appClient } = useNetworkStore();

  /**
   * sendWithRecovery — wraps a single `sendAndConfirm`-style write call.
   *
   * @param write    The async function that calls `sendAndConfirm` (from useV4Write).
   *                 Must throw an error with `.alreadyInFlight=true` (the sentinel)
   *                 OR an error whose message contains an in-flight pattern.
   * @param poller   An async function that checks for the onchain effect.
   *                 Called every 2 s for up to 30 s after an in-flight error.
   *                 Return a truthy value when the effect is confirmed, null otherwise.
   * @param opts     onSuccess / setStatus / setError callbacks.
   * @returns true on success, false on failure (error is set via opts.setError).
   */
  const sendWithRecovery = useCallback(async <T>(
    write: () => Promise<`0x${string}`>,
    poller: (() => Promise<T | null>) | null,
    opts: TxRecoveryOptions<T> = {},
  ): Promise<boolean> => {
    const { onSuccess, setStatus, setError } = opts;

    try {
      // Happy path: wallet+RPC cooperated, receipt confirmed.
      const hash = await write();
      setStatus?.('Confirmed.');
      onSuccess?.(hash);
      return true;
    } catch (err: unknown) {
      // Debug: log raw error so console.jsonl captures the exact shape.
      console.error('[sendWithRecovery] raw error:', err,
        '| extractedText:', extractErrorText(err).slice(0, 300));

      // Check if this is an in-flight error (sentinel from sendAndConfirm,
      // OR a raw wallet error that bypassed sendAndConfirm's catch).
      if (!isAlreadyInFlight(err)) {
        // Real failure — parse and surface.
        const { parseOnchainErrorV4 } = await import('@/lib/grantflowV4');
        setError?.(parseOnchainErrorV4(err));
        return false;
      }

      // ── In-flight recovery ──────────────────────────────────────────────────
      if (!poller) {
        // No poller provided: we can't verify outcome. Tell user to check wallet.
        setStatus?.('');
        setError?.('Transaction submitted — check your wallet for confirmation status.');
        return false;
      }

      setStatus?.('Transaction submitted — confirming onchain…');

      const result = await pollFor(poller);
      if (result !== null) {
        setStatus?.('Confirmed.');
        // We don't have the hash when recovering from in-flight, pass '' as sentinel.
        onSuccess?.('0x', result);
        return true;
      } else {
        setStatus?.('');
        setError?.('Transaction may be pending — open your wallet to check. If confirmed, refresh the page.');
        return false;
      }
    }
  }, [appClient]); // eslint-disable-line react-hooks/exhaustive-deps

  return { sendWithRecovery, appClient };
}
