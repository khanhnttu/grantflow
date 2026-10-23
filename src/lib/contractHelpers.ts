// Helpers to safely map useReadContracts results into typed arrays

// ── Onchain enums (must mirror GrantFlow.sol) ─────────────────────────────

export const PROGRAM_TYPE = {
  ONCHAIN_BUILD: 0,
  OPEN_BOUNTY: 1,
} as const;
export type ProgramTypeValue = (typeof PROGRAM_TYPE)[keyof typeof PROGRAM_TYPE];

export const CATEGORY = {
  Hackathon: 0,
  Bounty: 1,
  Contest: 2,
  Referral: 3,
} as const;
export type CategoryValue = (typeof CATEGORY)[keyof typeof CATEGORY];

export const CATEGORY_LABELS: Record<CategoryValue, string> = {
  0: 'Hackathon',
  1: 'Bounty',
  2: 'Contest',
  3: 'Referral',
};

export const PROGRAM_TYPE_LABELS: Record<ProgramTypeValue, string> = {
  0: 'Onchain Build',
  1: 'Open Bounty',
};

/** Program tuple from getProgram() */
export type ProgramTuple = readonly [
  name: string,
  prizeAmount: bigint,
  slots: bigint,
  deadline: bigint,
  sponsor: `0x${string}`,
  reviewers: readonly `0x${string}`[],
  threshold: bigint,
  slotsUsed: bigint,
  totalDeposited: bigint,
  exists: boolean,
];

/** ProgramMeta tuple from getProgramMeta() */
export type ProgramMetaTuple = readonly [
  programType: number,
  category: number,
  description: string,
];

/** Submission tuple from getSubmission() */
export type SubmissionTuple = readonly [
  submitter: `0x${string}`,
  projectContract: `0x${string}`,
  metadataURI: string,
  approvals: bigint,
  paid: boolean,
];

export interface ProgramEntry {
  id: bigint;
  data: ProgramTuple;
}

export interface ProgramMetaEntry {
  id: bigint;
  meta: ProgramMetaTuple;
}

export interface SubmissionEntry {
  id: bigint;
  data: SubmissionTuple;
}

type ReadResult<T> = { status: 'success'; result: T } | { status: 'failure'; error: Error };

export function mapPrograms(
  results: ReadResult<ProgramTuple>[] | undefined,
): ProgramEntry[] {
  if (!results) return [];
  const out: ProgramEntry[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'success' && r.result) {
      out.push({ id: BigInt(i), data: r.result });
    }
  }
  return out;
}

export function mapProgramMetas(
  results: ReadResult<ProgramMetaTuple>[] | undefined,
): ProgramMetaEntry[] {
  if (!results) return [];
  const out: ProgramMetaEntry[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'success' && r.result) {
      out.push({ id: BigInt(i), meta: r.result });
    }
  }
  return out;
}

export function mapSubmissions(
  results: ReadResult<SubmissionTuple>[] | undefined,
): SubmissionEntry[] {
  if (!results) return [];
  const out: SubmissionEntry[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'success' && r.result) {
      out.push({ id: BigInt(i), data: r.result });
    }
  }
  return out;
}
