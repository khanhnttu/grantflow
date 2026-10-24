/**
 * GrantFlowV4 — ABI, types, and pure helpers.
 * Contract: ranked-prize hackathon. Phases: Submission → Judging → Finalized.
 */

import { formatUnits, parseUnits } from 'viem';

// ── Chain config ──────────────────────────────────────────────────────────────

const ARC_TESTNET_ID  = 5042002;
const ARC_MAINNET_ID  = 5042;

// V4 testnet address (deployed this session)
const V4_TESTNET  = (import.meta.env.VITE_GRANTFLOW_V4_ADDRESS  || '0x8a8d4e2378842d02690e247c9241842a30bbf7c4') as `0x${string}`;
const V4_MAINNET  = (import.meta.env.VITE_GRANTFLOW_V4_ADDRESS_MAINNET || '') as `0x${string}`;

export const USDC_DECIMALS = 6;
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  [ARC_TESTNET_ID]: '0x3600000000000000000000000000000000000000',
  [ARC_MAINNET_ID]: '0x3600000000000000000000000000000000000000',
};

export function getV4Address(chainId: number): `0x${string}` {
  if (chainId === ARC_MAINNET_ID && V4_MAINNET) return V4_MAINNET;
  return V4_TESTNET;
}

export function usdcToDisplay(raw: bigint): string {
  return formatUnits(raw, USDC_DECIMALS);
}
export function displayToUsdc(val: string): bigint {
  return parseUnits(val, USDC_DECIMALS);
}

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ProgramType = { ONCHAIN_BUILD: 0, OPEN_BOUNTY: 1 } as const;
export const Category    = { Hackathon: 0, Bounty: 1, Contest: 2, Referral: 3 } as const;
export const Phase       = { Submission: 0, Judging: 1, Finalized: 2, Cancelled: 3 } as const;

export type ProgramTypeValue = typeof ProgramType[keyof typeof ProgramType];
export type CategoryValue    = typeof Category[keyof typeof Category];
export type PhaseValue       = typeof Phase[keyof typeof Phase];

export const PROGRAM_TYPE_LABELS: Record<ProgramTypeValue, string> = {
  [ProgramType.ONCHAIN_BUILD]: 'Onchain Build',
  [ProgramType.OPEN_BOUNTY]:   'Open Bounty',
};
export const CATEGORY_LABELS: Record<CategoryValue, string> = {
  [Category.Hackathon]: 'Hackathon',
  [Category.Bounty]:    'Bounty',
  [Category.Contest]:   'Contest',
  [Category.Referral]:  'Referral',
};
export const PHASE_LABELS: Record<PhaseValue, string> = {
  [Phase.Submission]: 'Submissions open',
  [Phase.Judging]:    'Judging',
  [Phase.Finalized]:  'Finalized',
  [Phase.Cancelled]:  'Cancelled',
};
export const PHASE_COLORS: Record<PhaseValue, string> = {
  [Phase.Submission]: 'text-emerald-400 bg-emerald-400/10',
  [Phase.Judging]:    'text-amber-400  bg-amber-400/10',
  [Phase.Finalized]:  'text-sky-400    bg-sky-400/10',
  [Phase.Cancelled]:  'text-zinc-400   bg-zinc-400/10',
};

// ── ABI ───────────────────────────────────────────────────────────────────────

