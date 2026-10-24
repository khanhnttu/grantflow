/**
 * AppSlimFooter — one-line footer for app-shell pages (Explore, program pages, etc.)
 * Sits inside the app-content area, below the page content.
 */
import { ExternalLink } from 'lucide-react';
import { GRANTFLOW_V4_ADDRESS, EXPLORER_BASE } from '@/lib/chainConfig';

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function AppSlimFooter() {
  return (
    <footer
      className="mt-8 pt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
      style={{
        borderTop: '1px solid var(--border)',
        color: 'var(--muted)',
      }}
    >
      <span>© 2026 GrantFlow</span>
      <span aria-hidden>·</span>
      <span>Read live from Arc mainnet</span>
      <span aria-hidden>·</span>
      <a
        href={`${EXPLORER_BASE}/address/${GRANTFLOW_V4_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity font-mono"
        aria-label={`View V4 contract ${GRANTFLOW_V4_ADDRESS} on explorer`}
      >
        V4 {short(GRANTFLOW_V4_ADDRESS)}
        <ExternalLink size={9} aria-hidden />
      </a>
      <span aria-hidden>·</span>
      <a
        href="https://github.com/khanhnttu/grantflow"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        GitHub
      </a>
    </footer>
  );
}
