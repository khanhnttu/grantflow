/**
 * Wagmi hooks for GrantFlowV4.
 *
 * ALL reads use appClient from useNetworkStore (the app-selected network RPC),
 * independent of the connected wallet's chain. Only write hooks use wagmi's
 * useWriteContract (which correctly routes through the wallet signer).
 */
import { useWriteContract, useAccount } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { parseAbiItem } from 'viem';
import { GRANTFLOW_V4_ABI, ERC20_ABI } from '@/lib/grantflowV4';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import { isAlreadyInFlight } from '@/hooks/useTxRecovery';

// ── Typed return shapes ───────────────────────────────────────────────────────

export type V4ProgramTuple = readonly [
  string, string, `0x${string}`, readonly bigint[], bigint,
  bigint, bigint, number, number, boolean, boolean, boolean
];
export type V4SubTuple = readonly [
  `0x${string}`, `0x${string}`, string, bigint, bigint, boolean
];

// ── Low-level helpers ─────────────────────────────────────────────────────────

function useAddrs() {
  const { config } = useNetworkStore();
  return { v4: config.v4Address, usdc: config.usdcAddress };
}

// ── Read hooks (all use appClient — wallet-chain independent) ─────────────────

export function useProgramCount() {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData]       = useState<bigint | undefined>(undefined);
  const [isLoading, setLoad]  = useState(true);  // true until first fetch resolves
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    setIsError(false);
    try {
      const n = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'programCount',
      });
      setData(n);
    } catch { setIsError(true); }
    finally { setLoad(false); }
  }, [appClient, v4]);

  useEffect(() => {
    let cancelled = false;
    appClient.readContract({ address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'programCount' })
      .then(n => { if (!cancelled) { setData(n); setLoad(false); } })
      .catch(() => { if (!cancelled) { setIsError(true); setLoad(false); } });
    return () => { cancelled = true; };
  }, [appClient, v4]);

  return { data, isLoading, isError, refetch };
}

export function useFeeBps() {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [feeBps, setFeeBps] = useState<bigint | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    appClient.readContract({ address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'feeBps' })
      .then(v => { if (!cancelled) setFeeBps(v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4]);

  return { data: feeBps };
}

export function useProgramV4(programId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData]       = useState<V4ProgramTuple | null>(null);
  const [isLoading, setLoad]  = useState(true);
  const [error, setError]     = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (programId === undefined) return;
    setError(null);
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'getProgram', args: [BigInt(programId)],
      });
      setData(r);
    } catch (e) { setError(e instanceof Error ? e : new Error(String(e))); }
    finally { setLoad(false); }
  }, [appClient, v4, programId]);

  useEffect(() => {
    if (programId === undefined) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'getProgram', args: [BigInt(programId)],
    }).then(r => { if (!cancelled) { setData(r); setLoad(false); } })
      .catch(e => { if (!cancelled) { setError(e instanceof Error ? e : new Error(String(e))); setLoad(false); } });
    return () => { cancelled = true; };
  }, [appClient, v4, programId]);

  return { data, isLoading, error, refetch };
}

export function useProgramJudges(programId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<readonly `0x${string}`[] | null>(null);

  const refetch = useCallback(async () => {
    if (programId === undefined) return;
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'getJudges', args: [BigInt(programId)],
      });
      setData(r);
    } catch { /* ignore */ }
  }, [appClient, v4, programId]);

  useEffect(() => {
    if (programId === undefined) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'getJudges', args: [BigInt(programId)],
    }).then(r => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId]);

  return { data, refetch };
}

export function useSubmissionCountV4(programId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<bigint | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (programId === undefined) return;
    try {
      const n = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'submissionCount', args: [BigInt(programId)],
      });
      setData(n);
    } catch { /* ignore */ }
  }, [appClient, v4, programId]);

  useEffect(() => {
    if (programId === undefined) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'submissionCount', args: [BigInt(programId)],
    }).then(n => { if (!cancelled) setData(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId]);

  return { data, refetch };
}

export function useSubmissionV4(programId: number | undefined, submissionId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<V4SubTuple | null>(null);

  const refetch = useCallback(async () => {
    if (programId === undefined || submissionId === undefined) return;
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'getSubmission', args: [BigInt(programId), BigInt(submissionId)],
      });
      setData(r);
    } catch { /* ignore */ }
  }, [appClient, v4, programId, submissionId]);

  useEffect(() => {
    if (programId === undefined || submissionId === undefined) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'getSubmission', args: [BigInt(programId), BigInt(submissionId)],
    }).then(r => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId, submissionId]);

  return { data, refetch };
}

