import { useState, useEffect, useCallback } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  LayoutGrid, List, Compass, PlusCircle, FileText,
  BookOpen, Users, Sun, Moon, Menu, ChevronRight,
  Github, ExternalLink
} from 'lucide-react';
import { GRANTFLOW_ADDRESS } from '@/lib/grantflow';
import { ACTIVE_CHAIN_ID } from '@/lib/chainConfig';

// ── Types ────────────────────────────────────────────────────────────────────

export type AppPage =
  | 'landing' | 'explore' | 'sponsor' | 'builder' | 'reviewer'
  | 'program' | 'about' | 'docs' | 'terms' | 'deploy';

export type ThemeMode = 'light' | 'dark';

interface AppShellProps {
  page: AppPage;
  onNav: (page: AppPage, programId?: number) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  search: string;
  onSearch: (v: string) => void;
  children: React.ReactNode;
  /** If true renders without sidebar (landing page, info pages) */
  bare?: boolean;
}

// ── Short address ─────────────────────────────────────────────────────────────
const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

const EXPLORER = ACTIVE_CHAIN_ID === 5042
  ? 'https://explorer.arc.io'
  : 'https://explorer.testnet.arc.io';

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV = [
  { id: 'explore' as AppPage,   label: 'Explore',       icon: Compass },
  { id: 'sponsor' as AppPage,   label: 'My programs',   icon: LayoutGrid },
  { id: 'builder' as AppPage,   label: 'My submissions',icon: List },
  { id: 'reviewer' as AppPage,  label: 'Review queue',  icon: Users },
  { id: 'docs' as AppPage,      label: 'Guide',         icon: BookOpen },
];

// ── Logo mark SVG ─────────────────────────────────────────────────────────────
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="7" fill="#4f9ef8" />
      <path
        d="M14 6C9.58 6 6 9.58 6 14s3.58 8 8 8c2.13 0 4.07-.83 5.52-2.19l-1.42-1.42A5.96 5.96 0 0 1 14 20a6 6 0 0 1 0-12c2.03 0 3.82 1.01 4.9 2.56H16v2h6V7h-2v1.97A7.97 7.97 0 0 0 14 6Zm1 7h-2v2h2v-2Z"
        fill="#fff"
      />
    </svg>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({
  page, onNav, mobileOpen, onMobileClose,
}: {
  page: AppPage;
  onNav: (p: AppPage) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={`app-sidebar${mobileOpen ? ' mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-4 cursor-pointer"
          onClick={() => { onNav('landing'); onMobileClose(); }}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onNav('landing')}
        >
          <LogoMark />
          <span className="display font-semibold text-white text-[15px] tracking-tight">
            GrantFlow
          </span>
        </div>

        {/* Create button */}
        <div className="px-3 mb-3">
          <button
            onClick={() => { onNav('sponsor'); onMobileClose(); }}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all"
            style={{
              background: '#4f9ef8',
              color: '#080e17',
            }}
          >
            <PlusCircle size={15} />
            Create program
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => { onNav(id); onMobileClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all"
                style={{
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  color: active ? '#fff' : 'var(--sidebar-fg)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget).style.background = 'var(--sidebar-hover)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget).style.background = 'transparent'; }}
              >
                <Icon size={16} style={{ color: active ? 'var(--sidebar-accent)' : 'var(--sidebar-fg)', flexShrink: 0 }} />
                {label}
                {active && <ChevronRight size={12} className="ml-auto opacity-50" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="text-xs mb-2" style={{ color: 'var(--sidebar-fg)' }}>
            Contract
          </div>
          <a
            href={`${EXPLORER}/address/${GRANTFLOW_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-[11px] transition-colors"
            style={{ color: 'var(--sidebar-accent)' }}
          >
            <ExternalLink size={10} />
            {short(GRANTFLOW_ADDRESS)}
          </a>
          <div className="flex items-center gap-2 mt-3">
            <a
              href="https://github.com/khanhnttu/grantflow"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: 'var(--sidebar-fg)' }}
            >
              <Github size={14} />
            </a>
            <button
              onClick={() => { onNav('terms'); onMobileClose(); }}
              className="text-[11px] transition-colors hover:text-white"
              style={{ color: 'var(--sidebar-fg)' }}
            >
              Terms
            </button>
            <span style={{ color: 'var(--sidebar-fg)', opacity: 0.4 }}>·</span>
            <button
              onClick={() => { onNav('about'); onMobileClose(); }}
              className="text-[11px] transition-colors hover:text-white"
              style={{ color: 'var(--sidebar-fg)' }}
            >
              About
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────
function TopBar({
  page, onNav, theme, onThemeToggle, search, onSearch, onMobileMenu,
}: {
  page: AppPage;
  onNav: (p: AppPage) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  search: string;
  onSearch: (v: string) => void;
  onMobileMenu: () => void;
}) {
  const isMainnet = ACTIVE_CHAIN_ID === 5042;

  return (
    <header className="app-topbar">
      {/* Mobile hamburger */}
      <button
        className="md:hidden mr-1 rounded-lg p-1.5 transition-colors"
        style={{ color: 'var(--muted)' }}
        onClick={onMobileMenu}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xs relative">
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search programs…"
          className="w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-all"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
          }}
          onFocus={() => { if (page !== 'explore') onNav('explore'); }}
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Network badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: isMainnet ? 'rgba(79,158,248,0.12)' : 'rgba(5,150,105,0.12)',
            color: isMainnet ? '#4f9ef8' : '#059669',
            border: `1px solid ${isMainnet ? 'rgba(79,158,248,0.25)' : 'rgba(5,150,105,0.25)'}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: isMainnet ? '#4f9ef8' : '#059669' }}
          />
          {isMainnet ? 'Arc Mainnet' : 'Arc Testnet'}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="rounded-lg p-1.5 transition-colors"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Docs */}
        <button
          onClick={() => onNav('docs')}
          className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
        >
          <FileText size={13} />
          Docs
        </button>

        {/* Wallet */}
        <ConnectKitButton />
      </div>
    </header>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
export function AppShell({
  page, onNav, theme, onThemeToggle,
  search, onSearch, children, bare,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleNav = useCallback((p: AppPage, _id?: number) => {
    onNav(p, _id);
  }, [onNav]);

  if (bare) {
    return (
      <div style={{ color: 'var(--ink)' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ background: 'var(--bg)' }}>
      <Sidebar
        page={page}
        onNav={handleNav}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="app-main">
        <TopBar
          page={page}
          onNav={handleNav}
          theme={theme}
          onThemeToggle={onThemeToggle}
          search={search}
          onSearch={onSearch}
          onMobileMenu={() => setMobileOpen(true)}
        />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
