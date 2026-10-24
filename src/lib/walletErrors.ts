/**
 * Human-readable wallet/transaction error messages.
 */
import { ACTIVE_CHAIN_ID } from '@/lib/chainConfig';

export function parseWalletError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request'))
    return 'Transaction rejected by wallet.';
  if (lower.includes('insufficient') && (lower.includes('usdc') || lower.includes('balance') || lower.includes('funds')))
    return 'Insufficient USDC balance.';
  if (lower.includes('allowance') || lower.includes('approve'))
    return 'Please approve USDC spending first.';
  if (lower.includes('chain') && lower.includes('mismatch'))
    return `Wrong network — please switch to ${ACTIVE_CHAIN_ID === 5042 ? 'Arc Mainnet' : 'Arc Testnet'}.`;
  if (lower.includes('nonce') || lower.includes('replacement'))
    return 'Transaction nonce conflict. Refresh and try again.';
  if (lower.includes('gas') || lower.includes('out of gas'))
    return 'Transaction ran out of gas.';

  // Contract custom errors
  const contractErrMap: Record<string, string> = {
    NotSubmissionPhase:      'Submissions are closed for this program.',
    NotJudgingPhase:         'Voting is not open yet.',
    AlreadyFinalized:        'This program is already finalized.',
    NotAfterJudgingDeadline: 'Judging deadline has not passed yet.',
    AlreadySubmitted:        'You already submitted to this program.',
    ConflictOfInterest:      'Sponsors and judges cannot submit.',
    WrongProgramType:        'Use a link (not a contract) for Open Bounty.',
    InvalidProjectContract:  'Contract address has no deployed code.',
    TooManySubmissions:      'Submission limit (100) reached.',
    NotJudge:                'You are not a judge for this program.',
    AlreadyVoted:            'You already voted on this submission.',
    NothingToClaim:          'No prizes to claim.',
    NothingToReclaim:        'Nothing to reclaim (fully awarded or already reclaimed).',
    NotSponsor:              'Only the sponsor can do this.',
    NotFinalized:            'Finalize the program first.',
    AlreadyCancelled:        'Program is already cancelled.',
    SubmissionsExist:        'Cannot cancel after submissions exist.',
    FeeTooHigh:              'Platform fee exceeds the 5% maximum.',
    ZeroAddress:             'Address cannot be zero.',
    InvalidParams:           'Invalid parameters.',
  };
  for (const [key, label] of Object.entries(contractErrMap)) {
    if (msg.includes(key)) return label;
  }

  return 'Transaction failed. Check your wallet and try again.';
}

export function explorerTxUrl(txHash: string, chainId: number): string {
  const base = chainId === 5042 ? 'https://explorer.arc.io' : 'https://explorer.testnet.arc.io';
  return `${base}/tx/${txHash}`;
}
