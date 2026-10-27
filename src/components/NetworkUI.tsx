/**
 * NetworkUI — three exports:
 *   NetworkDropdown   — header chip, replaces TrustPill
 *   WrongNetworkBanner — sticky banner when wallet chainId ≠ app network
 *   WrongNetworkProvider / useDisableTx — context for disabling tx buttons
 */
import React, {
  useState, useEffect, useRef, useCallback,
  createContext, useContext, createElement,
} from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import type { NetworkChoice } from '@/hooks/useNetworkStore';
import { useWrongNetwork } from '@/hooks/useWrongNetwork';
import { useI18n } from '@/hooks/useI18n';

// ── WrongNetwork context (so tx buttons can read disableTx) ──────────────────

const WrongNetworkCtx = createContext<boolean>(false);

export function WrongNetworkProvider({ children }: { children: ReactNode }) {
  const { isWrong } = useWrongNetwork();
  return createElement(WrongNetworkCtx.Provider, { value: isWrong }, children);
}

/** Returns true when the wallet is on the wrong chain — disable tx buttons. */
export function useDisableTx(): boolean {
  return useContext(WrongNetworkCtx);
}

// ── NetworkDropdown ───────────────────────────────────────────────────────────

export function NetworkDropdown() {
  const { network, config, setNetwork } = useNetworkStore();
  const [open, setOpen]   = useState(false);
  const [block, setBlock] = useState<bigint | null>(null);
  const [healthy, setHealthy] = useState(true);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number; minWidth: number }>({ top: 0, right: 0, minWidth: 192 });
  const ref      = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const client = usePublicClient();

  // Poll block number from the selected network's RPC
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled || !client) return;
      try {
        const b = await client.getBlockNumber();
        if (!cancelled) { setBlock(b); setHealthy(true); }
      } catch {
        if (!cancelled) setHealthy(false);
      }
      if (!cancelled) timer = setTimeout(() => { void poll(); }, 6000);
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [client, config.chainId]); // re-run when config changes

  // Compute position from button rect when opening
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPanelPos({
      top: r.bottom + 6,
      right: window.innerWidth - r.right,
      minWidth: Math.max(r.width, 192),
    });
  }, [open]);

  // Close on outside click (check both button and portal panel) or scroll
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      const insideBtn   = ref.current?.contains(t) ?? false;
      const insidePanel = panelRef.current?.contains(t) ?? false;
      if (!insideBtn && !insidePanel) setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeOnScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', closeOnScroll);
    };
  }, [open]);

  const isMainnet = network === 'mainnet';
  const dotColor  = healthy ? '#22c55e' : '#ef4444';
  const bgColor   = isMainnet ? 'rgba(79,158,248,0.10)' : 'rgba(245,158,11,0.12)';
  const textColor = isMainnet ? '#4f9ef8' : '#d97706';
  const borderColor = isMainnet ? 'rgba(79,158,248,0.22)' : 'rgba(245,158,11,0.30)';

  const options: { value: NetworkChoice; label: string }[] = [
    { value: 'mainnet', label: 'Arc Mainnet' },
    { value: 'testnet', label: 'Arc Testnet' },
  ];

  return (
    <div ref={ref} className="relative hidden md:block flex-shrink-0">
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold select-none transition-colors"
        style={{ background: bgColor, color: textColor, border: `1px solid ${borderColor}` }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`${config.label} · click to switch`}
        role="button"
      >
        {/* Health dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${healthy ? 'animate-pulse' : ''}`}
          style={{ background: dotColor }}
          aria-hidden
        />

        {config.label}

        {/* Testnet badge */}
        {!isMainnet && (
          <span className="rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide"
            style={{ background: 'rgba(245,158,11,0.20)', color: '#d97706' }}>
            TESTNET
          </span>
        )}

        {/* Block */}
        {block !== null && (
          <span className="block-num opacity-60 font-mono text-[10px] ml-0.5" aria-label={`Block ${block.toString()}`}>
            block {block.toString()}
          </span>
        )}

        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl shadow-xl py-1"
          style={{
            position: 'fixed',
            top: panelPos.top,
            right: panelPos.right,
            minWidth: panelPos.minWidth,
            zIndex: 99999,
            background: 'var(--surface-strong)',
            border: '1px solid var(--border)',
          }}
          role="listbox"
          aria-label="Select network"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              role="option"
              aria-selected={network === opt.value}
              onClick={() => { setNetwork(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-sm text-left transition-colors"
              style={{
                background: network === opt.value ? 'var(--surface-muted)' : 'transparent',
                color: network === opt.value ? 'var(--accent)' : 'var(--ink)',
                fontWeight: network === opt.value ? 600 : 400,
              }}
              onMouseEnter={e => { if (network !== opt.value) (e.currentTarget).style.background = 'var(--surface-muted)'; }}
              onMouseLeave={e => { if (network !== opt.value) (e.currentTarget).style.background = 'transparent'; }}
            >
              <span className="flex items-center gap-2">
                {opt.value === 'testnet' && (
                  <span className="rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: 'rgba(245,158,11,0.20)', color: '#d97706' }}>
                    TEST
                  </span>
                )}
                {opt.label}
              </span>
              {network === opt.value && <Check size={13} aria-hidden style={{ color: 'var(--accent)' }} />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── WrongNetworkBanner ────────────────────────────────────────────────────────

export function WrongNetworkBanner() {
  const {
    isWrong, walletChainLabel, walletChainId,
    appChainLabel, appChainId,
    isMisconfigured, switchNetwork,
  } = useWrongNetwork();
  const { t } = useI18n();
  const [switching, setSwitching] = useState(false);
  const [err, setErr]             = useState('');

  const handleSwitch = useCallback(async () => {
    setSwitching(true);
    setErr('');
    const ok = await switchNetwork();
    if (!ok) setErr(t('banner.switchFailed'));
    setSwitching(false);
  }, [switchNetwork, t]);

  if (!isWrong) return null;

  const rpcUrl = appChainId === 5042 ? 'https://rpc.mainnet.arc.io' : 'https://rpc.testnet.arc.io';
  const hintBody = t('banner.hintBody')
    .replace(/\$name/g, appChainLabel)
    .replace(/\$got/g,  String(walletChainId))
    .replace(/\$want/g, String(appChainId))
    .replace(/\$rpc/g,  rpcUrl);

  return (
    <div
      className="wrong-net-banner w-full flex flex-col gap-2 px-4 py-2.5 text-sm"
      style={{
        background: 'rgba(245,158,11,0.12)',
        borderBottom: '1px solid rgba(245,158,11,0.30)',
        color: '#92400e',
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium">
          <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0 }} aria-hidden />
          {t('banner.walletOn')}{' '}
          <strong className="mx-0.5">
            {walletChainLabel}{walletChainId !== undefined ? ` (chain ${walletChainId})` : ''}
          </strong>
          {t('banner.appExpects')}{' '}
          <strong className="mx-0.5">{appChainLabel} (chain {appChainId})</strong>.{' '}
          {t('banner.txDisabled')}
        </span>
        <div className="flex items-center gap-3">
          {err && <span className="text-xs text-red-600">{err}</span>}
          <button
            onClick={() => void handleSwitch()}
            disabled={switching}
            className="switch-btn rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-60 focus-visible:outline-2"
            style={{ background: '#d97706', color: '#fff' }}
            aria-label={`${t('banner.switchTo')} ${appChainLabel}`}
          >
            {switching ? t('banner.switching') : `${t('banner.switchTo')} ${appChainLabel}`}
          </button>
        </div>
      </div>
      {/* Misconfigured-wallet hint: wallet shows the right name but wrong chainId */}
      {isMisconfigured && (
        <p className="text-xs" style={{ color: '#92400e' }}>
          <strong>{t('banner.hintTitle')}</strong>{' '}{hintBody}
        </p>
      )}
    </div>
  );
}


