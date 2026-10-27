/**
 * JudgeProgramsPage — lists programs where the connected wallet is a judge.
 * Reads both V5 and V4 contracts. Clicking a row navigates to that program.
 */
import { useState, useCallback, useEffect } from 'react';
import { Scale, ExternalLink } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAccount } from 'wagmi';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import {
  useV5ProgramCount,
  fetchV5Program,
  GRANTFLOW_V5_ABI,
} from '@/hooks/useGrantFlowV5';
import {
  useProgramCount, useAllProgramsV4,
} from '@/hooks/useGrantFlowV4';
import {
  computePhase, PHASE_LABELS, PHASE_COLORS, usdcToDisplay, totalPool,
} from '@/lib/grantflowV4';
import { GRANTFLOW_V4_ABI } from '@/lib/grantflowV4';

interface Props {
  onSelectV4: (id: number) => void;
  onSelectV5: (id: number) => void;
}

interface JudgeRow {
  id: number;
  name: string;
  pool: string;
  phase: import('@/lib/grantflowV4').PhaseValue;
  version: 'v5' | 'v4';
}

export function JudgeProgramsPage({ onSelectV4, onSelectV5 }: Props) {
  const { t } = useI18n();
  const { address: account } = useAccount();
  const { config, appClient } = useNetworkStore();
  const { count: v5Count } = useV5ProgramCount();
  const { data: v4CountRaw } = useProgramCount();
  const v4Count = Number(v4CountRaw ?? 0);
  const { data: v4Programs } = useAllProgramsV4(v4Count);

  const [rows, setRows] = useState<JudgeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!account) { setRows([]); return; }
    setLoading(true);
    const result: JudgeRow[] = [];

    // V5 programs
    if (config.v5Address && v5Count && v5Count > 0) {
      for (let pid = 0; pid < v5Count; pid++) {
        try {
          const isJudge = await appClient.readContract({
            address: config.v5Address,
            abi: GRANTFLOW_V5_ABI,
            functionName: 'isJudge',
            args: [BigInt(pid), account],
          });
          if (!isJudge) continue;
          const prog = await fetchV5Program(pid, config, appClient);
          if (!prog) continue;
          const phase = computePhase(
            BigInt(prog.submissionDeadline), BigInt(prog.judgingDeadline),
            prog.finalized, prog.cancelled
          );
          result.push({
            id: pid, name: prog.name,
            pool: prog.totalPool,
            phase, version: 'v5',
          });
        } catch { /* skip */ }
      }
    }

    // V4 programs — check isJudge via the ABI
    if (v4Programs && config.v4Address) {
      for (let pid = 0; pid < v4Count; pid++) {
        try {
          const isJudge = await appClient.readContract({
            address: config.v4Address,
            abi: GRANTFLOW_V4_ABI,
            functionName: 'isJudge',
            args: [BigInt(pid), account],
          });
          if (!isJudge) continue;
          const pr = v4Programs[pid];
          if (!pr || pr.status !== 'success' || !pr.result) continue;
          const [name, , , prizes, deposited, subDl, judDl, , , , finalized, cancelled] = pr.result;
          const phase = computePhase(subDl, judDl, finalized, cancelled);
          result.push({
            id: pid, name,
            pool: usdcToDisplay(deposited > 0n ? deposited : totalPool(prizes)),
            phase, version: 'v4',
          });
        } catch { /* skip */ }
      }
    }

    setRows(result);
    setLoading(false);
  }, [account, config, appClient, v5Count, v4Count, v4Programs]);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
        <span className="text-4xl">🔗</span>
        <p className="text-sm">{t('mySubs.noWallet')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Scale size={18} style={{ color: 'var(--accent)' }} />
          {t('nav.judge')}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {t('judge.sub')}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
          <Scale size={36} className="opacity-30" />
          <p className="text-sm">{t('judge.empty')}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {rows.map((row, i) => (
            <div
              key={`${row.version}-${row.id}`}
              onClick={() => row.version === 'v5' ? onSelectV5(row.id) : onSelectV4(row.id)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : undefined, background: 'var(--surface)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                  style={row.version === 'v5'
                    ? { background: 'rgba(79,158,248,0.12)', color: '#4f9ef8' }
                    : { background: 'rgba(180,120,0,0.12)', color: '#b47800' }
                  }>
                  {row.version}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{row.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.pool} USDC pool</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[row.phase]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  {PHASE_LABELS[row.phase]}
                </span>
                <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
