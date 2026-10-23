import { useState } from 'react';
import {
  useProgram, useProgramMeta, useSubmissionCount, useAllSubmissions,
  useContractEvents,
} from '@/hooks/useGrantFlow';
import {
  CATEGORY_LABELS, PROGRAM_TYPE_LABELS,
} from '@/lib/contractHelpers';
import type { CategoryValue, ProgramTypeValue } from '@/lib/contractHelpers';
import { EXPLORER_BASE } from '@/lib/chainConfig';
import {
  ArrowLeft, Clock, ExternalLink, CheckCircle2, Circle,
  AlertCircle, ShieldCheck, Copy, Check,
} from 'lucide-react';
import { useAccount } from 'wagmi';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Frozen at module load — avoids React purity lint on Date.now() during render
const NOW_S = Math.floor(Date.now() / 1000);

const USDC_DEC = 6;
const fmt = (raw: bigint) =>
  (Number(raw) / 10 ** USDC_DEC).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

function Countdown({ deadline }: { deadline: bigint }) {
  const secs = Number(deadline) - NOW_S;
  if (secs <= 0) return <span style={{ color: 'var(--subtle)' }}>Ended</span>;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const urgent = secs < 86400 * 2;
  const label = d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  return (
    <span style={{ color: urgent ? 'var(--warning)' : 'var(--success)' }}>
      <Clock size={12} className="inline mr-1" />{label}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="rounded p-1 transition-colors" style={{ color: 'var(--subtle)' }}
      title="Copy">
      {done ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
    </button>
  );
}

// ── Confirmation Card ─────────────────────────────────────────────────────────

export function ConfirmCard({
  title,
  prizePool,
  fee,
  total,
  onConfirm,
  onCancel,
  loading,
  contractAddress,
}: {
  title: string;
  prizePool: bigint;
  fee: bigint;
  total: bigint;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  contractAddress: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="card-strong rounded-2xl p-6 w-full max-w-sm" style={{ background: 'var(--surface-strong)' }}>
        <h3 className="display font-bold text-lg mb-1" style={{ color: 'var(--ink)' }}>{title}</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
          You approve this payment in your wallet. Amounts are exact.
        </p>

        <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--muted)' }}>Prize pool</span>
            <span className="mono font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{fmt(prizePool)} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--muted)' }}>Platform fee (1%)</span>
            <span className="mono tabular-nums" style={{ color: 'var(--muted)' }}>{fmt(fee)} USDC</span>
          </div>
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <div className="flex justify-between text-sm font-bold">
            <span style={{ color: 'var(--ink)' }}>Total you pay</span>
            <span className="mono tabular-nums" style={{ color: 'var(--accent)' }}>{fmt(total)} USDC</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-5 text-xs"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--subtle)' }}>
          <ShieldCheck size={13} style={{ flexShrink: 0, color: 'var(--accent)' }} />
          <span>Contract: </span>
          <span className="mono truncate">{short(contractAddress)}</span>
          <a href={`${EXPLORER_BASE}/address/${contractAddress}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={11} style={{ color: 'var(--accent)' }} />
          </a>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
            style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
            style={{
              background: loading ? 'var(--subtle)' : 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >{loading ? 'Waiting for wallet…' : 'Approve in wallet'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Program Detail Page ────────────────────────────────────────────────────────

export function ProgramDetailPage({
  programId,
  onBack,
  onNav,
}: {
  programId: number;
  onBack: () => void;
  onNav: (page: string) => void;
}) {
  const id = BigInt(programId);
  const { address } = useAccount();
  const { data: programData, isLoading: loadingProgram } = useProgram(id);
  const { data: metaData } = useProgramMeta(id);
  const { data: subCountData } = useSubmissionCount(id);
  const subCount = subCountData;
  const { data: subsRaw } = useAllSubmissions(id, subCount);
  const { events, loading: loadingEvents } = useContractEvents(id);

  if (loadingProgram) {
    return (
      <div className="flex items-center justify-center py-32" style={{ color: 'var(--subtle)' }}>
        <div className="animate-pulse text-sm">Loading program…</div>
      </div>
    );
  }

  if (!programData) {
    return (
      <div className="card flex flex-col items-center py-16" style={{ color: 'var(--subtle)' }}>
        <AlertCircle size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
        <div className="text-sm">Program not found.</div>
        <button onClick={onBack} className="mt-4 text-xs underline" style={{ color: 'var(--accent)' }}>Go back</button>
      </div>
    );
  }

  const [name, prizeAmount, slots, deadline, sponsor, reviewers, threshold, slotsUsed, totalDeposited] = programData as readonly [
    string, bigint, bigint, bigint, `0x${string}`, readonly `0x${string}`[], bigint, bigint, bigint, boolean
  ];

  const meta = metaData;
  const subs = subsRaw ?? [];

  const isSponsor = address?.toLowerCase() === sponsor.toLowerCase();
  const isReviewer = reviewers.some(r => r.toLowerCase() === (address ?? '').toLowerCase());
  const pct = slots > 0n ? Math.round((Number(slotsUsed) / Number(slots)) * 100) : 0;
  const isActive = BigInt(NOW_S) < deadline;

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-5 transition-colors"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={15} />
        Back to Explore
      </button>

      {/* Header */}
      <div className="card p-6 mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {meta && (
                <>
                  <span className="pill" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                    {CATEGORY_LABELS[meta[1] as CategoryValue]}
                  </span>
                  <span className="pill" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                    {PROGRAM_TYPE_LABELS[meta[0] as ProgramTypeValue]}
                  </span>
                </>
              )}
              <span className={`pill ${isActive ? 'pill-open' : 'pill-closed'}`}>
                {isActive ? 'Active' : 'Ended'}
              </span>
            </div>
            <h1 className="display font-bold text-2xl mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {name}
            </h1>
            {meta?.[2] && (
              <p className="text-sm" style={{ color: 'var(--muted)', maxWidth: '65ch' }}>{meta[2]}</p>
            )}
          </div>

          {/* Stats cluster */}
          <div className="flex gap-6 flex-shrink-0">
            <div>
              <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Pool</div>
              <div className="display font-bold text-2xl tabular-nums" style={{ color: 'var(--ink)' }}>
                {fmt(totalDeposited)}
              </div>
              <div className="text-xs" style={{ color: 'var(--subtle)' }}>USDC locked</div>
            </div>
            <div>
              <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Prize / slot</div>
              <div className="display font-bold text-2xl tabular-nums" style={{ color: 'var(--accent)' }}>
                {fmt(prizeAmount)}
              </div>
              <div className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</div>
            </div>
          </div>
        </div>

        {/* Progress + deadline */}
        <div className="mt-5">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--subtle)' }}>
            <span>{Number(slotsUsed)} / {Number(slots)} slots filled</span>
            <Countdown deadline={deadline} />
          </div>
          <div className="progress-track" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Sponsor / contract info */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
            Sponsor:
            <a href={`${EXPLORER_BASE}/address/${sponsor}`} target="_blank" rel="noopener noreferrer"
              className="mono hover:underline flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
              {short(sponsor)}<ExternalLink size={10} />
            </a>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
            {reviewers.length} reviewer{reviewers.length !== 1 ? 's' : ''}, {Number(threshold)} approvals needed
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)' }}>
        {/* Left: submissions + timeline */}
        <div className="space-y-4">
          {/* Submissions */}
          <div className="card p-5">
            <h2 className="display font-semibold text-base mb-4" style={{ color: 'var(--ink)' }}>
              Submissions ({Number(subCount ?? 0n)})
            </h2>
            {subs.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--subtle)' }}>
                No submissions yet.
              </div>
            ) : (
              <div className="space-y-3">
                {subs.map((s, i) => {
                  const sub = (s as { status: string; result?: readonly [string, string, string, bigint, boolean] }).result;
                  if (!sub) return null;
                  const [submitter, projectContract, metadataURI, approvals, paid] = sub;
                  const approvalPct = Number(threshold) > 0
                    ? Math.min(100, Math.round((Number(approvals) / Number(threshold)) * 100))
                    : 0;
                  return (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--ink)' }}>
                            Submission #{i + 1}
                          </div>
                          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--subtle)' }}>
                            By:
                            <a href={`${EXPLORER_BASE}/address/${submitter}`} target="_blank" rel="noopener noreferrer"
                              className="mono hover:underline" style={{ color: 'var(--accent)' }}>
                              {short(submitter)}
                            </a>
                          </div>
                        </div>
                        {paid ? (
                          <span className="pill pill-open">
                            <CheckCircle2 size={10} /> Paid
                          </span>
                        ) : (
                          <span className="pill" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)', border: '1px solid var(--border)' }}>
                            <Circle size={10} /> Pending
                          </span>
                        )}
                      </div>

                      {projectContract !== '0x0000000000000000000000000000000000000000' && (
                        <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                          Contract:
                          <a href={`${EXPLORER_BASE}/address/${projectContract}`} target="_blank" rel="noopener noreferrer"
                            className="mono hover:underline flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
                            {short(projectContract)}<ExternalLink size={10} />
                          </a>
                        </div>
                      )}

                      {metadataURI && (
                        <div className="text-xs truncate mb-2" style={{ color: 'var(--muted)' }}>
                          {metadataURI.startsWith('http')
                            ? <a href={metadataURI} target="_blank" rel="noopener noreferrer"
                                className="hover:underline" style={{ color: 'var(--accent)' }}>{metadataURI}</a>
                            : metadataURI
                          }
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--subtle)' }}>
                          <span>Approvals</span>
                          <span>{Number(approvals)} / {Number(threshold)}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{
                            width: `${approvalPct}%`,
                            background: approvalPct >= 100 ? 'var(--success)' : 'var(--accent)',
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Onchain timeline */}
          <div className="card p-5">
            <h2 className="display font-semibold text-base mb-4" style={{ color: 'var(--ink)' }}>
              Onchain timeline
            </h2>
            {loadingEvents ? (
              <div className="text-sm animate-pulse" style={{ color: 'var(--subtle)' }}>Loading events…</div>
            ) : events.length === 0 ? (
              <div className="py-6 text-center text-sm" style={{ color: 'var(--subtle)' }}>
                No onchain events recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: ev.event === 'PrizePaid' ? 'var(--success)' : 'var(--warning)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{ev.label}</div>
                      <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                        <span className="mono">{short(ev.actor)}</span>
                        {ev.amount > 0n && <span>· {fmt(ev.amount)} USDC</span>}
                        <a href={`${EXPLORER_BASE}/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-0.5 hover:underline" style={{ color: 'var(--accent)' }}>
                          tx <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: action panel */}
        <div className="space-y-4">
          {/* Role action */}
          <div className="card p-5">
            <h2 className="display font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>
              Your role
            </h2>
            {!address ? (
              <div className="text-sm" style={{ color: 'var(--subtle)' }}>Connect wallet to interact.</div>
            ) : isSponsor ? (
              <div className="space-y-3">
                <div className="pill pill-open text-xs">Sponsor</div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  You created this program. Once submissions are approved, use the Reviewer page to pay winners.
                </p>
                <button
                  onClick={() => onNav('reviewer')}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >Open review queue</button>
              </div>
            ) : isReviewer ? (
              <div className="space-y-3">
                <div className="pill" style={{ background: 'rgba(79,158,248,0.12)', color: 'var(--accent)' }}>Reviewer</div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  You are a reviewer. Approve or pay submissions from the review queue.
                </p>
                <button
                  onClick={() => onNav('reviewer')}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >Open review queue</button>
              </div>
            ) : isActive ? (
              <div className="space-y-3">
                <div className="pill" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>Builder</div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {meta?.[0] === 0
                    ? 'Submit your onchain project (deployed contract required).'
                    : 'Submit your work to this open bounty.'}
                </p>
                <button
                  onClick={() => onNav('builder')}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >Submit your work</button>
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--subtle)' }}>This program has ended.</div>
            )}
          </div>

          {/* Contract card */}
          <div className="card p-5">
            <h2 className="display font-semibold text-sm mb-3" style={{ color: 'var(--ink)' }}>
              Verified onchain
            </h2>
            <div className="space-y-2 text-xs" style={{ color: 'var(--subtle)' }}>
              <div className="flex items-center justify-between">
                <span>Program ID</span>
                <span className="mono" style={{ color: 'var(--ink-2)' }}>#{programId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pool locked</span>
                <span className="mono tabular-nums" style={{ color: 'var(--ink-2)' }}>{fmt(totalDeposited)} USDC</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Slots</span>
                <span className="mono" style={{ color: 'var(--ink-2)' }}>{Number(slotsUsed)}/{Number(slots)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 flex items-center gap-1" style={{ borderTop: '1px solid var(--border)' }}>
              <a href={`${EXPLORER_BASE}/address/${sponsor}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                <ExternalLink size={11} /> View on explorer
              </a>
              <CopyBtn text={sponsor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
