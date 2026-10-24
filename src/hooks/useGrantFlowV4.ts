/**
 * Wagmi hooks for GrantFlowV4.
 */
import { useReadContract, useReadContracts, useWriteContract, useAccount, useChainId, usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';
import { parseAbiItem } from 'viem';
import { GRANTFLOW_V4_ABI, ERC20_ABI, getV4Address, USDC_ADDRESS } from '@/lib/grantflowV4';

function useV4Address() {
  const chainId = useChainId();
  return getV4Address(chainId);
}

function useUsdcAddress() {
  const chainId = useChainId();
  return USDC_ADDRESS[chainId] ?? USDC_ADDRESS[5042002];
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function useProgramCount() {
  const address = useV4Address();
  return useReadContract({ address, abi: GRANTFLOW_V4_ABI, functionName: 'programCount' });
}

export function useFeeBps() {
  const address = useV4Address();
  return useReadContract({ address, abi: GRANTFLOW_V4_ABI, functionName: 'feeBps' });
}

export function useProgramV4(programId: number | undefined) {
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'getProgram',
    args: programId !== undefined ? [BigInt(programId)] : undefined,
    query: { enabled: programId !== undefined },
  });
}

export function useProgramJudges(programId: number | undefined) {
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'getJudges',
    args: programId !== undefined ? [BigInt(programId)] : undefined,
    query: { enabled: programId !== undefined },
  });
}

export function useSubmissionCountV4(programId: number | undefined) {
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'submissionCount',
    args: programId !== undefined ? [BigInt(programId)] : undefined,
    query: { enabled: programId !== undefined },
  });
}

export function useSubmissionV4(programId: number | undefined, submissionId: number | undefined) {
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'getSubmission',
    args: (programId !== undefined && submissionId !== undefined)
      ? [BigInt(programId), BigInt(submissionId)] : undefined,
    query: { enabled: programId !== undefined && submissionId !== undefined },
  });
}

export function usePhaseV4(programId: number | undefined) {
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'getPhase',
    args: programId !== undefined ? [BigInt(programId)] : undefined,
    query: { enabled: programId !== undefined },
  });
}

export function useVotesRemaining(programId: number | undefined) {
  const { address: account } = useAccount();
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'votesRemaining',
    args: (programId !== undefined && account) ? [BigInt(programId), account] : undefined,
    query: { enabled: programId !== undefined && !!account },
  });
}

export function usePendingClaim() {
  const { address: account } = useAccount();
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'pendingClaims',
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });
}

export function useIsJudge(programId: number | undefined) {
  const { address: account } = useAccount();
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'isJudge',
    args: (programId !== undefined && account) ? [BigInt(programId), account] : undefined,
    query: { enabled: programId !== undefined && !!account },
  });
}

export function useHasSubmitted(programId: number | undefined) {
  const { address: account } = useAccount();
  const address = useV4Address();
  return useReadContract({
    address,
    abi: GRANTFLOW_V4_ABI,
    functionName: 'hasSubmitted',
    args: (programId !== undefined && account) ? [BigInt(programId), account] : undefined,
    query: { enabled: programId !== undefined && !!account },
  });
}

export function useUsdcBalance() {
  const { address: account } = useAccount();
  const usdcAddr = useUsdcAddress();
  return useReadContract({
    address: usdcAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });
}

export function useUsdcAllowance() {
  const { address: account } = useAccount();
  const v4 = useV4Address();
  const usdcAddr = useUsdcAddress();
  return useReadContract({
    address: usdcAddr,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: account ? [account, v4] : undefined,
    query: { enabled: !!account },
  });
}