export function usePhaseV4(programId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<number | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (programId === undefined) return;
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'getPhase', args: [BigInt(programId)],
      });
      setData(Number(r));
    } catch { /* ignore */ }
  }, [appClient, v4, programId]);

  useEffect(() => {
    if (programId === undefined) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'getPhase', args: [BigInt(programId)],
    }).then(r => { if (!cancelled) setData(Number(r)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId]);

  return { data, refetch };
}

export function useVotesRemaining(programId: number | undefined) {
  const { address: account } = useAccount();
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<bigint | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (programId === undefined || !account) return;
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'votesRemaining', args: [BigInt(programId), account],
      });
      setData(r);
    } catch { /* ignore */ }
  }, [appClient, v4, programId, account]);

  useEffect(() => {
    if (programId === undefined || !account) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'votesRemaining', args: [BigInt(programId), account],
    }).then(r => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId, account]);

  return { data, refetch };
}

export function usePendingClaim() {
  const { address: account } = useAccount();
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<bigint | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (!account) return;
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'pendingClaims', args: [account],
      });
      setData(r);
    } catch { /* ignore */ }
  }, [appClient, v4, account]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'pendingClaims', args: [account],
    }).then(r => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, account]);

  return { data, refetch };
}

export function useIsJudge(programId: number | undefined) {
  const { address: account } = useAccount();
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<boolean | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (programId === undefined || !account) return;
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'isJudge', args: [BigInt(programId), account],
      });
      setData(r);
    } catch { /* ignore */ }
  }, [appClient, v4, programId, account]);

  useEffect(() => {
    if (programId === undefined || !account) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'isJudge', args: [BigInt(programId), account],
    }).then(r => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId, account]);

  return { data, refetch };
}

export function useHasSubmitted(programId: number | undefined) {
  const { address: account } = useAccount();
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData] = useState<boolean | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (programId === undefined || !account) return;
    try {
      const r = await appClient.readContract({
        address: v4, abi: GRANTFLOW_V4_ABI,
        functionName: 'hasSubmitted', args: [BigInt(programId), account],
      });
      setData(r);
    } catch { /* ignore */ }
  }, [appClient, v4, programId, account]);

  useEffect(() => {
    if (programId === undefined || !account) return;
    let cancelled = false;
    appClient.readContract({
      address: v4, abi: GRANTFLOW_V4_ABI,
      functionName: 'hasSubmitted', args: [BigInt(programId), account],
    }).then(r => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId, account]);

  return { data, refetch };
}

export function useUsdcBalance() {
  const { address: account } = useAccount();
  const { appClient } = useNetworkStore();
  const { usdc } = useAddrs();
  const [data, setData] = useState<bigint | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (!account) return;
    try {
      const r = await appClient.readContract({
        address: usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [account],
      });
      setData(r);
    } catch { /* ignore */ }
  }, [appClient, usdc, account]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    appClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [account] })
      .then(r => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, usdc, account]);

  return { data, refetch };
}

export function useUsdcAllowance() {
  const { address: account } = useAccount();
  const { appClient, config } = useNetworkStore();
  const [data, setData] = useState<bigint | undefined>(undefined);

  const refetch = useCallback(() => {
    if (!account) return Promise.resolve();
    return appClient.readContract({
      address: config.usdcAddress, abi: ERC20_ABI,
      functionName: 'allowance', args: [account, config.v4Address],
    }).then(v => { setData(v); }).catch(() => {});
  }, [appClient, config, account]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    appClient.readContract({
      address: config.usdcAddress, abi: ERC20_ABI,
      functionName: 'allowance', args: [account, config.v4Address],
    }).then(v => { if (!cancelled) setData(v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, config, account]);

  return { data, refetch };
}

/** Batch-read all programs 0..count-1 using appClient (not wagmi/wallet chain). */
export function useAllProgramsV4(count: number) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData]       = useState<{ result: V4ProgramTuple | undefined; status: 'success' | 'failure' }[]>([]);
  const [isLoading, setLoad]  = useState(count > 0);  // no load needed when count=0
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    if (count === 0) { setData([]); return; }
    setIsError(false);
    try {
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          appClient.readContract({
            address: v4, abi: GRANTFLOW_V4_ABI,
            functionName: 'getProgram', args: [BigInt(i)],
          }).then(r => ({ result: r as V4ProgramTuple, status: 'success' as const }))
            .catch(() => ({ result: undefined, status: 'failure' as const }))
        )
      );
      setData(results);
    } catch { setData([]); setIsError(true); }
    finally { setLoad(false); }
  }, [appClient, v4, count]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      count === 0
        ? [Promise.resolve({ result: undefined, status: 'noop' as const })]
        : Array.from({ length: count }, (_, i) =>
            appClient.readContract({
              address: v4, abi: GRANTFLOW_V4_ABI,
              functionName: 'getProgram', args: [BigInt(i)],
            }).then(r => ({ result: r as V4ProgramTuple, status: 'success' as const }))
              .catch(() => ({ result: undefined, status: 'failure' as const }))
          )
    ).then(results => {
      if (!cancelled) {
        setData(count === 0 ? [] : results as { result: V4ProgramTuple | undefined; status: 'success' | 'failure' }[]);
        setLoad(false);
      }
    }).catch(() => {
      if (!cancelled) { setIsError(true); setLoad(false); }
    });
    return () => { cancelled = true; };
  }, [appClient, v4, count]);

  return { data, isLoading, isError, refetch };
}

