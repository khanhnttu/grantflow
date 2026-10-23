import { useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';
import { GRANTFLOW_ABI, GRANTFLOW_ADDRESS } from '@/lib/grantflow';
import { ACTIVE_CHAIN_ID } from '@/lib/chainConfig';
import type { ProgramTuple, ProgramMetaTuple, SubmissionTuple } from '@/lib/contractHelpers';

export { ACTIVE_CHAIN_ID as ARC_TESTNET_ID };

export function useProgramCount() {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'programCount',
    chainId: ACTIVE_CHAIN_ID,
  });
}

export function useProgram(programId: bigint | undefined) {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'getProgram',
    args: programId !== undefined ? [programId] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: programId !== undefined },
  });
}

export function useSubmissionCount(programId: bigint | undefined) {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'submissionCount',
    args: programId !== undefined ? [programId] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: programId !== undefined },
  });
}

export function useIsReviewer(programId: bigint | undefined, account: string | undefined) {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'isReviewer',
    args:
      programId !== undefined && account
        ? [programId, account as `0x${string}`]
        : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: programId !== undefined && !!account },
  });
}

export function usePendingClaims(account: string | undefined) {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'pendingClaims',
    args: account ? [account as `0x${string}`] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: !!account },
  });
}

/** Current platform fee in basis points (e.g. 100 = 1%). */
export function useFeeBps() {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'feeBps',
    chainId: ACTIVE_CHAIN_ID,
  });
}

/** Cumulative fees collected by the protocol. */
export function useTotalFeesCollected() {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'totalFeesCollected',
    chainId: ACTIVE_CHAIN_ID,
  });
}

export function useAllProgramMetas(count: bigint | undefined) {
  const n = count ? Number(count) : 0;
  const contracts = Array.from({ length: n }, (_, i) => ({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'getProgramMeta' as const,
    args: [BigInt(i)] as [bigint],
    chainId: ACTIVE_CHAIN_ID,
  }));
  return useReadContracts<ProgramMetaTuple[]>({
    contracts,
    query: { enabled: n > 0 },
  });
}

export function useProgramMeta(programId: bigint | undefined) {
  return useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'getProgramMeta',
    args: programId !== undefined ? [programId] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: programId !== undefined },
  });
}

export function useAllPrograms(count: bigint | undefined) {
  const n = count ? Number(count) : 0;
  const contracts = Array.from({ length: n }, (_, i) => ({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'getProgram' as const,
    args: [BigInt(i)] as [bigint],
    chainId: ACTIVE_CHAIN_ID,
  }));
  return useReadContracts<ProgramTuple[]>({
    contracts,
    query: { enabled: n > 0 },
  });
}

export function useAllSubmissions(programId: bigint | undefined, count: bigint | undefined) {
  const n = count ? Number(count) : 0;
  const contracts = Array.from({ length: n }, (_, i) => ({
    address: GRANTFLOW_ADDRESS,
    abi: GRANTFLOW_ABI,
    functionName: 'getSubmission' as const,
    args: [programId!, BigInt(i)] as [bigint, bigint],
    chainId: ACTIVE_CHAIN_ID,
  }));
  return useReadContracts<SubmissionTuple[]>({
    contracts,
    query: { enabled: programId !== undefined && n > 0 },
  });
}

/** Raw USDC balance of the GrantFlow contract itself (6-dec ERC-20 view). */
export function useContractUsdcBalance() {
  const { data } = useReadContract({
    address: GRANTFLOW_ADDRESS,
    abi: [
      {
        type: 'function',
        name: 'usdc',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
      },
    ] as const,
    functionName: 'usdc',
    chainId: ACTIVE_CHAIN_ID,
  });

  return useReadContract({
    address: data,
    abi: [
      {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const,
    functionName: 'balanceOf',
    args: [GRANTFLOW_ADDRESS],
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: !!data },
  });
}

// ── Event log types ─────────────────────────────────────────────────────────

export interface EventLog {
  event: 'PrizePaid' | 'Claimed' | 'Reclaimed';
  txHash: string;
  blockNumber: bigint;
  /** Human-readable label */
  label: string;
  /** USDC amount (raw, 6 dec) */
  amount: bigint;
  /** Recipient or sponsor */
  actor: string;
}

/**
 * Fetch PrizePaid + Reclaimed logs for a given programId.
 * Uses eth_getLogs from the active chain.
 */
export function useContractEvents(programId: bigint | undefined) {
  const client = usePublicClient({ chainId: ACTIVE_CHAIN_ID });
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (programId === undefined || !client) return;

    let cancelled = false;

    const fetch = async () => {
      if (!cancelled) setLoading(true);
      try {
        // Use getLogs with the ABI — viem handles topic encoding
        const [prizePaid, reclaimed] = await Promise.all([
          client.getLogs({
            address: GRANTFLOW_ADDRESS,
            event: {
              type: 'event',
              name: 'PrizePaid',
              inputs: [
                { indexed: true, name: 'programId', type: 'uint256' },
                { indexed: true, name: 'submissionId', type: 'uint256' },
                { indexed: true, name: 'recipient', type: 'address' },
                { indexed: false, name: 'amount', type: 'uint256' },
              ],
            } as const,
            args: { programId },
            fromBlock: 'earliest',
            toBlock: 'latest',
          }),
          client.getLogs({
            address: GRANTFLOW_ADDRESS,
            event: {
              type: 'event',
              name: 'Reclaimed',
              inputs: [
                { indexed: true, name: 'programId', type: 'uint256' },
                { indexed: true, name: 'sponsor', type: 'address' },
                { indexed: false, name: 'amount', type: 'uint256' },
              ],
            } as const,
            args: { programId },
            fromBlock: 'earliest',
            toBlock: 'latest',
          }),
        ]);

        if (cancelled) return;

        const out: EventLog[] = [];

        for (const log of prizePaid) {
          const args = log.args as { recipient?: `0x${string}`; amount?: bigint };
          out.push({
            event: 'PrizePaid',
            txHash: log.transactionHash ?? '',
            blockNumber: log.blockNumber ?? 0n,
            label: 'Prize paid',
            amount: args.amount ?? 0n,
            actor: args.recipient ?? '',
          });
        }

        for (const log of reclaimed) {
          const args = log.args as { sponsor?: `0x${string}`; amount?: bigint };
          out.push({
            event: 'Reclaimed',
            txHash: log.transactionHash ?? '',
            blockNumber: log.blockNumber ?? 0n,
            label: 'Reclaimed by sponsor',
            amount: args.amount ?? 0n,
            actor: args.sponsor ?? '',
          });
        }

        out.sort((a, b) => (a.blockNumber < b.blockNumber ? 1 : -1));
        setEvents(out);
      } catch {
        // Silently fail — events section just shows nothing on RPC error
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetch();
    return () => { cancelled = true; };
  }, [programId, client]);

  return { events, loading };
}
