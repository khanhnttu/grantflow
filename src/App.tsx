import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import type { AppPage, ThemeMode } from '@/components/AppShell';
import { HelpAssistant } from '@/components/HelpAssistant';
import { LandingPage } from '@/components/pages/LandingPage';
import { ExplorePage } from '@/components/pages/ExplorePage';
import { SponsorPage } from '@/components/pages/SponsorPage';
import { BuilderPage } from '@/components/pages/BuilderPage';
import { ReviewerPage } from '@/components/pages/ReviewerPage';
import { ProgramDetailPage } from '@/components/pages/ProgramDetailPage';
import { AboutPage, DocsPage, TermsPage } from '@/components/pages/InfoPages';
import { DeployPage } from '@/components/pages/DeployPage';

// Pages that bypass the sidebar shell
const BARE_PAGES: AppPage[] = ['landing', 'about', 'docs', 'terms'];

function parseHash(): { page: AppPage; programId?: number } {
  const hash = window.location.hash.replace('#', '').replace(/^\//, '');
  if (!hash || hash === '/') return { page: 'landing' };
  if (hash.startsWith('program/')) {
    const id = parseInt(hash.split('/')[1], 10);
    return { page: 'program', programId: isNaN(id) ? 0 : id };
  }
  const valid: AppPage[] = ['explore','sponsor','builder','reviewer','about','docs','terms','deploy','landing'];
  return valid.includes(hash as AppPage)
    ? { page: hash as AppPage }
    : { page: 'landing' };
}

export default function App() {
  const [{ page, programId }, setRoute] = useState<{ page: AppPage; programId?: number }>(parseHash);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('gf-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });
  const [search, setSearch] = useState('');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gf-theme', theme);
  }, [theme]);

  // Hash-based routing
  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (p: AppPage, id?: number) => {
    if (p === 'program' && id !== undefined) {
      window.location.hash = `program/${id}`;
    } else {
      window.location.hash = p === 'landing' ? '/' : p;
    }
    setRoute({ page: p, programId: id });
  };

  const isBare = BARE_PAGES.includes(page);

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onNav={p => navigate(p as AppPage)} />;
      case 'explore':
        return (
          <ExplorePage
            search={search}
            onOpenProgram={id => navigate('program', id)}
          />
        );
      case 'sponsor':
        return <SponsorPage />;
      case 'builder':
        return <BuilderPage />;
      case 'reviewer':
        return <ReviewerPage />;
      case 'program':
        return (
          <ProgramDetailPage
            programId={programId ?? 0}
            onBack={() => navigate('explore')}
            onNav={p => navigate(p as AppPage)}
          />
        );
      case 'about':
        return <AboutPage onNav={p => navigate(p as AppPage)} />;
      case 'docs':
        return <DocsPage onNav={p => navigate(p as AppPage)} />;
      case 'terms':
        return <TermsPage onNav={p => navigate(p as AppPage)} />;
      case 'deploy':
        return <DeployPage />;
      default:
        return <LandingPage onNav={p => navigate(p as AppPage)} />;
    }
  };

  return (
    <>
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
      </AppShell>
      {/* Help assistant — not shown on deploy page */}
      {page !== 'deploy' && (
        <HelpAssistant onNav={p => navigate(p as AppPage)} />
      )}
    </>
  );
}
