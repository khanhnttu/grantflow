import { useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import {
  LayoutGrid, List, Clock, Users, Zap, AlertCircle, ArrowUpRight
} from 'lucide-react';
import {
  useProgramCount, useAllPrograms, useAllProgramMetas,
} from '@/hooks/useGrantFlow';
import { mapPrograms, mapProgramMetas, CATEGORY_LABELS, PROGRAM_TYPE_LABELS } from '@/lib/contractHelpers';
import type { CategoryValue, ProgramTypeValue } from '@/lib/contractHelpers';
import { GRANTFLOW_ADDRESS } from '@/lib/grantflow';
import { ACTIVE_CHAIN_ID, EXPLORER_BASE } from '@/lib/chainConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

const USDC_DEC = 6;
const fmt = (raw: bigint, dec = USDC_DEC) =>
  (Number(raw) / 10 ** dec).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

function countdown(deadline: bigint): { label: string; urgent: boolean } {
  const secs = Number(deadline) - Math.floor(Date.now() / 1000);
  if (secs <= 0) return { label: 'Ended', urgent: false };
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return { label: `${d}d ${h}h`, urgent: d < 2 };
  if (h > 0) return { label: `${h}h ${m}m`, urgent: true };
  return { label: `${m}m`, urgent: true };
}

function programStatus(p: { slots: bigint; slotsUsed: bigint; deadline: bigint }): 'open' | 'ending' | 'full' | 'closed' {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= p.deadline) return 'closed';
  if (p.slotsUsed >= p.slots) return 'full';
  const hoursLeft = (Number(p.deadline) - Date.now() / 1000) / 3600;
  if (hoursLeft < 48) return 'ending';
  return 'open';
}

// ── Activity Ticker ───────────────────────────────────────────────────────────

interface TickerEvent {
  id: string;
  label: string;
  txHash: string;
  time: number;
  type: 'created' | 'submitted' | 'paid' | 'claimed';
}

