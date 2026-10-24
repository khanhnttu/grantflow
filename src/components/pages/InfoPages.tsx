import { ExternalLink, Github } from 'lucide-react';
import { GRANTFLOW_ADDRESS, addrUrl } from '@/lib/chainConfig';

// ── shared prose wrapper ──────────────────────────────────────────────────

function ProseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
        {children}
      </div>
    </section>
  );
}

function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-16">
      <div className="pt-4">
        <h1 className="display text-3xl font-bold" style={{ color: 'var(--ink)' }}>{title}</h1>
        {subtitle && <p className="mt-2 text-base" style={{ color: 'var(--ink-2)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── AboutPage ─────────────────────────────────────────────────────────────

export function AboutPage({ onNav: _onNav }: { onNav?: (p: string) => void }) {
  return (
    <PageShell
      title="About GrantFlow"
      subtitle="An onchain grant and bounty payout platform built on Arc."
    >
      <ProseSection title="What is GrantFlow?">
        <p>
          GrantFlow is a smart-contract platform that automates grant and bounty payouts in USDC.
          Instead of a sponsor manually wiring funds to winners after a review process, GrantFlow
          holds the prize pool in a smart contract from day one. When reviewers approve a submission,
          the winner can claim their USDC directly — no intermediary, no delay, no trust in the operator.
        </p>
        <p>
          It runs on Arc, Circle's blockchain where USDC is the native gas token. This means sponsors
          and builders only need USDC — no ETH, no bridging.
        </p>
      </ProseSection>

      <ProseSection title="Who built it?">
        <p>
          GrantFlow was built with Arc Studio, Circle's development environment for onchain applications.
          The smart contract is written in Solidity (0.8.28), uses OpenZeppelin 5.6.1 libraries, and was
          deployed to Arc Mainnet with a browser wallet.
        </p>
        <p>
          The source code is open-source and available on GitHub.
        </p>
      </ProseSection>

      <ProseSection title="Contract">
        <div
          className="rounded-2xl px-4 py-3 space-y-1"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Arc Mainnet</p>
          <code className="mono text-xs break-all" style={{ color: 'var(--ink-2)' }}>{GRANTFLOW_ADDRESS}</code>
          <div className="flex gap-3 pt-1">
            <a
              href={addrUrl(GRANTFLOW_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent-hover)' }}
            >
              Explorer <ExternalLink className="size-3" />
            </a>
            <a
              href="https://github.com/khanhnttu/grantflow"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent-hover)' }}
            >
              <Github className="size-3" /> GitHub
            </a>
          </div>
        </div>
      </ProseSection>
    </PageShell>
  );
}

// ── DocsPage ──────────────────────────────────────────────────────────────

export function DocsPage({ onNav: _onNav }: { onNav?: (p: string) => void }) {
  return (
    <PageShell
      title="Docs"
      subtitle="GrantFlowV4 — ranked-prize hackathon guide."
    >
      <ProseSection title="How it works (V4)">
        <p>
          GrantFlowV4 runs two-phase hackathons with ranked prizes. The sponsor creates a program with a prize list (1st, 2nd, 3rd…), a submission deadline, a judging deadline, and a panel of judges. USDC is locked in the contract at creation — plus a 1% platform fee.
        </p>
        <p>
          <strong>Phase 1 — Submission</strong> (before submissionDeadline): builders submit their work. Sponsors and judges cannot submit to their own programs.
        </p>
        <p>
          <strong>Phase 2 — Judging</strong> (submissionDeadline to judgingDeadline): judges vote. Each judge has exactly N votes, where N equals the number of prize tiers. One vote per submission per judge. Judges cannot vote on their own submission (the COI guard also prevents this because judges cannot submit).
        </p>
        <p>
          <strong>Finalization</strong> (after judgingDeadline, anyone calls): submissions are ranked by vote count (ties broken by earlier submission ID). The top N submissions with at least 1 vote receive prizes[0], prizes[1], … Any unawarded prizes stay in the contract for the sponsor to reclaim.
        </p>
      </ProseSection>

      <ProseSection title="For organizers">
        <p><strong>1.</strong> Switch to the <em>Organizer</em> role using the role switcher in the top bar.</p>
        <p><strong>2.</strong> Click <em>Create program</em> in the sidebar and fill in the four-step wizard: basics, prizes, judges, review and pay.</p>
        <p><strong>3.</strong> You will approve USDC in one transaction, then create the program in a second. The full prize pool is locked immediately; the 1% fee goes to the platform fee recipient.</p>
        <p><strong>4.</strong> After the judging deadline, anyone may call Finalize. You may then reclaim any unawarded prizes via the program page.</p>
        <p><strong>Cancel</strong> — if no submissions exist yet, you can cancel the program and recover the full prize pool (fee not returned).</p>
      </ProseSection>

      <ProseSection title="For hackers">
        <p><strong>1.</strong> Switch to the <em>Hacker</em> role. Browse programs in <em>Explore V4</em>.</p>
        <p><strong>2.</strong> Click a program during the Submission phase and submit your work link (Open Bounty) or deployed contract address (Onchain Build). One submission per wallet per program.</p>
        <p><strong>3.</strong> After finalization, check <em>My submissions</em>. If you won a prize, a Claim button will appear.</p>
      </ProseSection>

      <ProseSection title="For judges">
        <p><strong>1.</strong> Switch to the <em>Judge</em> role. You will see programs where you are assigned as a judge.</p>
        <p><strong>2.</strong> During the Judging phase, open a program and go to the Submissions tab. Vote on submissions you want to reward. You have as many votes as there are prize tiers.</p>
        <p><strong>3.</strong> You cannot vote on the same submission twice. After the judging deadline, voting closes automatically.</p>
      </ProseSection>

      <ProseSection title="Program types">
        <p><strong>Onchain Build</strong> — submit a deployed contract address. The contract must have bytecode (not an EOA). One submission per contract address per program.</p>
        <p><strong>Open Bounty</strong> — submit a link to your work. One submission per wallet address per program.</p>
      </ProseSection>

      <ProseSection title="Fee model">
        <p>A 1% platform fee (hard-capped at 5%) is taken from the prize pool at program creation. The fee goes to the feeRecipient address configured in the contract. Fees are not refundable, even on cancel.</p>
      </ProseSection>

      <ProseSection title="Network setup">
        <p>Add Arc Mainnet to your wallet if it is not already listed:</p>
        <div
          className="rounded-2xl px-4 py-3 space-y-1 font-mono text-xs"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink-2)' }}
        >
          <p>Network name: Arc Mainnet</p>
          <p>RPC URL: https://rpc.mainnet.arc.io</p>
          <p>Chain ID: 5042</p>
          <p>Currency symbol: USDC</p>
          <p>Block explorer: https://explorer.arc.io</p>
        </div>
        <p>For testing, use Arc Testnet (chain ID 5042002). The "Get test USDC" button in the Arc Studio sidebar funds your wallet with testnet USDC.</p>
      </ProseSection>
    </PageShell>
  );
}

// ── TermsPage ─────────────────────────────────────────────────────────────

export function TermsPage({ onNav: _onNav }: { onNav?: (p: string) => void }) {
  return (
    <PageShell
      title="Terms &amp; Risk Disclaimer"
      subtitle="Please read before using GrantFlow."
    >
      <ProseSection title="No warranties">
        <p>
          GrantFlow is experimental software provided as-is, with no warranties of any kind, express or implied.
          The smart contract has not been audited by an independent third-party security firm.
          Use at your own risk and only with amounts you can afford to lose entirely.
        </p>
      </ProseSection>

      <ProseSection title="Smart contract risk">
        <p>
          All funds are held in a non-upgradeable smart contract on Arc Mainnet. Once deployed, the
          contract logic cannot be changed. A bug or vulnerability cannot be patched. Transactions on
          Arc Mainnet are irreversible.
        </p>
        <p>
          Security measures in place: OpenZeppelin SafeERC20, ReentrancyGuard, Ownable2Step, pull-claim
          payout pattern, 89 automated Foundry tests. These measures reduce risk but do not eliminate it.
        </p>
      </ProseSection>

      <ProseSection title="No intermediary role">
        <p>
          GrantFlow does not custody funds. The smart contract is the only custodian. GrantFlow cannot
          freeze, redirect, or recover funds on your behalf. If you send USDC to the wrong address or
          make a transaction error, there is no recourse.
        </p>
      </ProseSection>

      <ProseSection title="Reviewer and sponsor responsibility">
        <p>
          Sponsors are responsible for choosing reviewers they trust and setting appropriate deadlines,
          prize amounts, and approval thresholds. Reviewers are responsible for their approval decisions.
          GrantFlow does not adjudicate disputes between sponsors and builders.
        </p>
      </ProseSection>

      <ProseSection title="Regulatory compliance">
        <p>
          You are responsible for determining whether your use of GrantFlow complies with the laws and
          regulations applicable to you. GrantFlow does not provide legal or financial advice.
        </p>
      </ProseSection>

      <ProseSection title="Contact">
        <p>
          For questions, bug reports, or security disclosures, open an issue on{' '}
          <a
            href="https://github.com/khanhnttu/grantflow"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
            style={{ color: 'var(--accent-hover)' }}
          >
            GitHub
          </a>.
          For security issues, please open a private security advisory rather than a public issue.
        </p>
      </ProseSection>
    </PageShell>
  );
}
