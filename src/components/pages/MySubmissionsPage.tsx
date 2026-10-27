/**
 * MySubmissionsPage — combined V5 + V4 submissions for the connected wallet.
 * Shows V5 programs first (active), then V4 legacy programs below.
 */
import { useState, useCallback, useEffect } from 'react';
import { Trophy, ExternalLink, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAccount } from 'wagmi';
import {
  useProgramCount, useAllProgramsV4, useSubmissionCountV4,
  useAllSubmissionsV4, usePendingClaim, useV4Write,
} from '@/hooks/useGrantFlowV4';
import {
  computePhase, usdcToDisplay, PHASE_LABELS, PHASE_COLORS,
  shortAddr,
} from '@/lib/grantflowV4';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import { useDisableTx } from '@/components/NetworkUI';
import { useTxRecovery, makeClaimPoller } from '@/hooks/useTxRecovery';
import {
  useV5ProgramCount,
  fetchV5Program,
  fetchV5Submissions,
  GRANTFLOW_V5_ABI,
} from '@/hooks/useGrantFlowV5';
import { formatUnits } from 'viem';

interface Props {
  onSelectV4: (id: number) => void;
  onSelectV5: (id: number) => void;
}

// ── V5 section ─────────────────────────────────────────────────────────────────

interface V5MySub {
  programId:   number;
  programName: string;
  submissionId: number;
  metadataURI:  string;
  prizeAwarded: bigint;
  paid:         boolean;
  isSolo:       boolean;
  teamName:     string;
}

