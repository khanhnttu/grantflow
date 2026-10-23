
import { useState } from 'react';
import { ExternalLink, RefreshCw, Trophy, Clock, Users, Shield, Zap, Tag } from 'lucide-react';
import { Card, InnerCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { buildAddressExplorerUrl } from '@/onchain-facts';
import {
  mapPrograms,
  mapProgramMetas,
  mapSubmissions,
  type ProgramTuple,
  type ProgramMetaTuple,
  type SubmissionTuple,
  CATEGORY_LABELS,
  PROGRAM_TYPE_LABELS,
  type CategoryValue,
  type ProgramTypeValue,
} from '@/lib/contractHelpers';
import { ACTIVE_CHAIN_ID, GRANTFLOW_ADDRESS, txUrl, addrUrl } from '@/lib/chainConfig';
import { formatUSDC, formatAddress, deadlineLabel, deadlineDate } from '@/lib/utils';
import {
  useAllPrograms,
  useProgramCount,
  useAllSubmissions,
  useSubmissionCount,
  useContractUsdcBalance,
  useContractEvents,
  useFeeBps,
  useTotalFeesCollected,
  useAllProgramMetas,
  useProgramMeta,
} from '@/hooks/useGrantFlow';
import { TokenUSDC } from '@web3icons/react';

const MODULE_NOW = BigInt(Math.floor(Date.now() / 1000));

const ALL_CATEGORIES = ['All', 'Hackathon', 'Bounty', 'Contest', 'Referral'] as const;
type CategoryFilter = (typeof ALL_CATEGORIES)[number];

// ── Verified Onchain Section ──────────────────────────────────────────────

function VerifiedSection({ programId }: { programId: bigint }) {
  const { data: liveBalance, isLoading: balLoading } = useContractUsdcBalance();
  const { events, loading: eventsLoading } = useContractEvents(programId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Shield className="size-3.5" style={{ color: 'var(--success)' }} />
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Verified Onchain
        </h3>
      </div>

      {/* Contract address */}
      <InnerCard className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Contract</span>
          <a
            href={addrUrl(GRANTFLOW_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 mono text-xs"
            style={{ color: 'var(--accent-hover)' }}
          >
            {GRANTFLOW_ADDRESS.slice(0, 10)}…{GRANTFLOW_ADDRESS.slice(-6)}
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Live USDC pool balance */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>USDC pool (live)</span>
          <div className="flex items-center gap-1">
            <TokenUSDC size={14} variant="branded" />
            <span className="display text-sm font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {balLoading ? '…' : liveBalance !== undefined ? formatUSDC(liveBalance) : '—'}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>USDC</span>
          </div>
        </div>
      </InnerCard>

      {/* Event log */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Payout events</p>
        {eventsLoading && (
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Loading events…</p>
        )}
        {!eventsLoading && events.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>No payout events yet.</p>
        )}
        <div className="space-y-1.5">
          {events.map((ev) => (
            <div
              key={ev.txHash + ev.event}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant={ev.event === 'PrizePaid' ? 'success' : ev.event === 'Reclaimed' ? 'muted' : 'warning'}>
                    {ev.label}
                  </Badge>
                  <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
                    {formatAddress(ev.actor)}
                  </span>
                </div>
                <p className="display text-sm font-bold tabular-nums mt-0.5" style={{ color: 'var(--ink)' }}>
                  {formatUSDC(ev.amount)} USDC
                </p>
              </div>
              <a
                href={txUrl(ev.txHash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs flex-shrink-0"
                style={{ color: 'var(--accent-hover)' }}
              >
                Tx <ExternalLink className="size-3" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ProgramDetail ─────────────────────────────────────────────────────────

function ProgramDetail({
  id,
  name,
  prize,
  slots,
  deadline,
  sponsor,
  threshold,
  slotsUsed,
  totalDeposited,
  programType,
  category,
  description,
}: {
  id: bigint;
  name: string;
  prize: bigint;
  slots: bigint;
  deadline: bigint;
  sponsor: string;
  threshold: bigint;
  slotsUsed: bigint;
  totalDeposited: bigint;
  programType?: ProgramTypeValue;
  category?: CategoryValue;
  description?: string;
}) {
  const { data: subCount } = useSubmissionCount(id);
  const { data: allSubs } = useAllSubmissions(id, subCount);

  const submissions = mapSubmissions(
    allSubs?.map((r) => r as { status: 'success'; result: SubmissionTuple } | { status: 'failure'; error: Error })
  );

  const winners = submissions.filter((s) => s.data[4]);
  const remaining = totalDeposited - slotsUsed * prize;
  const isActive = deadline > MODULE_NOW && slotsUsed < slots;
  const isOpenBounty = programType === 1;

  return (
    <Card className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>{name}</h2>
            <Badge variant={isActive ? 'success' : 'muted'}>{isActive ? 'Active' : 'Closed'}</Badge>
            {category !== undefined && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(18,45,69,0.07)', color: 'var(--ink-2)' }}
              >
                <Tag className="size-2.5" />
                {CATEGORY_LABELS[category]}
              </span>
            )}
            {programType !== undefined && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(18,45,69,0.07)', color: 'var(--ink-2)' }}
              >
                {PROGRAM_TYPE_LABELS[programType]}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm mt-1.5 text-pretty" style={{ color: 'var(--ink-2)' }}>{description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <a
              href={buildAddressExplorerUrl(ACTIVE_CHAIN_ID, sponsor)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--muted)' }}
            >
              Sponsor: <span className="mono">{formatAddress(sponsor)}</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <TokenUSDC size={20} variant="branded" />
            <span className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {formatUSDC(remaining)}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>USDC in pool</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <InnerCard className="text-center py-3">
          <p className="display text-lg font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {formatUSDC(prize)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>per winner</p>
        </InnerCard>
        <InnerCard className="text-center py-3">
          <p className="display text-lg font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {slotsUsed.toString()}/{slots.toString()}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>slots filled</p>
        </InnerCard>
        <InnerCard className="text-center py-3">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Clock className="size-3" style={{ color: 'var(--muted)' }} />
          </div>
          <p className="display text-sm font-bold" style={{ color: 'var(--ink)' }}>{deadlineLabel(deadline)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{deadlineDate(deadline)}</p>
        </InnerCard>
      </div>

      {/* Winners */}
      {winners.length > 0 && (
        <div>
          <h3
            className="text-xs font-semibold mb-2 flex items-center gap-1.5 uppercase tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            <Trophy className="size-3" style={{ color: '#b47800' }} />
            Winners
          </h3>
          <div className="space-y-2">
            {winners.map(({ id: subId, data }) => {
              const [_submitter, _projectContract, _metadataURI] = data;
              return (
                <InnerCard key={subId.toString()} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {isOpenBounty ? (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        by {formatAddress(_submitter)}
                      </p>
                    ) : (
                      <p className="mono text-xs truncate" style={{ color: 'var(--ink-2)' }}>
                        {_projectContract}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {!isOpenBounty && (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          by {formatAddress(_submitter)}
                        </p>
                      )}
                      {_metadataURI && (
                        <a
                          href={_metadataURI.startsWith('ipfs://') ? _metadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/') : _metadataURI}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 text-xs"
                          style={{ color: 'var(--accent-hover)' }}
                        >
                          {isOpenBounty ? 'Work' : 'Docs'} <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Badge variant="success" className="flex-shrink-0">
                    {formatUSDC(prize)} USDC
                  </Badge>
                </InnerCard>
              );
            })}
          </div>
        </div>
      )}

      {/* All submissions */}
      {submissions.length > 0 && (
        <div>
          <h3
            className="text-xs font-semibold mb-2 flex items-center gap-1.5 uppercase tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            <Users className="size-3" />
            All Submissions ({submissions.length})
          </h3>
          <div className="space-y-2">
            {submissions.map(({ id: subId, data }) => {
              const [_submitter, _projectContract, _metadataURI, _approvals, _paid] = data;
              return (
                <div
                  key={subId.toString()}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                  style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                >
                  <div className="min-w-0 flex-1">
                    {!isOpenBounty && (
                      <p className="mono text-xs truncate" style={{ color: 'var(--ink-2)' }}>{_projectContract}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {_approvals.toString()}/{threshold.toString()} approvals · by {formatAddress(_submitter)}
                      </p>
                      {_metadataURI && (
                        <a
                          href={_metadataURI.startsWith('ipfs://') ? _metadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/') : _metadataURI}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--accent-hover)' }}
                        >
                          {isOpenBounty ? 'Work' : 'Docs'} <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Badge variant={_paid ? 'success' : 'default'} className="flex-shrink-0">
                    {_paid ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {submissions.length === 0 && (
        <p className="text-sm text-center py-2" style={{ color: 'var(--muted)' }}>No submissions yet.</p>
      )}

      {/* Verified onchain section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        <VerifiedSection programId={id} />
      </div>
    </Card>
  );
}

// ── PublicProgramPage — shareable program page ─────────────────────────────

export function PublicProgramPage({ programId, onBack }: { programId: bigint; onBack: () => void }) {
  const { data: programData, isLoading } = useAllPrograms(undefined);
  // We'll read the single program via useProgramMeta + useAllPrograms on a 1-element set
  const { data: meta } = useProgramMeta(programId);

  // Build a minimal programs list with just this one id so we can reuse useAllPrograms by reading it from the parent
  // Instead, read directly using the raw hook that fetches a single program
  const count = programId !== undefined ? programId + 1n : undefined;
  const { data: progs } = useAllPrograms(count);
  const programs = mapPrograms(
    progs?.map((r) => r as { status: 'success'; result: ProgramTuple } | { status: 'failure'; error: Error })
  );

  const _ = programData; // suppress unused

  const prog = programs.find((p) => p.id === programId);

  if (isLoading || !prog) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="text-xs font-semibold"
          style={{ color: 'var(--muted)' }}
        >
          ← Back to Programs
        </button>
        <Card className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {isLoading ? 'Loading…' : 'Program not found.'}
          </p>
        </Card>
      </div>
    );
  }

  const [_name, _prize, _slots, _deadline, _sponsor, , _threshold, _slotsUsed, _totalDeposited] = prog.data;
  const programType = meta ? (meta[0] as ProgramTypeValue) : undefined;
  const category = meta ? (meta[1] as CategoryValue) : undefined;
  const description = meta ? meta[2] : undefined;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-xs font-semibold"
        style={{ color: 'var(--muted)' }}
      >
        ← Back to Programs
      </button>
      <ProgramDetail
        id={programId}
        name={_name}
        prize={_prize}
        slots={_slots}
        deadline={_deadline}
        sponsor={_sponsor}
        threshold={_threshold}
        slotsUsed={_slotsUsed}
        totalDeposited={_totalDeposited}
        programType={programType}
        category={category}
        description={description}
      />
    </div>
  );
}

// ── ProgramsPage ──────────────────────────────────────────────────────────

export function ProgramsPage({ onSelectProgram }: { onSelectProgram?: (id: bigint) => void }) {
  const { data: programCount, refetch: refetchCount } = useProgramCount();
  const { data: allPrograms, refetch: refetchPrograms } = useAllPrograms(programCount);
  const { data: allMetas, refetch: refetchMetas } = useAllProgramMetas(programCount);
  const { data: feeBps } = useFeeBps();
  const { data: totalFeesCollected } = useTotalFeesCollected();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');

  const programs = mapPrograms(
    allPrograms?.map((r) => r as { status: 'success'; result: ProgramTuple } | { status: 'failure'; error: Error })
  );
  const allMetasList = mapProgramMetas(
    allMetas?.map((r) => r as { status: 'success'; result: ProgramMetaTuple } | { status: 'failure'; error: Error })
  );

  const filteredPrograms = programs.filter(({ id }) => {
    if (categoryFilter === 'All') return true;
    const meta = allMetasList.find((m) => m.id === id)?.meta;
    if (!meta) return false;
    return CATEGORY_LABELS[meta[1] as CategoryValue] === categoryFilter;
  });

  const totalPool = programs.reduce((sum, { data }) => {
    const [, _prize, , , , , , _slotsUsed, _totalDeposited] = data;
    return sum + (_totalDeposited - _slotsUsed * _prize);
  }, 0n);

  return (
    <div className="space-y-6">
      {/* ── Hero copy ──────────────────────────────────────────────── */}
      <div
        className="rounded-3xl px-6 py-8 sm:py-10"
        style={{ background: 'var(--accent)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex size-12 items-center justify-center rounded-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Zap className="size-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/60 tracking-widest uppercase mb-1">GrantFlow</p>
            <p className="display text-xl sm:text-2xl font-bold text-white leading-snug max-w-lg">
              Grant programs still pay winners by hand, weeks later.
            </p>
            <p className="mt-1 text-base sm:text-lg font-medium text-white/80 max-w-lg">
              GrantFlow puts the whole payout onchain.
            </p>
          </div>
        </div>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Programs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Live pool balances, winners, and every payout — all onchain.
          </p>
        </div>
        <button
          onClick={() => { void refetchCount(); void refetchPrograms(); void refetchMetas(); }}
          className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: 'var(--subtle)' }}
          aria-label="Refresh"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Global pool stat */}
      {programs.length > 0 && (
        <div
          className="rounded-3xl p-5 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, #1a5c8a 0%, #122d45 100%)',
            boxShadow: '0 4px 24px rgba(18,45,69,0.16)',
          }}
        >
          <div
            className="flex size-12 items-center justify-center rounded-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.10)' }}
          >
            <TokenUSDC size={28} variant="branded" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/60 tracking-widest uppercase">Total Live Pool</p>
            <p className="display text-3xl font-bold tabular-nums text-white mt-0.5">
              {formatUSDC(totalPool)} <span className="text-lg font-medium text-white/60">USDC</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="display text-2xl font-bold text-white">{programs.length}</p>
            <p className="text-xs text-white/60">programs</p>
          </div>
        </div>
      )}

      {/* Protocol stats card */}
      <div
        className="rounded-2xl px-5 py-4 grid grid-cols-2 gap-4 sm:grid-cols-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Platform Fee
          </p>
          <p className="display text-xl font-bold mt-0.5" style={{ color: 'var(--ink)' }}>
            {feeBps !== undefined ? `${Number(feeBps) / 100}%` : '…'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>per program created</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Fees Collected
          </p>
          <p className="display text-xl font-bold mt-0.5" style={{ color: 'var(--ink)' }}>
            {totalFeesCollected !== undefined ? `${formatUSDC(totalFeesCollected)} USDC` : '…'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>all-time protocol revenue</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Programs
          </p>
          <p className="display text-xl font-bold mt-0.5" style={{ color: 'var(--ink)' }}>
            {programCount !== undefined ? programCount.toString() : '…'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>onchain total</p>
        </div>
      </div>

      {/* Category filter chips */}
      {programs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={
                categoryFilter === cat
                  ? { background: 'var(--accent)', color: 'white' }
                  : { background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {programs.length === 0 && (
        <Card className="text-center py-16">
          <div className="flex justify-center mb-4">
            <div
              className="flex size-14 items-center justify-center rounded-3xl"
              style={{ background: 'var(--surface-muted)' }}
            >
              <Trophy className="size-6" style={{ color: 'var(--subtle)' }} />
            </div>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No programs yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Be the first — go to the Sponsor tab to create one.
          </p>
        </Card>
      )}

      {filteredPrograms.length === 0 && programs.length > 0 && (
        <Card className="text-center py-10">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No programs in this category.</p>
        </Card>
      )}

      {filteredPrograms.map(({ id, data }) => {
        const [_name, _prize, _slots, _deadline, _sponsor, , _threshold, _slotsUsed, _totalDeposited] = data;
        const meta = allMetasList.find((m) => m.id === id)?.meta;
        const programType = meta ? (meta[0] as ProgramTypeValue) : undefined;
        const category = meta ? (meta[1] as CategoryValue) : undefined;
        const description = meta ? meta[2] : undefined;

        return (
          <div key={id.toString()}>
            {/* "View program" link */}
            {onSelectProgram && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => onSelectProgram(id)}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: 'var(--accent-hover)' }}
                >
                  Share / open program page <ExternalLink className="size-3" />
                </button>
              </div>
            )}
            <ProgramDetail
              id={id}
              name={_name}
              prize={_prize}
              slots={_slots}
              deadline={_deadline}
              sponsor={_sponsor}
              threshold={_threshold}
              slotsUsed={_slotsUsed}
              totalDeposited={_totalDeposited}
              programType={programType}
              category={category}
              description={description}
            />
          </div>
        );
      })}
    </div>
  );
}
