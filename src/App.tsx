import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import type { AppPage, ThemeMode } from '@/components/AppShell';
import { HelpAssistant } from '@/components/HelpAssistant';
import { RoleProvider } from '@/components/RoleSwitcher';
import { I18nProvider } from '@/hooks/useI18n';
import { AppFooter } from '@/components/AppFooter';
import { LandingPage } from '@/components/pages/LandingPage';
import { ExplorePage } from '@/components/pages/ExplorePage';
import { SponsorPage } from '@/components/pages/SponsorPage';
import { BuilderPage } from '@/components/pages/BuilderPage';
import { ReviewerPage } from '@/components/pages/ReviewerPage';
import { ProgramDetailPage } from '@/components/pages/ProgramDetailPage';
import { AboutPage, DocsPage, TermsPage } from '@/components/pages/InfoPages';
import { DeployPage } from '@/components/pages/DeployPage';
import { ExploreV4 } from '@/components/pages/v4/ExploreV4';
import { ProgramDetailV4 } from '@/components/pages/v4/ProgramDetailV4';
import { CreateProgramV4 } from '@/components/pages/v4/CreateProgramV4';
import { MySubmissionsV4 } from '@/components/pages/v4/MySubmissionsV4';
import { HowItWorksPage } from '@/components/pages/HowItWorksPage';
import { ComparePage } from '@/components/pages/ComparePage';
import { DevelopersPage } from '@/components/pages/DevelopersPage';
import { BuiltVsPlannedPage } from '@/components/pages/BuiltVsPlannedPage';

// Pages that bypass the sidebar shell
const BARE_PAGES: AppPage[] = ['landing', 'about', 'docs', 'terms'];

// Per-page document titles
const PAGE_TITLES: Partial<Record<AppPage, string>> = {
  landing:          'GrantFlow — Onchain grant and bounty payouts in USDC',
  'v4-explore':     'Explore Programs · GrantFlow',
  'v4-create':      'Create Program · GrantFlow',
  'v4-submissions': 'My Submissions · GrantFlow',
  'how-it-works':   'How It Works · GrantFlow',
  compare:          'Compare · GrantFlow',
  developers:       'Developers · GrantFlow',
  'built-vs-planned': 'Built vs Planned · GrantFlow',
  about:            'About · GrantFlow',
  docs:             'Guide · GrantFlow',
  terms:            'Terms & Risk · GrantFlow',
  deploy:           'Deploy Contract · GrantFlow',
};

function parseHash(): { page: AppPage; programId?: number } {
  const hash = window.location.hash.replace('#', '').replace(/^\//, '');
  if (!hash || hash === '/') return { page: 'landing' };
  if (hash.startsWith('program/')) {
    const id = parseInt(hash.split('/')[1], 10);
    return { page: 'program', programId: isNaN(id) ? 0 : id };
  }
  if (hash.startsWith('v4-program/')) {
    const id = parseInt(hash.split('/')[1], 10);
    return { page: 'v4-program', programId: isNaN(id) ? 0 : id };
  }
  const valid: AppPage[] = [
    'explore','sponsor','builder','reviewer','about','docs','terms','deploy','landing',
    'v4-explore','v4-create','v4-submissions',
    'how-it-works','compare','developers','built-vs-planned',
  ];
  return valid.includes(hash as AppPage)
    ? { page: hash as AppPage }
    : { page: 'v4-explore' };
}

// Pages that show the footer
const FOOTER_PAGES: AppPage[] = [
  'v4-explore','how-it-works','compare','developers','built-vs-planned','about','docs','terms',
];

export default function App() {
  const [{ page, programId }, setRoute] = useState<{ page: AppPage; programId?: number }>(parseHash);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('gf-theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
    } catch { return 'light'; }
  });
  const [search, setSearch] = useState('');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('gf-theme', theme); } catch {}
  }, [theme]);

  // Hash-based routing
  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Per-page document titles
  useEffect(() => {
    if (page === 'v4-program') {
      document.title = `Program #${programId ?? ''} · GrantFlow`;
    } else {
      document.title = PAGE_TITLES[page] ?? 'GrantFlow';
    }
  }, [page, programId]);

  const navigate = (p: AppPage, id?: number) => {
    if (p === 'program' && id !== undefined) {
      window.location.hash = `program/${id}`;
    } else if (p === 'v4-program' && id !== undefined) {
      window.location.hash = `v4-program/${id}`;
    } else {
      window.location.hash = p === 'landing' ? '/' : p;
    }
    setRoute({ page: p, programId: id });
  };

  const isBare      = BARE_PAGES.includes(page);
  const showFooter  = FOOTER_PAGES.includes(page);

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onNav={p => navigate(p as AppPage)} />;

      // ── V4 pages ──
      case 'v4-explore':
        return <ExploreV4 search={search} onSelect={id => navigate('v4-program', id)} />;
      case 'v4-program':
        return <ProgramDetailV4 programId={programId ?? 0} onBack={() => navigate('v4-explore')} />;
      case 'v4-create':
        return <CreateProgramV4 onDone={() => navigate('v4-explore')} />;
      case 'v4-submissions':
        return <MySubmissionsV4 onSelect={id => navigate('v4-program', id)} />;

      // ── New product pages ──
      case 'how-it-works':
        return <HowItWorksPage />;
      case 'compare':
        return <ComparePage />;
      case 'developers':
        return <DevelopersPage />;
      case 'built-vs-planned':
        return <BuiltVsPlannedPage />;

      // ── Legacy pages ──
      case 'explore':
        return <ExplorePage search={search} onOpenProgram={id => navigate('program', id)} />;
      case 'sponsor':
        return <SponsorPage />;
      case 'builder':
        return <BuilderPage />;
      case 'reviewer':
        return <ReviewerPage />;
      case 'program':
        return <ProgramDetailPage programId={programId ?? 0} onBack={() => navigate('explore')} onNav={p => navigate(p as AppPage)} />;

      // ── Info pages ──
      case 'about':
        return <AboutPage onNav={p => navigate(p as AppPage)} />;
      case 'docs':
        return <DocsPage onNav={p => navigate(p as AppPage)} />;
      case 'terms':
        return <TermsPage onNav={p => navigate(p as AppPage)} />;
      case 'deploy':
        return <DeployPage />;

      default:
        return <ExploreV4 search={search} onSelect={id => navigate('v4-program', id)} />;
    }
  };

  return (
    <I18nProvider>
      <RoleProvider>
        <AppShell
          page={page}
          onNav={navigate}
          theme={theme}
          onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          search={search}
          onSearch={setSearch}
          bare={isBare}
        >
          {renderPage()}
          {showFooter && !isBare && (
            <AppFooter onNav={navigate} />
          )}
        </AppShell>
        {/* Help assistant — not shown on deploy page */}
        {page !== 'deploy' && (
          <HelpAssistant onNav={p => navigate(p as AppPage)} />
        )}
      </RoleProvider>
    </I18nProvider>
  );
}
