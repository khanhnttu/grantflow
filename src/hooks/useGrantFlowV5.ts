/**
 * useGrantFlowV5 — hooks for GrantFlowV5 (auto-payout push model).
 *
 * Key differences from V4:
 *  - finalize() pushes prizes directly to winners (no pendingClaims).
 *  - finalize() auto-refunds sponsor residual in the same tx.
 *  - No claim() / reclaim() calls needed.
 *  - updateProgram() for sponsor edits before first submission.
 *  - description stores JSON: {"desc":"...","sponsorName":"...","website":"...","logo":"..."}
 *    Old plain-text descriptions are still displayed as-is.
 */
import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits, type Hash, type PublicClient, ContractFunctionRevertedError } from 'viem';
import { useNetworkStore } from './useNetworkStore';
import { isAlreadyInFlight } from './useTxRecovery';

// ── ABI ───────────────────────────────────────────────────────────────────────

export const GRANTFLOW_V5_ABI = [
  // State reads
  { name: 'programCount',       type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'feeBps',             type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'feeRecipient',       type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'address' }] },
  { name: 'hasSubmitted',       type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'hasVotedOn',         type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }, { type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
  { name: 'votesCast',          type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },

  // Program reads
  { name: 'getProgram', type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
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
    ]},
  { name: 'getJudges',          type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }], outputs: [{ type: 'address[]' }] },
  { name: 'submissionCount',    type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'getSubmission',      type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'uint256' }],
    outputs: [
      { name: 'submitter',        type: 'address' },
      { name: 'projectContract',  type: 'address' },
      { name: 'metadataURI',      type: 'string'  },
      { name: 'votes',            type: 'uint256' },
      { name: 'prizeAwarded',     type: 'uint256' },
      { name: 'paid',             type: 'bool'    },  // always true after finalize in V5
    ]},
  { name: 'getPhase',           type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint8' }] },
  { name: 'isJudge',            type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'votesRemaining',     type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },

  // Writes
  { name: 'createProgram', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'name_',               type: 'string'    },
      { name: 'description_',        type: 'string'    },
      { name: 'prizes_',             type: 'uint256[]' },
      { name: 'submissionDeadline_', type: 'uint256'   },
      { name: 'judgingDeadline_',    type: 'uint256'   },
      { name: 'judges_',             type: 'address[]' },
      { name: 'programType_',        type: 'uint8'     },
      { name: 'category_',           type: 'uint8'     },
    ],
    outputs: [{ type: 'uint256' }]},
  { name: 'submit', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'programId',        type: 'uint256'   },
      { name: 'projectContract',  type: 'address'   },
      { name: 'metadataURI',      type: 'string'    },
      { name: 'payees_',          type: 'address[]' },
      { name: 'sharesBps_',       type: 'uint256[]' },
    ], outputs: [] },
  { name: 'getSubmissionTeam', type: 'function', stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'uint256' }],
    outputs: [
      { name: 'payees_',    type: 'address[]' },
      { name: 'sharesBps_', type: 'uint256[]' },
    ]},
  { name: 'vote', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'programId',    type: 'uint256' },
      { name: 'submissionId', type: 'uint256' },
    ], outputs: [] },
  { name: 'finalize', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'programId', type: 'uint256' }], outputs: [] },
  { name: 'cancel', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'programId', type: 'uint256' }], outputs: [] },
  { name: 'updateProgram', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'programId',           type: 'uint256' },
      { name: 'name_',               type: 'string'  },
      { name: 'description_',        type: 'string'  },
      { name: 'submissionDeadline_', type: 'uint256' },
      { name: 'judgingDeadline_',    type: 'uint256' },
    ], outputs: [] },

  // Events
  { name: 'ProgramCreated', type: 'event',
    inputs: [
      { name: 'programId', type: 'uint256', indexed: true },
      { name: 'sponsor',   type: 'address', indexed: true },
      { name: 'name',      type: 'string',  indexed: false },
      { name: 'totalPool', type: 'uint256', indexed: false },
      { name: 'submissionDeadline', type: 'uint256', indexed: false },
      { name: 'judgingDeadline',    type: 'uint256', indexed: false },
    ]},
  { name: 'PrizePaid', type: 'event',
    inputs: [
      { name: 'programId',    type: 'uint256', indexed: true },
      { name: 'submissionId', type: 'uint256', indexed: true },
      { name: 'winner',       type: 'address', indexed: true },
      { name: 'amount',       type: 'uint256', indexed: false },
      { name: 'rank',         type: 'uint256', indexed: false },
    ]},
  { name: 'SponsorRefunded', type: 'event',
    inputs: [
      { name: 'programId', type: 'uint256', indexed: true },
      { name: 'sponsor',   type: 'address', indexed: true },
      { name: 'amount',    type: 'uint256', indexed: false },
    ]},
  { name: 'Finalized', type: 'event',
    inputs: [
      { name: 'programId',   type: 'uint256', indexed: true },
      { name: 'winnerCount', type: 'uint256', indexed: false },
    ]},
  { name: 'ProgramUpdated', type: 'event',
    inputs: [
      { name: 'programId', type: 'uint256', indexed: true },
      { name: 'sponsor',   type: 'address', indexed: true },
    ]},
] as const;

