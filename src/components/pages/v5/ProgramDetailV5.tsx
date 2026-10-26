/**
 * ProgramDetailV5 — program detail for GrantFlowV5 (push-payout).
 *
 * Key differences from V4 detail:
 *  - Sponsor name, logo, website from SponsorMeta (description JSON).
 *  - Finalize pushes prizes directly — no Claim/Reclaim buttons.
 *  - Results tab shows podium + payout tx links.
 *  - Edit button for sponsor (0 submissions, before deadline).
 *  - ShareBox in header.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle,
  Globe, Edit2, Send, PlusCircle, Trash2, Users, User,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatUnits, createPublicClient, http } from 'viem';
import { useI18n } from '@/hooks/useI18n';
import { useNetworkStore, NETWORK_CONFIGS } from '@/hooks/useNetworkStore';
import type { NetworkConfig } from '@/hooks/useNetworkStore';
import { useDisableTx } from '@/components/NetworkUI';
import { useRole } from '@/components/RoleSwitcher';
import { ShareBox } from '@/components/ShareBox';
import { ResultsTab } from '@/components/pages/v5/ResultsTab';
import { EditProgramModal } from '@/components/pages/v5/EditProgramModal';
import {
  useV5Write, useV5ProgramForChain, useV5SubmissionsForChain,
  buildProgramUrl, slugify, GRANTFLOW_V5_ABI,
} from '@/hooks/useGrantFlowV5';
import {
  computePhase, countdownLabel, totalPool,
  PHASE_LABELS, PHASE_COLORS, CATEGORY_LABELS, PROGRAM_TYPE_LABELS,
  Phase, shortAddr,
} from '@/lib/grantflowV4';

interface Props {
  programId:      number;
  onBack:         () => void;
  /** 'mainnet' | 'testnet' from the URL — sets the share link network label */
  programNetwork?: 'mainnet' | 'testnet';
}

type TabId = 'results' | 'details' | 'submissions' | 'judges';

