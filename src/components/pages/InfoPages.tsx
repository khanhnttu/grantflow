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

export function AboutPage() {
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

export function DocsPage() {
  return (
    <PageShell
      title="Docs"
      subtitle="A short guide for sponsors, builders, and reviewers."
    >
      <ProseSection title="For sponsors">
        <p><strong>1. Connect your wallet</strong> — use any EVM wallet on Arc Mainnet (chain ID 5042, RPC https://rpc.mainnet.arc.io). USDC is the only token you need.</p>
        <p><strong>2. Create a program</strong> — go to the Sponsor tab. Choose a program type (Onchain Build or Open Bounty), set a prize amount per winner, the number of slots, a deadline, and assign reviewers by their wallet addresses.</p>
        <p><strong>3. Approve USDC + pay</strong> — you will be prompted for two transactions: first an ERC-20 approve (allowing the contract to pull USDC), then the createProgram call which locks prize pool + 1% fee.</p>
        <p><strong>4. After the deadline</strong> — if any prize slots go unclaimed, call reclaim() from the Sponsor tab to recover the remaining USDC.</p>
      </ProseSection>

      <ProseSection title="For builders">
        <p><strong>1. Browse programs</strong> — visit the Programs tab to see all active programs, their prize amounts, deadlines, and submission counts.</p>
        <p><strong>2. Submit</strong> — go to the Builder tab. For Onchain Build programs, provide the address of your deployed smart contract. For Open Bounty programs, provide a link to your work. Only one submission per address per program is allowed.</p>
        <p><strong>3. Wait for review</strong> — reviewers will evaluate submissions and cast approval votes. You can track approval counts in the Builder tab.</p>
        <p><strong>4. Claim your prize</strong> — once your submission reaches the approval threshold and a slot is available, a Claim button will appear. Click it to receive USDC directly in your wallet.</p>
      </ProseSection>

      <ProseSection title="For reviewers">
        <p><strong>1. You must be assigned</strong> — only wallet addresses the sponsor listed as reviewers can cast approval votes for a program.</p>
        <p><strong>2. Approve submissions</strong> — go to the Reviewer tab. You will see all submissions for programs where you are a reviewer. Click Approve to cast your vote on-chain.</p>
        <p><strong>3. Threshold</strong> — a submission is eligible for payout only after it accumulates the number of approvals the sponsor set at creation. You cannot approve the same submission twice, and you cannot approve after the deadline.</p>
        <p><strong>4. No payment to reviewers</strong> — reviewer roles are not paid by the protocol. Compensation (if any) is handled off-chain between the sponsor and reviewers.</p>
      </ProseSection>

      <ProseSection title="Program types">
        <p><strong>Onchain Build</strong> — the submitter provides a deployed contract address. The contract must have bytecode (not an EOA). One submission per contract address per program.</p>
        <p><strong>Open Bounty</strong> — the submitter provides a work link. No deployed contract is required. One submission per wallet address per program.</p>
      </ProseSection>

      <ProseSection title="Supported categories">
        <p>Each program has one category: Hackathon, Bounty, Contest, or Referral. Categories are informational and affect how programs appear in filters — they do not change the contract logic.</p>
      </ProseSection>

      <ProseSection title="Network setup">
        <p>Add Arc Mainnet to your wallet manually if it is not already listed:</p>
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
      </ProseSection>
    </PageShell>
  );
}

// ── TermsPage ─────────────────────────────────────────────────────────────

export function TermsPage() {
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