const EVENT_COLORS: Record<TickerEvent['type'], string> = {
  created:   '#4f9ef8',
  submitted: '#a78bfa',
  paid:      '#34d399',
  claimed:   '#34d399',
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ActivityTicker() {
  const client = usePublicClient({ chainId: ACTIVE_CHAIN_ID });
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [loading, setLoading] = useState(true);


  const fetchEvents = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const head = await client.getBlockNumber();
      const fromBlock = head > 10000n ? head - 10000n : 0n;

      const [created, submitted, paid, claimed] = await Promise.all([
        client.getLogs({
          address: GRANTFLOW_ADDRESS,
          event: { type: 'event', name: 'ProgramCreated', inputs: [
            { name: 'programId', type: 'uint256', indexed: true },
            { name: 'name', type: 'string', indexed: false },
            { name: 'sponsor', type: 'address', indexed: true },
          ] },
          fromBlock,
          toBlock: head,
        }).catch(() => []),
        client.getLogs({
          address: GRANTFLOW_ADDRESS,
          event: { type: 'event', name: 'Submitted', inputs: [
            { name: 'programId', type: 'uint256', indexed: true },
            { name: 'submissionId', type: 'uint256', indexed: true },
            { name: 'submitter', type: 'address', indexed: true },
            { name: 'projectContract', type: 'address', indexed: false },
            { name: 'metadataURI', type: 'string', indexed: false },
          ] },
          fromBlock,
          toBlock: head,
        }).catch(() => []),
        client.getLogs({
          address: GRANTFLOW_ADDRESS,
          event: { type: 'event', name: 'PrizePaid', inputs: [
            { name: 'programId', type: 'uint256', indexed: true },
            { name: 'submissionId', type: 'uint256', indexed: true },
            { name: 'recipient', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
          ] },
          fromBlock,
          toBlock: head,
        }).catch(() => []),
        client.getLogs({
          address: GRANTFLOW_ADDRESS,
          event: { type: 'event', name: 'Claimed', inputs: [
            { name: 'recipient', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
          ] },
          fromBlock,
          toBlock: head,
        }).catch(() => []),
      ]);

      const now = Date.now();
      const all: TickerEvent[] = [
        ...created.map(e => ({
          id: `c-${e.transactionHash}-${e.logIndex}`,
          label: `New program created by ${short((e.args as { sponsor?: string }).sponsor ?? '0x0')}`,
          txHash: e.transactionHash ?? '',
          time: now,
          type: 'created' as const,
        })),
        ...submitted.map(e => ({
          id: `s-${e.transactionHash}-${e.logIndex}`,
          label: `Submission by ${short((e.args as { submitter?: string }).submitter ?? '0x0')}`,
          txHash: e.transactionHash ?? '',
          time: now,
          type: 'submitted' as const,
        })),
        ...paid.map(e => {
          const args = e.args as { recipient?: string; amount?: bigint };
          return {
            id: `p-${e.transactionHash}-${e.logIndex}`,
            label: `Paid ${fmt(args.amount ?? 0n)} USDC to ${short(args.recipient ?? '0x0')}`,
            txHash: e.transactionHash ?? '',
            time: now,
            type: 'paid' as const,
          };
        }),
        ...claimed.map(e => {
          const args = e.args as { recipient?: string; amount?: bigint };
          return {
            id: `cl-${e.transactionHash}-${e.logIndex}`,
            label: `${short(args.recipient ?? '0x0')} claimed ${fmt(args.amount ?? 0n)} USDC`,
            txHash: e.transactionHash ?? '',
            time: now,
            type: 'claimed' as const,
          };
        }),
      ].slice(-20);

      setEvents(all);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Kick the initial fetch when the component first renders via a mount effect
  // registered as a one-time side effect through a stable callback
  useState(() => { void fetchEvents(); });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
        <span className="animate-pulse">Loading activity…</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
        <Zap size={12} />
        <span>No onchain activity yet — be the first to create a program.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {events.map(ev => (
        <a
          key={ev.id}
          href={`${EXPLORER_BASE}/tx/${ev.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ticker-item flex-shrink-0"
        >
          <span className="ticker-dot" style={{ background: EVENT_COLORS[ev.type] }} />
          {ev.label}
          <span style={{ color: 'var(--subtle)' }}>· {timeAgo(ev.time)}</span>
          <ArrowUpRight size={10} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
        </a>
      ))}
    </div>
  );
}

// ── Category / Filter chips ───────────────────────────────────────────────────

type FilterTab = 'all' | 'open' | 'ending' | 'completed';
type ViewMode = 'table' | 'grid';

const CATEGORY_LIST = [
  { value: 'all' as const, label: 'All categories' },
  { value: 0 as CategoryValue, label: 'Hackathon' },
  { value: 1 as CategoryValue, label: 'Bounty' },
  { value: 2 as CategoryValue, label: 'Contest' },
  { value: 3 as CategoryValue, label: 'Referral' },
];

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ReturnType<typeof programStatus> }) {
  const map = {
    open:    'pill pill-open',
    ending:  'pill pill-ending',
    full:    'pill pill-full',
    closed:  'pill pill-closed',
  };
  const labels = { open: 'Open', ending: 'Ending soon', full: 'Full', closed: 'Closed' };
  return <span className={map[status]}>{labels[status]}</span>;
}

// ── Grid Card ─────────────────────────────────────────────────────────────────

function ProgramCard({
  id: _id, data, meta, onClick,
}: {
  id: number;
  data: ReturnType<typeof mapPrograms>[0]['data'];
  meta?: ReturnType<typeof mapProgramMetas>[0]['meta'];
  onClick: () => void;
}) {
  const [name, prizeAmount, slots, deadline, sponsor, , , slotsUsed, totalDeposited] = data;
  const status = programStatus({ slots, slotsUsed, deadline });
  const { label: cdLabel, urgent } = countdown(deadline);
  const pct = slots > 0n ? Math.round((Number(slotsUsed) / Number(slots)) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="card text-left p-5 hover:border-[--accent] transition-all w-full group"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{name}</div>
          {meta && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="pill" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                {CATEGORY_LABELS[meta[1] as CategoryValue]}
              </span>
              <span className="pill" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                {PROGRAM_TYPE_LABELS[meta[0] as ProgramTypeValue]}
              </span>
            </div>
          )}
        </div>
        <StatusPill status={status} />
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-xs" style={{ color: 'var(--subtle)' }}>Prize per slot</div>
          <div className="display font-bold text-xl tabular-nums" style={{ color: 'var(--ink)' }}>
            {fmt(prizeAmount)} <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>USDC</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: 'var(--subtle)' }}>Pool</div>
          <div className="font-semibold text-sm tabular-nums" style={{ color: 'var(--ink-2)' }}>
            {fmt(totalDeposited)} USDC
          </div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--subtle)' }}>
          <span>{Number(slotsUsed)}/{Number(slots)} slots</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--subtle)' }}>
        <span className="flex items-center gap-1">
          <Clock size={11} />
          <span style={{ color: urgent ? 'var(--warning)' : undefined }}>{cdLabel}</span>
        </span>
        <span className="flex items-center gap-1">
          <Users size={11} />
          {short(sponsor)}
        </span>
      </div>
    </button>
  );
}

// ── Main ExploreTable ─────────────────────────────────────────────────────────

export function ExplorePage({
  search,
  onOpenProgram,
}: {
  search: string;
  onOpenProgram: (id: number) => void;
}) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [catFilter, setCatFilter] = useState<'all' | CategoryValue>('all');
  const [view, setView] = useState<ViewMode>('table');

  const { data: countData } = useProgramCount();
  const count = countData;
  const { data: programsRaw } = useAllPrograms(count);
  const { data: metasRaw } = useAllProgramMetas(count);

  const programs = mapPrograms(programsRaw as Parameters<typeof mapPrograms>[0]);
  const metas = mapProgramMetas(metasRaw as Parameters<typeof mapProgramMetas>[0]);

  const metaMap = Object.fromEntries(metas.map(m => [String(m.id), m.meta]));

  // Filter + search
  const visible = programs.filter(({ id, data }) => {
    const [name, , slots, deadline, sponsor, , , slotsUsed] = data;
    const meta = metaMap[String(id)];

    // Search
    if (search) {
      const q = search.toLowerCase();
      if (!name.toLowerCase().includes(q) && !sponsor.toLowerCase().includes(q)) return false;
    }

    // Category
    if (catFilter !== 'all' && meta && meta[1] !== catFilter) return false;

    // Tab
    const status = programStatus({ slots, slotsUsed, deadline });
    if (filter === 'open' && status !== 'open' && status !== 'ending') return false;
    if (filter === 'ending' && status !== 'ending') return false;
    if (filter === 'completed' && status !== 'closed' && status !== 'full') return false;

    return true;
  });

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: `All (${programs.length})` },
    { id: 'open', label: 'Open' },
    { id: 'ending', label: 'Ending soon' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="display font-bold text-2xl" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          Programs, paid onchain
        </h1>
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setView('table')}
            className="rounded-md p-1.5 transition-all"
            style={{ background: view === 'table' ? 'var(--surface-strong)' : 'transparent', color: view === 'table' ? 'var(--accent)' : 'var(--muted)' }}
            aria-label="Table view"
          ><List size={15} /></button>
          <button
            onClick={() => setView('grid')}
            className="rounded-md p-1.5 transition-all"
            style={{ background: view === 'grid' ? 'var(--surface-strong)' : 'transparent', color: view === 'grid' ? 'var(--accent)' : 'var(--muted)' }}
            aria-label="Grid view"
          ><LayoutGrid size={15} /></button>
        </div>
      </div>

      {/* Activity ticker */}
      <div className="card mb-4 px-4 py-2.5 flex items-center gap-3" style={{ minHeight: 40 }}>
        <Zap size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <ActivityTicker />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: filter === t.id ? 'var(--accent)' : 'var(--surface-muted)',
              color: filter === t.id ? 'var(--accent-fg)' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
          >{t.label}</button>
        ))}
        <div className="flex-1" />
        {/* Category chips */}
        {CATEGORY_LIST.map(c => (
          <button
            key={String(c.value)}
            onClick={() => setCatFilter(c.value)}
            className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
            style={{
              background: catFilter === c.value ? 'rgba(79,158,248,0.15)' : 'transparent',
              color: catFilter === c.value ? 'var(--accent)' : 'var(--subtle)',
              border: `1px solid ${catFilter === c.value ? 'rgba(79,158,248,0.4)' : 'var(--border)'}`,
            }}
          >{c.label}</button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16" style={{ color: 'var(--subtle)' }}>
          <AlertCircle size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div className="font-semibold text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
            {programs.length === 0 ? 'No programs yet' : 'No programs match this filter'}
          </div>
          <div className="text-xs">
            {programs.length === 0
              ? 'Be the first to launch a grant program on Arc.'
              : 'Try a different filter or search term.'}
          </div>
        </div>
      )}

      {/* Grid view */}
      {view === 'grid' && visible.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {visible.map(({ id, data }) => (
            <ProgramCard
              key={String(id)}
              id={Number(id)}
              data={data}
              meta={metaMap[String(id)]}
              onClick={() => onOpenProgram(Number(id))}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && visible.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="gf-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Category</th>
                <th>Prize / slot</th>
                <th>Pool</th>
                <th>Slots</th>
                <th>Deadline</th>
                <th>Sponsor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ id, data }) => {
                const [name, prizeAmount, slots, deadline, sponsor, , , slotsUsed, totalDeposited] = data;
                const meta = metaMap[String(id)];
                const status = programStatus({ slots, slotsUsed, deadline });
                const { label: cdLabel, urgent } = countdown(deadline);
                const pct = slots > 0n ? Math.round((Number(slotsUsed) / Number(slots)) * 100) : 0;

                return (
                  <tr key={String(id)} onClick={() => onOpenProgram(Number(id))}>
                    <td>
                      <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{name}</div>
                      {meta && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                          {PROGRAM_TYPE_LABELS[meta[0] as ProgramTypeValue]}
                        </div>
                      )}
                    </td>
                    <td>
                      {meta ? (
                        <span className="pill" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                          {CATEGORY_LABELS[meta[1] as CategoryValue]}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className="mono font-medium tabular-nums" style={{ color: 'var(--ink)' }}>
                        {fmt(prizeAmount)}
                      </span>
                      <span className="text-xs ml-1" style={{ color: 'var(--subtle)' }}>USDC</span>
                    </td>
                    <td>
                      <span className="mono tabular-nums text-sm" style={{ color: 'var(--ink-2)' }}>
                        {fmt(totalDeposited)}
                      </span>
                      <span className="text-xs ml-1" style={{ color: 'var(--subtle)' }}>USDC</span>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 60 }}>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                          {Number(slotsUsed)}/{Number(slots)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs flex items-center gap-1" style={{ color: urgent ? 'var(--warning)' : 'var(--subtle)' }}>
                        <Clock size={11} />{cdLabel}
                      </span>
                    </td>
                    <td>
                      <a
                        href={`${EXPLORER_BASE}/address/${sponsor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-xs hover:underline"
                        style={{ color: 'var(--accent)' }}
                        onClick={e => e.stopPropagation()}
                      >{short(sponsor)}</a>
                    </td>
                    <td><StatusPill status={status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