export const GRANTFLOW_V4_ABI = [
  // ── constructor ──
  { type: 'constructor', inputs: [
    { name: 'usdc_',        type: 'address' },
    { name: 'feeRecipient_',type: 'address' },
    { name: 'feeBps_',      type: 'uint256' },
  ], stateMutability: 'nonpayable' },

  // ── write ──
  { type: 'function', name: 'createProgram',
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
    outputs: [{ name: 'programId', type: 'uint256' }],
    stateMutability: 'nonpayable' },

  { type: 'function', name: 'submit',
    inputs: [
      { name: 'programId',       type: 'uint256' },
      { name: 'projectContract', type: 'address' },
      { name: 'metadataURI',     type: 'string'  },
    ],
    outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'vote',
    inputs: [
      { name: 'programId',    type: 'uint256' },
      { name: 'submissionId', type: 'uint256' },
    ],
    outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'finalize',
    inputs: [{ name: 'programId', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'claim',
    inputs: [], outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'reclaim',
    inputs: [{ name: 'programId', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'cancel',
    inputs: [{ name: 'programId', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'setFeeRecipient',
    inputs: [{ name: 'newRecipient', type: 'address' }],
    outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'setFeeBps',
    inputs: [{ name: 'newBps', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable' },

  { type: 'function', name: 'acceptOwnership',
    inputs: [], outputs: [], stateMutability: 'nonpayable' },

  // ── read ──
  { type: 'function', name: 'getProgram',
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
    stateMutability: 'view' },

  { type: 'function', name: 'getJudges',
    inputs: [{ name: 'programId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view' },

  { type: 'function', name: 'submissionCount',
    inputs: [{ name: 'programId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' },

  { type: 'function', name: 'getSubmission',
    inputs: [
      { name: 'programId',    type: 'uint256' },
      { name: 'submissionId', type: 'uint256' },
    ],
    outputs: [
      { name: 'submitter',       type: 'address' },
      { name: 'projectContract', type: 'address' },
      { name: 'metadataURI',     type: 'string'  },
      { name: 'votes',           type: 'uint256' },
      { name: 'prizeAwarded',    type: 'uint256' },
      { name: 'claimed',         type: 'bool'    },
    ],
    stateMutability: 'view' },

  { type: 'function', name: 'isJudge',
    inputs: [
      { name: 'programId', type: 'uint256' },
      { name: 'account',   type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view' },

  { type: 'function', name: 'getPhase',
    inputs: [{ name: 'programId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view' },

  { type: 'function', name: 'votesRemaining',
    inputs: [
      { name: 'programId', type: 'uint256' },
      { name: 'judge',     type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' },

  { type: 'function', name: 'pendingClaims',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' },

  { type: 'function', name: 'programCount',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' },

  { type: 'function', name: 'feeBps',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' },

  { type: 'function', name: 'feeRecipient',
    inputs: [], outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view' },

  { type: 'function', name: 'totalFeesCollected',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' },

  { type: 'function', name: 'hasSubmitted',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view' },

  { type: 'function', name: 'hasVotedOn',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
      { name: '', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view' },

  { type: 'function', name: 'votesCast',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' },

  // ── events ──
  { type: 'event', name: 'ProgramCreated',
    inputs: [
      { name: 'programId',          type: 'uint256', indexed: true  },
      { name: 'sponsor',            type: 'address', indexed: true  },
      { name: 'name',               type: 'string',  indexed: false },
      { name: 'totalPool',          type: 'uint256', indexed: false },
      { name: 'submissionDeadline', type: 'uint256', indexed: false },
      { name: 'judgingDeadline',    type: 'uint256', indexed: false },
    ]},
  { type: 'event', name: 'Submitted',
    inputs: [
      { name: 'programId',       type: 'uint256', indexed: true  },
      { name: 'submissionId',    type: 'uint256', indexed: true  },
      { name: 'submitter',       type: 'address', indexed: true  },
      { name: 'projectContract', type: 'address', indexed: false },
      { name: 'metadataURI',     type: 'string',  indexed: false },
    ]},
  { type: 'event', name: 'Voted',
    inputs: [
      { name: 'programId',    type: 'uint256', indexed: true  },
      { name: 'submissionId', type: 'uint256', indexed: true  },
      { name: 'judge',        type: 'address', indexed: true  },
      { name: 'totalVotes',   type: 'uint256', indexed: false },
    ]},
  { type: 'event', name: 'Finalized',
    inputs: [
      { name: 'programId',   type: 'uint256', indexed: true  },
      { name: 'winnerCount', type: 'uint256', indexed: false },
    ]},
  { type: 'event', name: 'PrizeAssigned',
    inputs: [
      { name: 'programId',    type: 'uint256', indexed: true  },
      { name: 'submissionId', type: 'uint256', indexed: true  },
      { name: 'winner',       type: 'address', indexed: true  },
      { name: 'amount',       type: 'uint256', indexed: false },
      { name: 'rank',         type: 'uint256', indexed: false },
    ]},
  { type: 'event', name: 'Claimed',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
    ]},
  { type: 'event', name: 'Reclaimed',
    inputs: [
      { name: 'programId', type: 'uint256', indexed: true  },
      { name: 'sponsor',   type: 'address', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
    ]},
  { type: 'event', name: 'Cancelled',
    inputs: [
      { name: 'programId', type: 'uint256', indexed: true  },
      { name: 'sponsor',   type: 'address', indexed: true  },
      { name: 'refund',    type: 'uint256', indexed: false },
    ]},
  { type: 'event', name: 'FeeCollected',
    inputs: [
      { name: 'programId', type: 'uint256', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
    ]},

  // ── errors ──
  { type: 'error', name: 'ProgramNotFound',          inputs: [] },
  { type: 'error', name: 'SubmissionNotFound',        inputs: [] },
  { type: 'error', name: 'NotJudge',                  inputs: [] },
  { type: 'error', name: 'AlreadyVoted',              inputs: [] },
  { type: 'error', name: 'AlreadyPaid',               inputs: [] },
  { type: 'error', name: 'NotSubmissionPhase',        inputs: [] },
  { type: 'error', name: 'NotJudgingPhase',           inputs: [] },
  { type: 'error', name: 'NotFinalized',              inputs: [] },
  { type: 'error', name: 'AlreadyFinalized',          inputs: [] },
  { type: 'error', name: 'NotAfterJudgingDeadline',   inputs: [] },
  { type: 'error', name: 'AlreadySubmitted',          inputs: [] },
  { type: 'error', name: 'InvalidProjectContract',    inputs: [] },
  { type: 'error', name: 'InvalidParams',             inputs: [] },
  { type: 'error', name: 'NotSponsor',                inputs: [] },
  { type: 'error', name: 'FeeTooHigh',                inputs: [] },
  { type: 'error', name: 'ZeroAddress',               inputs: [] },
  { type: 'error', name: 'WrongProgramType',          inputs: [] },
  { type: 'error', name: 'ConflictOfInterest',        inputs: [] },
  { type: 'error', name: 'TooManySubmissions',        inputs: [] },
  { type: 'error', name: 'NothingToReclaim',          inputs: [] },
  { type: 'error', name: 'NothingToClaim',            inputs: [] },
  { type: 'error', name: 'AlreadyCancelled',          inputs: [] },
  { type: 'error', name: 'SubmissionsExist',          inputs: [] },
] as const;

// ── ERC-20 minimal ABI ────────────────────────────────────────────────────────

export const ERC20_ABI = [
  { type: 'function', name: 'approve',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function computePhase(
  submissionDeadline: bigint,
  judgingDeadline: bigint,
  finalized: boolean,
  cancelled: boolean,
): PhaseValue {
  if (cancelled) return Phase.Cancelled;
  if (finalized) return Phase.Finalized;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < submissionDeadline) return Phase.Submission;
  return Phase.Judging;
}

export function countdownLabel(ts: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const diff = ts > now ? Number(ts - now) : 0;
  if (diff === 0) return 'ended';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function totalPool(prizes: readonly bigint[]): bigint {
  return prizes.reduce((a, b) => a + b, 0n);
}

export function feeAmount(pool: bigint, feeBps: bigint): bigint {
  return (pool * feeBps) / 10_000n;
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function parseOnchainErrorV4(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const map: Record<string, string> = {
    NotSubmissionPhase:     'Submissions are closed.',
    NotJudgingPhase:        'Voting is not open.',
    AlreadyFinalized:       'Program is already finalized.',
    NotAfterJudgingDeadline:'Judging deadline has not passed yet.',
    AlreadySubmitted:       'You have already submitted to this program.',
    ConflictOfInterest:     'Sponsors and judges cannot submit.',
    WrongProgramType:       'Use address(0) for Open Bounty submissions.',
    InvalidProjectContract: 'Contract address has no deployed code.',
    TooManySubmissions:     'Submission limit reached.',
    NotJudge:               'You are not a judge for this program.',
    AlreadyVoted:           'You already voted on this submission.',
    NothingToClaim:         'No prizes to claim.',
    NothingToReclaim:       'Nothing to reclaim (fully awarded or already reclaimed).',
    NotSponsor:             'Only the sponsor can do this.',
    NotFinalized:           'Finalize the program first.',
    AlreadyCancelled:       'Program is already cancelled.',
    SubmissionsExist:       'Cannot cancel after submissions exist.',
    FeeTooHigh:             'Fee exceeds the 5% cap.',
    ZeroAddress:            'Address cannot be zero.',
    InvalidParams:          'Invalid parameters.',
    User_rejected:          'Transaction rejected.',
  };
  for (const [key, label] of Object.entries(map)) {
    if (msg.includes(key)) return label;
  }
  if (msg.includes('rejected')) return 'Transaction rejected.';
  if (msg.includes('insufficient')) return 'Insufficient USDC balance or allowance.';
  return 'Transaction failed. Check your wallet and try again.';
}
