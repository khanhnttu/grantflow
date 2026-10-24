/**
 * DeployPage — admin-only, route /deploy (not in main nav).
 *
 * Lets the connected wallet deploy GrantFlow to Arc Mainnet directly from the
 * browser using wagmi's deployContract hook. The route is intentionally hidden
 * from the nav; navigate to it by typing /deploy in the URL bar or by pressing
 * the on-screen button in the app header when on the deploy page.
 *
 * MAINNET WARNING: this sends a real transaction with real USDC. The page shows
 * a mandatory confirmation step before any transaction is submitted.
 */

import { useState } from 'react';
import {
  useAccount,
  useSwitchChain,
  useDeployContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { encodeDeployData, isAddress } from 'viem';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Copy, ExternalLink, Loader2, Shield, Zap } from 'lucide-react';
import { GRANTFLOW_DEPLOY_ABI } from '@/lib/grantflowDeploy';
import { GRANTFLOW_BYTECODE } from '@/lib/grantflowBytecode';
import { GRANTFLOW_V4_BYTECODE } from '@/lib/grantflowV4Bytecode';
import { GRANTFLOW_V4_ABI } from '@/lib/grantflowV4';
import { arcMainnet } from '@/config';
import { requireChain } from '@/onchain-facts';
import { cn } from '@/lib/utils';

// Arc mainnet facts — read from registry, never hardcoded
const ARC_MAINNET = requireChain(5042);
const ARC_MAINNET_USDC = ARC_MAINNET.usdc!.address as `0x${string}`;
const ARC_MAINNET_EXPLORER = ARC_MAINNET.explorerBase;

const DEFAULT_FEE_BPS = 100; // 1%

type Step = 'form' | 'confirm' | 'deploying' | 'done' | 'error';
type ContractVersion = 'v3' | 'v4';

interface DeployPageProps {
  onBack?: () => void;
}

