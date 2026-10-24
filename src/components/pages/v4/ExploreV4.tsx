/**
 * ExploreV4 — program explorer for GrantFlowV4.
 * Tabs: All / Submissions open / Judging / Finalized.
 * Category chips. Table and grid toggle.
 */
import { useState, useMemo } from 'react';
import { LayoutGrid, List, RefreshCw, Trophy } from 'lucide-react';
import { useProgramCount, useAllProgramsV4 } from '@/hooks/useGrantFlowV4';
import {
  computePhase, countdownLabel, totalPool, usdcToDisplay,
  PHASE_LABELS, PHASE_COLORS, CATEGORY_LABELS, PROGRAM_TYPE_LABELS,
  shortAddr, Phase,
  type PhaseValue,
} from '@/lib/grantflowV4';
import { useChainId } from 'wagmi';

const CHAIN_EXPLORER: Record<number, string> = {
  5042002: 'https://explorer.testnet.arc.io',
  5042:    'https://explorer.arc.io',
};

const TABS: { id: PhaseValue | 'all'; label: string }[] = [
  { id: 'all',              label: 'All'              },
  { id: Phase.Submission,   label: 'Submissions open' },
  { id: Phase.Judging,      label: 'Judging'          },
  { id: Phase.Finalized,    label: 'Finalized'        },
];

const CAT_ALL = 99 as const;

interface Props {
  search: string;
  onSelect: (id: number) => void;
}

export function ExploreV4({ search, onSelect }: Props) {
  const [tab, setTab]   = useState<PhaseValue | 'all'>('all');
  const [cat, setCat]   = useState<number>(CAT_ALL);
  const [grid, setGrid] = useState(false);

  const chainId  = useChainId();
  const explorer = CHAIN_EXPLORER[chainId] ?? CHAIN_EXPLORER[5042002];

  const { data: countRaw, refetch } = useProgramCount();
  const count = Number(countRaw ?? 0);
  const { data: programs, isLoading } = useAllProgramsV4(count);

  interface ProgramRow {
    id: number; name: string; desc: string; sponsor: string;
    prizes: readonly bigint[]; pool: bigint; deposited: bigint;
    subDl: bigint; judDl: bigint; pType: number; pCat: number;
    phase: PhaseValue; finalized: boolean; cancelled: boolean;
  }

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
  const filtered = useMemo(() => rows.filter((r: ProgramRow) => {
    if (tab !== 'all' && r.phase !== tab) return false;
    if (cat !== CAT_ALL && r.pCat !== cat) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, tab, cat, search]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Programs, paid onchain</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {count} program{count !== 1 ? 's' : ''} · GrantFlowV4
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void refetch()} className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setGrid(false)} className="p-1.5 rounded-md transition-colors" style={{ color: grid ? 'var(--text-muted)' : 'var(--accent)' }}>
            <List size={16} />
          </button>
          <button onClick={() => setGrid(true)} className="p-1.5 rounded-md transition-colors" style={{ color: grid ? 'var(--accent)' : 'var(--text-muted)' }}>
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button
            key={String(t.id)}
            onClick={() => setTab(t.id)}
            className="px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px"
            style={tab === t.id
              ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
              : { borderColor: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        <Chip active={cat === CAT_ALL} onClick={() => setCat(CAT_ALL)}>All</Chip>
        {(Object.entries(CATEGORY_LABELS)).map(([k, v]) => (
          <Chip key={k} active={cat === Number(k)} onClick={() => setCat(Number(k))}>{v}</Chip>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty />
      ) : grid ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {(filtered).map(r => (
            <GridCard key={r.id} row={r} explorer={explorer} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs" style={{ color: 'var(--text)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                {['Program','Type','Category','Pool','Prizes','Submissions','Sub deadline','Judge deadline','Sponsor','Phase'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(filtered).map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className="cursor-pointer transition-colors hover:bg-white/5"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : undefined }}
                >
                  <td className="px-3 py-2.5 font-medium max-w-[140px] truncate">{r.name}</td>
                  <td className="px-3 py-2.5">{PROGRAM_TYPE_LABELS[r.pType as 0 | 1]}</td>
                  <td className="px-3 py-2.5">{CATEGORY_LABELS[r.pCat as 0|1|2|3]}</td>
                  <td className="px-3 py-2.5 tabular-nums">{usdcToDisplay(r.pool)} USDC</td>
                  <td className="px-3 py-2.5">{r.prizes.length} rank{r.prizes.length !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-2.5">—</td>
                  <td className="px-3 py-2.5">{countdownLabel(r.subDl)}</td>
                  <td className="px-3 py-2.5">{countdownLabel(r.judDl)}</td>
                  <td className="px-3 py-2.5">
                    <a href={`${explorer}/address/${r.sponsor}`} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="hover:underline" style={{ color: 'var(--accent)' }}>
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
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PhasePill({ phase }: { phase: PhaseValue }) {
  if (phase === Phase.Finalized) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-400/10">
        <Trophy size={9} /> Ended · winners announced
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[phase]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {PHASE_LABELS[phase]}
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
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
    <div
      onClick={() => onSelect(row.id)}
      className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
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
        <span>·</span>
        <span>{CATEGORY_LABELS[row.pCat as 0|1|2|3]}</span>
        <span>·</span>
        <span>Sub: {countdownLabel(row.subDl)}</span>
      </div>
      <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <a href={`${explorer}/address/${row.sponsor}`} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="hover:underline" style={{ color: 'var(--accent)' }}>
          {shortAddr(row.sponsor)}
        </a>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1,2,3].map(i => (
        <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }} />
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
      <span className="text-4xl">🏆</span>
      <p className="text-sm">No programs found</p>
    </div>
  );
}
