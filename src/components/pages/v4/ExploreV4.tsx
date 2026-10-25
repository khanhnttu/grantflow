/**
 * ExploreV4 — program explorer for GrantFlowV4.
 * Pagination (20/page), sort (newest / ending soon / biggest pool).
 * Fully readable without a wallet.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { LayoutGrid, List, RefreshCw, Trophy, ChevronLeft, ChevronRight as ChevronR, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Zap } from 'lucide-react';
import { LogoMark } from '@/components/BrandLogo';
import { useProgramCount, useAllProgramsV4 } from '@/hooks/useGrantFlowV4';
import { useProgramCount as useV3Count } from '@/hooks/useGrantFlow';
import { useReadContracts } from 'wagmi';
import { GRANTFLOW_ABI } from '@/lib/grantflow';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import {
  computePhase, countdownLabel, totalPool, usdcToDisplay,
  PHASE_LABELS, PHASE_COLORS, CATEGORY_LABELS, PROGRAM_TYPE_LABELS,
  shortAddr, Phase,
  type PhaseValue,
} from '@/lib/grantflowV4';
import { useI18n } from '@/hooks/useI18n';
import type { StringKey } from '@/lib/i18n';
import { useV5ProgramCount, GRANTFLOW_V5_ABI, parseSponsorMeta } from '@/hooks/useGrantFlowV5';
import { formatUnits } from 'viem';

const PAGE_SIZE = 20;
// Module-level snapshot of "now" — used in LegacyV3Section to classify ended programs.
// A module-level value is acceptable to the React Compiler purity rule.
const MODULE_NOW_SEC = BigInt(Math.floor(Date.now() / 1000));

type SortKey = 'newest' | 'ending-soon' | 'biggest-pool';

const TABS: { id: PhaseValue | 'all'; labelKey: StringKey }[] = [
  { id: 'all',            labelKey: 'explore.all'      },
  { id: Phase.Submission, labelKey: 'explore.subOpen'  },
  { id: Phase.Judging,    labelKey: 'explore.judging'  },
  { id: Phase.Finalized,  labelKey: 'explore.finalized'},
];

const CAT_ALL = 99 as const;

interface Props {
  search: string;
  onSelect: (id: number) => void;
  /** Called when user clicks a V5 program (navigate to v5-program page) */
  onSelectV5?: (id: number) => void;
}

interface ProgramRow {
  id: number; name: string; desc: string; sponsor: string;
  prizes: readonly bigint[]; pool: bigint; deposited: bigint;
  subDl: bigint; judDl: bigint; pType: number; pCat: number;
  phase: PhaseValue; finalized: boolean; cancelled: boolean;
}

