/**
 * ResultsTab — podium + winner cards for V5 and V4 finalized programs.
 *
 * V5: finalize() pushed prizes directly, so prizeAwarded > 0 means paid.
 *     Shows PrizePaid and SponsorRefunded tx links from event logs.
 * V4: same structure but shows "Claim" state instead of push tx.
 */
import { useState, useEffect, useCallback } from 'react';
import { formatUnits, parseAbiItem, type Address } from 'viem';
import { ExternalLink, Share2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import type { StringKey } from '@/lib/i18n/index';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import type { NetworkConfig } from '@/hooks/useNetworkStore';
import type { PublicClient } from 'viem';
import { ShareBox } from '@/components/ShareBox';
import { buildProgramUrl, GRANTFLOW_V5_ABI, parseTeamName, buildTeamMembers } from '@/hooks/useGrantFlowV5';
import { GRANTFLOW_ABI } from '@/lib/grantflow';

// ── Types ──────────────────────────────────────────────────────────────────

interface WinnerEntry {
  rank:           number;
  submissionId:   number;
  submitter:      string;
  metadataURI:    string;
  votes:          bigint;
  prizeAwarded:   bigint;
  payoutTxHash:   string | null;
  // Team fields (from getSubmissionTeam)
  isSolo:         boolean;
  teamName:       string;
  payees:         string[];
  sharesBps:      bigint[];
}

interface ResultsTabProps {
  programId:    number;
  programName:  string;
  /** 'v5' = push-payout, 'v4' = pull-claim */
  contractVersion: 'v5' | 'v4';
  /** Called when user clicks Finalize (banner only) */
  onFinalize?:  () => void;
  finalizeBusy?: boolean;
  disableTx?:   boolean;
  /** Override: read from this config/client instead of the global network store.
   *  Used by ProgramDetailV5 when the URL chain differs from the wallet chain. */
  networkOverride?: { cfg: NetworkConfig; client: PublicClient };
}

// ── Podium medal colours ────────────────────────────────────────────────────

const MEDAL = ['#F5A623', '#B0B0B0', '#CD7F32'] as const; // gold, silver, bronze

function rankLabel(rank: number, t: (k: StringKey) => string): string {
  if (rank === 0) return t('results.rankGold');
  if (rank === 1) return t('results.rankSilver');
  if (rank === 2) return t('results.rankBronze');
  return `${t('results.rankN')} ${rank + 1}`;
}

// ── ResultsTab ──────────────────────────────────────────────────────────────

export function ResultsTab({
  programId, programName, contractVersion, onFinalize, finalizeBusy, disableTx,
  networkOverride,
}: ResultsTabProps) {
  const { t } = useI18n();
  const { config: storeConfig, appClient: storeClient } = useNetworkStore();
  // Use override when provided (URL chain), else global store
  const config    = networkOverride?.cfg    ?? storeConfig;
  const appClient = networkOverride?.client ?? storeClient;

  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [sponsorRefundTx, setSponsorRefundTx] = useState<string | null>(null);
  const [finalizeTxHash, setFinalizeTxHash] = useState<string | null>(null);
  const [totalPaid, setTotalPaid] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  const contractAddress = contractVersion === 'v5' ? config.v5Address : config.v4Address;
  const shareUrl = buildProgramUrl(config.name, programId, contractVersion);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const abi = contractVersion === 'v5' ? GRANTFLOW_V5_ABI : GRANTFLOW_ABI;

      // Read submission count
      const subCount = Number(await appClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'submissionCount',
        args: [BigInt(programId)],
      }));

      if (subCount === 0) { setWinners([]); setLoading(false); return; }

      // Read all submissions
      const subs = await Promise.all(
        Array.from({ length: subCount }, (_, i) =>
          appClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'getSubmission',
            args: [BigInt(programId), BigInt(i)],
          })
        )
      );

      // For V5: look up PrizePaid events to get tx hashes
      let prizeTxMap: Map<number, string> = new Map();
      let refundTx: string | null = null;
      let finalizedTxRef: string | null = null;

      if (contractVersion === 'v5' && config.v5Address) {
        try {
          // Use a bounded lookback (head − 500 000 blocks) rather than scanning from 0.
          // V5 contracts are recent; scanning from genesis on a live chain causes
          // RPC range errors and unnecessary latency.
          const headBlock = await appClient.getBlockNumber().catch(() => 500_000n);
          const fromBlock = headBlock > 500_000n ? headBlock - 500_000n : 0n;

          // Fetch PrizePaid logs for this programId using parseAbiItem (viem-typed)
          const prizePaidAbi = parseAbiItem(
            'event PrizePaid(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank)'
          );
          const prizeLogs = await appClient.getLogs({
            address: config.v5Address,
            event:   prizePaidAbi,
            // eslint-disable-next-line typescript/no-unnecessary-type-assertion
            args:    { programId: BigInt(programId) } as never,
            fromBlock,
          }).catch(() => []);

          for (const log of prizeLogs) {
            const args = (log as { args?: { submissionId?: bigint } }).args;
            const subId = Number(args?.submissionId ?? 0n);
            if (log.transactionHash) prizeTxMap.set(subId, log.transactionHash);
          }

          // Fetch SponsorRefunded logs for this programId
          const sponsorRefundedAbi = parseAbiItem(
            'event SponsorRefunded(uint256 indexed programId, address indexed sponsor, uint256 amount)'
          );
          const refundLogs = await appClient.getLogs({
            address: config.v5Address,
            event:   sponsorRefundedAbi,
            // eslint-disable-next-line typescript/no-unnecessary-type-assertion
            args:    { programId: BigInt(programId) } as never,
            fromBlock,
          }).catch(() => []);

          if (refundLogs[0]?.transactionHash) refundTx = refundLogs[0].transactionHash;

          // Fetch Finalized event to get the finalize transaction hash
          const finalizedAbi = parseAbiItem(
            'event Finalized(uint256 indexed programId, uint256 winnerCount, uint256 totalPaid)'
          );
          const finalizedLogs = await appClient.getLogs({
            address: config.v5Address,
            event:   finalizedAbi,
            // eslint-disable-next-line typescript/no-unnecessary-type-assertion
            args:    { programId: BigInt(programId) } as never,
            fromBlock,
          }).catch(() => []);
          if (finalizedLogs[0]?.transactionHash) {
            refundTx = refundTx ?? null; // keep existing
            // Store finalize tx separately via closure variable
            finalizedTxRef = finalizedLogs[0].transactionHash;
          }
        } catch { /* event lookup optional — tx links are a nice-to-have */ }
      }

      // For V5: also fetch team data for each submission
      let teamDataMap: Map<number, { payees: Address[]; sharesBps: bigint[] }> = new Map();
      if (contractVersion === 'v5' && config.v5Address) {
        try {
          const teamResults = await Promise.all(
            subs.map((_, i) =>
              appClient.readContract({
                address: config.v5Address,
                abi: GRANTFLOW_V5_ABI,
                functionName: 'getSubmissionTeam',
                args: [BigInt(programId), BigInt(i)],
              }).catch(() => [[], []] as [Address[], bigint[]])
            )
          );
          teamResults.forEach((r, i) => {
            const t2 = r as unknown as [Address[], bigint[]];
            teamDataMap.set(i, { payees: t2[0] ?? [], sharesBps: t2[1] ?? [] });
          });
        } catch { /* team data optional */ }
      }

      // Build winner entries (only subs with prizeAwarded > 0)
      const winnerList: WinnerEntry[] = [];
      let paid = 0n;

      subs.forEach((sub, i) => {
        const [submitter, , metadataURI, votes, prizeAwarded] = sub as [string, string, string, bigint, bigint, boolean];
        if (prizeAwarded > 0n) {
          const team = teamDataMap.get(i);
          const payees    = team?.payees ?? [submitter as Address];
          const sharesBps = team?.sharesBps ?? [10_000n];
          const isSolo    = payees.length === 1;
          const teamName  = parseTeamName(metadataURI);
          winnerList.push({
            rank:          winnerList.length,
            submissionId:  i,
            submitter,
            metadataURI,
            votes,
            prizeAwarded,
            payoutTxHash:  prizeTxMap.get(i) ?? null,
            isSolo,
            teamName,
            payees:    payees as string[], // eslint-disable-line typescript/no-unnecessary-type-assertion
            sharesBps,
          });
          paid += prizeAwarded;
        }
      });

      // Sort by prizeAwarded DESC (matches the rank assignment in finalize)
      winnerList.sort((a, b) => (b.prizeAwarded > a.prizeAwarded ? 1 : b.prizeAwarded < a.prizeAwarded ? -1 : a.rank - b.rank));
      winnerList.forEach((w, i) => { w.rank = i; });

      setWinners(winnerList);
      setTotalPaid(paid);
      setSponsorRefundTx(refundTx);
      setFinalizeTxHash(finalizedTxRef);
    } finally {
      setLoading(false);
    }
  }, [appClient, contractAddress, contractVersion, programId, config]);

  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await load();
    };
    void run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const fmt = (n: bigint) => formatUnits(n, config.usdcDecimals);
  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const explorerTx = (hash: string) => `${config.explorerBase}/tx/${hash}`;

  if (loading) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading results…
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <div className="text-2xl">🏁</div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('results.noVotes')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">

      {/* Podium — top 3 */}
      {winners.length > 0 && (
        <div className="flex items-end justify-center gap-3 py-6">
          {/* Silver (rank 1) on left */}
          {winners[1] && (
            <PodiumBlock
              entry={winners[1]}
              height={72}
              color={MEDAL[1]}
              label={rankLabel(1, t)}
              fmt={fmt}
              shortAddr={shortAddr}
            />
          )}
          {/* Gold (rank 0) in centre — tallest */}
          <PodiumBlock
            entry={winners[0]}
            height={96}
            color={MEDAL[0]}
            label={rankLabel(0, t)}
            fmt={fmt}
            shortAddr={shortAddr}
          />
          {/* Bronze (rank 2) on right */}
          {winners[2] && (
            <PodiumBlock
              entry={winners[2]}
              height={56}
              color={MEDAL[2]}
              label={rankLabel(2, t)}
              fmt={fmt}
              shortAddr={shortAddr}
            />
          )}
        </div>
      )}

      {/* Winner cards */}
      <div className="space-y-3">
        {winners.map(w => (
          <WinnerCard
            key={w.submissionId}
            entry={w}
            fmt={fmt}
            shortAddr={shortAddr}
            explorerTx={explorerTx}
            explorerBase={config.explorerBase}
            contractVersion={contractVersion}
            rankLabel={rankLabel(w.rank, t)}
            t={t}
            decimals={config.usdcDecimals}
          />
        ))}
      </div>

      {/* Summary row */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--bg-alt)' }}>
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{t('results.totalPaid')}</span>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            {fmt(totalPaid)} USDC
          </span>
        </div>
        {finalizeTxHash && (
          <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{t('results.finalizeTx')}</span>
            <a href={explorerTx(finalizeTxHash)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--accent)' }}>
              {finalizeTxHash.slice(0, 10)}… <ExternalLink size={10} />
            </a>
          </div>
        )}
        {sponsorRefundTx && (
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{t('results.refundTx')}</span>
            <a href={explorerTx(sponsorRefundTx)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--accent)' }}>
              {sponsorRefundTx.slice(0, 10)}… <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>

      {/* Share results */}
      <div>
        <button
          onClick={() => setShowShare(v => !v)}
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          <Share2 size={13} /> {t('results.shareBtn')}
        </button>
        {showShare && (
          <div className="mt-3">
            <ShareBox url={shareUrl} programName={programName} />
          </div>
        )}
      </div>

      {/* Finalize banner (when not yet finalized — parent passes onFinalize) */}
      {onFinalize && (
        <FinalizeReadyBanner onFinalize={onFinalize} busy={finalizeBusy} disableTx={disableTx} t={t} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PodiumBlock({ entry, height, color, label, fmt, shortAddr }: {
  entry: WinnerEntry; height: number; color: string;
  label: string;
  fmt: (n: bigint) => string;
  shortAddr: (a: string) => string;
}) {
  const displayName = !entry.isSolo && entry.teamName
    ? entry.teamName
    : shortAddr(entry.submitter);
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div className="text-xs font-semibold text-center" style={{ color }}>
        {label}
      </div>
      <div className="text-[11px] text-center truncate w-full" style={{ color: 'var(--text-muted)' }}>
        {displayName}
      </div>
      <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>
        {fmt(entry.prizeAwarded)} USDC
      </div>
      <div
        className="w-full rounded-t-lg"
        style={{ height, background: color, opacity: 0.25 }}
      />
    </div>
  );
}

function WinnerCard({ entry, fmt, shortAddr, explorerTx, explorerBase, contractVersion, rankLabel: rl, t, decimals }: {
  entry: WinnerEntry;
  fmt: (n: bigint) => string;
  shortAddr: (a: string) => string;
  explorerTx: (hash: string) => string;
  explorerBase: string;
  contractVersion: 'v5' | 'v4';
  rankLabel: string;
  t: (k: StringKey) => string;
  decimals: number;
}) {
  const medal  = MEDAL[entry.rank] ?? 'var(--accent)';
  const isLink = entry.metadataURI.startsWith('http');
  const members = !entry.isSolo
    ? buildTeamMembers(
        entry.payees as `0x${string}`[],
        entry.sharesBps,
        entry.prizeAwarded,
        decimals
      )
    : null;

  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: medal + '22', color: medal }}>
            {rl}
          </span>
          {!entry.isSolo && entry.teamName && (
            <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              {entry.teamName}
            </span>
          )}
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          {fmt(entry.prizeAwarded)} USDC
        </span>
      </div>

      {entry.isSolo ? (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <a href={`${explorerBase}/address/${entry.submitter}`} target="_blank" rel="noreferrer"
            className="text-xs font-mono hover:underline" style={{ color: 'var(--text-muted)' }}>
            {shortAddr(entry.submitter)}
          </a>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {Number(entry.votes)} {t('results.votes')}
          </span>
        </div>
      ) : (
        /* Team members */
        <div className="space-y-1">
          {members?.map((m, mi) => (
            <div key={mi} className="flex items-center justify-between text-xs">
              <a href={`${explorerBase}/address/${m.address}`} target="_blank" rel="noreferrer"
                className="font-mono hover:underline" style={{ color: 'var(--text-muted)' }}>
                {shortAddr(m.address)}
                {mi === 0 && <span className="ml-1 text-[10px] opacity-60">{t('team.leader')}</span>}
              </a>
              <span style={{ color: 'var(--text)' }}>{m.amountFmt} USDC ({m.sharePct}%)</span>
            </div>
          ))}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Number(entry.votes)} {t('results.votes')}</span>
        </div>
      )}

      {/* Project link */}
      {isLink && (
        <a href={entry.metadataURI} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: 'var(--accent)' }}>
          <ExternalLink size={11} /> {t('results.projectLink')}
        </a>
      )}

      {/* Payout tx (V5 push-paid) */}
      {contractVersion === 'v5' && entry.payoutTxHash && (
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{t('results.payoutTx')}:</span>
          <a href={explorerTx(entry.payoutTxHash)} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-0.5 hover:underline"
            style={{ color: 'var(--accent)' }}>
            {entry.payoutTxHash.slice(0, 10)}… <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}

function FinalizeReadyBanner({ onFinalize, busy, disableTx, t }: {
  onFinalize: () => void;
  busy?: boolean;
  disableTx?: boolean;
  t: (k: StringKey) => string;
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      style={{ background: '#FFF7D4', border: '1.5px solid #F5A623' }}>
      <p className="text-sm font-semibold" style={{ color: '#92651A' }}>
        🏁 {t('results.readyBanner')}
      </p>
      <button
        onClick={onFinalize}
        disabled={busy || disableTx}
        className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-opacity disabled:opacity-50"
        style={{ background: '#F5A623', color: '#fff' }}>
        {busy ? '…' : t('results.finalizeBtn')}
      </button>
    </div>
  );
}
