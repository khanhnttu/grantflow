import { useState } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { CheckCircle2, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, InnerCard } from '@/components/ui/Card';
import { TxButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GRANTFLOW_ABI, GRANTFLOW_ADDRESS } from '@/lib/grantflow';
import { ACTIVE_CHAIN_ID, CHAIN_LABEL, txUrl } from '@/lib/chainConfig';
import { formatUSDC, formatAddress, parseOnchainError, deadlineLabel } from '@/lib/utils';
import {
  useAllPrograms,
  useProgramCount,
  useAllSubmissions,
  useSubmissionCount,
  useIsReviewer,
} from '@/hooks/useGrantFlow';
import { mapPrograms, mapSubmissions, type ProgramTuple, type SubmissionTuple } from '@/lib/contractHelpers';

// ── SubmissionRow ──────────────────────────────────────────────────────────

function SubmissionRow({
  programId,
  submissionId,
  submitter,
  projectContract,
  metadataURI,
  approvals,
  paid,
  threshold,
  onApproved,
}: {
  programId: bigint;
  submissionId: bigint;
  submitter: string;
  projectContract: string;
  metadataURI: string;
  approvals: bigint;
  paid: boolean;
  threshold: bigint;
  onApproved: () => void;
}) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const wrongChain = chainId !== ACTIVE_CHAIN_ID;

  const { writeContract: approveTx, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleApprove = () => {
    if (wrongChain) { switchChain({ chainId: ACTIVE_CHAIN_ID }); return; }
    approveTx(
      { address: GRANTFLOW_ADDRESS, abi: GRANTFLOW_ABI, functionName: 'approve', args: [programId, submissionId] },
      {
        onSuccess: () => { toast.success('Vote recorded!'); onApproved(); },
        onError: (e) => toast.error(parseOnchainError(e)),
      },
    );
  };

  const pctWidth = Math.min(100, Math.round((Number(approvals) / Number(threshold)) * 100));

  return (
    <InnerCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mono text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>
            {projectContract}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            by {formatAddress(submitter)}
          </p>
          {metadataURI && (
            <a
              href={metadataURI.startsWith('ipfs://') ? metadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/') : metadataURI}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs mt-1"
              style={{ color: 'var(--accent-hover)' }}
            >
              View submission <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {paid ? (
          <Badge variant="success" className="flex-shrink-0">
            <CheckCircle2 className="size-3 mr-1" /> Paid
          </Badge>
        ) : (
          <div className="flex-shrink-0">
            {isSuccess ? (
              <a
                href={txUrl(hash!)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold"
                style={{ color: 'var(--success)' }}
              >
                Voted ✓
              </a>
            ) : (
              <TxButton
                isConnected={isConnected}
                wrongChain={wrongChain}
                chainLabel={CHAIN_LABEL}
                isPending={isPending}
                isConfirming={isConfirming}
                label="Approve"
                onClick={handleApprove}
                className="text-xs py-2 px-4 w-auto"
                disabled={paid || address === undefined}
              />
            )}
          </div>
        )}
      </div>
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
          <span>{approvals.toString()} of {threshold.toString()} approvals</span>
          {paid && <span style={{ color: 'var(--success)' }}>Payout queued</span>}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pctWidth}%`, background: paid ? 'var(--success)' : 'var(--accent)' }}
          />
        </div>
      </div>
    </InnerCard>
  );
}

// ── ProgramQueue ───────────────────────────────────────────────────────────

function ProgramQueue({
  programId,
  name,
  prize,
  threshold,
  deadline,
}: {
  programId: bigint;
  name: string;
  prize: bigint;
  threshold: bigint;
  deadline: bigint;
}) {
  const { address } = useAccount();
  const [open, setOpen] = useState(true);

  const { data: subCount, refetch } = useSubmissionCount(programId);
  const { data: allSubs, refetch: refetchSubs } = useAllSubmissions(programId, subCount);
  const { data: amReviewer } = useIsReviewer(programId, address);

  const submissions = mapSubmissions(
    allSubs?.map((r) => r as { status: 'success'; result: SubmissionTuple } | { status: 'failure'; error: Error })
  );
  const unpaid = submissions.filter((s) => !s.data[4]);

  if (!amReviewer) return null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>{name}</span>
            <Badge variant={unpaid.length > 0 ? 'warning' : 'muted'}>
              {unpaid.length} pending
            </Badge>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {formatUSDC(prize)} USDC · threshold {threshold.toString()} · {deadlineLabel(deadline)}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
          style={{ color: 'var(--muted)' }}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {submissions.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>No submissions yet.</p>
          )}
          {submissions.map(({ id, data }) => {
            const [_submitter, _projectContract, _metadataURI, _approvals, _paid] = data;
            return (
              <SubmissionRow
                key={id.toString()}
                programId={programId}
                submissionId={id}
                submitter={_submitter}
                projectContract={_projectContract}
                metadataURI={_metadataURI}
                approvals={_approvals}
                paid={_paid}
                threshold={threshold}
                onApproved={() => { void refetch(); void refetchSubs(); }}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── ReviewerPage ───────────────────────────────────────────────────────────

export function ReviewerPage() {
  const { data: programCount, refetch: refetchCount } = useProgramCount();
  const { data: allPrograms, refetch: refetchPrograms } = useAllPrograms(programCount);

  const programs = mapPrograms(
    allPrograms?.map((r) => r as { status: 'success'; result: ProgramTuple } | { status: 'failure'; error: Error })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Reviewer</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Review queue for programs where you are a designated reviewer.
          </p>
        </div>
        <button
          onClick={() => { void refetchCount(); void refetchPrograms(); }}
          className="p-1.5 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0 mt-0.5"
          style={{ color: 'var(--subtle)' }}
          aria-label="Refresh"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {programs.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Connect your wallet to see programs where you are a reviewer.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {programs.map(({ id, data }) => {
            const [_name, _prize, , _deadline, , , _threshold] = data;
            return (
              <ProgramQueue
                key={id.toString()}
                programId={id}
                name={_name}
                prize={_prize}
                threshold={_threshold}
                deadline={_deadline}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