// ── USDC ABI (minimal) ────────────────────────────────────────────────────────

export const ERC20_ABI_V5 = [
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

// ── Sponsor metadata helpers ──────────────────────────────────────────────────

export interface SponsorMeta {
  desc:        string;
  sponsorName: string;
  website:     string;
  logo:        string;
}

export function parseSponsorMeta(raw: string): SponsorMeta {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const safe = (v: unknown) => (typeof v === 'string' ? v : '');
    return {
      desc:        safe(j['desc']),
      sponsorName: safe(j['sponsorName']),
      website:     safe(j['website']),
      logo:        safe(j['logo']),
    };
  } catch {
    // Plain-text description — backward compat
    return { desc: raw, sponsorName: '', website: '', logo: '' };
  }
}

export function encodeSponsorMeta(meta: SponsorMeta): string {
  // Only include non-empty fields to keep the string short
  const obj: Record<string, string> = {};
  if (meta.desc)        obj['desc']        = meta.desc;
  if (meta.sponsorName) obj['sponsorName'] = meta.sponsorName;
  if (meta.website)     obj['website']     = meta.website;
  if (meta.logo)        obj['logo']        = meta.logo;
  return JSON.stringify(obj);
}

// Validate that a URL is http/https only
export function isValidUrl(url: string): boolean {
  if (!url) return true; // empty is fine
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

// ── V5 program type ───────────────────────────────────────────────────────────

export interface V5Program {
  id:                   number;
  name:                 string;
  description:          string; // raw (may be JSON or plain text)
  meta:                 SponsorMeta;
  sponsor:              `0x${string}`;
  prizes:               bigint[];
  totalDeposited:       bigint;
  submissionDeadline:   number;
  judgingDeadline:      number;
  programType:          number;
  category:             number;
  exists:               boolean;
  finalized:            boolean;
  cancelled:            boolean;
  // Computed
  totalPool:            string;  // formatted USDC
  prizesFmt:            string[]; // formatted USDC per rank
}

export interface V5TeamMember {
  address:   `0x${string}`;
  sharesBps: number;   // e.g. 5000 = 50%
  sharePct:  string;   // e.g. "50.00"
  amount:    bigint;   // prizeAwarded * sharesBps / 10000
  amountFmt: string;
}

export interface V5Submission {
  id:              number;
  submitter:       `0x${string}`;
  projectContract: `0x${string}`;
  metadataURI:     string;
  votes:           bigint;
  prizeAwarded:    bigint;
  prizeFmt:        string;
  paid:            boolean; // always true in V5 after finalize (push-paid)
  // Team fields
  isSolo:          boolean; // true when payees.length === 1
  teamName:        string;  // from metadataURI JSON "teamName" field
  payees:          `0x${string}`[];
  sharesBps:       bigint[];
  members:         V5TeamMember[]; // computed from payees/sharesBps/prizeAwarded
}

// ── Read hooks ────────────────────────────────────────────────────────────────

/** useV5ProgramCount — reads programCount from the app-selected V5 contract */
export function useV5ProgramCount() {
  const { config, appClient } = useNetworkStore();
  const [count, setCount] = useState<number | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (!config.v5Address) { setCount(0); return; }
    try {
      const n = await appClient.readContract({
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'programCount',
      });
      setCount(Number(n));
    } catch { setCount(0); }
  }, [config, appClient]);

  // Trigger on mount and whenever the app-selected network changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await refetch(); };
    void run();
    return () => { cancelled = true; };
  }, [refetch]);

  return { count, refetch };
}

