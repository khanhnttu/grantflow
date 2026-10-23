import { useState, useEffect } from 'react';
import { Layout, type Page } from '@/components/Layout';
import { SponsorPage } from '@/components/pages/SponsorPage';
import { BuilderPage } from '@/components/pages/BuilderPage';
import { ReviewerPage } from '@/components/pages/ReviewerPage';
import { ProgramsPage, PublicProgramPage } from '@/components/pages/ProgramsPage';
import { DeployPage } from '@/components/pages/DeployPage';
import { IS_MAINNET } from '@/lib/chainConfig';

// Route /deploy is a hidden admin page — accessed by navigating to /#deploy or
// clicking the subtle admin link. It is never shown in the main nav.
function useDeployRoute() {
  const [isDeployRoute, setIsDeployRoute] = useState(() => window.location.hash === '#deploy');
  useEffect(() => {
    const handler = () => setIsDeployRoute(window.location.hash === '#deploy');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return isDeployRoute;
}

export default function App() {
  const [page, setPage] = useState<Page>('programs');
  const [programDetailId, setProgramDetailId] = useState<bigint | null>(null);
  const isDeployRoute = useDeployRoute();

  const handleNav = (p: Page) => {
    setProgramDetailId(null);
    setPage(p);
    // Leave deploy route if user clicks a main nav item
    if (window.location.hash === '#deploy') {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  const handleBackFromDeploy = () => {
    window.location.hash = '';
  };

  const handleOpenDeploy = () => {
    window.location.hash = 'deploy';
  };

  // If user is on the deploy route, render the deploy page without the main layout nav
  if (isDeployRoute) {
    return (
      <div className="min-h-dvh" style={{ color: 'var(--ink)' }}>
        {/* Mainnet warning banner — sticky, always visible on deploy page */}
        <div
          className="sticky top-0 z-50 w-full px-4 py-2 text-center text-sm font-semibold"
          style={{ background: 'rgba(220,38,38,0.92)', color: 'white' }}
        >
          Real USDC. Use small amounts. Transactions on Arc Mainnet are irreversible.
        </div>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <DeployPage onBack={handleBackFromDeploy} />
        </main>
      </div>
    );
  }

  return (
    <Layout page={page} onNav={handleNav} onDeploy={handleOpenDeploy}>
      {/* Mainnet warning banner — shown inside the normal layout when VITE_CHAIN=mainnet */}
      {IS_MAINNET && (
        <div
          className="mb-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{
            background: 'rgba(220,38,38,0.07)',
            borderColor: 'rgba(220,38,38,0.25)',
            color: '#b91c1c',
          }}
        >
          <span className="size-2 rounded-full flex-shrink-0 bg-red-500" />
          Arc Mainnet — Real USDC. Use small amounts. Transactions are irreversible.
        </div>
      )}

      {page === 'programs' && !programDetailId && (
        <ProgramsPage onSelectProgram={(id) => setProgramDetailId(id)} />
      )}
      {page === 'programs' && programDetailId !== null && (
        <PublicProgramPage
          programId={programDetailId}
          onBack={() => setProgramDetailId(null)}
        />
      )}
      {page === 'sponsor' && <SponsorPage />}
      {page === 'builder' && <BuilderPage />}
      {page === 'reviewer' && <ReviewerPage />}
    </Layout>
  );
}
