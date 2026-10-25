/**
 * MyProgramsV4 — Organizer's program dashboard.
 * Shows all V4 programs where the connected wallet is the sponsor.
 */
import { useMemo } from 'react';
import { PlusCircle, ExternalLink, Trophy } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useProgramCount, useAllProgramsV4 } from '@/hooks/useGrantFlowV4';
import {
  computePhase, countdownLabel, totalPool, usdcToDisplay,
  PHASE_LABELS, PHASE_COLORS, CATEGORY_LABELS,
  Phase,
  type PhaseValue,
} from '@/lib/grantflowV4';
import { useChainId } from 'wagmi';
import { useI18n } from '@/hooks/useI18n';
import { LogoMark } from '@/components/BrandLogo';

const CHAIN_EXPLORER: Record<number, string> = {
  5042002: 'https://explorer.testnet.arc.io',
  5042:    'https://explorer.arc.io',
};

const MODULE_NOW_SEC = BigInt(Math.floor(Date.now() / 1000));

interface Props {
  onSelect: (id: number) => void;
  onCreateNew: () => void;
}

interface ProgramRow {
  id: number;
  name: string;
  prizes: readonly bigint[];
  pool: bigint;
  subDl: bigint;
  judDl: bigint;
  pCat: number;
  phase: PhaseValue;
  finalized: boolean;
  cancelled: boolean;
}

export function MyProgramsV4({ onSelect, onCreateNew }: Props) {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const explorer = CHAIN_EXPLORER[chainId] ?? CHAIN_EXPLORER[5042002];

  const { data: countRaw, isLoading: countLoading } = useProgramCount();
  const count = Number(countRaw ?? 0);
  const { data: programs, isLoading: progsLoading } = useAllProgramsV4(count);
  const isLoading = countLoading || progsLoading;

  const myPrograms = useMemo<ProgramRow[]>(() => {
    if (!programs || !address) return [];
    const result: ProgramRow[] = [];
    for (let i = 0; i < programs.length; i++) {
      const r = programs[i];
      if (r.status !== 'success' || !r.result) continue;
      const [name, , sponsor, prizes, , subDl, judDl, , pCat, , finalized, cancelled] = r.result;
      if (sponsor.toLowerCase() !== address.toLowerCase()) continue;
      const phase = computePhase(subDl, judDl, finalized, cancelled);
      const pool  = totalPool(prizes);
      result.push({ id: i, name, prizes, pool, subDl, judDl, pCat: Number(pCat), phase, finalized, cancelled });
    }
    return result.reverse(); // newest first
  }, [programs, address]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: 'var(--muted)' }}>
        <div className="opacity-30"><LogoMark size={48} variant="light" /></div>
        <p className="text-sm">{t('myPrograms.noWallet')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t('myPrograms.title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('myPrograms.sub')}</p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 focus-visible:outline-2"
          style={{ background: 'var(--accent)', color: '#fff' }}
          aria-label="Create a new program"
        >
          <PlusCircle size={15} aria-hidden />
          {t('nav.create')}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : myPrograms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="opacity-20"><LogoMark size={56} variant="light" /></div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('myPrograms.empty')}</p>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 focus-visible:outline-2"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <PlusCircle size={15} aria-hidden />
            {t('myPrograms.createFirst')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myPrograms.map(row => (
            <ProgramCard
              key={row.id}
              row={row}
              explorer={explorer}
              onSelect={onSelect}
              onFinalize={onSelect}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({
  row, explorer, onSelect, t,
}: {
  row: ProgramRow;
  explorer: string;
  onSelect: (id: number) => void;
  onFinalize: (id: number) => void;
  t: (key: Parameters<ReturnType<typeof useI18n>['t']>[0]) => string;
}) {
  const needsFinalize =
    !row.finalized && !row.cancelled &&
    MODULE_NOW_SEC > row.judDl;

  return (
    <div
      className="rounded-2xl p-4 flex flex-wrap items-center gap-4 cursor-pointer transition-all hover:ring-1 focus-visible:outline-2"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onClick={() => onSelect(row.id)}
      onKeyDown={e => e.key === 'Enter' && onSelect(row.id)}
      tabIndex={0}
      role="button"
      aria-label={`Open program ${row.name}`}
    >
      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
          #{row.id} · {row.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {CATEGORY_LABELS[row.pCat as 0|1|2|3]} · {t('myPrograms.prizes')}: {row.prizes.length}
        </p>
      </div>

      {/* Pool */}
      <div className="text-right">
        <p className="text-base font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
          {usdcToDisplay(row.pool)} <span className="text-xs font-normal">USDC</span>
        </p>
      </div>

      {/* Deadlines */}
      <div className="text-xs space-y-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
        <p>{t('myPrograms.subDl')}: {countdownLabel(row.subDl)}</p>
        <p>{t('myPrograms.judDl')}: {countdownLabel(row.judDl)}</p>
      </div>

      {/* Phase pill */}
      <div className="flex items-center gap-2">
        {row.phase === Phase.Finalized ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-400/10">
            <Trophy size={9} aria-hidden /> {PHASE_LABELS[row.phase]}
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[row.phase]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" aria-hidden />
            {PHASE_LABELS[row.phase]}
          </span>
        )}
        {needsFinalize && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(79,158,248,0.15)', color: 'var(--accent)' }}>
            {t('myPrograms.finalize')}
          </span>
        )}
        <a
          href={`${explorer}/address/${row.id}`}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-0.5 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
          aria-label={`Program ${row.id} on explorer`}
        >
          <ExternalLink size={11} aria-hidden />
        </a>
      </div>
    </div>
  );
}