export function ExploreV4({ search, onSelect, onSelectV5 }: Props) {
  const [tab, setTab]     = useState<PhaseValue | 'all'>('all');
  const [cat, setCat]     = useState<number>(CAT_ALL);
  const [grid, setGrid]   = useState(false);
  const [page, setPage]   = useState(1);
  const [sort, setSort]   = useState<SortKey>('newest');

  const { t } = useI18n();
  const { config } = useNetworkStore();
  const explorer = config.explorerBase;

  const { data: countRaw, refetch, isLoading: countLoading, isError: countError } = useProgramCount();
  const count = Number(countRaw ?? 0);
  const { data: programs, isLoading: progsLoading, isError: progsError, refetch: refetchProgs } = useAllProgramsV4(count);
  const isLoading = countLoading || progsLoading;
  const isError   = countError   || progsError;

  const rows = useMemo<ProgramRow[]>(() => {
    if (!programs) return [];
    const result: ProgramRow[] = [];
    for (let i = 0; i < programs.length; i++) {
      const r = programs[i];
      if (r.status !== 'success' || !r.result) continue;
      const [name, desc, sponsor, prizes, deposited, subDl, judDl, pType, pCat, , finalized, cancelled] = r.result;
      const phase = computePhase(subDl, judDl, finalized, cancelled);
      const pool  = totalPool(prizes);
      result.push({ id: i, name, desc, sponsor, prizes, pool, deposited, subDl, judDl, pType: Number(pType), pCat: Number(pCat), phase, finalized, cancelled });
    }
    return result;
  }, [programs]);

  // filter
  const filtered = useMemo(() => rows.filter(r => {
    if (tab !== 'all' && r.phase !== tab) return false;
    if (cat !== CAT_ALL && r.pCat !== cat) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, tab, cat, search]);

  // sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === 'newest')       return arr.reverse();
    if (sort === 'ending-soon')  return arr.sort((a, b) => Number(a.subDl - b.subDl));
    if (sort === 'biggest-pool') return arr.sort((a, b) => (a.pool > b.pool ? -1 : a.pool < b.pool ? 1 : 0));
    return arr;
  }, [filtered, sort]);

  // pagination — reset to page 1 on filter/sort change
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleTabChange  = (id: PhaseValue | 'all') => { setTab(id); setPage(1); };
  const handleCatChange  = (c: number) => { setCat(c); setPage(1); };

  const doRefetch = () => { void refetch(); void refetchProgs(); };

  return (
    <div className="flex flex-col gap-4">
      {/* V5 programs section — shown when V5 contract is deployed */}
      <V5ProgramsSection search={search} onSelectV5={onSelectV5 ?? onSelect} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t('explore.title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {count} program{count !== 1 ? 's' : ''} · GrantFlowV4 ({t('explore.legacyNote')})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sort}
            onChange={e => { setSort(e.target.value as SortKey); setPage(1); }}
            className="text-xs rounded-lg px-2 py-1.5 outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
            aria-label="Sort programs"
          >
            <option value="newest">{t('explore.sort.newest')}</option>
            <option value="ending-soon">{t('explore.sort.endingSoon')}</option>
            <option value="biggest-pool">{t('explore.sort.biggestPool')}</option>
          </select>

          <button
            onClick={doRefetch}
            className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Refresh programs"
          >
            <RefreshCw size={14} aria-hidden />
          </button>
          <button
            onClick={() => setGrid(false)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: grid ? 'var(--text-muted)' : 'var(--accent)' }}
            aria-label="List view"
            aria-pressed={!grid}
          >
            <List size={16} aria-hidden />
          </button>
          <button
            onClick={() => setGrid(true)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: grid ? 'var(--accent)' : 'var(--text-muted)' }}
            aria-label="Grid view"
            aria-pressed={grid}
          >
            <LayoutGrid size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }} role="tablist" aria-label="Filter by phase">
        {TABS.map(tab_ => (
          <button
            key={String(tab_.id)}
            onClick={() => handleTabChange(tab_.id)}
            role="tab"
            aria-selected={tab === tab_.id}
            className="px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px focus-visible:outline-2"
            style={tab === tab_.id
              ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
              : { borderColor: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {t(tab_.labelKey)}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
        <Chip active={cat === CAT_ALL} onClick={() => handleCatChange(CAT_ALL)}>{t('explore.all')}</Chip>
        {(Object.entries(CATEGORY_LABELS)).map(([k, v]) => (
          <Chip key={k} active={cat === Number(k)} onClick={() => handleCatChange(Number(k))}>{v}</Chip>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState onRetry={doRefetch} message={t('error.loadFailed')} />
      ) : sorted.length === 0 ? (
        <EmptyState message={t('explore.empty')} />
      ) : grid ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map(r => (
            <GridCard key={r.id} row={r} explorer={explorer} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs" style={{ color: 'var(--text)' }} role="grid" aria-label="Programs list">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                {['Program','Type','Category','Pool','Prizes','Sub deadline','Judge deadline','Sponsor','Phase'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium" style={{ color: 'var(--text-muted)' }} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  onKeyDown={e => e.key === 'Enter' && onSelect(r.id)}
                  className="cursor-pointer transition-colors hover:bg-white/5 focus-visible:outline-2"
                  tabIndex={0}
                  role="row"
                  aria-label={`Open program: ${r.name}`}
                  style={{ borderBottom: i < pageItems.length - 1 ? '1px solid var(--border)' : undefined }}
                >
                  <td className="px-3 py-2.5 font-medium max-w-[140px] truncate">{r.name}</td>
                  <td className="px-3 py-2.5">{PROGRAM_TYPE_LABELS[r.pType as 0 | 1]}</td>
                  <td className="px-3 py-2.5">{CATEGORY_LABELS[r.pCat as 0|1|2|3]}</td>
                  <td className="px-3 py-2.5 tabular-nums">{usdcToDisplay(r.pool)} USDC</td>
                  <td className="px-3 py-2.5">{r.prizes.length} rank{r.prizes.length !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-2.5">{countdownLabel(r.subDl)}</td>
                  <td className="px-3 py-2.5">{countdownLabel(r.judDl)}</td>
                  <td className="px-3 py-2.5">
                    <a href={`${explorer}/address/${r.sponsor}`} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="hover:underline" style={{ color: 'var(--accent)' }}
                      aria-label={`Sponsor ${r.sponsor} on explorer`}>
                      {shortAddr(r.sponsor)}
                    </a>
                  </td>
                  <td className="px-3 py-2.5">
                    <PhasePill phase={r.phase} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legacy V3 programs */}
      <LegacyV3Section explorer={explorer} />

      {/* Pagination */}
      {!isLoading && !isError && sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 pt-2" role="navigation" aria-label="Pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 focus-visible:outline-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            aria-label="Previous page"
          >
            <ChevronLeft size={13} aria-hidden /> {t('explore.prev')}
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('explore.page')} {safePage} {t('explore.of')} {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 focus-visible:outline-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            aria-label="Next page"
          >
            {t('explore.next')} <ChevronR size={13} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PhasePill({ phase }: { phase: PhaseValue }) {
  if (phase === Phase.Finalized) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-400/10">
        <Trophy size={9} aria-hidden /> Ended · winners announced
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[phase]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {PHASE_LABELS[phase]}
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors focus-visible:outline-2"
      aria-pressed={active}
      style={active
        ? { background: 'var(--accent)', color: '#fff' }
        : { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
      }
    >
      {children}
    </button>
  );
}

interface RowType {
  id: number; name: string; prizes: readonly bigint[];
  pool: bigint; subDl: bigint; judDl: bigint;
  pType: number; pCat: number; phase: PhaseValue; sponsor: string;
}

function GridCard({ row, explorer, onSelect }: { row: RowType; explorer: string; onSelect: (id: number) => void }) {
  return (
    <article
      onClick={() => onSelect(row.id)}
      onKeyDown={e => e.key === 'Enter' && onSelect(row.id)}
      tabIndex={0}
      role="button"
      aria-label={`Open program: ${row.name}`}
      className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] focus-visible:outline-2"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{row.name}</span>
        <PhasePill phase={row.phase} />
      </div>
      <div className="text-2xl font-bold tabular-nums mb-1" style={{ color: 'var(--accent)' }}>
        {usdcToDisplay(row.pool)} <span className="text-sm font-normal">USDC</span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        <span>{row.prizes.length} prize{row.prizes.length !== 1 ? 's' : ''}</span>
        <span aria-hidden>·</span>
        <span>{CATEGORY_LABELS[row.pCat as 0|1|2|3]}</span>
        <span aria-hidden>·</span>
        <span>Sub: {countdownLabel(row.subDl)}</span>
      </div>
      <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <a href={`${explorer}/address/${row.sponsor}`} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="hover:underline" style={{ color: 'var(--accent)' }}
          aria-label={`Sponsor ${row.sponsor}`}>
          {shortAddr(row.sponsor)}
        </a>
      </div>
    </article>
  );
}

// ── Legacy V3 section ──────────────────────────────────────────────────────────

function LegacyV3Section({ explorer }: { explorer: string }) {
  const [open, setOpen] = useState(false);
  const { config } = useNetworkStore();
  const v3Address = config.v3Address;
  const chainId   = config.chainId;
  const { data: countRaw } = useV3Count();
  const count = Number(countRaw ?? 0);

  const contracts = useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: count }, (_, i) => ({
      address: v3Address,
      abi: GRANTFLOW_ABI,
      functionName: 'getProgram' as const,
      args: [BigInt(i)] as const,
      chainId,
    }));
  }, [count, v3Address, chainId]);

  const { data: programs, isLoading } = useReadContracts({
    contracts,
    query: { enabled: open && count > 0 },
  });

  const nowSec = MODULE_NOW_SEC;

  if (count === 0) return null;

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
        style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider" style={{ background: 'rgba(180,120,0,0.12)', color: '#b47800' }}>
            Legacy v3
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{count} program{count !== 1 ? 's' : ''} · read-only</span>
        </span>
        {open ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>

      {open && (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {isLoading ? (
            <div className="px-4 py-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>
          ) : programs?.map((r, i) => {
            if (r.status !== 'success' || !r.result) return null;
            const [name, prizeAmount, slots, deadline, sponsor, , , slotsUsed] = r.result as readonly [string, bigint, bigint, bigint, `0x${string}`, readonly `0x${string}`[], bigint, bigint, bigint, boolean];
            const ended = deadline < nowSec;
            const pool = prizeAmount * slots;
            return (
              <div key={i} className="px-4 py-3 flex flex-wrap items-center gap-3 text-xs" style={{ background: 'var(--surface-muted)' }}>
                <span className="font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--text)' }}>
                  #{i} · {name}
                </span>
                <span className="tabular-nums" style={{ color: 'var(--accent)' }}>
                  {usdcToDisplay(pool)} USDC
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {slotsUsed.toString()}/{slots.toString()} slots
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={ended
                    ? { background: 'rgba(180,120,0,0.12)', color: '#b47800' }
                    : { background: 'rgba(34,197,94,0.10)', color: '#16a34a' }
                  }
                >
                  {ended ? 'Ended' : 'Open'}
                </span>
                <a
                  href={`${explorer}/address/${sponsor}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                  style={{ color: 'var(--accent)' }}
                  aria-label={`Sponsor ${sponsor} on explorer`}
                >
                  {shortAddr(sponsor)}
                </a>
                <a
                  href={`${explorer}/address/${v3Address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:underline opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="View V3 contract on explorer"
                >
                  <ExternalLink size={10} aria-hidden />
                  V3
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── V5 Programs Section ────────────────────────────────────────────────────────

interface V5ProgCard {
  id: number;
  name: string;
  sponsorName: string;
  logo: string;
  pool: string;
  prizeCount: number;
  subDl: number;
  phase: PhaseValue;
  finalized: boolean;
  cancelled: boolean;
}

function V5ProgramsSection({ search, onSelectV5 }: { search: string; onSelectV5: (id: number) => void }) {
  const { config, appClient } = useNetworkStore();
  const { count } = useV5ProgramCount();
  const [cards, setCards] = useState<V5ProgCard[]>([]);
  const [loadingV5, setLoadingV5] = useState(false);

  const loadV5 = useCallback(async () => {
    if (!config.v5Address || !count) { setCards([]); return; }
    setLoadingV5(true);
    try {
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          appClient.readContract({
            address: config.v5Address,
            abi: GRANTFLOW_V5_ABI,
            functionName: 'getProgram',
            args: [BigInt(i)],
          }).catch(() => null)
        )
      );
      const parsed: V5ProgCard[] = [];
      results.forEach((r, i) => {
        if (!r) return;
        const [name, description, , prizes, totalDeposited, subDl, judDl, , , , finalized, cancelled] =
          r as readonly [string, string, `0x${string}`, readonly bigint[], bigint, bigint, bigint, number, number, boolean, boolean, boolean];
        const meta = parseSponsorMeta(description);
        const phase = computePhase(subDl, judDl, finalized, cancelled);
        parsed.push({
          id: i, name,
          sponsorName: meta.sponsorName,
          logo: meta.logo,
          pool: formatUnits(totalDeposited, config.usdcDecimals),
          prizeCount: prizes.length,
          subDl: Number(subDl),
          phase,
          finalized,
          cancelled,
        });
      });
      setCards(parsed.reverse()); // newest first
    } finally {
      setLoadingV5(false);
    }
  }, [config, appClient, count]);

  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await loadV5(); };
    void run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadV5]);

  if (!config.v5Address || count === 0) return null;

  const filtered = cards.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Zap size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          New Programs
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}>V5</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          · auto-payout · {count} program{count !== 1 ? 's' : ''}
        </span>
      </div>

      {loadingV5 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1,2,3].map(i => (
            <div key={i} className="flex-shrink-0 w-52 h-28 rounded-2xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No V5 programs yet.</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <article key={c.id}
              onClick={() => onSelectV5(c.id)}
              onKeyDown={e => e.key === 'Enter' && onSelectV5(c.id)}
              tabIndex={0}
              role="button"
              aria-label={`Open V5 program: ${c.name}`}
              className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01] focus-visible:outline-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                {c.logo ? (
                  <img src={c.logo} alt={c.sponsorName || 'Sponsor'}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    onError={e => { (e.currentTarget).style.display = 'none'; }} />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-sm truncate flex-1" style={{ color: 'var(--text)' }}>
                  {c.name}
                </span>
                <PhasePill phase={c.phase} />
              </div>
              <div className="text-xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                {c.pool} <span className="text-xs font-normal">USDC</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{c.prizeCount} prize{c.prizeCount !== 1 ? 's' : ''}</span>
                <span aria-hidden>·</span>
                <span>Sub: {new Date(c.subDl * 1000).toLocaleDateString()}</span>
              </div>
              {c.sponsorName && (
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{c.sponsorName}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Divider before V4 section */}
      <div className="h-px mt-2" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading programs" aria-busy="true">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }} />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4" style={{ color: 'var(--muted)' }}>
      <div className="opacity-30">
        <LogoMark size={48} variant="light" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ErrorState({ onRetry, message }: { onRetry: () => void; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4" role="alert">
      <AlertCircle size={32} style={{ color: 'var(--text-muted)' }} aria-hidden />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Retry
      </button>
    </div>
  );
}
