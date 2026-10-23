import { useState } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { Clock, Send, RefreshCw, Loader2, Gift, Tag } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { TxButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { GRANTFLOW_ABI, GRANTFLOW_ADDRESS } from '@/lib/grantflow';
import { ACTIVE_CHAIN_ID, CHAIN_LABEL, txUrl } from '@/lib/chainConfig';
import { formatUSDC, formatAddress, parseOnchainError, deadlineLabel } from '@/lib/utils';
import { useAllPrograms, useProgramCount, usePendingClaims, useAllProgramMetas } from '@/hooks/useGrantFlow';
import { mapPrograms, mapProgramMetas, type ProgramTuple, type ProgramMetaTuple, PROGRAM_TYPE, CATEGORY_LABELS, PROGRAM_TYPE_LABELS } from '@/lib/contractHelpers';

const MODULE_NOW = BigInt(Math.floor(Date.now() / 1000));

export function BuilderPage() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const wrongChain = chainId !== ACTIVE_CHAIN_ID;

  const { data: programCount, refetch: refetchCount } = useProgramCount();
  const { data: allPrograms, refetch: refetchPrograms } = useAllPrograms(programCount);
  const { data: allMetas, refetch: refetchMetas } = useAllProgramMetas(programCount);
  const { data: pendingClaim, refetch: refetchClaim } = usePendingClaims(address);

  const [selectedProgram, setSelectedProgram] = useState<bigint | null>(null);
  const [projectContract, setProjectContract] = useState('');
  const [metadataURI, setMetadataURI] = useState('');

  const { writeContract: submit, data: submitHash, isPending: submitPending } = useWriteContract();
  const { isLoading: submitConfirming, isSuccess: submitSuccess } = useWaitForTransactionReceipt({ hash: submitHash });

  const { writeContract: claimTx, data: claimHash, isPending: claimPending } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  const allProgramsList = mapPrograms(
    allPrograms?.map((r) => r as { status: 'success'; result: ProgramTuple } | { status: 'failure'; error: Error })
  );
  const allMetasList = mapProgramMetas(
    allMetas?.map((r) => r as { status: 'success'; result: ProgramMetaTuple } | { status: 'failure'; error: Error })
  );
  const openPrograms = allProgramsList.filter((p) => p.data[3] > MODULE_NOW && p.data[7] < p.data[2]);

  const selectedProgramData = selectedProgram !== null
    ? openPrograms.find((p) => p.id === selectedProgram)
    : null;
  const selectedMeta = selectedProgram !== null
    ? allMetasList.find((m) => m.id === selectedProgram)?.meta
    : null;
  const isOpenBounty = selectedMeta ? selectedMeta[0] === PROGRAM_TYPE.OPEN_BOUNTY : false;

  const handleSubmit = () => {
    if (wrongChain) { switchChain({ chainId: ACTIVE_CHAIN_ID }); return; }
    if (selectedProgram === null || !metadataURI) {
      toast.error('Select a program and fill in all fields.'); return;
    }
    if (!isOpenBounty && !projectContract) {
      toast.error('This program requires a deployed contract address.'); return;
    }
    const contractArg = isOpenBounty
      ? '0x0000000000000000000000000000000000000000' as `0x${string}`
      : projectContract as `0x${string}`;

    submit(
      { address: GRANTFLOW_ADDRESS, abi: GRANTFLOW_ABI, functionName: 'submit', args: [selectedProgram, contractArg, metadataURI] },
      {
        onSuccess: () => {
          toast.success('Submission sent!');
          setProjectContract(''); setMetadataURI('');
          void refetchPrograms(); void refetchMetas(); void refetchCount();
        },
        onError: (e) => toast.error(parseOnchainError(e)),
      },
    );
  };

  const handleClaim = () => {
    if (wrongChain) { switchChain({ chainId: ACTIVE_CHAIN_ID }); return; }
    claimTx(
      { address: GRANTFLOW_ADDRESS, abi: GRANTFLOW_ABI, functionName: 'claim', args: [] },
      {
        onSuccess: () => { toast.success('USDC claimed!'); void refetchClaim(); },
        onError: (e) => toast.error(parseOnchainError(e)),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Builder</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Browse open programs and submit your work.
        </p>
      </div>

      {/* Pending claim */}
      {pendingClaim !== undefined && pendingClaim > 0n && (
        <Card>
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-2xl flex-shrink-0"
              style={{ background: 'rgba(26,128,71,0.10)' }}
            >
              <Gift className="size-5" style={{ color: 'var(--success)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Pending prize</p>
              <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--success)' }}>
                {formatUSDC(pendingClaim)} <span className="text-sm font-medium">USDC</span>
              </p>
            </div>
            {claimSuccess && claimHash ? (
              <a
                href={txUrl(claimHash)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold flex-shrink-0"
                style={{ color: 'var(--success)' }}
              >
                Claimed ✓
              </a>
            ) : (
              <button
                disabled={!isConnected || claimPending || claimConfirming}
                onClick={handleClaim}
                className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2 flex-shrink-0"
                style={{ background: 'var(--success)' }}
              >
                {claimPending || claimConfirming ? <Loader2 className="size-4 animate-spin" /> : null}
                Claim USDC
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Open Programs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Open Programs
          </h2>
          <button
            onClick={() => { void refetchCount(); void refetchPrograms(); void refetchMetas(); }}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: 'var(--subtle)' }}
            aria-label="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>

        {openPrograms.length === 0 && (
          <Card className="text-center py-10">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No open programs right now.</p>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {openPrograms.map(({ id, data }) => {
            const [_name, _prize, _slots, _deadline, _sponsor, , , _slotsUsed] = data;
            const meta = allMetasList.find((m) => m.id === id)?.meta;
            const isSelected = selectedProgram === id;
            const pType = meta ? (meta[0] as 0 | 1) : 0;
            const cat = meta ? (meta[1] as 0 | 1 | 2 | 3) : 0;

            return (
              <button
                key={id.toString()}
                onClick={() => { setSelectedProgram(isSelected ? null : id); setProjectContract(''); setMetadataURI(''); }}
                className="text-left rounded-3xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: isSelected ? 'var(--accent)' : 'var(--surface)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: isSelected ? '0 4px 16px rgba(18,45,69,0.18)' : '0 1px 3px rgba(18,45,69,0.06)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="display text-base font-bold truncate" style={{ color: isSelected ? 'white' : 'var(--ink)' }}>
                      {_name}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : 'var(--muted)' }}>
                      by {formatAddress(_sponsor)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="display text-xl font-bold tabular-nums" style={{ color: isSelected ? 'white' : 'var(--success)' }}>
                      {formatUSDC(_prize)}
                    </p>
                    <p className="text-xs" style={{ color: isSelected ? 'rgba(255,255,255,0.55)' : 'var(--muted)' }}>USDC prize</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Badge variant={isSelected ? 'default' : 'success'}>
                    {(_slots - _slotsUsed).toString()} slots left
                  </Badge>
                  {meta && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(18,45,69,0.07)',
                        color: isSelected ? 'white' : 'var(--ink-2)',
                      }}
                    >
                      <Tag className="size-2.5" />
                      {CATEGORY_LABELS[cat]}
                    </span>
                  )}
                  {meta && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(18,45,69,0.07)',
                        color: isSelected ? 'white' : 'var(--ink-2)',
                      }}
                    >
                      {PROGRAM_TYPE_LABELS[pType]}
                    </span>
                  )}
                  <div
                    className="flex items-center gap-1 text-xs"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : 'var(--muted)' }}
                  >
                    <Clock className="size-3" />
                    {deadlineLabel(_deadline)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit form */}
      {selectedProgram !== null && selectedProgramData && (
        <Card>
          <h2 className="display text-lg font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
            Submit to: {selectedProgramData.data[0]}
          </h2>

          {/* Type badge */}
          {selectedMeta && (
            <div className="mb-4 flex gap-2 flex-wrap">
              <Badge variant="default">{PROGRAM_TYPE_LABELS[selectedMeta[0] as 0|1]}</Badge>
              <Badge variant="default">{CATEGORY_LABELS[selectedMeta[1] as 0|1|2|3]}</Badge>
              {selectedMeta[2] && (
                <p className="text-sm w-full mt-1" style={{ color: 'var(--muted)' }}>{selectedMeta[2]}</p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {/* Conditional field: only show contract input for ONCHAIN_BUILD */}
            {!isOpenBounty ? (
              <Input
                label="Project contract address"
                value={projectContract}
                onChange={(e) => setProjectContract(e.target.value)}
                placeholder="0x..."
                hint="Must be a deployed contract (has bytecode)"
                className="mono"
              />
            ) : (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(16,97,166,0.07)', border: '1px solid rgba(16,97,166,0.12)', color: 'var(--ink-2)' }}
              >
                This is an open bounty — no contract address required. Just submit your work link below.
              </div>
            )}
            <Input
              label={isOpenBounty ? 'Work link / submission URL' : 'Metadata URI'}
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
              placeholder={isOpenBounty ? 'https://github.com/you/project' : 'ipfs://... or https://...'}
              hint={isOpenBounty ? 'Link to your work (GitHub, docs, demo)' : 'Link to your project description, demo, or docs'}
            />
            <TxButton
              isConnected={isConnected}
              wrongChain={wrongChain}
              chainLabel={CHAIN_LABEL}
              isPending={submitPending}
              isConfirming={submitConfirming}
              label="Submit"
              onClick={handleSubmit}
            />
            {submitSuccess && submitHash && (
              <a
                href={txUrl(submitHash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: 'var(--success)' }}
              >
                <Send className="size-3" /> Confirmed — view on explorer
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
