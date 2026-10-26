/**
 * AppSlimFooter — one-line footer for app-shell pages.
 * Reads contract address and network name from the selected network (useNetworkStore),
 * so it stays in sync with the network dropdown.
 */
import { ExternalLink } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useNetworkStore } from '@/hooks/useNetworkStore';

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function AppSlimFooter() {
  const { t } = useI18n();
  const { config } = useNetworkStore();

  // Show V5 address when available, fall back to V4
  const primaryAddr    = config.v5Address || config.v4Address;
  const primaryLabel   = config.v5Address ? 'V5' : 'V4';

  return (
    <footer
      className="mt-8 pt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
      style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}
    >
      <span>© 2026 GrantFlow</span>
      <span aria-hidden>·</span>
      {/* Network-aware "Read live from …" label */}
      <span>
        {t('slimFooter.readLive').replace('Arc mainnet', config.label)}
      </span>
      <span aria-hidden>·</span>
      <a
        href={`${config.explorerBase}/address/${primaryAddr}`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity font-mono"
        aria-label={`${t('slimFooter.contract')} ${primaryAddr}`}
      >
        {primaryLabel} {short(primaryAddr)} <ExternalLink size={9} aria-hidden />
      </a>
      <span aria-hidden>·</span>
      {/* Source code link — transparency for a USDC-holding app */}
      <a
        href="https://github.com/khanhnttu/grantflow"
        target="_blank" rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        Source code
      </a>
    </footer>
  );
}
