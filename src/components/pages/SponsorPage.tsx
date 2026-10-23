import { useState } from 'react';
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { erc20Abi } from 'viem';
import { toast } from 'sonner';
import { Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, InnerCard } from '@/components/ui/Card';
import { Button, TxButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { GRANTFLOW_ABI, GRANTFLOW_ADDRESS } from '@/lib/grantflow';
import { ACTIVE_CHAIN_ID, USDC_ADDRESS, CHAIN_LABEL, txUrl } from '@/lib/chainConfig';
import { parseUSDCInput, formatUSDC, parseOnchainError, deadlineDate, deadlineLabel } from '@/lib/utils';
import { useAllPrograms, useProgramCount, useFeeBps, useAllProgramMetas } from '@/hooks/useGrantFlow';
import { mapPrograms, mapProgramMetas, type ProgramTuple, type ProgramMetaTuple, PROGRAM_TYPE, CATEGORY, CATEGORY_LABELS, PROGRAM_TYPE_LABELS } from '@/lib/contractHelpers';

// Stable page-load timestamp for deadline comparisons
const MODULE_NOW = BigInt(Math.floor(Date.now() / 1000));

// ── Deadline helper ────────────────────────────────────────────────────────

type DeadlineUnit = 'minutes' | 'hours' | 'days';
const UNIT_SECONDS: Record<DeadlineUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
};

// ── ReclaimRow ─────────────────────────────────────────────────────────────

function ReclaimRow({ programId, sponsor, deadline, slotsUsed, prizeAmount, totalDeposited }: {
  programId: bigint;
  sponsor: string;
  deadline: bigint;
  slotsUsed: bigint;
  prizeAmount: bigint;
  totalDeposited: bigint;
}) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const wrongChain = chainId !== ACTIVE_CHAIN_ID;
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isSponsor = address?.toLowerCase() === sponsor.toLowerCase();
  const afterDeadline = MODULE_NOW > deadline;
  const unallocated = totalDeposited - slotsUsed * prizeAmount;

  if (!isSponsor || unallocated === 0n) return null;

  const handleReclaim = () => {
    if (wrongChain) { switchChain({ chainId: ACTIVE_CHAIN_ID }); return; }
    writeContract(
      { address: GRANTFLOW_ADDRESS, abi: GRANTFLOW_ABI, functionName: 'reclaim', args: [programId] },
      { onError: (e) => toast.error(parseOnchainError(e)) },
    );
  };

  return (
    <div
      className="mt-3 flex items-center justify-between rounded-xl p-3 gap-3"
      style={{ background: 'rgba(26,128,71,0.06)', border: '1px solid rgba(26,128,71,0.15)' }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
          Reclaimable: {formatUSDC(unallocated)} USDC
        </p>
        {!afterDeadline && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Available {deadlineLabel(deadline)}
          </p>
        )}
      </div>
      {isSuccess && hash ? (
        <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--success)' }}>
          Reclaimed ✓
        </a>
      ) : (
        <Button
          variant="secondary"
          className="text-xs py-1.5 px-3 flex-shrink-0"
          disabled={!afterDeadline || isPending || isConfirming}
          loading={isPending || isConfirming}
          onClick={handleReclaim}
        >
          Reclaim
        </Button>
      )}
    </div>
  );
}

// ── SponsorPage ────────────────────────────────────────────────────────────

