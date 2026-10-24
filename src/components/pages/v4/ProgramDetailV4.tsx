/**
 * ProgramDetailV4 — full hackathon program page.
 *
 * Tabs (order changes after finalize):
 *   Winners (only after finalize, default-selected then)
 *   Details | Submissions (count) | Participants | Judges | Ask
 *
 * Before finalize: phase banner with live countdown + Finalize button.
 * Winners tab: celebratory header, ranked winner cards, claim/payout status,
 *              unawarded prizes reclaim status, share-results button.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle,
  Share2, Copy, Trophy,
} from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import {
  useProgramV4, useProgramJudges, useSubmissionCountV4,
  useAllSubmissionsV4, useVotesRemaining, useHasSubmitted,
  useIsJudge, usePendingClaim, useFeeBps, useV4Write,
  usePrizeAssignedLogs, useClaimedLogs, useReclaimedLogs,
} from '@/hooks/useGrantFlowV4';
import {
  computePhase, countdownLabel, totalPool, usdcToDisplay,
  PHASE_LABELS, PHASE_COLORS, CATEGORY_LABELS, PROGRAM_TYPE_LABELS,
  Phase, ProgramType, shortAddr, feeAmount, parseOnchainErrorV4,
} from '@/lib/grantflowV4';
import { useRole } from '@/components/RoleSwitcher';

const CHAIN_EXPLORER: Record<number, string> = {
  5042002: 'https://explorer.testnet.arc.io',
  5042:    'https://explorer.arc.io',
};

const MEDAL = ['🥇', '🥈', '🥉'];
const RANK_BG = [
  'bg-amber-400/10 border-amber-400/30',
  'bg-zinc-300/10 border-zinc-300/20',
  'bg-orange-400/10 border-orange-400/20',
];

interface Props { programId: number; onBack: () => void; }

type TabId = 'winners' | 'details' | 'submissions' | 'participants' | 'judges' | 'ask';

interface SubRow {
  id: number;
  submitter: string;
  projContract: string;
  metaURI: string;
  voteCount: bigint;
  prizeAw: bigint;
  claimed: boolean;
}

export function ProgramDetailV4({ programId, onBack }: Props) {
  const chainId  = useChainId();
  const explorer = CHAIN_EXPLORER[chainId] ?? CHAIN_EXPLORER[5042002];
  const { address: account } = useAccount();
  const { role } = useRole();

  const { data: prog, refetch: refetchProg } = useProgramV4(programId);
  const { data: judges }     = useProgramJudges(programId);
  const { data: subCountRaw, refetch: refetchCount } = useSubmissionCountV4(programId);
  const { data: feeBpsRaw }  = useFeeBps();
  useVotesRemaining(programId);
  const { data: hasSub }     = useHasSubmitted(programId);
  const { data: isJudge }    = useIsJudge(programId);
  const { data: pending }    = usePendingClaim();

  const subCount = Number(subCountRaw ?? 0);
  const { data: subs, refetch: refetchSubs } = useAllSubmissionsV4(programId, subCount);

  // Event logs for tx links
  const { logs: prizeAssignedLogs } = usePrizeAssignedLogs(programId);
  const claimedLogs  = useClaimedLogs();
  const reclaimedLog = useReclaimedLogs(programId);

  const { submit, vote, finalize, claim, reclaim, cancel } = useV4Write();

  // ── State (all before early return) ──────────────────────────────────────────
  const [busy, setBusy]   = useState(false);
  const [txErr, setTxErr] = useState('');
  const [txOk, setTxOk]  = useState('');
  const [subMeta, setSubMeta]           = useState('');
  const [subContract, setSubContract]   = useState('');
  const [subConfirm, setSubConfirm]     = useState(false);
  const [copied, setCopied]             = useState(false);
  // Tab state — declared unconditionally before any early return
  const [tab, setTab] = useState<TabId>('details');
  // Capture current time once at mount — useState initializer runs outside render.
  const [nowSec] = useState<bigint>(() => BigInt(Math.floor(Date.now() / 1000)));

  const refetchAll = useCallback(() => {
    void refetchProg();
    void refetchCount();
    void refetchSubs();
  }, [refetchProg, refetchCount, refetchSubs]);

  // Build rows (before early return so hook order is stable)
  const rows = useMemo<SubRow[]>(() => {
    const result: SubRow[] = [];
    for (let i = 0; i < (subs ?? []).length; i++) {
      const s = (subs ?? [])[i];
      if (s.status !== 'success' || !s.result) continue;
      const [submitter, projContract, metaURI, voteCount, prizeAw, clm] = s.result;
      result.push({ id: i, submitter, projContract, metaURI, voteCount, prizeAw, claimed: clm });
    }
    return result;
  }, [subs]);

  const ranked = useMemo(() => [...rows].sort((a, b) =>
    b.voteCount > a.voteCount ? 1 : b.voteCount < a.voteCount ? -1 : a.id - b.id
  ), [rows]);

  // Unique participants
  const participants = useMemo(() =>
    [...new Set(rows.map(r => r.submitter.toLowerCase()))],
  [rows]);

  if (!prog) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  const [name, desc, sponsor, prizes, , subDl, judDl, pType, pCat, , finalized, cancelled] = prog;
  const phase  = computePhase(subDl, judDl, finalized, cancelled);
  const pool   = totalPool(prizes);
  const feeBps = feeBpsRaw ?? 0n;
  const fee    = feeAmount(pool, feeBps);
  const isSponsor = account?.toLowerCase() === sponsor.toLowerCase();

  // Winners = ranked subs with prizeAw > 0 (after finalize)
  const winners = finalized ? ranked.filter(r => r.prizeAw > 0n) : [];
  const totalPaidOut = winners.reduce((a, r) => a + r.prizeAw, 0n);

  // ── Tab definitions ───────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string }[] = [
    ...(finalized ? [{ id: 'winners' as TabId, label: 'Winners' }] : []),
    { id: 'details',      label: 'Details'                         },
    { id: 'submissions',  label: `Submissions (${subCount})`       },
    { id: 'participants', label: `Participants (${participants.length})` },
    { id: 'judges',       label: 'Judges'                          },
    { id: 'ask',          label: 'Ask / Contact'                   },
  ];
  // Jump to winners when finalized arrives mid-session
  const effectiveTab = finalized && tab === 'details' && winners.length > 0 ? 'winners' : tab;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const shareResults = () => {
    const url = `${window.location.origin}${window.location.pathname}#v4-program/${programId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Find claim tx for a winner address (latest Claimed event from that address after finalization)
  const claimTxFor = (winner: string): `0x${string}` | null => {
    const match = claimedLogs
      .filter(l => l.recipient.toLowerCase() === winner.toLowerCase())
      .sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
    return match[0]?.txHash ?? null;
  };

  // Find PrizeAssigned log for a submission
  const prizeLogFor = (subId: number) =>
    prizeAssignedLogs.find(l => Number(l.submissionId) === subId);

  // ── Tx handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!account) return;
    setBusy(true); setTxErr(''); setTxOk('');
    try {
      const projAddr: `0x${string}` = pType === ProgramType.OPEN_BOUNTY
        ? '0x0000000000000000000000000000000000000000'
        : (subContract as `0x${string}`);
      await submit(BigInt(programId), projAddr, subMeta);
      setTxOk('Submitted!');
      setSubMeta(''); setSubContract(''); setSubConfirm(false);
      refetchAll();
    } catch (e) { setTxErr(parseOnchainErrorV4(e)); }
    setBusy(false);
  };

  const handleVote = async (sid: number) => {
    setBusy(true); setTxErr(''); setTxOk('');
    try {
      await vote(BigInt(programId), BigInt(sid));
      setTxOk(`Voted on submission #${sid}.`);
      refetchAll();
    } catch (e) { setTxErr(parseOnchainErrorV4(e)); }
    setBusy(false);
  };

  const handleFinalize = async () => {
    setBusy(true); setTxErr(''); setTxOk('');
    try {
      await finalize(BigInt(programId));
      setTxOk('Program finalized!');
      refetchAll();
    } catch (e) { setTxErr(parseOnchainErrorV4(e)); }
    setBusy(false);
  };

  const handleReclaim = async () => {
    setBusy(true); setTxErr(''); setTxOk('');
    try {
      await reclaim(BigInt(programId));
      setTxOk('Funds reclaimed to sponsor.');
      refetchAll();
    } catch (e) { setTxErr(parseOnchainErrorV4(e)); }
    setBusy(false);
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this program? The prize pool will be returned. This cannot be undone.')) return;
    setBusy(true); setTxErr(''); setTxOk('');
    try {
      await cancel(BigInt(programId));
      setTxOk('Program cancelled.');
      refetchAll();
    } catch (e) { setTxErr(parseOnchainErrorV4(e)); }
    setBusy(false);
  };

  const handleClaim = async () => {
    setBusy(true); setTxErr(''); setTxOk('');
    try {
      await claim();
      setTxOk('USDC claimed to your wallet!');
      refetchAll();
    } catch (e) { setTxErr(parseOnchainErrorV4(e)); }
    setBusy(false);
  };

  // ── Phase banner (before finalize) ───────────────────────────────────────────

  const renderPhaseBanner = () => {
    if (finalized || cancelled) return null;
    const isSubPhase = phase === Phase.Submission;
    const isJudgPhase = phase === Phase.Judging;
    const pastJudging = !finalized && !cancelled && phase === Phase.Judging &&
      nowSec > judDl;

    const bannerColor = isSubPhase
      ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-400'
      : 'bg-amber-400/10 border-amber-400/25 text-amber-400';

    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${bannerColor}`}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {isSubPhase && `Submissions open · closes in ${countdownLabel(subDl)}`}
          {isJudgPhase && !pastJudging && `Judging in progress · closes in ${countdownLabel(judDl)}`}
          {isJudgPhase && pastJudging && 'Judging deadline passed · waiting for finalize'}
        </div>
        {/* Anyone can finalize after judging deadline */}
        {pastJudging && (
          <Btn onClick={() => void handleFinalize()} disabled={busy}>
            {busy ? 'Finalizing…' : 'Finalize now'}
          </Btn>
        )}
      </div>
    );
  };

  // ── Winners tab ───────────────────────────────────────────────────────────────

  const renderWinnersTab = () => (
    <div className="flex flex-col gap-5">
      {/* Celebratory header */}
      <div className="rounded-2xl px-6 py-6 text-center"
        style={{ background: 'linear-gradient(135deg,var(--accent)18,var(--surface))', border: '1px solid var(--border)' }}>
        <div className="text-3xl mb-2">🏆</div>
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
          Winners announced
        </h2>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>{name}</p>
        <div className="flex justify-center gap-6 text-sm">
          <Stat label="Total paid out" value={`${usdcToDisplay(totalPaidOut)} USDC`} accent />
          <Stat label="Submissions" value={String(subCount)} />
          <Stat label="Winners" value={String(winners.length)} />
        </div>
        {/* Share results */}
        <button
          onClick={shareResults}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          {copied ? <><CheckCircle2 size={12} /> Link copied!</> : <><Share2 size={12} /> Share results</>}
        </button>
      </div>

      {/* Winner cards */}
      {winners.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          No winners — no submission received votes.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {winners.map((r, idx) => {
            const rank = idx; // already sorted
            const medal = MEDAL[rank] ?? `#${rank + 1}`;
            const rankBg = RANK_BG[rank] ?? 'bg-zinc-400/10 border-zinc-400/20';
            const prizeLog = prizeLogFor(r.id);
            const claimTx  = claimTxFor(r.submitter);
            const isMe = account?.toLowerCase() === r.submitter.toLowerCase();
            const isOpenBounty = r.projContract === '0x0000000000000000000000000000000000000000';

            return (
              <div key={r.id}
                className={`rounded-xl border px-5 py-4 ${rankBg}`}
              >
                <div className="flex items-start gap-4">
                  {/* Medal */}
                  <div className="text-3xl leading-none mt-0.5 w-10 text-center flex-shrink-0">{medal}</div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Rank {rank + 1}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                        {usdcToDisplay(r.prizeAw)} USDC
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {Number(r.voteCount)} vote{Number(r.voteCount) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Winner address */}
                    <div className="flex items-center gap-1 text-sm mb-1">
                      <a href={`${explorer}/address/${r.submitter}`} target="_blank" rel="noreferrer"
                        className="font-medium hover:underline" style={{ color: 'var(--text)' }}>
                        {shortAddr(r.submitter)}
                      </a>
                      {isMe && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-emerald-400 bg-emerald-400/15">You</span>
                      )}
                    </div>

                    {/* Submission link */}
                    {isOpenBounty ? (
                      r.metaURI && (
                        <a href={r.metaURI.startsWith('http') ? r.metaURI : `https://${r.metaURI}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs hover:underline truncate block max-w-xs" style={{ color: 'var(--text-muted)' }}>
                          {r.metaURI} <ExternalLink size={9} className="inline" />
                        </a>
                      )
                    ) : (
                      r.projContract && (
                        <a href={`${explorer}/address/${r.projContract}`} target="_blank" rel="noreferrer"
                          className="text-xs hover:underline flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                          {shortAddr(r.projContract)} <ExternalLink size={9} />
                        </a>
                      )
                    )}

                    {/* Prize tx link */}
                    {prizeLog && (
                      <a href={`${explorer}/tx/${prizeLog.txHash}`} target="_blank" rel="noreferrer"
                        className="text-xs hover:underline mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                        Prize assigned · tx <ExternalLink size={9} className="inline" />
                      </a>
                    )}
                  </div>

                  {/* Payout status */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {r.claimed ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <CheckCircle2 size={12} /> Claimed
                        </span>
                        {claimTx && (
                          <a href={`${explorer}/tx/${claimTx}`} target="_blank" rel="noreferrer"
                            className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
                            view tx <ExternalLink size={9} className="inline" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Unclaimed · winner can claim
                        </span>
                        {isMe && (pending ?? 0n) > 0n && (
                          <Btn onClick={() => void handleClaim()} disabled={busy}>
                            Claim {usdcToDisplay(pending ?? 0n)} USDC
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unawarded prizes reclaim */}
      {reclaimedLog ? (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--text)' }}>Unawarded prizes returned to sponsor</span>
          {' '}·{' '}
          <a href={`${explorer}/tx/${reclaimedLog.txHash}`} target="_blank" rel="noreferrer"
            className="hover:underline" style={{ color: 'var(--accent)' }}>
            {usdcToDisplay(reclaimedLog.amount)} USDC reclaimed <ExternalLink size={10} className="inline" />
          </a>
        </div>
      ) : isSponsor && finalized && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Reclaim unawarded prize funds
          </span>
          <Btn variant="secondary" onClick={() => void handleReclaim()} disabled={busy}>
            {busy ? 'Reclaiming…' : 'Reclaim'}
          </Btn>
        </div>
      )}
    </div>
  );

  // ── Details tab ───────────────────────────────────────────────────────────────

  const renderDetailsTab = () => (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <Card title="About">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {desc || 'No description provided.'}
        </p>
      </Card>
      <Card title="Prizes">
        {prizes.map((amt, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <span className="text-lg">{MEDAL[i] ?? `#${i + 1}`}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {usdcToDisplay(amt)} USDC
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rank {i + 1}</span>
          </div>
        ))}
      </Card>
      <Card title="Deadlines">
        <Row label="Submissions close" value={new Date(Number(subDl) * 1000).toLocaleString()} />
        <Row label="Judging closes"    value={new Date(Number(judDl) * 1000).toLocaleString()} />
        <Row label="Countdown (sub)"   value={countdownLabel(subDl)} />
        <Row label="Countdown (judge)" value={countdownLabel(judDl)} />
      </Card>
      <Card title="Fee breakdown">
        <Row label="Prize pool"  value={`${usdcToDisplay(pool)} USDC`} />
        <Row label={`Platform fee (${Number(feeBps) / 100}%)`} value={`${usdcToDisplay(fee)} USDC`} />
        <Row label="Total deposited" value={`${usdcToDisplay(pool + fee)} USDC`} strong />
      </Card>
    </div>
  );

  // ── Submissions tab ───────────────────────────────────────────────────────────

  const renderSubmissionsTab = () => (
    <div className="flex flex-col gap-3">
      {/* Hacker submit action */}
      {role === 'hacker' && phase === Phase.Submission && !hasSub && account && (
        <Card title="Submit your project">
          {!subConfirm ? (
            <div className="flex flex-col gap-3">
              {pType === ProgramType.ONCHAIN_BUILD && (
                <Input label="Deployed contract address" value={subContract}
                  onChange={setSubContract} placeholder="0x…" />
              )}
              <Input
                label={pType === ProgramType.OPEN_BOUNTY ? 'Link to your work' : 'Metadata link (GitHub, docs…)'}
                value={subMeta} onChange={setSubMeta} placeholder="https://github.com/…"
              />
              <Btn onClick={() => setSubConfirm(true)} disabled={!subMeta && !subContract}>
                Review submission
              </Btn>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Confirm submission</div>
                <Row label="Program" value={name} />
                {pType === ProgramType.ONCHAIN_BUILD && <Row label="Contract" value={shortAddr(subContract)} />}
                <Row label="Link" value={subMeta || '—'} />
              </div>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => setSubConfirm(false)}>Back</Btn>
                <Btn onClick={() => void handleSubmit()} disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit onchain'}
                </Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* List */}
      {rows.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No submissions yet.</p>
      ) : (
        rows.map(r => (
          <SubCard key={r.id} row={r} prizes={prizes} phase={phase} explorer={explorer}
            isJudge={!!isJudge} onVote={handleVote} busy={busy} account={account} />
        ))
      )}
    </div>
  );

  // ── Participants tab ──────────────────────────────────────────────────────────

  const renderParticipantsTab = () => (
    <div className="flex flex-col gap-2">
      {participants.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No participants yet.</p>
      ) : (
        participants.map(addr => (
          <div key={addr} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <a href={`${explorer}/address/${addr}`} target="_blank" rel="noreferrer"
              className="text-sm font-mono hover:underline" style={{ color: 'var(--accent)' }}>
              {shortAddr(addr)}
            </a>
            <a href={`${explorer}/address/${addr}`} target="_blank" rel="noreferrer"
              style={{ color: 'var(--text-muted)' }}>
              <ExternalLink size={12} />
            </a>
          </div>
        ))
      )}
    </div>
  );

  // ── Judges tab ────────────────────────────────────────────────────────────────

  const renderJudgesTab = () => (
    <div className="flex flex-col gap-2">
      {(judges ?? []).length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No judges listed.</p>
      ) : (
        (judges ?? []).map(j => (
          <div key={j} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <a href={`${explorer}/address/${j}`} target="_blank" rel="noreferrer"
              className="text-sm font-mono hover:underline" style={{ color: 'var(--accent)' }}>
              {shortAddr(j)}
            </a>
            <a href={`${explorer}/address/${j}`} target="_blank" rel="noreferrer"
              style={{ color: 'var(--text-muted)' }}>
              <ExternalLink size={12} />
            </a>
          </div>
        ))
      )}
    </div>
  );

  // ── Ask / Contact tab ─────────────────────────────────────────────────────────

  const renderAskTab = () => (
    <div className="flex flex-col gap-4">
      <Card title="Contact the sponsor">
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          This program is organised by{' '}
          <a href={`${explorer}/address/${sponsor}`} target="_blank" rel="noreferrer"
            className="font-mono hover:underline" style={{ color: 'var(--accent)' }}>
            {shortAddr(sponsor)}
          </a>
          . You can reach them by sending a transaction or message onchain, or by looking up their address on a social directory.
        </p>
        <div className="flex gap-2 flex-wrap">
          <a
            href={`${explorer}/address/${sponsor}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <ExternalLink size={11} /> View on explorer
          </a>
          <button
            onClick={() => void navigator.clipboard.writeText(sponsor).then(() => setCopied(true))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <Copy size={11} /> {copied ? 'Copied!' : 'Copy address'}
          </button>
        </div>
      </Card>
    </div>
  );

  // ── Organizer actions panel (shown below tabs when relevant) ──────────────────

  const renderOrganizerPanel = () => {
    if (!isSponsor) return null;
    if (finalized || cancelled) return null;
    const pastJudging = phase === Phase.Judging && nowSec > judDl;
    if (!pastJudging) return null;
    return null; // Already shown in phase banner; skip duplicate
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">

      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="mt-1 p-1 rounded-md hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--text)' }}>{name}</h1>
            {finalized ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-400/10">
                <Trophy size={10} /> Ended · winners announced
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[phase]}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {PHASE_LABELS[phase]}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {PROGRAM_TYPE_LABELS[pType as 0 | 1]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {CATEGORY_LABELS[pCat as 0 | 1 | 2 | 3]}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <StatSmall label="Pool"   value={`${usdcToDisplay(pool)} USDC`} />
            <StatSmall label="Prizes" value={prizes.length.toString()} />
            {!finalized && <StatSmall label="Sub closes"   value={countdownLabel(subDl)} />}
            {!finalized && <StatSmall label="Judge closes" value={countdownLabel(judDl)} />}
            <span>
              Sponsor:{' '}
              <a href={`${explorer}/address/${sponsor}`} target="_blank" rel="noreferrer"
                className="hover:underline" style={{ color: 'var(--accent)' }}>
                {shortAddr(sponsor)}
              </a>
            </span>
          </div>
        </div>
        <button onClick={refetchAll} className="p-1.5 rounded-md hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Phase banner */}
      {renderPhaseBanner()}

      {/* Pending claim banner */}
      {(pending ?? 0n) > 0n && !finalized && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span className="text-sm text-emerald-400 font-medium">
            You have {usdcToDisplay(pending ?? 0n)} USDC to claim!
          </span>
          <Btn onClick={() => void handleClaim()} disabled={busy}>Claim USDC</Btn>
        </div>
      )}

      {/* Tx feedback */}
      {(txErr || txOk) && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${txOk ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {txOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {txOk || txErr}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap"
            style={effectiveTab === t.id
              ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
              : { borderColor: 'transparent', color: 'var(--text-muted)' }
            }>
            {t.id === 'winners' ? (
              <span className="inline-flex items-center gap-1">
                <Trophy size={11} /> {t.label}
              </span>
            ) : t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {effectiveTab === 'winners'      && renderWinnersTab()}
      {effectiveTab === 'details'      && renderDetailsTab()}
      {effectiveTab === 'submissions'  && renderSubmissionsTab()}
      {effectiveTab === 'participants' && renderParticipantsTab()}
      {effectiveTab === 'judges'       && renderJudgesTab()}
      {effectiveTab === 'ask'          && renderAskTab()}

      {renderOrganizerPanel()}

      {/* Cancel (organizer, before any submissions) */}
      {isSponsor && subCount === 0 && !cancelled && !finalized && (
        <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => void handleCancel()} disabled={busy}
            className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
            Cancel program and recover prize pool
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SubCard({ row, prizes, phase, explorer, isJudge, onVote, busy, account }: {
  row: SubRow;
  prizes: readonly bigint[];
  phase: number;
  explorer: string;
  isJudge: boolean;
  onVote: (id: number) => Promise<void>;
  busy: boolean;
  account: string | undefined;
}) {
  const isOwnSubmission = account?.toLowerCase() === row.submitter.toLowerCase();
  const canVote = isJudge && phase === Phase.Judging && !isOwnSubmission;
  const isOpenBounty = row.projContract === '0x0000000000000000000000000000000000000000';

  return (
    <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <a href={`${explorer}/address/${row.submitter}`} target="_blank" rel="noreferrer"
              className="text-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {shortAddr(row.submitter)}
            </a>
            {row.prizeAw > 0n && (
              <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-400/10">
                Won {usdcToDisplay(row.prizeAw)} USDC
              </span>
            )}
          </div>
          {isOpenBounty ? (
            row.metaURI && (
              <a href={row.metaURI.startsWith('http') ? row.metaURI : `https://${row.metaURI}`}
                target="_blank" rel="noreferrer"
                className="text-xs hover:underline block truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>
                {row.metaURI}
              </a>
            )
          ) : (
            row.projContract && (
              <a href={`${explorer}/address/${row.projContract}`} target="_blank" rel="noreferrer"
                className="text-xs hover:underline flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                {shortAddr(row.projContract)} <ExternalLink size={9} />
              </a>
            )
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {Number(row.voteCount)} vote{Number(row.voteCount) !== 1 ? 's' : ''}
          </span>
          {prizes.length > 0 && (
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{
                background: 'var(--accent)',
                width: `${Math.min(100, (Number(row.voteCount) / prizes.length) * 100)}%`,
              }} />
            </div>
          )}
          {canVote && (
            <Btn onClick={() => { void onVote(row.id); }} disabled={busy}>Vote</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{title.toUpperCase()}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-bold tabular-nums" style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function StatSmall({ label, value }: { label: string; value: string }) {
  return <span><span className="opacity-60">{label}: </span>{value}</span>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: strong ? 600 : undefined }}>{value}</span>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        className="px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      />
    </div>
  );
}

function Btn({ onClick, disabled, children, variant = 'primary' }: {
  onClick?: () => void; disabled?: boolean;
  children: React.ReactNode; variant?: 'primary' | 'secondary';
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
      style={variant === 'primary'
        ? { background: 'var(--accent)', color: '#fff' }
        : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }
      }>
      {children}
    </button>
  );
}
