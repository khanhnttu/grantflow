import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatUSDC(raw: bigint, decimals = 6): string {
  const n = Number(raw) / 10 ** decimals;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function parseUSDCInput(input: string, decimals = 6): bigint {
  const n = parseFloat(input);
  if (isNaN(n) || n < 0) return 0n;
  return BigInt(Math.round(n * 10 ** decimals));
}

export function deadlineLabel(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  const now = Date.now();
  const diff = date.getTime() - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function deadlineDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? '';
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.';
  if (msg.includes('alreadyvoted')) return 'You already voted on this submission.';
  if (msg.includes('alreadypaid')) return 'This submission was already paid.';
  if (msg.includes('deadlinepassed')) return 'The program deadline has passed.';
  if (msg.includes('deadlinenotpassed')) return 'The deadline has not passed yet.';
  if (msg.includes('slotsfull')) return 'All prize slots are filled.';
  if (msg.includes('alreadysubmittedwallet')) return 'You already submitted to this program.';
  if (msg.includes('alreadysubmitted')) return 'This contract was already submitted.';
  if (msg.includes('wrongprogramtype')) return 'Wrong submission type for this program.';
  if (msg.includes('invalidprojectcontract')) return 'Address has no deployed code.';
  if (msg.includes('invalidparams')) return 'Invalid parameters.';
  if (msg.includes('notreviewer')) return 'You are not a reviewer for this program.';
  if (msg.includes('notsponsor')) return 'Only the sponsor can do this.';
  if (msg.includes('programnotfound')) return 'Program not found.';
  if (msg.includes('submissionnotfound')) return 'Submission not found.';
  if (msg.includes('insufficient')) return 'Insufficient USDC balance or allowance.';
  if (msg.includes('reverted')) return 'Transaction reverted. Check your inputs.';
  return 'Something went wrong. Please try again.';
}