/** Batch-read all submissions for a program using appClient. */
export function useAllSubmissionsV4(programId: number | undefined, count: number) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [data, setData]      = useState<{ result: V4SubTuple | undefined; status: 'success' | 'failure' }[]>([]);
  const [isLoading, setLoad] = useState(programId !== undefined && count > 0);

  const refetch = useCallback(async () => {
    if (programId === undefined || count === 0) { setData([]); return; }
    try {
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          appClient.readContract({
            address: v4, abi: GRANTFLOW_V4_ABI,
            functionName: 'getSubmission', args: [BigInt(programId), BigInt(i)],
          }).then(r => ({ result: r, status: 'success' as const }))
            .catch(() => ({ result: undefined, status: 'failure' as const }))
        )
      );
      setData(results);
    } catch { setData([]); }
    finally { setLoad(false); }
  }, [appClient, v4, programId, count]);

  useEffect(() => {
    const skip = programId === undefined || count === 0;
    let cancelled = false;
    Promise.all(
      skip
        ? [Promise.resolve({ result: undefined, status: 'noop' as const })]
        : Array.from({ length: count }, (_, i) =>
            appClient.readContract({
              address: v4, abi: GRANTFLOW_V4_ABI,
              functionName: 'getSubmission', args: [BigInt(programId), BigInt(i)],
            }).then(r => ({ result: r, status: 'success' as const }))
              .catch(() => ({ result: undefined, status: 'failure' as const }))
          )
    ).then(results => {
      if (!cancelled) {
        setData(skip ? [] : results as { result: V4SubTuple | undefined; status: 'success' | 'failure' }[]);
        setLoad(false);
      }
    }).catch(() => {
      if (!cancelled) setLoad(false);
    });
    return () => { cancelled = true; };
  }, [appClient, v4, programId, count]);

  return { data, isLoading, refetch };
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function useV4Write() {
  const { writeContractAsync, isPending, error } = useWriteContract();
  const { v4, usdc } = useAddrs();
  const { appClient } = useNetworkStore();

  const sendAndConfirm = useCallback(async (
    call: () => Promise<`0x${string}`>,
    onHash?: (hash: `0x${string}`) => void,
  ): Promise<`0x${string}`> => {
    let hash: `0x${string}`;
    try {
      hash = await call();
    } catch (err) {
      if (!isAlreadyInFlight(err)) throw err;
      throw Object.assign(new Error('__already_in_flight__'), { alreadyInFlight: true });
    }
    if (onHash) onHash(hash);
    const receipt = await appClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Transaction reverted onchain.');
    return hash;
  }, [appClient]);

  const approveUsdc = (amount: bigint) =>
    sendAndConfirm(() => writeContractAsync({
      address: usdc, abi: ERC20_ABI, functionName: 'approve', args: [v4, amount],
    }));

  const createProgram = (args: Parameters<typeof writeContractAsync>[0]['args']) =>
    sendAndConfirm(() => writeContractAsync({
      address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'createProgram', args: args as never,
    }));

  const submit = (programId: bigint, projectContract: `0x${string}`, metadataURI: string) =>
    sendAndConfirm(() => writeContractAsync({
      address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'submit',
      args: [programId, projectContract, metadataURI],
    }));

  const vote = (programId: bigint, submissionId: bigint) =>
    sendAndConfirm(() => writeContractAsync({
      address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'vote',
      args: [programId, submissionId],
    }));

  const finalize = (programId: bigint) =>
    sendAndConfirm(() => writeContractAsync({
      address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'finalize', args: [programId],
    }));

  const claim = () =>
    sendAndConfirm(() => writeContractAsync({
      address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'claim', args: [],
    }));

  const reclaim = (programId: bigint) =>
    sendAndConfirm(() => writeContractAsync({
      address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'reclaim', args: [programId],
    }));

  const cancel = (programId: bigint) =>
    sendAndConfirm(() => writeContractAsync({
      address: v4, abi: GRANTFLOW_V4_ABI, functionName: 'cancel', args: [programId],
    }));

  return { approveUsdc, createProgram, submit, vote, finalize, claim, reclaim, cancel, isPending, error };
}