/** useV5FeeBps — reads feeBps from the app-selected V5 contract (not wallet chain) */
export function useV5FeeBps() {
  const { config, appClient } = useNetworkStore();
  const [feeBps, setFeeBps] = useState<bigint>(100n);

  const refetch = useCallback(async () => {
    if (!config.v5Address) return;
    try {
      const bps = await appClient.readContract({
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'feeBps',
      });
      setFeeBps(bps);
    } catch { /* ignore */ }
  }, [config, appClient]);

  // Initial load — useEffect, not useMemo (side-effects must not run during render)
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => { void refetch(); }, [refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return { feeBps, refetch };
}

// ── Low-level fetch helpers (accept explicit config + client) ─────────────────

/** fetchV5Program — one-shot fetch, no React state. Used by override hooks. */
export async function fetchV5Program(
  programId: number,
  cfg: import('./useNetworkStore').NetworkConfig,
  client: PublicClient
): Promise<V5Program | null> {
  if (!cfg.v5Address) return null;
  try {
    const raw = await client.readContract({
      address: cfg.v5Address,
      abi: GRANTFLOW_V5_ABI,
      functionName: 'getProgram',
      args: [BigInt(programId)],
    });
    const [name, description, sponsor, prizes, totalDeposited,
      submissionDeadline, judgingDeadline, programType, category,
      exists, finalized, cancelled] = raw;
    const meta = parseSponsorMeta(description);
    const usdcDec = cfg.usdcDecimals;
    const prizeArr = prizes as bigint[];
    return {
      id: programId,
      name,
      description,
      meta,
      sponsor,
      prizes: prizeArr,
      totalDeposited,
      submissionDeadline: Number(submissionDeadline),
      judgingDeadline: Number(judgingDeadline),
      programType: Number(programType),
      category: Number(category),
      exists,
      finalized,
      cancelled,
      totalPool: formatUnits(totalDeposited, usdcDec),
      prizesFmt: prizeArr.map(p => formatUnits(p, usdcDec)),
    };
  } catch {
    return null;
  }
}

/** fetchV5Submissions — one-shot fetch, no React state. */
export async function fetchV5Submissions(
  programId: number,
  subCount: number,
  cfg: import('./useNetworkStore').NetworkConfig,
  client: PublicClient
): Promise<V5Submission[]> {
  if (!cfg.v5Address || subCount === 0) return [];
  try {
    const [scalarResults, teamResults] = await Promise.all([
      Promise.all(
        Array.from({ length: subCount }, (_, i) =>
          client.readContract({
            address: cfg.v5Address,
            abi: GRANTFLOW_V5_ABI,
            functionName: 'getSubmission',
            args: [BigInt(programId), BigInt(i)],
          })
        )
      ),
      Promise.all(
        Array.from({ length: subCount }, (_, i) =>
          client.readContract({
            address: cfg.v5Address,
            abi: GRANTFLOW_V5_ABI,
            functionName: 'getSubmissionTeam',
            args: [BigInt(programId), BigInt(i)],
          }).catch(() => [[], []] as [`0x${string}`[], bigint[]])
        )
      ),
    ]);
    return scalarResults.map((r, i) => {
      const [submitter, projectContract, metadataURI, votes, prizeAwarded, paid] = r;
      /* eslint-disable typescript/no-unnecessary-type-assertion */
      const teamRaw   = teamResults[i] as unknown as [`0x${string}`[], bigint[]];
      const payees    = (teamRaw[0] ?? [submitter]) as `0x${string}`[];
      /* eslint-enable typescript/no-unnecessary-type-assertion */
      const sharesBps = teamRaw[1] ?? [10_000n];
      const isSolo    = payees.length === 1;
      const teamName  = parseTeamName(metadataURI);
      const members   = buildTeamMembers(payees, sharesBps, prizeAwarded, cfg.usdcDecimals);
      return {
        id: i, submitter, projectContract, metadataURI, votes, prizeAwarded,
        prizeFmt: formatUnits(prizeAwarded, cfg.usdcDecimals),
        paid, isSolo, teamName, payees, sharesBps, members,
      };
    });
  } catch {
    return [];
  }
}

/** useV5Program — reads a single program by id */
export function useV5Program(programId: number) {
  const { config, appClient } = useNetworkStore();
  const [prog, setProg] = useState<V5Program | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchV5Program(programId, config, appClient);
    setProg(result);
    setLoading(false);
  }, [config, appClient, programId]);

  // eslint-disable-next-line react-compiler/react-compiler,react/set-state-in-effect
  useEffect(() => { void refetch(); }, [refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return { prog, loading, refetch };
}

/**
 * useV5ProgramForChain — like useV5Program but reads from an EXPLICIT chain
 * regardless of the globally selected network. Used by ProgramDetailV5 when
 * the program chain is encoded in the URL (e.g. /p/v5-testnet/3).
 */
export function useV5ProgramForChain(
  programId: number,
  cfg: import('./useNetworkStore').NetworkConfig,
  client: PublicClient
) {
  const [prog, setProg] = useState<V5Program | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchV5Program(programId, cfg, client);
    setProg(result);
    setLoading(false);
  }, [cfg, client, programId]);

  // eslint-disable-next-line react-compiler/react-compiler,react/set-state-in-effect
  useEffect(() => { void refetch(); }, [refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return { prog, loading, refetch };
}

/** useV5Submissions — reads all submissions for a program (including team data) */
export function useV5Submissions(programId: number, subCount: number) {
  const { config, appClient } = useNetworkStore();
  return useV5SubmissionsForChain(programId, subCount, config, appClient);
}

/**
 * useV5SubmissionsForChain — like useV5Submissions but uses an explicit
 * NetworkConfig + PublicClient instead of the globally selected network.
 */
export function useV5SubmissionsForChain(
  programId: number,
  subCount: number,
  cfg: import('./useNetworkStore').NetworkConfig,
  client: PublicClient
) {
  const [subs, setSubs] = useState<V5Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchV5Submissions(programId, subCount, cfg, client);
    setSubs(result);
    setLoading(false);
  }, [cfg, client, programId, subCount]);

  return { subs, loading, refetch };
}

