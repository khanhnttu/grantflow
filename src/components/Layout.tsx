import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { Award, BookOpen, Eye, Github, Globe2, Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { TokenUSDC } from '@web3icons/react';
import { cn } from '@/lib/utils';
import { CHAIN_LABEL, IS_MAINNET } from '@/lib/chainConfig';

export type Page = 'sponsor' | 'builder' | 'reviewer' | 'programs';

const NAV_ITEMS: { page: Page; label: string; icon: ReactNode }[] = [
  { page: 'programs', label: 'Programs', icon: <Globe2 className="size-3.5 flex-shrink-0" /> },
  { page: 'sponsor',  label: 'Sponsor',  icon: <TokenUSDC size={14} variant="branded" /> },
  { page: 'builder',  label: 'Builder',  icon: <BookOpen className="size-3.5 flex-shrink-0" /> },
  { page: 'reviewer', label: 'Reviewer', icon: <Eye className="size-3.5 flex-shrink-0" /> },
];

interface LayoutProps {
  children: ReactNode;
  page: Page;
  onNav: (p: Page) => void;
  onDeploy?: () => void;
}

export function Layout({ children, page, onNav }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (p: Page) => {
    onNav(p);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-dvh" style={{ color: 'var(--ink)' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 w-full"
        style={{
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          {/* Logo */}
          <button
            onClick={() => handleNav('programs')}
            className="flex items-center gap-2 flex-shrink-0"
            aria-label="Go to Programs"
          >
            <div
              className="flex size-8 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent)' }}
            >
              <Award className="size-4 text-white" />
            </div>
            <span className="display text-base font-bold hidden sm:block" style={{ color: 'var(--ink)' }}>
              GrantFlow
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden sm:flex flex-1 items-center gap-0.5">
            {NAV_ITEMS.map(({ page: p, label, icon }) => (
              <button
                key={p}
                onClick={() => handleNav(p)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all whitespace-nowrap',
                  page === p ? 'font-semibold' : 'hover:bg-black/5',
                )}
                style={
                  page === p
                    ? { background: 'var(--accent)', color: 'white' }
                    : { color: 'var(--ink-2)' }
                }
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>

          {/* Spacer on desktop when nav is present */}
          <div className="flex-1 sm:hidden" />

          {/* Right side: network badge + wallet + mobile menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Network badge */}
            <span
              className="hidden xs:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={
                IS_MAINNET
                  ? { background: 'rgba(26,128,71,0.12)', color: 'var(--success)' }
                  : { background: 'rgba(16,97,166,0.10)', color: 'var(--accent-hover)' }
              }
            >
              <span className="size-1.5 rounded-full inline-block" style={{ background: IS_MAINNET ? 'var(--success)' : 'var(--accent-hover)' }} />
              {CHAIN_LABEL}
            </span>

            <ConnectKitButton />

            {/* Hamburger */}
            <button
              className="sm:hidden flex items-center justify-center rounded-xl p-2"
              style={{ color: 'var(--ink-2)', background: 'var(--surface-muted)' }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div
            className="sm:hidden border-t px-4 pb-4 pt-2 flex flex-col gap-1"
            style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.97)' }}
          >
            {/* Network badge mobile */}
            <div className="mb-2 flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={
                  IS_MAINNET
                    ? { background: 'rgba(26,128,71,0.12)', color: 'var(--success)' }
                    : { background: 'rgba(16,97,166,0.10)', color: 'var(--accent-hover)' }
                }
              >
                <span className="size-1.5 rounded-full inline-block" style={{ background: IS_MAINNET ? 'var(--success)' : 'var(--accent-hover)' }} />
                {CHAIN_LABEL}
              </span>
            </div>
            {NAV_ITEMS.map(({ page: p, label, icon }) => (
              <button
                key={p}
                onClick={() => handleNav(p)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium w-full text-left transition-all',
                  page === p ? 'font-semibold' : '',
                )}
                style={
                  page === p
                    ? { background: 'var(--accent)', color: 'white' }
                    : { color: 'var(--ink-2)' }
                }
              >
                {icon}
                {label}
              </button>
            ))}

          </div>
        )}
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="mt-8 border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-muted, #f8fafc)' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ color: 'var(--ink-3, #94a3b8)' }}
        >
          {/* Left: branding */}
          <div className="flex items-center gap-1.5">
            <div
              className="flex size-5 items-center justify-center rounded-md"
              style={{ background: 'var(--accent)' }}
            >
              <Award className="size-3 text-white" />
            </div>
            <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>GrantFlow</span>
            <span>·</span>
            <span>Built with</span>
            <a
              href="https://studio.arc.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Arc Studio
            </a>
          </div>

          {/* Center: contract address */}
          <a
            href="https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:underline flex items-center gap-1"
            style={{ color: 'var(--ink-3, #94a3b8)' }}
            title="View contract on Arc Mainnet explorer"
          >
            0x7c28…fe7d
          </a>

          {/* Right: GitHub */}
          <a
            href="https://github.com/khanhnttu/grantflow"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:underline"
            style={{ color: 'var(--ink-3, #94a3b8)' }}
          >
            <Github className="size-3.5" />
            khanhnttu/grantflow
          </a>
        </div>
      </footer>
    </div>
  );
}