// ── Event-log hooks (use appClient from store — wallet-chain independent) ─────

export interface PrizeAssignedLog {
  programId: bigint; submissionId: bigint; winner: `0x${string}`;
  amount: bigint; rank: bigint; txHash: `0x${string}`;
}
export interface ClaimedLog {
  recipient: `0x${string}`; amount: bigint;
  txHash: `0x${string}`; blockNumber: bigint;
}
export interface ReclaimedLog {
  programId: bigint; sponsor: `0x${string}`; amount: bigint; txHash: `0x${string}`;
}
export interface SubmittedLog {
  programId: bigint; submissionId: bigint; submitter: `0x${string}`; txHash: `0x${string}`;
}

const PRIZE_ASSIGNED_EVENT = parseAbiItem(
  'event PrizeAssigned(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank)',
);
const CLAIMED_EVENT = parseAbiItem('event Claimed(address indexed recipient, uint256 amount)');
const RECLAIMED_EVENT = parseAbiItem(
  'event Reclaimed(uint256 indexed programId, address indexed sponsor, uint256 amount)',
);
const SUBMITTED_EVENT = parseAbiItem(
  'event Submitted(uint256 indexed programId, uint256 indexed submissionId, address indexed submitter, address projectContract, string metadataURI)',
);

export function usePrizeAssignedLogs(programId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [logs, setLogs] = useState<PrizeAssignedLog[]>([]);

  useEffect(() => {
    if (programId === undefined) return;
    let cancelled = false;
    appClient.getLogs({
      address: v4, event: PRIZE_ASSIGNED_EVENT,
      args: { programId: BigInt(programId) },
      fromBlock: 'earliest', toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      setLogs(raw.map(l => ({
        programId: l.args.programId ?? 0n, submissionId: l.args.submissionId ?? 0n,
        winner: l.args.winner ?? '0x0', amount: l.args.amount ?? 0n,
        rank: l.args.rank ?? 0n, txHash: l.transactionHash ?? '0x0',
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId]);

  return { logs };
}

export function useClaimedLogs() {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [logs, setLogs] = useState<ClaimedLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    appClient.getLogs({
      address: v4, event: CLAIMED_EVENT,
      fromBlock: 'earliest', toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      setLogs(raw.map(l => ({
        recipient: l.args.recipient ?? '0x0', amount: l.args.amount ?? 0n,
        txHash: l.transactionHash ?? '0x0', blockNumber: l.blockNumber ?? 0n,
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4]);

  return logs;
}

export function useReclaimedLogs(programId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [log, setLog] = useState<ReclaimedLog | null>(null);

  useEffect(() => {
    if (programId === undefined) return;
    let cancelled = false;
    appClient.getLogs({
      address: v4, event: RECLAIMED_EVENT,
      args: { programId: BigInt(programId) },
      fromBlock: 'earliest', toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      if (raw.length > 0) {
        const l = raw[raw.length - 1];
        setLog({
          programId: l.args.programId ?? 0n, sponsor: l.args.sponsor ?? '0x0',
          amount: l.args.amount ?? 0n, txHash: l.transactionHash ?? '0x0',
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId]);

  return log;
}

export function useSubmittedLogs(programId: number | undefined) {
  const { appClient } = useNetworkStore();
  const { v4 } = useAddrs();
  const [logs, setLogs] = useState<SubmittedLog[]>([]);

  useEffect(() => {
    if (programId === undefined) return;
    let cancelled = false;
    appClient.getLogs({
      address: v4, event: SUBMITTED_EVENT,
      args: { programId: BigInt(programId) },
      fromBlock: 'earliest', toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      setLogs(raw.map(l => ({
        programId: l.args.programId ?? 0n, submissionId: l.args.submissionId ?? 0n,
        submitter: l.args.submitter ?? '0x0', txHash: l.transactionHash ?? '0x0',
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [appClient, v4, programId]);

  return logs;
}