/** useV5UsdcAllowance — reads allowance from the app-selected network RPC */
export function useV5UsdcAllowance(owner: `0x${string}` | undefined) {
  const { config, appClient } = useNetworkStore();
  const [allowance, setAllowance] = useState<bigint>(0n);

  const refetch = useCallback(async () => {
    if (!owner || !config.v5Address) return;
    try {
      const a = await appClient.readContract({
        address: config.usdcAddress,
        abi: ERC20_ABI_V5,
        functionName: 'allowance',
        args: [owner, config.v5Address],
      });
      setAllowance(a);
    } catch { /* ignore */ }
  }, [owner, config, appClient]);

  return { allowance, refetch };
}

// ── Write hook ────────────────────────────────────────────────────────────────

/**
 * simulateV5 — calls simulateContract on the app-selected network's public client.
 * Returns null on success, or a human-readable revert reason string on failure.
 * Uses the app client (not the wallet transport), so chain mismatch never causes
 * a spurious "wrong network" error — we're just doing a static call.
 */
export async function simulateV5(
  appClient: PublicClient,
  account: `0x${string}`,
  request: { address: `0x${string}`; abi: unknown; functionName: string; args: unknown[] },
): Promise<string | null> {
  try {
    await appClient.simulateContract({
      ...(request as Parameters<typeof appClient.simulateContract>[0]),
      account,
    });
    return null; // simulation passed
  } catch (err) {
    // ContractFunctionRevertedError carries a decoded error name
    if (err instanceof ContractFunctionRevertedError) {
      const name = err.data?.errorName ?? err.shortMessage ?? String(err);
      return parseV5RevertName(name);
    }
    const raw = err instanceof Error ? (err.message + ' ' + ((err as { details?: string }).details ?? '')) : String(err);
    return parseV5Error(raw);
  }
}