function V5MySubmissions({ account, onSelect }: { account: string; onSelect: (id: number) => void }) {
  const { t } = useI18n();
  const { config, appClient } = useNetworkStore();
  const { count } = useV5ProgramCount();
  const [items, setItems] = useState<V5MySub[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!config.v5Address || !count || count === 0) { setItems([]); return; }
    setLoading(true);
    const result: V5MySub[] = [];
    try {
      for (let pid = 0; pid < count; pid++) {
        // Read submission count for this program
        let subCount = 0;
        try {
          const sc = await appClient.readContract({
            address: config.v5Address,
            abi: GRANTFLOW_V5_ABI,
            functionName: 'submissionCount',
            args: [BigInt(pid)],
          });
          subCount = Number(sc);
        } catch { continue; }
        if (subCount === 0) continue;

        const prog = await fetchV5Program(pid, config, appClient);
        if (!prog) continue;
        const subs = await fetchV5Submissions(pid, subCount, config, appClient);
        for (const s of subs) {
          // Match on submitter OR any payee (team member)
          const isParticipant =
            s.submitter.toLowerCase() === account.toLowerCase() ||
            s.payees.some(p => p.toLowerCase() === account.toLowerCase());
          if (!isParticipant) continue;
          result.push({
            programId:   pid,
            programName: prog.name,
            submissionId: s.id,
            metadataURI:  s.metadataURI,
            prizeAwarded: s.prizeAwarded,
            paid:         s.paid,
            isSolo:       s.isSolo,
            teamName:     s.teamName,
          });
        }
      }
    } finally {
      setLoading(false);
    }
    setItems(result);
  }, [config, appClient, count, account]);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (!config.v5Address) return null;
  if (loading) return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>V5 Programs</h2>
      {[1,2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
    </div>
  );
  if (items.length === 0) return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>V5 Programs</h2>
      <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>{t('mySubs.empty')}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>V5 Programs</h2>
      {items.map(item => (
        <div key={`${item.programId}-${item.submissionId}`}
          className="rounded-xl px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onClick={() => onSelect(item.programId)}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text)' }}>
                {item.programName}
                <span className="ml-1.5 font-mono opacity-60">#{item.submissionId + 1}</span>
              </div>
              {!item.isSolo && item.teamName && (
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Users size={10} /> {item.teamName}
                </div>
              )}
              {item.metadataURI && (
                <a href={item.metadataURI.startsWith('http') ? item.metadataURI : `https://${item.metadataURI}`}
                  target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                  className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                  {item.metadataURI} <ExternalLink size={9} className="inline" />
                </a>
              )}
            </div>
            {item.prizeAwarded > 0n && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Trophy size={12} />
                {formatUnits(item.prizeAwarded, 6)} USDC
                {item.paid ? ' (paid)' : ''}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── V4 section (inline subset of MySubmissionsV4) ──────────────────────────────

function V4MySubmissions({ account, onSelect }: { account: string; onSelect: (id: number) => void }) {
  const { t } = useI18n();
  const { config, appClient } = useNetworkStore();
  const explorer = config.explorerBase;
  const disableTx = useDisableTx();
  const [busy, setBusy]   = useState(false);
  const [txErr, setTxErr] = useState('');
  const [txOk, setTxOk]  = useState('');
  const [matchCount, setMatchCount] = useState(0);

  const { data: countRaw } = useProgramCount();
  const count = Number(countRaw ?? 0);
  const { data: programs }  = useAllProgramsV4(count);
  const { data: pending }   = usePendingClaim();
  const { claim }           = useV4Write();
  const { sendWithRecovery } = useTxRecovery();

  const handleClaim = async () => {
    setBusy(true); setTxErr(''); setTxOk('');
    const prevPending = pending ?? 0n;
    await sendWithRecovery(
      () => claim(),
      makeClaimPoller(appClient, config.v4Address, account as `0x${string}`, prevPending),
      {
        setStatus: m => { if (m) setTxOk(m); },
        setError:  m => setTxErr(m),
        onSuccess: () => setTxOk('USDC claimed!'),
      },
    );
    setBusy(false);
  };

  const hasPending = (pending ?? 0n) > 0n;
  // Hide section entirely when count is still loading (0) and no pending claim
  if (count === 0 && !hasPending) return null;
  // Hide section when programs are loaded but no rows match (matchCount stays 0 after load)
  // Allow a brief window while programs are loading by checking count > 0
  if (count > 0 && programs && matchCount === 0 && !hasPending) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
        Legacy V4 Programs
      </h2>

      {hasPending && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div>
            <p className="text-sm font-semibold text-emerald-400">{t('mySubs.prizeAvail')}</p>
            <p className="text-xs text-emerald-400/70">{usdcToDisplay(pending ?? 0n)} {t('mySubs.usdcPending')}</p>
          </div>
          <button onClick={() => void handleClaim()} disabled={busy || disableTx}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: '#10b981', color: '#fff' }}>
            {busy ? t('mySubs.claiming') : t('mySubs.claim')}
          </button>
        </div>
      )}

      {(txErr || txOk) && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${txOk ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {txOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {txOk || txErr}
        </div>
      )}

      {Array.from({ length: count }, (_, pid) => (
        <V4ProgramRow key={pid} pid={pid} account={account} explorer={explorer} onSelect={onSelect} programs={programs} onMatch={() => setMatchCount(n => n + 1)} />
      ))}
    </div>
  );
}

function V4ProgramRow({ pid, account, explorer, onSelect, programs, onMatch }:
  { pid: number; account: string; explorer: string; onSelect: (id: number) => void; programs: ReturnType<typeof useAllProgramsV4>['data']; onMatch?: () => void }) {
  const { data: subCountRaw } = useSubmissionCountV4(pid);
  const subCount = Number(subCountRaw ?? 0);
  const { data: subs } = useAllSubmissionsV4(pid, subCount);

  interface MySub { id: number; submitter: string; projContract: string; metaURI: string; votes: bigint; prizeAw: bigint; claimed: boolean; }

  const progResult = programs?.[pid];
  const progOk = !!(progResult && progResult.status === 'success' && progResult.result);
  const [pname = '', , , , , subDl = 0n, judDl = 0n, , , , finalized = false, cancelled = false] =
    progOk ? (progResult.result as unknown as [string, string, string, readonly bigint[], bigint, bigint, bigint, bigint, bigint, unknown, boolean, boolean]) : [];
  const phase = computePhase(subDl, judDl, finalized, cancelled);

  const mySubmissions: MySub[] = [];
  if (progOk) {
    for (let i = 0; i < (subs ?? []).length; i++) {
      const s = (subs ?? [])[i];
      if (s.status !== 'success' || !s.result) continue;
      const [submitter, projContract, metaURI, votes, prizeAw, claimed] = s.result;
      if (submitter.toLowerCase() !== account.toLowerCase()) continue;
      mySubmissions.push({ id: i, submitter, projContract, metaURI, votes, prizeAw, claimed });
    }
  }

  // Notify parent once when this row has matched submissions
  const reported = useState(false);
  useEffect(() => {
    if (mySubmissions.length > 0 && !reported[0]) { reported[1](true); onMatch?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySubmissions.length]);

  if (!progOk || mySubmissions.length === 0) return null;

  return (
    <div className="rounded-xl" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-90"
        onClick={() => onSelect(pid)}
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{pname}</span>
          <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>Program #{pid}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[phase]}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          {PHASE_LABELS[phase]}
        </span>
      </div>
      {mySubmissions.map(sub => (
        <div key={sub.id} className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text)' }}>
              Submission #{sub.id + 1}
            </div>
            {sub.metaURI && (
              <a href={sub.metaURI.startsWith('http') ? sub.metaURI : `https://${sub.metaURI}`}
                target="_blank" rel="noreferrer"
                className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                {sub.metaURI} <ExternalLink size={9} className="inline" />
              </a>
            )}
            {sub.projContract !== '0x0000000000000000000000000000000000000000' && (
              <a href={`${explorer}/address/${sub.projContract}`} target="_blank" rel="noreferrer"
                className="text-xs hover:underline block" style={{ color: 'var(--text-muted)' }}>
                {shortAddr(sub.projContract)} <ExternalLink size={9} className="inline" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: 'var(--text-muted)' }}>{Number(sub.votes)} vote{Number(sub.votes) !== 1 ? 's' : ''}</span>
            {sub.prizeAw > 0n && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Trophy size={12} />
                {usdcToDisplay(sub.prizeAw)} USDC {sub.claimed ? '(claimed)' : ''}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Combined page ──────────────────────────────────────────────────────────────

export function MySubmissionsPage({ onSelectV4, onSelectV5 }: Props) {
  const { t } = useI18n();
  const { address: account } = useAccount();

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
        <span className="text-4xl">🔗</span>
        <p className="text-sm">{t('mySubs.noWallet')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t('mySubs.title')}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('mySubs.sub')}</p>
      </div>

      <V5MySubmissions account={account} onSelect={onSelectV5} />

      <div className="h-px" style={{ background: 'var(--border)' }} />

      <V4MySubmissions account={account} onSelect={onSelectV4} />
    </div>
  );
}
