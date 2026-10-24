import { useState, useEffect, useCallback } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  Compass, PlusCircle, FileText,
  BookOpen, Sun, Moon, Menu, ChevronRight,
  Github, ExternalLink, Code2, Scale, List,
  Info, HelpCircle, GitCompare, Cpu,
} from 'lucide-react';
import { GRANTFLOW_ADDRESS } from '@/lib/grantflow';
import { ACTIVE_CHAIN_ID } from '@/lib/chainConfig';
import { RoleSwitcher, useRole } from '@/components/RoleSwitcher';
import { useNetworkHealth } from '@/hooks/useNetworkHealth';
import { useI18n } from '@/hooks/useI18n';
import type { Lang } from '@/lib/i18n';

// ── Types ────────────────────────────────────────────────────────────────────

export type AppPage =
  | 'landing' | 'explore' | 'sponsor' | 'builder' | 'reviewer'
  | 'program' | 'about' | 'docs' | 'terms' | 'deploy'
  | 'v4-explore' | 'v4-program' | 'v4-create' | 'v4-submissions'
  | 'how-it-works' | 'compare' | 'developers' | 'built-vs-planned';

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

// ── Role-aware nav ────────────────────────────────────────────────────────────
const NAV_HACKER = [
  { id: 'v4-explore' as AppPage,     label: 'nav.explore',      icon: Compass   },
  { id: 'v4-submissions' as AppPage, label: 'nav.submissions',  icon: Code2     },
  { id: 'how-it-works' as AppPage,   label: 'nav.howItWorks',   icon: HelpCircle },
  { id: 'docs' as AppPage,           label: 'nav.docs',         icon: BookOpen  },
];
const NAV_ORGANIZER = [
  { id: 'v4-explore' as AppPage,     label: 'nav.explore',      icon: Compass    },
  { id: 'v4-create' as AppPage,      label: 'nav.create',       icon: PlusCircle },
  { id: 'how-it-works' as AppPage,   label: 'nav.howItWorks',   icon: HelpCircle },
  { id: 'docs' as AppPage,           label: 'nav.docs',         icon: BookOpen   },
];
const NAV_JUDGE = [
  { id: 'v4-explore' as AppPage,     label: 'nav.judge',        icon: Scale    },
  { id: 'how-it-works' as AppPage,   label: 'nav.howItWorks',   icon: HelpCircle },
  { id: 'docs' as AppPage,           label: 'nav.docs',         icon: BookOpen  },
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

// ── Language switcher ─────────────────────────────────────────────────────────
function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
      className="px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
      style={{
        background: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
      }}
      aria-label={`Switch to ${lang === 'en' ? 'Vietnamese' : 'English'}`}
      title={lang === 'en' ? 'Switch to Vietnamese' : 'Switch to English'}
    >
      {lang === 'en' ? 'VI' : 'EN'}
    </button>
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
  const { role } = useRole();
  const { t } = useI18n();
  const NAV = role === 'organizer' ? NAV_ORGANIZER : role === 'judge' ? NAV_JUDGE : NAV_HACKER;

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
          aria-label="Go to home"
        >
          <LogoMark />
          <span className="display font-semibold text-white text-[15px] tracking-tight">
            GrantFlow
          </span>
        </div>

        {/* Create button (organizer-only) */}
        {role === 'organizer' && (
          <div className="px-3 mb-3">
            <button
              onClick={() => { onNav('v4-create'); onMobileClose(); }}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: '#4f9ef8', color: '#080e17' }}
              aria-label="Create a new program"
            >
              <PlusCircle size={15} aria-hidden />
              {t('nav.create')}
            </button>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => { onNav(id); onMobileClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  color: active ? '#fff' : 'var(--sidebar-fg)',
                }}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={e => { if (!active) (e.currentTarget).style.background = 'var(--sidebar-hover)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget).style.background = 'transparent'; }}
              >
                <Icon size={16} aria-hidden style={{ color: active ? 'var(--sidebar-accent)' : 'var(--sidebar-fg)', flexShrink: 0 }} />
                {t(label as Parameters<typeof t>[0])}
                {active && <ChevronRight size={12} className="ml-auto opacity-50" aria-hidden />}
              </button>
            );
          })}
        </nav>

        {/* Secondary nav */}
        <nav className="px-2 pb-1 space-y-0.5" aria-label="Secondary navigation">
          {([
            { id: 'compare'         as AppPage, label: 'nav.compare',        icon: GitCompare },
            { id: 'developers'      as AppPage, label: 'nav.developers',      icon: Cpu        },
            { id: 'built-vs-planned'as AppPage, label: 'nav.builtVsPlanned',  icon: List       },
          ] as const).map(({ id, label, icon: Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => { onNav(id); onMobileClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all focus-visible:outline-2"
                style={{
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  color: active ? '#fff' : 'var(--sidebar-fg)',
                  opacity: active ? 1 : 0.7,
                }}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.opacity = '1'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.7'; } }}
              >
                <Icon size={13} aria-hidden style={{ color: active ? 'var(--sidebar-accent)' : 'var(--sidebar-fg)', flexShrink: 0 }} />
                {t(label)}
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
            className="flex items-center gap-1.5 font-mono text-[11px] transition-colors hover:opacity-80"
            style={{ color: 'var(--sidebar-accent)' }}
            aria-label={`View contract ${GRANTFLOW_ADDRESS} on explorer`}
          >
            <ExternalLink size={10} aria-hidden />
            {short(GRANTFLOW_ADDRESS)}
          </a>
          <div className="flex items-center gap-2 mt-3">
            <a
              href="https://github.com/khanhnttu/grantflow"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:opacity-80"
              style={{ color: 'var(--sidebar-fg)' }}
              aria-label="GitHub repository"
            >
              <Github size={14} aria-hidden />
            </a>
            <button
              onClick={() => { onNav('terms'); onMobileClose(); }}
              className="text-[11px] transition-colors hover:text-white focus-visible:outline-2"
              style={{ color: 'var(--sidebar-fg)' }}
            >
              {t('nav.terms')}
            </button>
            <span style={{ color: 'var(--sidebar-fg)', opacity: 0.4 }} aria-hidden>·</span>
            <button
              onClick={() => { onNav('about'); onMobileClose(); }}
              className="text-[11px] transition-colors hover:text-white focus-visible:outline-2"
              style={{ color: 'var(--sidebar-fg)' }}
            >
              {t('nav.about')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Trust pill ────────────────────────────────────────────────────────────────
function TrustPill() {
  const isMainnet = ACTIVE_CHAIN_ID === 5042;
  const { blockNumber, health } = useNetworkHealth();
  const { t } = useI18n();

  const dotColor = health === 'healthy' ? '#22c55e' : health === 'slow' ? '#f59e0b' : '#ef4444';
  const bgColor  = isMainnet ? 'rgba(79,158,248,0.10)' : 'rgba(5,150,105,0.10)';
  const textColor = isMainnet ? '#4f9ef8' : '#059669';
  const borderColor = isMainnet ? 'rgba(79,158,248,0.22)' : 'rgba(5,150,105,0.22)';

  const networkLabel = isMainnet ? t('trust.mainnet') : t('trust.testnet');
  const healthLabel  = health === 'healthy' ? t('trust.healthy') : health === 'slow' ? t('trust.slow') : t('trust.down');

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold select-none"
      style={{ background: bgColor, color: textColor, border: `1px solid ${borderColor}` }}
      title={`${networkLabel} · ${healthLabel}`}
      role="status"
      aria-label={`Network: ${networkLabel}${blockNumber ? `, block ${blockNumber.toString()}` : ''}, ${healthLabel}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${health === 'healthy' ? 'animate-pulse' : ''}`}
        style={{ background: dotColor }}
        aria-hidden
      />
      {networkLabel}
      {blockNumber !== null && (
        <span className="opacity-60 font-mono text-[10px] ml-0.5">
          #{blockNumber.toString()}
        </span>
      )}
    </div>
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
  const { t } = useI18n();

  return (
    <header className="app-topbar" role="banner">
      {/* Mobile hamburger */}
      <button
        className="md:hidden mr-1 rounded-lg p-1.5 transition-colors focus-visible:outline-2"
        style={{ color: 'var(--muted)' }}
        onClick={onMobileMenu}
        aria-label="Open navigation menu"
        aria-expanded={false}
      >
        <Menu size={18} aria-hidden />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xs relative">
        <label htmlFor="global-search" className="sr-only">Search programs</label>
        <input
          id="global-search"
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={t('explore.search')}
          className="w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-all focus-visible:ring-2"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
          }}
          onFocus={() => { if (page !== 'v4-explore') onNav('v4-explore'); }}
          aria-label="Search programs"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto" role="toolbar" aria-label="Header actions">
        {/* Role switcher */}
        <RoleSwitcher />

        {/* Trust pill */}
        <TrustPill />

        {/* GitHub */}
        <a
          href="https://github.com/khanhnttu/grantflow"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex rounded-lg p-1.5 transition-colors hover:opacity-80 focus-visible:outline-2"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
          aria-label="GitHub repository"
        >
          <Github size={15} aria-hidden />
        </a>

        {/* Language switcher */}
        <LangSwitcher />

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="rounded-lg p-1.5 transition-colors focus-visible:outline-2"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
        </button>

        {/* Docs */}
        <button
          onClick={() => onNav('docs')}
          className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
          aria-label="Open documentation"
        >
          <FileText size={13} aria-hidden />
          {t('nav.docs')}
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
        <main className="app-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Re-export for use elsewhere
export type { Lang };
export { Info };