export function ProgramDetailV5({ programId, onBack, programNetwork }: Props) {
  const { t } = useI18n();
  // Global store — only used for write txs (wallet must be on this network)
  const { config: globalConfig } = useNetworkStore();
  const disableTx   = useDisableTx();
  const { address: account } = useAccount();
  const { role }    = useRole();

  // ── Read config: always use the chain encoded in the URL, NOT the wallet chain ──
  // This lets /p/v5-testnet/3 load correctly even if the wallet is on mainnet.
  const readChain = programNetwork ?? globalConfig.name;
  const readCfg: NetworkConfig = NETWORK_CONFIGS[readChain];
  // Stable viem client for the read chain (memoised by chain key)
  const readClient = useMemo(
    () => createPublicClient({ transport: http(readCfg.rpcUrl) }),
    [readCfg.rpcUrl]
  );

  const explorer = readCfg.explorerBase;

  // ── Data (always from readCfg, never from wallet chain) ──────────────────────
  const { prog, loading, refetch: refetchProg } = useV5ProgramForChain(programId, readCfg, readClient);

  // Share URL — includes slug once program name loads (replaceState updates URL in useEffect below)
  const shareUrl = buildProgramUrl(readChain, programId, 'v5', prog?.name ?? '');
  const [subCount, setSubCount] = useState(0);
  const { subs, refetch: refetchSubs } = useV5SubmissionsForChain(programId, subCount, readCfg, readClient);
  const [judges, setJudges] = useState<string[]>([]);
  const [isJudge, setIsJudge] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [votesLeft, setVotesLeft] = useState(0);

  // ── TX state ─────────────────────────────────────────────────────────────────
  const {
    busy, txErr, txHash, clearErr,
    submit, vote, finalize, cancel, updateProgram,
  } = useV5Write();
  const [txOk, setTxOk] = useState('');
  const [subMeta, setSubMeta]     = useState('');
  const [subContract, setSubContract] = useState('');
  const [showEdit, setShowEdit]   = useState(false);

  // Team submission state
  const [isTeam, setIsTeam]         = useState(false);
  const [teamName, setTeamName]     = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>(['']); // extra members (not leader)
  const [memberShares, setMemberShares] = useState<string[]>(['']); // in % (e.g. "30")
  const [leaderShare, setLeaderShare]   = useState('100'); // leader % (auto-calculated)
  const [sharesErr, setSharesErr]       = useState('');

  // Rewrite URL to canonical slug form once program name loads
  useEffect(() => {
    if (!prog?.name) return;
    const canonicalUrl = buildProgramUrl(readChain, programId, 'v5', prog.name);
    const canonicalPath = new URL(canonicalUrl, window.location.origin).pathname;
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, '', canonicalPath);
    }
  }, [prog?.name, readChain, programId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Active tab ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabId>('details');
  // Auto-switch to results once finalized
  useEffect(() => {
    if (prog?.finalized) setTab('results');
  }, [prog?.finalized]);

  // ── Load auxiliary data ───────────────────────────────────────────────────────
  const loadAux = useCallback(async () => {
    if (!readCfg.v5Address) return;
    try {
      const [cnt, jds] = await Promise.all([
        readClient.readContract({
          address: readCfg.v5Address, abi: GRANTFLOW_V5_ABI,
          functionName: 'submissionCount', args: [BigInt(programId)],
        }),
        readClient.readContract({
          address: readCfg.v5Address, abi: GRANTFLOW_V5_ABI,
          functionName: 'getJudges', args: [BigInt(programId)],
        }).catch(() => [] as `0x${string}`[]),
      ]);
      setSubCount(Number(cnt));
      setJudges(jds as string[]);

      if (account) {
        const [judgeRes, subRes, votesRes] = await Promise.all([
          readClient.readContract({
            address: readCfg.v5Address, abi: GRANTFLOW_V5_ABI,
            functionName: 'isJudge', args: [BigInt(programId), account],
          }).catch(() => false),
          readClient.readContract({
            address: readCfg.v5Address, abi: GRANTFLOW_V5_ABI,
            functionName: 'hasSubmitted', args: [BigInt(programId), account],
          }).catch(() => false),
          readClient.readContract({
            address: readCfg.v5Address, abi: GRANTFLOW_V5_ABI,
            functionName: 'votesRemaining', args: [BigInt(programId), account],
          }).catch(() => 0n),
        ]);
        setIsJudge(judgeRes);
        setHasSubmitted(subRes);
        setVotesLeft(Number(votesRes));
      }
    } catch { /* ignore */ }
  }, [readCfg, readClient, programId, account]);

  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await loadAux(); };
    void run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAux]);

  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    if (subCount > 0) void refetchSubs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subCount]);

  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);
  const [nowLive, setNowLive] = useState(nowSec);
  useEffect(() => {
    const iv = setInterval(() => setNowLive(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading…
      </div>
    );
  }

  if (!prog) {
    return (
      <div className="py-20 text-center">
        <p style={{ color: 'var(--text-muted)' }}>Program not found.</p>
        <button onClick={onBack} className="mt-4 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
          ← Back
        </button>
      </div>
    );
  }

  const phase = computePhase(
    BigInt(prog.submissionDeadline), BigInt(prog.judgingDeadline), prog.finalized, prog.cancelled
  );
  const phaseLabel = PHASE_LABELS[phase];
  const phaseColor = PHASE_COLORS[phase];

  const isSponsor  = !!account && account.toLowerCase() === prog.sponsor.toLowerCase();
  const canEdit    = isSponsor && subCount === 0 && !prog.cancelled && !prog.finalized &&
                     nowLive < prog.submissionDeadline;
  const canSubmit  = !hasSubmitted && !isJudge && !isSponsor && phase === Phase.Submission;
  const canVote    = isJudge && phase === Phase.Judging && votesLeft > 0;
  const canFinalize = (isSponsor || role === 'judge') && phase === Phase.Judging &&
                      nowLive >= prog.judgingDeadline;
  const canCancel  = isSponsor && !prog.finalized && !prog.cancelled && subCount === 0;

  const pool = totalPool(prog.prizes);
  const fmt  = (n: bigint) => formatUnits(n, readCfg.usdcDecimals);

  const handleSubmit = async () => {
    if (!subMeta || !account) return;
    setSharesErr('');
    clearErr(); setTxOk('');

    let payees: `0x${string}`[] = [account];
    let sharesBps: bigint[]     = [10_000n];

    if (isTeam) {
      // Build meta with teamName embedded
      const validMembers = teamMembers.filter(m => /^0x[0-9a-fA-F]{40}$/.test(m));
      const memberBpsArr = validMembers.map((_, i) => {
        const pct = parseFloat(memberShares[i] ?? '0');
        return Math.round(pct * 100); // % to bps
      });
      const memberBpsTotal = memberBpsArr.reduce((a, b) => a + b, 0);
      const leaderBps = 10_000 - memberBpsTotal;
      if (leaderBps <= 0) { setSharesErr('Member shares must leave at least 1 bps for leader.'); return; }
      if (memberBpsTotal > 10_000) { setSharesErr('Total shares exceed 100%.'); return; }
      if (validMembers.length === 0) { setSharesErr('Add at least one team member.'); return; }

      payees     = [account, ...validMembers.map(m => m as `0x${string}`)];
      sharesBps  = [BigInt(leaderBps), ...memberBpsArr.map(b => BigInt(b))];
    }

    // Embed teamName in metadataURI JSON if set
    let metaStr = subMeta;
    if (isTeam && teamName) {
      try {
        const j = JSON.parse(subMeta) as Record<string, unknown>;
        j['teamName'] = teamName;
        metaStr = JSON.stringify(j);
      } catch {
        metaStr = JSON.stringify({ url: subMeta, teamName });
      }
    }

    const hash = await submit(
      programId,
      (subContract || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      metaStr,
      payees,
      sharesBps
    );
    if (hash) {
      setTxOk('Submitted!');
      setSubMeta(''); setSubContract('');
      setTeamName(''); setTeamMembers(['']); setMemberShares(['']);
      setIsTeam(false);
      await loadAux(); void refetchSubs();
    }
  };

  const handleVote = async (subId: number) => {
    clearErr(); setTxOk('');
    const hash = await vote(programId, subId);
    if (hash) { setTxOk('Vote cast!'); setVotesLeft(v => Math.max(0, v - 1)); void refetchSubs(); }
  };

  const handleFinalize = async () => {
    clearErr(); setTxOk('');
    const hash = await finalize(programId);
    if (hash) { setTxOk('Finalized! Winners paid.'); void refetchProg(); void loadAux(); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this program? USDC will be refunded to you.')) return;
    clearErr(); setTxOk('');
    const hash = await cancel(programId);
    if (hash) { setTxOk('Programme cancelled.'); void refetchProg(); }
  };

  const handleUpdate = async (args: {
    name: string; description: string;
    submissionDeadline: bigint; judgingDeadline: bigint;
  }) => {
    clearErr(); setTxOk('');
    const hash = await updateProgram({ programId, ...args });
    if (hash) { setTxOk('Program updated!'); setShowEdit(false); void refetchProg(); }
  };

  const TABS: { id: TabId; label: string; count?: number }[] = [
    ...(prog.finalized ? [{ id: 'results' as TabId, label: t('results.tab') }] : []),
    { id: 'details',     label: t('program.tabDetails')  },
    { id: 'submissions', label: `${t('program.tabSubs')} (${subCount})` },
    { id: 'judges',      label: t('program.tabJudges')   },
  ];

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 pb-10">

      {/* Back */}
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity w-fit"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={15} /> {t('program.back')}
      </button>

      {/* Header card */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sponsor logo */}
            {prog.meta.logo ? (
              <img src={prog.meta.logo} alt={prog.meta.sponsorName || 'Sponsor'}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                onError={e => { (e.currentTarget).style.display = 'none'; }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {prog.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text)' }}>{prog.name}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {prog.meta.sponsorName ? (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{prog.meta.sponsorName}</span>
                ) : (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {shortAddr(prog.sponsor)}
                  </span>
                )}
                {prog.meta.website && (
                  <a href={prog.meta.website} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: 'var(--accent)' }}>
                    <Globe size={11} /> {t('sponsor.websiteLabel')}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Phase badge */}
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: phaseColor + '22', color: phaseColor }}>
              {phaseLabel}
            </span>
            {/* V5 badge */}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              V5
            </span>
            {/* Edit button */}
            {canEdit && (
              <button onClick={() => setShowEdit(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                <Edit2 size={11} /> {t('sponsor.editBtn')}
              </button>
            )}
            {/* Explorer link */}
            <a href={`${explorer}/address/${readCfg.v5Address}`} target="_blank" rel="noreferrer"
              className="p-1.5 rounded-lg border hover:opacity-70 transition-opacity"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <StatCell label={t('program.pool')} value={`${fmt(pool)} USDC`} />
          <StatCell label={t('program.prizes')} value={`${prog.prizes.length} ${t('program.ranks')}`} />
          <StatCell label={t('explore.subOpen')} value={new Date(prog.submissionDeadline * 1000).toLocaleDateString()} />
          <StatCell label={t('explore.judging')} value={new Date(prog.judgingDeadline * 1000).toLocaleDateString()} />
        </div>

        {/* Countdown / phase banner */}
        {!prog.finalized && !prog.cancelled && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
            style={{ background: phaseColor + '15', border: `1px solid ${phaseColor}44` }}>
            <span style={{ color: phaseColor, fontWeight: 600 }}>{phaseLabel}</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {countdownLabel(
                phase === Phase.Submission ? BigInt(prog.submissionDeadline) : BigInt(prog.judgingDeadline)
              )}
            </span>
          </div>
        )}

        {/* Finalize banner */}
        {canFinalize && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs"
            style={{ background: '#10b98115', border: '1px solid #10b98144' }}>
            <span className="font-semibold" style={{ color: '#10b981' }}>{t('results.finalizeReady')}</span>
            <button
              onClick={() => void handleFinalize()}
              disabled={busy || disableTx}
              className="px-3 py-1.5 rounded-lg font-medium text-xs disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ background: '#10b981', color: '#fff' }}>
              {busy ? '…' : t('results.finalizeCta')}
            </button>
          </div>
        )}

        {/* ShareBox */}
        <ShareBox url={shareUrl} programName={prog.name} compact />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tabItem => (
          <button key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: tab === tabItem.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === tabItem.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-40">

        {/* Results */}
        {tab === 'results' && (
          <ResultsTab
            programId={programId}
            programName={prog.name}
            contractVersion="v5"
            onFinalize={canFinalize ? () => void handleFinalize() : undefined}
            finalizeBusy={busy}
            disableTx={disableTx}
            networkOverride={{ cfg: readCfg, client: readClient }}
          />
        )}

        {/* Details */}
        {tab === 'details' && (
          <div className="space-y-4">
            {prog.meta.desc && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                {prog.meta.desc}
              </p>
            )}
            <DetailGrid>
              <DetailRow label={t('program.type')}     value={PROGRAM_TYPE_LABELS[prog.programType as 0|1]} />
              <DetailRow label={t('program.category')} value={CATEGORY_LABELS[prog.category as 0|1|2|3]} />
              <DetailRow label={t('program.sponsor')}  value={
                <a href={`${explorer}/address/${prog.sponsor}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono hover:underline"
                  style={{ color: 'var(--accent)' }}>
                  {shortAddr(prog.sponsor)} <ExternalLink size={10} />
                </a>
              } />
              <DetailRow label="Contract" value={
                <a href={`${explorer}/address/${readCfg.v5Address}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono hover:underline"
                  style={{ color: 'var(--accent)' }}>
                  {shortAddr(readCfg.v5Address)} <ExternalLink size={10} />
                </a>
              } />
            </DetailGrid>
            {/* Prize tiers */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{t('program.prizes')}</p>
              <div className="space-y-1.5">
                {prog.prizes.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {['🥇','🥈','🥉'][i] ?? `#${i+1}`} {t('program.rank')} {i+1}
                    </span>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>
                      {fmt(p)} USDC
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submissions */}
        {tab === 'submissions' && (
          <div className="space-y-4">
            {/* Submit form */}
            {canSubmit && !busy && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('program.submitTitle')}</p>

                {/* Solo/Team toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsTeam(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={!isTeam
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <User size={11} /> {t('team.solo')}
                  </button>
                  <button
                    onClick={() => setIsTeam(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={isTeam
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <Users size={11} /> {t('team.team')}
                  </button>
                </div>

                {/* Project link / metadata */}
                <input
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder={t('program.submitMetaPh')}
                  value={subMeta} onChange={e => setSubMeta(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none font-mono"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder={`${t('program.submitContractPh')} (${t('common.optional')})`}
                  value={subContract} onChange={e => setSubContract(e.target.value)}
                />

                {/* Team fields */}
                {isTeam && (
                  <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <input
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      placeholder={t('team.namePh')}
                      value={teamName} onChange={e => setTeamName(e.target.value)}
                    />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('team.leaderNote')} {account ? `${account.slice(0,6)}…${account.slice(-4)}` : ''}
                    </p>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('team.membersHeading')}</p>
                    {teamMembers.map((m, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none font-mono"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                          placeholder={t('team.memberAddrPh')}
                          value={m}
                          onChange={e => {
                            const v = [...teamMembers]; v[i] = e.target.value.trim();
                            setTeamMembers(v);
                          }}
                        />
                        <input
                          type="number" min="1" max="99"
                          className="w-20 px-3 py-2 rounded-xl text-sm outline-none text-right"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                          placeholder="%"
                          value={memberShares[i] ?? ''}
                          onChange={e => {
                            const v = [...memberShares]; v[i] = e.target.value;
                            const total = v.reduce((a, x) => a + (parseFloat(x) || 0), 0);
                            setLeaderShare(Math.max(0, 100 - total).toFixed(2));
                            setMemberShares(v);
                          }}
                        />
                        {teamMembers.length > 1 && (
                          <button onClick={() => {
                            setTeamMembers(prev => prev.filter((_, j) => j !== i));
                            setMemberShares(prev => prev.filter((_, j) => j !== i));
                          }} style={{ color: 'var(--text-muted)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                    {teamMembers.length < 4 && (
                      <button
                        onClick={() => { setTeamMembers(p => [...p, '']); setMemberShares(p => [...p, '']); }}
                        className="flex items-center gap-1 text-xs hover:opacity-70"
                        style={{ color: 'var(--accent)' }}>
                        <PlusCircle size={12} /> {t('team.addMember')}
                      </button>
                    )}
                    <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{t('team.leaderShareLabel')}</span>
                      <span className="font-semibold" style={{ color: parseFloat(leaderShare) > 0 ? 'var(--text)' : '#ef4444' }}>
                        {leaderShare}%
                      </span>
                    </div>
                    {sharesErr && <p className="text-xs text-red-400">{sharesErr}</p>}
                  </div>
                )}

                <button
                  onClick={() => void handleSubmit()}
                  disabled={!subMeta || busy || disableTx}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <Send size={13} /> {t('program.submitBtn')}
                </button>
              </div>
            )}
            {hasSubmitted && (
              <p className="text-sm px-1" style={{ color: 'var(--text-muted)' }}>
                {t('program.alreadySubmitted')}
              </p>
            )}
            {/* Submission list */}
            {subs.length === 0 && !canSubmit && (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                {t('program.noSubs')}
              </p>
            )}
            {subs.map(sub => (
              <div key={sub.id} className="rounded-2xl p-4 space-y-2"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {!sub.isSolo && <Users size={12} style={{ color: 'var(--accent)' }} />}
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      #{sub.id} · {sub.isSolo ? shortAddr(sub.submitter) : (sub.teamName || t('team.unnamed'))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {sub.votes.toString()} {t('program.votes')}
                    </span>
                    {canVote && (
                      <button
                        onClick={() => void handleVote(sub.id)}
                        disabled={busy || disableTx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        Vote
                      </button>
                    )}
                  </div>
                </div>
                {sub.metadataURI && (
                  <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{sub.metadataURI}</p>
                )}
                {/* Team members */}
                {!sub.isSolo && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sub.members.map((m, mi) => (
                      <span key={mi} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <span className="font-mono">{shortAddr(m.address)}</span>
                        <span>{m.sharePct}%</span>
                      </span>
                    ))}
                  </div>
                )}
                {sub.prizeAwarded > 0n && (
                  <div className="pt-1">
                    <p className="text-xs font-medium" style={{ color: '#10b981' }}>
                      ✓ {fmt(sub.prizeAwarded)} USDC {t('results.payoutTx')}
                    </p>
                    {!sub.isSolo && (
                      <div className="mt-1 space-y-0.5">
                        {sub.members.map((m, mi) => (
                          <div key={mi} className="flex justify-between text-xs"
                            style={{ color: 'var(--text-muted)' }}>
                            <span className="font-mono">{shortAddr(m.address)}</span>
                            <span>{m.amountFmt} USDC ({m.sharePct}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Judges */}
        {tab === 'judges' && (
          <div className="space-y-2">
            {judges.length === 0 && (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                {t('program.noJudges')}
              </p>
            )}
            {judges.map(j => (
              <div key={j} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="font-mono" style={{ color: 'var(--text)' }}>{j}</span>
                <a href={`${explorer}/address/${j}`} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--text-muted)' }}>
                  <ExternalLink size={11} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={() => void handleCancel()}
          disabled={busy || disableTx}
          className="text-xs hover:underline disabled:opacity-50 w-fit"
          style={{ color: 'var(--text-muted)' }}>
          {t('program.cancelBtn')}
        </button>
      )}

      {/* TX feedback */}
      {(txErr || txOk) && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${txOk ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {txOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span>{txOk || txErr}</span>
          {txHash && (
            <a href={`${explorer}/tx/${txHash}`} target="_blank" rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs hover:underline"
              style={{ color: 'var(--accent)' }}>
              Tx <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditProgramModal
          prog={prog}
          busy={busy}
          onClose={() => setShowEdit(false)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-xl"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}