/** parseV5RevertName — map a Solidity custom-error name to a human message */
function parseV5RevertName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('notsubmissionphase'))  return 'Submission period ended';
  if (n.includes('notjudgingphase'))     return 'Judging is not open';
  if (n.includes('notafterjudging'))     return 'Judging deadline not reached yet';
  if (n.includes('alreadyfinalized'))    return 'Already finalized';
  if (n.includes('alreadycancelled'))    return 'Already cancelled';
  if (n.includes('alreadyvoted'))        return 'Already voted on this submission';
  if (n.includes('alreadysubmitted'))    return 'Already submitted';
  if (n.includes('toomanysub'))          return 'Submission limit reached';
  if (n.includes('submissionsexist'))    return 'Cannot cancel — submissions exist';
  if (n.includes('notsponsor'))          return 'Only the sponsor can do this';
  if (n.includes('notjudge'))            return 'Only assigned judges can vote';
  if (n.includes('conflictofinterest'))  return 'Conflict of interest — you are a judge or sponsor';
  if (n.includes('invalidparams'))       return 'Invalid parameters';
  if (n.includes('invalidshares'))       return 'Team shares must sum to 100%';
  if (n.includes('duplicatemember'))     return 'Duplicate wallet in team';
  if (n.includes('toomanymembers'))      return 'Team size exceeds limit';
  if (n.includes('invalidprojectcontract')) return 'Invalid project contract address';
  if (n.includes('wrongprogramtype'))    return 'Wrong submission type for this program';
  if (n.includes('programnotfound'))     return 'Program not found';
  if (n.includes('submissionnotfound'))  return 'Submission not found';
  if (n.includes('invalidparam'))        return 'Invalid parameter';
  return name; // return the raw error name as a last resort
}