// Batch-read all programs 0..count-1
export function useAllProgramsV4(count: number) {
  const address = useV4Address();
  const ids = Array.from({ length: count }, (_, i) => i);
  return useReadContracts({
    contracts: ids.map(i => ({
      address,
      abi: GRANTFLOW_V4_ABI,
      functionName: 'getProgram' as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: count > 0 },
  });
}

// Batch-read all submissions for a program
export function useAllSubmissionsV4(programId: number | undefined, count: number) {
  const address = useV4Address();
  const ids = Array.from({ length: count }, (_, i) => i);
  return useReadContracts({
    contracts: ids.map(i => ({
      address,
      abi: GRANTFLOW_V4_ABI,
      functionName: 'getSubmission' as const,
      args: [BigInt(programId ?? 0), BigInt(i)] as const,
    })),
    query: { enabled: programId !== undefined && count > 0 },
  });
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function useV4Write() {
  const { writeContractAsync, isPending, error } = useWriteContract();
  const address = useV4Address();
  const usdcAddr = useUsdcAddress();

  const approveUsdc = async (amount: bigint) =>
    writeContractAsync({ address: usdcAddr, abi: ERC20_ABI, functionName: 'approve', args: [address, amount] });

  const createProgram = async (args: Parameters<typeof writeContractAsync>[0]['args']) =>
    writeContractAsync({ address, abi: GRANTFLOW_V4_ABI, functionName: 'createProgram', args: args as never });

  const submit = async (programId: bigint, projectContract: `0x${string}`, metadataURI: string) =>
    writeContractAsync({ address, abi: GRANTFLOW_V4_ABI, functionName: 'submit', args: [programId, projectContract, metadataURI] });

  const vote = async (programId: bigint, submissionId: bigint) =>
    writeContractAsync({ address, abi: GRANTFLOW_V4_ABI, functionName: 'vote', args: [programId, submissionId] });

  const finalize = async (programId: bigint) =>
    writeContractAsync({ address, abi: GRANTFLOW_V4_ABI, functionName: 'finalize', args: [programId] });

  const claim = async () =>
    writeContractAsync({ address, abi: GRANTFLOW_V4_ABI, functionName: 'claim', args: [] });

  const reclaim = async (programId: bigint) =>
    writeContractAsync({ address, abi: GRANTFLOW_V4_ABI, functionName: 'reclaim', args: [programId] });

  const cancel = async (programId: bigint) =>
    writeContractAsync({ address, abi: GRANTFLOW_V4_ABI, functionName: 'cancel', args: [programId] });

  return { approveUsdc, createProgram, submit, vote, finalize, claim, reclaim, cancel, isPending, error };
}

// ── Event-log hooks ───────────────────────────────────────────────────────────
// Uses parseAbiItem for fully-typed getLogs calls.

export interface PrizeAssignedLog {
  programId: bigint;
  submissionId: bigint;
  winner: `0x${string}`;
  amount: bigint;
  rank: bigint;
  txHash: `0x${string}`;
}

export interface ClaimedLog {
  recipient: `0x${string}`;
  amount: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

export interface ReclaimedLog {
  programId: bigint;
  sponsor: `0x${string}`;
  amount: bigint;
  txHash: `0x${string}`;
}

export interface SubmittedLog {
  programId: bigint;
  submissionId: bigint;
  submitter: `0x${string}`;
  txHash: `0x${string}`;
}

const PRIZE_ASSIGNED_EVENT = parseAbiItem(
  'event PrizeAssigned(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank)',
);
const CLAIMED_EVENT = parseAbiItem(
  'event Claimed(address indexed recipient, uint256 amount)',
);
const RECLAIMED_EVENT = parseAbiItem(
  'event Reclaimed(uint256 indexed programId, address indexed sponsor, uint256 amount)',
);
const SUBMITTED_EVENT = parseAbiItem(
  'event Submitted(uint256 indexed programId, uint256 indexed submissionId, address indexed submitter, address projectContract, string metadataURI)',
);

/** Fetch PrizeAssigned events for a specific programId. */
export function usePrizeAssignedLogs(programId: number | undefined) {
  const client = usePublicClient();
  const address = useV4Address();
  const [logs, setLogs] = useState<PrizeAssignedLog[]>([]);

  useEffect(() => {
    if (!client || programId === undefined) return;
    let cancelled = false;
    client.getLogs({
      address,
      event: PRIZE_ASSIGNED_EVENT,
      args: { programId: BigInt(programId) },
      fromBlock: 'earliest',
      toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      setLogs(raw.map(l => ({
        programId: l.args.programId ?? 0n,
        submissionId: l.args.submissionId ?? 0n,
        winner: l.args.winner ?? '0x0',
        amount: l.args.amount ?? 0n,
        rank: l.args.rank ?? 0n,
        txHash: (l.transactionHash ?? '0x0'),
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [client, address, programId]);

  return { logs };
}

/** Fetch Claimed events (global — no programId filter). */
export function useClaimedLogs() {
  const client = usePublicClient();
  const address = useV4Address();
  const [logs, setLogs] = useState<ClaimedLog[]>([]);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    client.getLogs({
      address,
      event: CLAIMED_EVENT,
      fromBlock: 'earliest',
      toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      setLogs(raw.map(l => ({
        recipient: l.args.recipient ?? '0x0',
        amount: l.args.amount ?? 0n,
        txHash: (l.transactionHash ?? '0x0'),
        blockNumber: l.blockNumber ?? 0n,
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [client, address]);

  return logs;
}

/** Fetch Reclaimed events for a specific programId. */
export function useReclaimedLogs(programId: number | undefined) {
  const client = usePublicClient();
  const address = useV4Address();
  const [log, setLog] = useState<ReclaimedLog | null>(null);

  useEffect(() => {
    if (!client || programId === undefined) return;
    let cancelled = false;
    client.getLogs({
      address,
      event: RECLAIMED_EVENT,
      args: { programId: BigInt(programId) },
      fromBlock: 'earliest',
      toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      if (raw.length > 0) {
        const l = raw[raw.length - 1];
        setLog({
          programId: l.args.programId ?? 0n,
          sponsor: l.args.sponsor ?? '0x0',
          amount: l.args.amount ?? 0n,
          txHash: (l.transactionHash ?? '0x0'),
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [client, address, programId]);

  return log;
}

/** Fetch Submitted events for a specific programId. */
export function useSubmittedLogs(programId: number | undefined) {
  const client = usePublicClient();
  const address = useV4Address();
  const [logs, setLogs] = useState<SubmittedLog[]>([]);

  useEffect(() => {
    if (!client || programId === undefined) return;
    let cancelled = false;
    client.getLogs({
      address,
      event: SUBMITTED_EVENT,
      args: { programId: BigInt(programId) },
      fromBlock: 'earliest',
      toBlock: 'latest',
    }).then(raw => {
      if (cancelled) return;
      setLogs(raw.map(l => ({
        programId: l.args.programId ?? 0n,
        submissionId: l.args.submissionId ?? 0n,
        submitter: l.args.submitter ?? '0x0',
        txHash: (l.transactionHash ?? '0x0'),
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [client, address, programId]);

  return logs;
}