export function DeployPage({ onBack }: DeployPageProps) {
  const { address: connectedAddress, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [version, setVersion] = useState<ContractVersion>('v4');
  const [step, setStep] = useState<Step>('form');
  const [feeRecipientOverride, setFeeRecipientOverride] = useState<string>('');
  const [feeBpsInput, setFeeBpsInput] = useState<string>(String(DEFAULT_FEE_BPS));
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<'addr' | 'tx' | null>(null);

  // Default feeRecipient to connected wallet; allow override via input
  const feeRecipient = feeRecipientOverride || connectedAddress || '';

  const isOnMainnet = chainId === arcMainnet.id;

  const feeBps = parseInt(feeBpsInput, 10);
  const feeBpsValid = !isNaN(feeBps) && feeBps >= 0 && feeBps <= 500;
  const feeRecipientValid = isAddress(feeRecipient);
  const formValid = feeRecipientValid && feeBpsValid && confirmed;

  const { deployContract, isPending: isDeploying, data: deployTxHash } = useDeployContract();

  const { data: receipt, isLoading: isWaiting } = useWaitForTransactionReceipt({
    hash: deployTxHash,
    chainId: arcMainnet.id,
    query: { enabled: !!deployTxHash },
  });

  // Derive deployed address and success state from receipt directly (no setState in effect)
  const deployedAddress = receipt?.contractAddress ?? '';
  const isDone = step === 'deploying' && !!deployedAddress;
  // Promote step to 'done' once receipt arrives — derive via render, not effect
  const effectiveStep: Step = isDone ? 'done' : step;

  const activeAbi = version === 'v4' ? GRANTFLOW_V4_ABI : GRANTFLOW_DEPLOY_ABI;
  const activeBytecode = version === 'v4' ? GRANTFLOW_V4_BYTECODE : GRANTFLOW_BYTECODE;

  const handleDeploy = () => {
    if (!formValid) return;
    setErrorMsg('');

    // Pre-flight: encode deploy data before opening the wallet
    try {
      encodeDeployData({
        abi: activeAbi,
        bytecode: activeBytecode,
        args: [ARC_MAINNET_USDC, feeRecipient, BigInt(feeBps)],
      });
    } catch (err) {
      setErrorMsg(
        'Pre-flight encoding failed: ' +
          (err instanceof Error ? err.message : JSON.stringify(err)),
      );
      setStep('error');
      return;
    }

    setStep('deploying');
    deployContract(
      {
        abi: activeAbi,
        bytecode: activeBytecode,
        args: [ARC_MAINNET_USDC, feeRecipient, BigInt(feeBps)],
      },
      {
        onError: (err) => {
          setErrorMsg(err.message);
          setStep('error');
        },
      },
    );
  };

  const copyToClipboard = (text: string, kind: 'addr' | 'tx') => {
    navigator.clipboard.writeText(text).catch(() => null);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Layout shell ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: 'var(--ink-2)' }}
      >
        <ArrowLeft className="size-4" />
        Back to app
      </button>

      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="size-5" style={{ color: 'var(--accent)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
            Deploy GrantFlow — Arc Mainnet
          </h1>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>
          Admin tool. Hidden from the main nav. Deploys the compiled GrantFlow contract
          from your browser wallet to Arc Mainnet.
        </p>
        {/* Version switcher */}
        <div className="flex gap-2">
          {(['v4', 'v3'] as ContractVersion[]).map(v => (
            <button key={v} onClick={() => { setVersion(v); setStep('form'); setConfirmed(false); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={version === v
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink-2)' }
              }>
              {v === 'v4' ? 'GrantFlowV4 (ranked prizes)' : 'GrantFlow v3 (legacy)'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mainnet warning banner (always visible) ───────────────────────── */}
      <div
        className="rounded-2xl border p-4 flex gap-3"
        style={{
          background: 'rgba(220,38,38,0.06)',
          borderColor: 'rgba(220,38,38,0.25)',
        }}
      >
        <AlertTriangle className="size-5 mt-0.5 flex-shrink-0 text-red-600" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-red-700">Real USDC. Use small amounts.</p>
          <p style={{ color: 'var(--ink-2)' }}>
            This deploys to Arc <strong>Mainnet</strong>. Gas is paid in real USDC from your
            connected wallet. Once submitted, the transaction is <strong>irreversible</strong>.
            Verify all constructor arguments carefully before signing.
          </p>
        </div>
      </div>

      {/* ── Chain switch prompt ───────────────────────────────────────────── */}
      {!isOnMainnet && connectedAddress && (
        <div
          className="rounded-2xl border p-4 flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}
        >
          <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Your wallet is on a different network. Switch to Arc Mainnet to deploy.
          </div>
          <button
            onClick={() => switchChain({ chainId: arcMainnet.id })}
            disabled={isSwitching}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60 flex-shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            {isSwitching && <Loader2 className="size-3.5 animate-spin" />}
            Switch to Arc Mainnet
          </button>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      {(effectiveStep === 'form' || effectiveStep === 'confirm') && (
        <div
          className="rounded-2xl border p-5 space-y-5"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
            Constructor arguments
          </h2>

          {/* Fixed arg: USDC address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
              USDC address (Arc Mainnet — fixed)
            </label>
            <div
              className="rounded-xl px-3 py-2.5 text-sm font-mono break-all"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
            >
              {ARC_MAINNET_USDC}
            </div>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              From Arc Studio onchain facts registry. Do not change.
            </p>
          </div>

          {/* feeRecipient */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
              Fee recipient
            </label>
            <input
              type="text"
              value={feeRecipient}
              onChange={(e) => setFeeRecipientOverride(e.target.value.trim())}
              placeholder="0x…"
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm font-mono outline-none transition-all',
                feeRecipient && !feeRecipientValid
                  ? 'border-red-400 bg-red-50'
                  : 'focus:border-[var(--accent)]',
              )}
              style={
                feeRecipient && !feeRecipientValid
                  ? {}
                  : { borderColor: 'var(--border)', background: 'var(--surface-muted)' }
              }
            />
            {feeRecipient && !feeRecipientValid && (
              <p className="text-xs text-red-600">Not a valid Ethereum address.</p>
            )}
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Pre-filled with your connected wallet. Platform fees are sent here.
            </p>
          </div>

          {/* feeBps */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
              Fee (basis points) — default 100 = 1%, max 500
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={500}
                value={feeBpsInput}
                onChange={(e) => setFeeBpsInput(e.target.value)}
                className={cn(
                  'w-32 rounded-xl border px-3 py-2.5 text-sm outline-none transition-all',
                  feeBpsInput && !feeBpsValid
                    ? 'border-red-400 bg-red-50'
                    : 'focus:border-[var(--accent)]',
                )}
                style={
                  feeBpsInput && !feeBpsValid
                    ? {}
                    : { borderColor: 'var(--border)', background: 'var(--surface-muted)' }
                }
              />
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                = {feeBpsValid ? (feeBps / 100).toFixed(2) : '—'}%
              </span>
            </div>
            {feeBpsInput && !feeBpsValid && (
              <p className="text-xs text-red-600">Must be 0–500.</p>
            )}
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--accent)] flex-shrink-0"
            />
            <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
              I have reviewed all arguments above. I understand this deploys to Arc Mainnet with
              real USDC, is irreversible, and I am solely responsible for the result.
            </span>
          </label>

          {/* Deploy button */}
          <button
            onClick={handleDeploy}
            disabled={!formValid || !isOnMainnet || !connectedAddress || isDeploying}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all',
              formValid && isOnMainnet && connectedAddress
                ? 'hover:opacity-90'
                : 'opacity-40 cursor-not-allowed',
            )}
            style={{ background: 'var(--accent)' }}
          >
            {isDeploying ? (
              <><Loader2 className="size-4 animate-spin" /> Waiting for signature…</>
            ) : (
              <><Zap className="size-4" /> Deploy to Arc Mainnet</>
            )}
          </button>

          {!connectedAddress && (
            <p className="text-xs text-center" style={{ color: 'var(--ink-2)' }}>
              Connect your wallet first (top-right).
            </p>
          )}
        </div>
      )}

      {/* ── Deploying / waiting for receipt ──────────────────────────────── */}
      {effectiveStep === 'deploying' && (
        <div
          className="rounded-2xl border p-6 flex flex-col items-center gap-4 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <Loader2 className="size-10 animate-spin" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="font-semibold" style={{ color: 'var(--ink)' }}>
              {isDeploying ? 'Waiting for wallet signature…' : isWaiting ? 'Transaction submitted — waiting for confirmation…' : 'Processing…'}
            </p>
            {deployTxHash && (
              <a
                href={`${ARC_MAINNET_EXPLORER}/tx/${deployTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-xs inline-flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink className="size-3" />
                View tx on explorer
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Success ───────────────────────────────────────────────────────── */}
      {effectiveStep === 'done' && deployedAddress && (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ borderColor: 'rgba(26,128,71,0.3)', background: 'rgba(26,128,71,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-green-600" />
            <h2 className="font-semibold text-green-700">Deployed successfully!</h2>
          </div>

          {/* Contract address */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
              Contract address
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 rounded-xl px-3 py-2 text-sm font-mono break-all"
                style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
              >
                {deployedAddress}
              </code>
              <button
                onClick={() => copyToClipboard(deployedAddress, 'addr')}
                className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-black/5"
                title="Copy address"
              >
                {copied === 'addr' ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" style={{ color: 'var(--ink-2)' }} />}
              </button>
              <a
                href={`${ARC_MAINNET_EXPLORER}/address/${deployedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-black/5"
                title="Open in explorer"
              >
                <ExternalLink className="size-4" style={{ color: 'var(--accent)' }} />
              </a>
            </div>
          </div>

          {/* Tx hash */}
          {deployTxHash && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
                Transaction hash
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-mono break-all"
                  style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
                >
                  {deployTxHash}
                </code>
                <button
                  onClick={() => copyToClipboard(deployTxHash, 'tx')}
                  className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-black/5"
                  title="Copy tx hash"
                >
                  {copied === 'tx' ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" style={{ color: 'var(--ink-2)' }} />}
                </button>
                <a
                  href={`${ARC_MAINNET_EXPLORER}/tx/${deployTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-black/5"
                  title="Open tx in explorer"
                >
                  <ExternalLink className="size-4" style={{ color: 'var(--accent)' }} />
                </a>
              </div>
            </div>
          )}

          {/* Next steps */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'var(--surface-muted)', borderLeft: '3px solid var(--accent)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Next steps
            </p>
            <ol className="text-sm space-y-1.5 list-decimal list-inside" style={{ color: 'var(--ink-2)' }}>
              <li>
                Copy the contract address above.
              </li>
              <li>
                Add it to your <code className="text-xs bg-black/5 px-1 rounded">.env</code> file:
                <pre
                  className="mt-1 rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >{version === 'v4'
                  ? `VITE_GRANTFLOW_V4_ADDRESS_MAINNET=${deployedAddress}`
                  : `VITE_GRANTFLOW_ADDRESS_MAINNET=${deployedAddress}`
                }</pre>
              </li>
              <li>
                Set the active chain:
                <pre
                  className="mt-1 rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >{`VITE_CHAIN=mainnet`}</pre>
              </li>
              <li>
                Restart the dev server (Vite reads <code className="text-xs bg-black/5 px-1 rounded">.env</code> only at startup).
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {effectiveStep === 'error' && (
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            <h2 className="font-semibold text-red-700">Deployment failed</h2>
          </div>
          <p className="text-sm font-mono break-all" style={{ color: 'var(--ink-2)' }}>
            {errorMsg || 'Unknown error. Check your wallet and try again.'}
          </p>
          <button
            onClick={() => setStep('form')}
            className="text-sm font-medium underline"
            style={{ color: 'var(--accent)' }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