export function SponsorPage() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const wrongChain = chainId !== ACTIVE_CHAIN_ID;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programType, setProgramType] = useState<0 | 1>(PROGRAM_TYPE.ONCHAIN_BUILD);
  const [category, setCategory] = useState<0 | 1 | 2 | 3>(CATEGORY.Hackathon);
  const [prizeAmount, setPrizeAmount] = useState('');
  const [slots, setSlots] = useState('');

  // Flexible deadline: value + unit
  const [deadlineValue, setDeadlineValue] = useState('30');
  const [deadlineUnit, setDeadlineUnit] = useState<DeadlineUnit>('days');

  const [reviewers, setReviewers] = useState('');
  const [threshold, setThreshold] = useState('1');
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: programCount, refetch: refetchCount } = useProgramCount();
  const { data: allPrograms, refetch: refetchPrograms } = useAllPrograms(programCount);
  const { data: allMetas, refetch: refetchMetas } = useAllProgramMetas(programCount);

  const allProgramsList = mapPrograms(
    allPrograms?.map((r) => r as { status: 'success'; result: ProgramTuple } | { status: 'failure'; error: Error })
  );
  const allMetasList = mapProgramMetas(
    allMetas?.map((r) => r as { status: 'success'; result: ProgramMetaTuple } | { status: 'failure'; error: Error })
  );
  const myPrograms = allProgramsList.filter(
    (p) => p.data[4].toLowerCase() === (address ?? '').toLowerCase()
  );

  // Allowance check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, GRANTFLOW_ADDRESS] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: !!address },
  });

  const { data: feeBps = 0n } = useFeeBps();

  const { writeContract: approveUsdc, data: approveHash, isPending: approvePending } = useWriteContract();
  const { isLoading: approveConfirming } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: createProgram, data: createHash, isPending: createPending } = useWriteContract();
  const { isLoading: createConfirming, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createHash });

  const reviewerList = reviewers.split('\n').map((r) => r.trim()).filter(Boolean);
  const prizeRaw = parseUSDCInput(prizeAmount);
  const slotsNum = parseInt(slots) || 0;
  const prizePool = prizeRaw * BigInt(slotsNum);
  const feeBpsBig = feeBps ?? 0n;
  const feeAmount = (prizePool * feeBpsBig) / 10_000n;
  const totalRequired = prizePool + feeAmount;
  const needsApproval = (allowance ?? 0n) < totalRequired;

  // Compute deadline in seconds
  const deadlineSecs = () => {
    const v = parseInt(deadlineValue) || 1;
    return BigInt(Math.floor(Date.now() / 1000) + v * UNIT_SECONDS[deadlineUnit]);
  };

  const handleApprove = () => {
    if (wrongChain) { switchChain({ chainId: ACTIVE_CHAIN_ID }); return; }
    approveUsdc(
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [GRANTFLOW_ADDRESS, totalRequired] },
      { onSuccess: () => { void refetchAllowance(); }, onError: (e) => toast.error(parseOnchainError(e)) },
    );
  };

  const handleCreate = () => {
    if (wrongChain) { switchChain({ chainId: ACTIVE_CHAIN_ID }); return; }
    if (!name || !prizeAmount || !slots || reviewerList.length === 0) {
      toast.error('Fill in all fields.'); return;
    }
    const threshNum = parseInt(threshold) || 1;
    if (reviewerList.length < threshNum) {
      toast.error('Threshold cannot exceed reviewer count.'); return;
    }
    createProgram(
      {
        address: GRANTFLOW_ADDRESS,
        abi: GRANTFLOW_ABI,
        functionName: 'createProgram',
        args: [name, prizeRaw, BigInt(slotsNum), deadlineSecs(), reviewerList as `0x${string}`[], BigInt(threshNum), programType, category, description],
      },
      {
        onSuccess: () => {
          toast.success('Program created!');
          setName(''); setDescription(''); setPrizeAmount(''); setSlots('');
          setReviewers(''); setThreshold('1');
          setDeadlineValue('30'); setDeadlineUnit('days');
          setProgramType(PROGRAM_TYPE.ONCHAIN_BUILD); setCategory(CATEGORY.Hackathon);
          setShowForm(false);
          void refetchCount(); void refetchPrograms(); void refetchMetas();
        },
        onError: (e) => toast.error(parseOnchainError(e)),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Sponsor</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Create grant programs, hackathons, bounties, and referral rewards.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="flex-shrink-0 gap-1.5">
          <Plus className="size-4" /> New Program
        </Button>
      </div>

      {/* ── Create form ──────────────────────────────────────────────── */}
      {showForm && (
        <Card>
          <h2 className="display text-lg font-semibold mb-5" style={{ color: 'var(--ink)' }}>Create Program</h2>
          <div className="space-y-4">

            {/* Program type */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>
                Program type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([PROGRAM_TYPE.ONCHAIN_BUILD, PROGRAM_TYPE.OPEN_BOUNTY] as const).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setProgramType(pt)}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-left transition-all"
                    style={
                      programType === pt
                        ? { background: 'var(--accent)', color: 'white', border: '1.5px solid var(--accent)' }
                        : { background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }
                    }
                  >
                    <p className="font-semibold">{PROGRAM_TYPE_LABELS[pt]}</p>
                    <p className="text-xs mt-0.5 opacity-70">
                      {pt === PROGRAM_TYPE.ONCHAIN_BUILD
                        ? 'Requires a deployed contract address'
                        : 'Open entry — contest, bounty, referral'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(CATEGORY)).map(([label, val]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCategory(val)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                    style={
                      category === val
                        ? { background: 'var(--accent)', color: 'white' }
                        : { background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Program name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hack the Planet 2026"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                Description (optional)
              </label>
              <textarea
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  minHeight: 72,
                }}
                placeholder="What are you rewarding? Who can apply? What counts as a valid submission?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prize per winner (USDC)"
                inputMode="decimal"
                value={prizeAmount}
                onChange={(e) => setPrizeAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="100.00"
                hint="6-decimal USDC"
              />
              <Input
                label="Winner slots"
                inputMode="numeric"
                value={slots}
                onChange={(e) => setSlots(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="5"
              />
            </div>

            {/* Flexible deadline */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>
                Deadline
              </label>
              <div className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={deadlineValue}
                  onChange={(e) => setDeadlineValue(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="30"
                  className="w-24 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {(['minutes', 'hours', 'days'] as DeadlineUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDeadlineUnit(u)}
                      className="px-3 py-2.5 text-xs font-medium transition-all capitalize"
                      style={
                        deadlineUnit === u
                          ? { background: 'var(--accent)', color: 'white' }
                          : { background: 'var(--surface-muted)', color: 'var(--ink-2)' }
                      }
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--subtle)' }}>
                Program closes in {deadlineValue || '?'} {deadlineUnit} from creation
              </p>
            </div>

            <Input
              label="Approval threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="2"
              hint="Votes needed to pay out"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                Reviewers (one address per line)
              </label>
              <textarea
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none mono"
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  minHeight: 88,
                }}
                placeholder={'0xAbc...\n0xDef...'}
                value={reviewers}
                onChange={(e) => setReviewers(e.target.value)}
                rows={3}
              />
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                {reviewerList.length} reviewer{reviewerList.length !== 1 ? 's' : ''} entered
              </p>
            </div>

            {prizePool > 0n && (
              <InnerCard>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: 'var(--muted)' }}>Prize pool</span>
                    <span className="display font-medium tabular-nums" style={{ color: 'var(--ink-2)' }}>
                      {formatUSDC(prizePool)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: 'var(--muted)' }}>
                      Platform fee ({Number(feeBpsBig) / 100}%)
                    </span>
                    <span className="display font-medium tabular-nums" style={{ color: 'var(--ink-2)' }}>
                      {formatUSDC(feeAmount)} USDC
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center text-sm pt-1.5"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <span className="font-semibold" style={{ color: 'var(--ink)' }}>Total you pay</span>
                    <span className="display font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                      {formatUSDC(totalRequired)} USDC
                    </span>
                  </div>
                </div>
              </InnerCard>
            )}

            {needsApproval ? (
              <TxButton
                isConnected={isConnected}
                wrongChain={wrongChain}
                chainLabel={CHAIN_LABEL}
                isPending={approvePending}
                isConfirming={approveConfirming}
                label={`Approve ${formatUSDC(totalRequired)} USDC`}
                onClick={handleApprove}
                disabled={totalRequired === 0n}
              />
            ) : (
              <TxButton
                isConnected={isConnected}
                wrongChain={wrongChain}
                chainLabel={CHAIN_LABEL}
                isPending={createPending}
                isConfirming={createConfirming}
                label="Create & Fund Program"
                onClick={handleCreate}
              />
            )}

            {createSuccess && createHash && (
              <a
                href={txUrl(createHash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: 'var(--success)' }}
              >
                Program created — view on explorer
              </a>
            )}
          </div>
        </Card>
      )}

      {/* ── My programs ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Your Programs
          </h2>
          <button
            onClick={() => { void refetchCount(); void refetchPrograms(); void refetchMetas(); }}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: 'var(--subtle)' }}
            aria-label="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>

        {myPrograms.length === 0 && (
          <Card className="text-center py-10">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {isConnected ? 'No programs yet. Create one above.' : 'Connect wallet to see your programs.'}
            </p>
          </Card>
        )}

        {myPrograms.map(({ id, data }) => {
          const [_name, _prize, _slots, _deadline, _sponsor, _reviewers, _threshold, _slotsUsed, _totalDeposited] = data;
          const meta = allMetasList.find((m) => m.id === id)?.meta;
          const isExpanded = expanded === Number(id);
          const remaining = _totalDeposited - _slotsUsed * _prize;
          const isActive = _deadline > MODULE_NOW && _slotsUsed < _slots;

          return (
            <Card key={id.toString()}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>{_name}</span>
                    <Badge variant={isActive ? 'success' : 'muted'}>
                      {isActive ? 'Active' : 'Closed'}
                    </Badge>
                    {meta && (
                      <Badge variant="default">{CATEGORY_LABELS[meta[1] as 0|1|2|3]}</Badge>
                    )}
                    {meta && (
                      <Badge variant="default">{PROGRAM_TYPE_LABELS[meta[0] as 0|1]}</Badge>
                    )}
                    <Badge variant="default">
                      {_slotsUsed.toString()}/{_slots.toString()} slots
                    </Badge>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {formatUSDC(_prize)} USDC per winner · {_reviewers.length} reviewer{_reviewers.length !== 1 ? 's' : ''} · threshold {_threshold.toString()} · {deadlineLabel(_deadline)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                    {formatUSDC(remaining)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>USDC remaining</p>
                </div>
              </div>

              <button
                onClick={() => setExpanded(isExpanded ? null : Number(id))}
                className="mt-3 flex items-center gap-1 text-xs rounded-lg px-1 py-0.5 hover:bg-black/5 transition-colors"
                style={{ color: 'var(--muted)' }}
              >
                {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {meta?.[2] && (
                    <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{meta[2]}</p>
                  )}
                  <InnerCard>
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Reviewers</p>
                    <div className="space-y-1">
                      {(_reviewers as string[]).map((r) => (
                        <p key={r} className="mono text-xs truncate" style={{ color: 'var(--ink-2)' }}>{r}</p>
                      ))}
                    </div>
                  </InnerCard>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                    Deadline: {deadlineDate(_deadline)}
                  </p>
                </div>
              )}

              <ReclaimRow
                programId={id}
                sponsor={_sponsor}
                deadline={_deadline}
                slotsUsed={_slotsUsed}
                prizeAmount={_prize}
                totalDeposited={_totalDeposited}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
