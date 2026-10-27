/**
 * MySubmissionsV4 — shows all submissions by the connected wallet.
 * Also shows pending claim if any.
 */
import { Trophy, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAccount } from 'wagmi';
import { useState } from 'react';
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

interface Props { onSelect: (id: number) => void; }

export function MySubmissionsV4({ onSelect }: Props) {
  const { t } = useI18n();
  const { address: account } = useAccount();
  const { config, appClient } = useNetworkStore();
  const explorer = config.explorerBase;
  const disableTx = useDisableTx();

  const [busy, setBusy]   = useState(false);
  const [txErr, setTxErr] = useState('');
  const [txOk, setTxOk]  = useState('');

  const { data: countRaw } = useProgramCount();
  const count = Number(countRaw ?? 0);
  const { data: programs }  = useAllProgramsV4(count);
  const { data: pending }   = usePendingClaim();
  const { claim }           = useV4Write();
  const { sendWithRecovery } = useTxRecovery();

  const handleClaim = async () => {
    if (!account) return;
    setBusy(true); setTxErr(''); setTxOk('');
    const prevPending = pending ?? 0n;
    await sendWithRecovery(
      () => claim(),
      makeClaimPoller(appClient, config.v4Address, account, prevPending),
      {
        setStatus: m => { if (m) setTxOk(m); },
        setError:  m => setTxErr(m),
        onSuccess: () => setTxOk('USDC claimed!'),
      },
    );
    setBusy(false);
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
        <span className="text-4xl">🔗</span>
        <p className="text-sm">{t('mySubs.noWallet')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t('mySubs.title')}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('mySubs.sub')}</p>
      </div>

      {/* Pending claim */}
      {(pending ?? 0n) > 0n && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div>
            <p className="text-sm font-semibold text-emerald-400">{t('mySubs.prizeAvail')}</p>
            <p className="text-xs text-emerald-400/70">{usdcToDisplay(pending ?? 0n)} {t('mySubs.usdcPending')}</p>
          </div>
          <button onClick={() => void handleClaim()} disabled={busy || disableTx}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: '#10b981', color: '#fff' }}
            title={disableTx ? 'Switch to the correct network first' : undefined}>
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

      {/* Program list with user submissions */}
      {count === 0 ? (
        <Empty />
      ) : (
        Array.from({ length: count }, (_, pid) => (
          <ProgramRow key={pid} pid={pid} account={account} explorer={explorer} onSelect={onSelect} programs={programs} />
        ))
      )}
    </div>
  );
}

function ProgramRow({ pid, account, explorer, onSelect, programs }:
  { pid: number; account: string; explorer: string; onSelect: (id: number) => void; programs: ReturnType<typeof useAllProgramsV4>['data'] }) {

  const { data: subCountRaw } = useSubmissionCountV4(pid);
  const subCount = Number(subCountRaw ?? 0);
  const { data: subs } = useAllSubmissionsV4(pid, subCount);

  const progResult = programs?.[pid];
  if (!progResult || progResult.status !== 'success' || !progResult.result) return null;

  const [pname, , , , , subDl, judDl, , , , finalized, cancelled] = progResult.result;
  const phase = computePhase(subDl, judDl, finalized, cancelled);

  interface MySub { id: number; submitter: string; projContract: string; metaURI: string; votes: bigint; prizeAw: bigint; claimed: boolean; }
  const mySubmissions: MySub[] = [];
  for (let i = 0; i < (subs ?? []).length; i++) {
    const s = (subs ?? [])[i];
    if (s.status !== 'success' || !s.result) continue;
    const [submitter, projContract, metaURI, votes, prizeAw, claimed] = s.result;
    if (submitter.toLowerCase() !== account.toLowerCase()) continue;
    mySubmissions.push({ id: i, submitter, projContract, metaURI, votes, prizeAw, claimed });
  }

  if (mySubmissions.length === 0) return null;

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

function Empty() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
      <span className="text-4xl">📭</span>
      <p className="text-sm">{t('mySubs.empty')}</p>
    </div>
  );
}
