import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { BookOpen, Copy, ExternalLink, Eye, Github, Globe2, Home, Info, Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { TokenUSDC } from '@web3icons/react';
import { cn } from '@/lib/utils';
import { CHAIN_LABEL, IS_MAINNET, GRANTFLOW_ADDRESS, addrUrl } from '@/lib/chainConfig';
import { LogoMark as BrandLogoMark } from '@/components/BrandLogo';

export type Page = 'home' | 'programs' | 'sponsor' | 'builder' | 'reviewer' | 'about' | 'docs' | 'terms';

const NAV_ITEMS: { page: Page; label: string; icon: ReactNode }[] = [
  { page: 'home',     label: 'Home',     icon: <Home className="size-3.5 flex-shrink-0" /> },
  { page: 'programs', label: 'Programs', icon: <Globe2 className="size-3.5 flex-shrink-0" /> },
  { page: 'sponsor',  label: 'Sponsor',  icon: <TokenUSDC size={14} variant="branded" /> },
  { page: 'builder',  label: 'Builder',  icon: <BookOpen className="size-3.5 flex-shrink-0" /> },
  { page: 'reviewer', label: 'Reviewer', icon: <Eye className="size-3.5 flex-shrink-0" /> },
];

// secondary nav shown on mobile only (not cluttering the main bar)
const SECONDARY_NAV: { page: Page; label: string }[] = [
  { page: 'about', label: 'About' },
  { page: 'docs',  label: 'Docs' },
  { page: 'terms', label: 'Terms' },
];

interface LayoutProps {
  children: ReactNode;
  page: Page;
  onNav: (p: Page) => void;
  onDeploy?: () => void;
}

// ── LogoMark ───────────────────────────────────────────────────────────────
function LogoMark({ size = 32 }: { size?: number }) {
  return <BrandLogoMark size={size} variant="light" />;
}

// ── CopyButton (footer) ────────────────────────────────────────────────────
function FooterCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-black/5"
      style={{ color: copied ? 'var(--success)' : 'var(--ink-3, #94a3b8)' }}
      title="Copy contract address"
    >
      <Copy className="size-3" />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────
export function Layout({ children, page, onNav }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (p: Page) => {
    onNav(p);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ color: 'var(--ink)' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 w-full"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2 flex-shrink-0"
            aria-label="GrantFlow home"
          >
            <LogoMark size={32} />
            <span className="display text-base font-bold hidden sm:block" style={{ color: 'var(--ink)' }}>
              GrantFlow
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden sm:flex flex-1 items-center gap-0.5" aria-label="Main navigation">
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
            {/* Desktop secondary links */}
            <span className="mx-1 h-4 w-px" style={{ background: 'var(--border)' }} />
            {SECONDARY_NAV.map(({ page: p, label }) => (
              <button
                key={p}
                onClick={() => handleNav(p)}
                className="rounded-xl px-3 py-2 text-sm font-medium transition-all whitespace-nowrap hover:bg-black/5"
                style={
                  page === p
                    ? { color: 'var(--accent)', fontWeight: 600 }
                    : { color: 'var(--ink-3, #94a3b8)' }
                }
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Spacer mobile */}
          <div className="flex-1 sm:hidden" />

          {/* Right: network badge + wallet + hamburger */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            className="sm:hidden border-t px-4 pb-4 pt-2 flex flex-col gap-1"
            style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.97)' }}
          >
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
                {icon}{label}
              </button>
            ))}
            <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
            {SECONDARY_NAV.map(({ page: p, label }) => (
              <button
                key={p}
                onClick={() => handleNav(p)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium w-full text-left hover:bg-black/5"
                style={{ color: 'var(--ink-3, #94a3b8)' }}
              >
                <Info className="size-3.5 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">{children}</main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="border-t mt-8"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-muted, #f8fafc)' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row gap-8 justify-between mb-8">
            {/* Brand */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <LogoMark size={28} />
                <span className="display text-base font-bold" style={{ color: 'var(--ink)' }}>GrantFlow</span>
              </div>
              <p className="text-xs max-w-xs" style={{ color: 'var(--muted)' }}>
                Onchain grant &amp; bounty payouts in USDC. Powered by Arc.
              </p>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                Built with{' '}
                <a href="https://studio.arc.io" target="_blank" rel="noopener noreferrer"
                  className="hover:underline" style={{ color: 'var(--accent)' }}>Arc Studio</a>
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-1 text-xs">
              <div className="space-y-1">
                <p className="font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>App</p>
                {([['home','Home'],['programs','Programs'],['sponsor','Sponsor'],['builder','Builder'],['reviewer','Reviewer']] as [Page,string][]).map(([p,l]) => (
                  <button key={p} onClick={() => onNav(p)} className="block hover:underline text-left" style={{ color: 'var(--ink-2)' }}>{l}</button>
                ))}
              </div>
              <div className="space-y-1">
                <p className="font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Info</p>
                {([['about','About'],['docs','Docs'],['terms','Terms & Risk']] as [Page,string][]).map(([p,l]) => (
                  <button key={p} onClick={() => onNav(p)} className="block hover:underline text-left" style={{ color: 'var(--ink-2)' }}>{l}</button>
                ))}
              </div>
              <div className="space-y-1">
                <p className="font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Links</p>
                <a href="https://github.com/khanhnttu/grantflow" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline" style={{ color: 'var(--ink-2)' }}>
                  <Github className="size-3" /> GitHub
                </a>
                <a href={addrUrl(GRANTFLOW_ADDRESS)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline" style={{ color: 'var(--ink-2)' }}>
                  <ExternalLink className="size-3" /> Explorer
                </a>
              </div>
            </div>
          </div>

          {/* Contract address row */}
          <div
            className="rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 mb-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Contract (Arc Mainnet)
            </span>
            <code className="mono text-xs flex-1 min-w-0 break-all" style={{ color: 'var(--ink-2)' }}>
              {GRANTFLOW_ADDRESS}
            </code>
            <FooterCopy text={GRANTFLOW_ADDRESS} />
            <a
              href={addrUrl(GRANTFLOW_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent-hover)' }}
            >
              <ExternalLink className="size-3" /> View
            </a>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: 'var(--subtle)' }}>
            <p>
              Not audited by a third party. Use small amounts. Transactions are irreversible.{' '}
              <button onClick={() => onNav('terms')} className="underline" style={{ color: 'var(--accent-hover)' }}>
                Terms &amp; Risk
              </button>
            </p>
            <p>© 2026 GrantFlow</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
