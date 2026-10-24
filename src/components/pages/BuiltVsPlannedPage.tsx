/**
 * Built vs Planned — honest checklist of live features and roadmap.
 */
import { Check, Clock, Circle } from 'lucide-react';

type ItemStatus = 'live' | 'planned' | 'considering';

interface Item {
  label: string;
  status: ItemStatus;
  note?: string;
}

const ITEMS: Item[] = [
  // Live
  { label: 'GrantFlowV3: open-bounty and onchain-build programs', status: 'live' },
  { label: 'GrantFlowV4: two-phase deadlines (submission → judging → finalized)', status: 'live' },
  { label: 'GrantFlowV4: ranked prize array (1st, 2nd, 3rd…)', status: 'live' },
  { label: 'GrantFlowV4: pull-claim payout pattern', status: 'live' },
  { label: 'GrantFlowV4: conflict-of-interest guards (sponsor/judge cannot submit)', status: 'live' },
  { label: 'GrantFlowV4: judge vote cap (N votes per judge = N prize tiers)', status: 'live' },
  { label: 'GrantFlowV4: cancel before first submission, full pool refund', status: 'live' },
  { label: 'GrantFlowV4: sponsor reclaims unawarded pool after finalize', status: 'live' },
  { label: 'GrantFlowV4: anyone can call finalize() after judging deadline', status: 'live' },
  { label: '1% platform fee, hard-capped at 5%', status: 'live' },
  { label: '157 Foundry unit tests (89 v3 + 68 v4), all passing', status: 'live' },
  { label: 'Deployed to Arc Testnet (V4)', status: 'live' },
  { label: 'Deployed to Arc Mainnet (V3)', status: 'live' },
  { label: 'Program explorer: table + grid, phase filter, category filter, search', status: 'live' },
  { label: 'Program detail page: Winners, Details, Submissions, Participants, Judges, Ask tabs', status: 'live' },
  { label: 'Winners tab: ranked cards, claim/unclaimed status, share link', status: 'live' },
  { label: 'Phase banner with countdown before finalize', status: 'live' },
  { label: 'Create program wizard (4-step, Organizer role)', status: 'live' },
  { label: 'My Submissions page', status: 'live' },
  { label: 'Role switcher: Hacker / Organizer / Judge in topbar', status: 'live' },
  { label: 'DoraHacks-style role-separated sidebar nav', status: 'live' },
  { label: 'Live network trust bar (block number, RPC health)', status: 'live' },
  { label: 'Read everything without connecting a wallet', status: 'live' },
  { label: 'Pagination (20/page) and sort on Explore', status: 'live' },
  { label: 'EN/VI language switch', status: 'live' },
  { label: 'LocalStorage cache with stale-while-revalidate', status: 'live' },
  { label: 'Skeleton loaders, empty states, error states with retry', status: 'live' },
  { label: 'Human-readable wallet errors + pending/confirmed/failed toasts', status: 'live' },
  { label: 'Keyboard navigation and ARIA labels', status: 'live' },
  { label: 'Light and dark theme', status: 'live' },
  { label: 'Bilingual help assistant (EN/VI)', status: 'live' },
  { label: 'Deploy page: deploy V3 or V4 from browser wallet', status: 'live' },
  { label: 'Deployed to Netlify and Vercel', status: 'live' },

  // Planned
  { label: 'Deploy GrantFlowV4 to Arc Mainnet', status: 'planned', note: 'User deploys from /deploy with their own wallet after independent review.' },
  { label: 'Independent third-party security audit', status: 'planned' },
  { label: 'Verifiable source on Arc explorer', status: 'planned' },
  { label: 'ENS / basename display for wallet addresses', status: 'planned' },
  { label: 'Email notifications for judging deadline reminders', status: 'planned' },
  { label: 'Program page: direct link to share on social', status: 'planned' },
  { label: 'Explore: infinite scroll or "Load more" as alternative to pagination', status: 'planned' },

  // Considering
  { label: 'GrantFlowV5: milestone-based payout (pay at each approved milestone)', status: 'considering' },
  { label: 'GrantFlowV5: multi-currency prizes (EURC alongside USDC)', status: 'considering' },
  { label: 'Permissioned submission (allowlist for invite-only programs)', status: 'considering' },
  { label: 'Quadratic voting mode', status: 'considering' },
  { label: 'DAO governance for fee changes', status: 'considering' },
];

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'live') return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
      <Check size={10} /> Live
    </span>
  );
  if (status === 'planned') return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(79,158,248,0.1)', color: '#4f9ef8' }}>
      <Clock size={10} /> Planned
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      <Circle size={10} /> Considering
    </span>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>{title}</h2>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label}
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex-shrink-0 mt-0.5"><StatusBadge status={item.status} /></div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{item.label}</p>
              {item.note && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BuiltVsPlannedPage() {
  const live       = ITEMS.filter(i => i.status === 'live');
  const planned    = ITEMS.filter(i => i.status === 'planned');
  const considering = ITEMS.filter(i => i.status === 'considering');

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="pt-4 mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          Transparency
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Built vs planned</h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>
          An honest checklist of what is live today, what is coming next, and what is under consideration.
          No vaporware — if it says live, it is deployed and working.
        </p>
        <div className="flex gap-4 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: '#22c55e' }}>{live.length} live</span>
          <span>·</span>
          <span style={{ color: '#4f9ef8' }}>{planned.length} planned</span>
          <span>·</span>
          <span>{considering.length} considering</span>
        </div>
      </div>

      <Section title={`Live (${live.length})`}       items={live} />
      <Section title={`Planned (${planned.length})`} items={planned} />
      <Section title={`Considering (${considering.length})`} items={considering} />

      <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
        "Planned" means we intend to build it. "Considering" means we are evaluating demand and feasibility.
        Neither is a commitment or a timeline. This page is updated as work is done.
      </p>
    </div>
  );
}