/** sendAndConfirm — wraps simulateContract (preflight) + writeContractAsync + waitForTransactionReceipt */
async function sendAndConfirm(
  writeContractAsync: (args: Record<string, unknown>) => Promise<Hash>,
  appClient: PublicClient,
  request: Record<string, unknown>,
  onHash?: (hash: Hash) => void,
  account?: `0x${string}`,
): Promise<Hash> {
  // Pre-flight simulation — catches revert reasons before opening the wallet
  if (account) {
    const simErr = await simulateV5(
      appClient,
      account,
      request as { address: `0x${string}`; abi: unknown; functionName: string; args: unknown[] },
    );
    if (simErr) throw new Error(simErr);
  }

  let hash: Hash;
  try {
    hash = await writeContractAsync(request);
  } catch (err) {
    if (isAlreadyInFlight(err)) {
      throw Object.assign(new Error('__already_in_flight__'), { alreadyInFlight: true });
    }
    const msg = JSON.stringify(err);
    if (msg.includes('already known')) {
      throw Object.assign(new Error('__already_in_flight__'), { alreadyInFlight: true });
    }
    throw err;
  }
  // Set hash immediately so error banner can show a tx link even if the receipt reverts
  onHash?.(hash);
  const receipt = await appClient.waitForTransactionReceipt({ hash, confirmations: 1 });
  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted (tx: ${hash})`);
  }
  return hash;
}

export interface V5WriteState {
  busy:    boolean;
  txErr:   string;
  txHash:  Hash | null;
  clearErr: () => void;
}

export function useV5Write() {
  const { address }    = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { config, appClient } = useNetworkStore();
  const [busy, setBusy]       = useState(false);
  const [txErr, setTxErr]     = useState('');
  const [txHash, setTxHash]   = useState<Hash | null>(null);

  const write = useCallback(async <T>(
    fn: () => Promise<T>
  ): Promise<T | null> => {
    setBusy(true); setTxErr(''); setTxHash(null);
    try {
      const result = await fn();
      return result;
    } catch (e) {
      setTxErr(parseV5Error(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  // Helper: typed writeContractAsync that accepts our loose Record type
  const wcAsync = writeContractAsync as (args: Record<string, unknown>) => Promise<Hash>;

  const approveUsdc = useCallback(async (amount: bigint): Promise<Hash | null> => {
    if (!address || !config.v5Address) return null;
    return write(async () => {
      const hash = await sendAndConfirm(wcAsync, appClient, {
        address: config.usdcAddress,
        abi: ERC20_ABI_V5,
        functionName: 'approve',
        args: [config.v5Address, amount],
      }, setTxHash, address);
      return hash;
    });
  }, [address, config, appClient, write, wcAsync]);

  const createProgram = useCallback(async (args: {
    name: string; description: string;
    prizes: bigint[]; submissionDeadline: bigint; judgingDeadline: bigint;
    judges: `0x${string}`[]; programType: number; category: number;
  }): Promise<Hash | null> => {
    if (!address || !config.v5Address) return null;
    return write(async () => {
      const hash = await sendAndConfirm(wcAsync, appClient, {
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'createProgram',
        args: [args.name, args.description, args.prizes,
          args.submissionDeadline, args.judgingDeadline,
          args.judges, args.programType, args.category],
      }, setTxHash, address);
      return hash;
    });
  }, [address, config, appClient, write, wcAsync]);

  const submit = useCallback(async (
    programId: number,
    projectContract: `0x${string}`,
    metadataURI: string,
    payees: `0x${string}`[],
    sharesBps: bigint[]
  ): Promise<Hash | null> => {
    if (!address || !config.v5Address) return null;
    return write(async () => {
      const hash = await sendAndConfirm(wcAsync, appClient, {
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'submit',
        args: [BigInt(programId), projectContract, metadataURI, payees, sharesBps],
      }, setTxHash, address);
      return hash;
    });
  }, [address, config, appClient, write, wcAsync]);

  const vote = useCallback(async (programId: number, submissionId: number): Promise<Hash | null> => {
    if (!address || !config.v5Address) return null;
    return write(async () => {
      const hash = await sendAndConfirm(wcAsync, appClient, {
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'vote',
        args: [BigInt(programId), BigInt(submissionId)],
      }, setTxHash, address);
      return hash;
    });
  }, [address, config, appClient, write, wcAsync]);

  const finalize = useCallback(async (programId: number): Promise<Hash | null> => {
    if (!address || !config.v5Address) return null;
    return write(async () => {
      const hash = await sendAndConfirm(wcAsync, appClient, {
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'finalize',
        args: [BigInt(programId)],
      }, setTxHash, address);
      return hash;
    });
  }, [address, config, appClient, write, wcAsync]);

  const cancel = useCallback(async (programId: number): Promise<Hash | null> => {
    if (!address || !config.v5Address) return null;
    return write(async () => {
      const hash = await sendAndConfirm(wcAsync, appClient, {
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'cancel',
        args: [BigInt(programId)],
      }, setTxHash, address);
      return hash;
    });
  }, [address, config, appClient, write, wcAsync]);

  const updateProgram = useCallback(async (args: {
    programId: number; name: string; description: string;
    submissionDeadline: bigint; judgingDeadline: bigint;
  }): Promise<Hash | null> => {
    if (!address || !config.v5Address) return null;
    return write(async () => {
      const hash = await sendAndConfirm(wcAsync, appClient, {
        address: config.v5Address,
        abi: GRANTFLOW_V5_ABI,
        functionName: 'updateProgram',
        args: [BigInt(args.programId), args.name, args.description,
          args.submissionDeadline, args.judgingDeadline],
      }, setTxHash, address);
      return hash;
    });
  }, [address, config, appClient, write, wcAsync]);

  return {
    busy, txErr, txHash,
    clearErr: () => setTxErr(''),
    approveUsdc, createProgram, submit, vote, finalize, cancel, updateProgram,
  };
}

// ── Error parser ──────────────────────────────────────────────────────────────

function parseV5Error(err: unknown): string {
  // Already-in-flight sentinel handled upstream
  if (isAlreadyInFlight(err)) return 'Transaction may be pending — check your wallet.';

  const msg = (() => {
    if (err instanceof Error) return err.message + ' ' + ((err as { details?: string }).details ?? '');
    if (typeof err === 'object' && err !== null) {
      return JSON.stringify(err);
    }
    return String(err);
  })().toLowerCase();

  if (msg.includes('user rejected') || msg.includes('user denied'))
    return 'Transaction rejected in wallet.';
  if (msg.includes('insufficient funds') || msg.includes('insufficient usdc'))
    return 'Insufficient USDC balance.';
  if (msg.includes('notjudge'))         return 'Only assigned judges can vote.';
  if (msg.includes('alreadyvoted'))     return 'You already voted on this submission.';
  if (msg.includes('notsubmissionphase'))   return 'Submissions are closed.';
  if (msg.includes('notjudgingphase'))  return 'Voting is not open yet.';
  if (msg.includes('notafterj'))        return 'Judging deadline has not passed yet.';
  if (msg.includes('alreadyfinalized')) return 'Program is already finalized.';
  if (msg.includes('conflictofinterest')) return 'You cannot submit to a program you judge or sponsor.';
  if (msg.includes('alreadysubmitted')) return 'You already submitted to this program.';
  if (msg.includes('toomanysub'))       return 'Submission limit reached.';
  if (msg.includes('submissionsexist')) return 'Cannot cancel: submissions already exist.';
  if (msg.includes('notsponsor'))       return 'Only the program sponsor can do this.';
  if (msg.includes('invalidparams'))    return 'Invalid parameters. Check deadlines and prize amounts.';
  if (msg.includes('alreadycancelled')) return 'Program is already cancelled.';
  if (msg.includes('already known'))    return 'Transaction already submitted — check your wallet.';
  if (msg.includes('wrongprogramtype')) return 'Wrong program type: use address(0) for Open Bounty submissions.';
  if (msg.includes('invalidprojectcontract')) return 'Invalid project contract: must be a deployed contract address.';
  if (msg.includes('transaction reverted')) return 'Transaction reverted onchain. Check the tx link for details.';
  return 'Transaction failed. Check your wallet and try again.';
}

// ── Shareable URL helpers ─────────────────────────────────────────────────────

const CANONICAL_BASE = 'https://grantflowapp.vercel.app';

/** slugify — ASCII-safe slug from a program name (Vietnamese-aware) */
export function slugify(name: string): string {
  // Decompose accented characters into base + combining marks, strip marks
  const ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // non-alphanumeric → dash
    .replace(/^-+|-+$/g, '')        // trim leading/trailing dashes
    .slice(0, 60);                  // cap at 60 chars
}

/**
 * buildProgramUrl — canonical URL for a V5/V4 program.
 *
 * Mainnet V5:  /programs/<slug>-<id>
 * Testnet V5:  /testnet/programs/<slug>-<id>
 * V4 legacy:   /programs/v4/<slug>-<id>  (mainnet only legacy)
 * Old /p/ URLs still parsed by parseProgramPath for redirect.
 */
export function buildProgramUrl(
  chainKey: 'mainnet' | 'testnet',
  programId: number,
  version: 'v5' | 'v4' = 'v5',
  programName = ''
): string {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : CANONICAL_BASE;
  const slug = programName ? `${slugify(programName)}-` : '';
  if (version === 'v4') {
    return `${origin}/programs/v4/${slug}${programId}`;
  }
  if (chainKey === 'testnet') {
    return `${origin}/testnet/programs/${slug}${programId}`;
  }
  return `${origin}/programs/${slug}${programId}`;
}

export type ProgramPathResult = {
  version: 'v5' | 'v4';
  chain: 'mainnet' | 'testnet';
  programId: number;
};

export function parseProgramPath(pathname: string): ProgramPathResult | null {
  // New clean URLs
  // Mainnet V5:  /programs/<slug>-<id>  or /programs/<id>
  const mv5 = pathname.match(/^\/programs\/(?!v4\/)(?:.*-)?(\d+)\/?$/);
  if (mv5) return { version: 'v5', chain: 'mainnet', programId: parseInt(mv5[1], 10) };

  // Testnet V5:  /testnet/programs/<slug>-<id>
  const tv5 = pathname.match(/^\/testnet\/programs\/(?:.*-)?(\d+)\/?$/);
  if (tv5) return { version: 'v5', chain: 'testnet', programId: parseInt(tv5[1], 10) };

  // V4 legacy:  /programs/v4/<slug>-<id>
  const v4 = pathname.match(/^\/programs\/v4\/(?:.*-)?(\d+)\/?$/);
  if (v4) return { version: 'v4', chain: 'mainnet', programId: parseInt(v4[1], 10) };

  // Old /p/ URLs — handled for redirect
  const old = pathname.match(/^\/p\/(v5|v4)-(mainnet|testnet)\/(\d+)$/);
  if (old) return {
    version: old[1] as 'v5' | 'v4',
    chain:   old[2] as 'mainnet' | 'testnet',
    programId: parseInt(old[3], 10),
  };

  return null;
}

/** formatUsdcV5 — format bigint USDC to human-readable string */
export function formatUsdcV5(amount: bigint, decimals = 6): string {
  return formatUnits(amount, decimals);
}

/** parseTeamName — extract "teamName" from metadataURI JSON if present */
export function parseTeamName(metadataURI: string): string {
  try {
    const j = JSON.parse(metadataURI) as Record<string, unknown>;
    return typeof j['teamName'] === 'string' ? j['teamName'] : '';
  } catch { return ''; }
}

/** buildTeamMembers — derive V5TeamMember array from raw on-chain data */
export function buildTeamMembers(
  payees: readonly `0x${string}`[],
  sharesBps: readonly bigint[],
  prizeAwarded: bigint,
  decimals: number
): V5TeamMember[] {
  return payees.map((addr, i) => {
    const bps = sharesBps[i] ?? 0n;
    const amount = prizeAwarded > 0n ? (prizeAwarded * bps) / 10_000n : 0n;
    return {
      address:   addr,
      sharesBps: Number(bps),
      sharePct:  (Number(bps) / 100).toFixed(2),
      amount,
      amountFmt: formatUnits(amount, decimals),
    };
  });
}

export function parseUsdcV5(amount: string, decimals = 6): bigint {
  try { return parseUnits(amount, decimals); }
  catch { return 0n; }
}
