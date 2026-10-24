import { useState } from 'react';
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink,
  Github, Lock, RefreshCw, Shield, Zap,
} from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import { GRANTFLOW_ADDRESS, addrUrl } from '@/lib/chainConfig';

// ── helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="display text-2xl sm:text-3xl font-bold leading-snug" style={{ color: 'var(--ink)' }}>
      {children}
    </h2>
  );
}

function Divider() {
  return <div className="my-16 border-t" style={{ borderColor: 'var(--border)' }} />;
}

// ── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
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
      className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-all"
      style={{ background: copied ? 'rgba(26,128,71,0.1)' : 'var(--surface-muted)', color: copied ? 'var(--success)' : 'var(--ink-2)', border: '1px solid var(--border)' }}
      title="Copy address"
    >
      <Copy className="size-3" />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        style={{ background: 'var(--surface)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{q}</span>
        {open
          ? <ChevronUp className="size-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />
          : <ChevronDown className="size-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />}
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1" style={{ background: 'var(--surface-muted)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{a}</p>
        </div>
      )}
    </div>
  );
}

// ── LandingPage ──────────────────────────────────────────────────────────────

interface LandingPageProps {
  onNav: (page: string) => void;


}

export function LandingPage({ onNav }: LandingPageProps) {
  const onLaunch = () => onNav('sponsor');
  const onBrowse = () => onNav('explore');
  return (
    <div className="space-y-0 pb-16">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 text-center space-y-6">
        {/* Logo mark */}
        <div className="flex justify-center mb-2">
          <div
            className="flex size-16 items-center justify-center rounded-3xl shadow-md"
            style={{ background: 'var(--accent)' }}
          >
            <span className="display text-3xl font-bold text-white">G</span>
          </div>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="display text-3xl sm:text-5xl font-bold leading-tight" style={{ color: 'var(--ink)' }}>
            Grant &amp; bounty payouts,<br />
            <span style={{ color: 'var(--accent)' }}>fully onchain.</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Sponsors lock a USDC prize pool in a smart contract. Reviewers vote.
            Winners claim instantly — no manual bank wires, no delays, no trust required.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onLaunch}
            className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Launch a program
            <ArrowRight className="size-4" />
          </button>
          <button
            onClick={onBrowse}
            className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all hover:bg-black/5"
            style={{ border: '1.5px solid var(--border)', color: 'var(--ink-2)' }}
          >
            Browse programs
          </button>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs" style={{ color: 'var(--muted)' }}>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" style={{ color: 'var(--success)' }} />
            Funds locked upfront in smart contract
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" style={{ color: 'var(--success)' }} />
            157 Foundry tests (v3 + v4)
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" style={{ color: 'var(--success)' }} />
            Open-source on GitHub
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" style={{ color: 'var(--success)' }} />
            Arc Mainnet — USDC native gas
          </span>
        </div>
      </section>

      <Divider />

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <SectionLabel>How it works</SectionLabel>
          <SectionHeading>Four steps. Fully onchain.</SectionHeading>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Fund the pool',
              body: 'A sponsor creates a program, sets prize amounts, slots, a deadline, and locks USDC into the contract. Funds are held by the smart contract — not by GrantFlow.',
              icon: <TokenUSDC size={24} variant="branded" />,
            },
            {
              step: '02',
              title: 'Collect submissions',
              body: 'Builders submit their project contract address (for Onchain Build programs) or a work link (for Open Bounty programs) before the deadline.',
              icon: <Lock className="size-6" style={{ color: 'var(--accent)' }} />,
            },
            {
              step: '03',
              title: 'Reviewers approve',
              body: 'Designated reviewers evaluate submissions and cast approval votes. A submission is eligible once it reaches the sponsor\'s threshold.',
              icon: <CheckCircle2 className="size-6" style={{ color: 'var(--success)' }} />,
            },
            {
              step: '04',
              title: 'Winners claim USDC',
              body: 'Approved winners call claim() directly on the contract. USDC lands in their wallet in the same transaction — no intermediary involved.',
              icon: <Zap className="size-6" style={{ color: '#b47800' }} />,
            },
          ].map(({ step, title, body, icon }) => (
            <div
              key={step}
              className="rounded-3xl p-5 space-y-3 flex flex-col"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="display text-xs font-bold tracking-wider"
                  style={{ color: 'var(--accent)', opacity: 0.5 }}
                >
                  {step}
                </span>
                {icon}
              </div>
              <h3 className="display text-base font-bold" style={{ color: 'var(--ink)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Use cases ─────────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <SectionLabel>Use cases</SectionLabel>
          <SectionHeading>Built for every kind of program</SectionHeading>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              category: 'Hackathon',
              headline: 'Onchain Build programs',
              body: 'Require participants to deploy a smart contract. The contract address is stored as proof of work onchain. Only one submission per deployed contract.',
              color: '#1061a6',
              bg: 'rgba(16,97,166,0.06)',
            },
            {
              category: 'Open Bounty',
              headline: 'Open Bounty programs',
              body: 'No contract required — perfect for design challenges, content bounties, referral programs, and any task where the deliverable is off-chain.',
              color: '#1a7d47',
              bg: 'rgba(26,125,71,0.06)',
            },
            {
              category: 'Contest',
              headline: 'Contests',
              body: 'Run a competition with a fixed prize pool. Multiple winners each claim an equal share. Unused slots are returnable to the sponsor after the deadline.',
              color: '#b47800',
              bg: 'rgba(180,120,0,0.06)',
            },
            {
              category: 'Referral',
              headline: 'Referral rewards',
              body: 'Pay out a fixed USDC amount for each valid referral. Reviewers verify each submission. One reward per wallet address per program.',
              color: '#7c3aed',
              bg: 'rgba(124,58,237,0.06)',
            },
          ].map(({ category, headline, body, color, bg }) => (
            <div
              key={category}
              className="rounded-3xl p-6 space-y-2"
              style={{ background: bg, border: `1px solid ${color}22` }}
            >
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: `${color}18`, color }}
              >
                {category}
              </span>
              <h3 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>{headline}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Why onchain ───────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <SectionLabel>Why onchain</SectionLabel>
          <SectionHeading>No trust in the operator required</SectionHeading>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Funds locked upfront',
              body: 'USDC is transferred into the contract when a program is created. GrantFlow never holds your funds — the contract does.',
            },
            {
              title: 'Transparent payouts',
              body: 'Every approval vote and every claim is a public transaction. Anyone can verify the payout trail on the Arc explorer.',
            },
            {
              title: 'Unused funds returned',
              body: 'If a program ends with unclaimed slots, the sponsor can reclaim the remaining USDC after the deadline. Nothing is locked permanently.',
            },
            {
              title: 'Sub-second finality',
              body: 'Arc confirms transactions in under a second. Winners see USDC in their wallet almost instantly after calling claim().',
            },
            {
              title: 'Gas paid in USDC',
              body: 'Arc\'s native gas token is USDC. Sponsors and builders never need to hold ETH or any other volatile gas token.',
            },
            {
              title: 'Pull-claim, not push-pay',
              body: 'Winners initiate their own payout. This pattern eliminates the risk of a single sponsor revert blocking all other winners.',
            },
          ].map(({ title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-5 space-y-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Fees ──────────────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <SectionLabel>Fees</SectionLabel>
          <SectionHeading>Simple, transparent, capped</SectionHeading>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <div
            className="rounded-3xl p-6 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="display text-4xl font-bold" style={{ color: 'var(--ink)' }}>1%</p>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
                  Platform fee charged once at program creation.
                </p>
              </div>
              <div
                className="rounded-2xl px-4 py-2 text-center flex-shrink-0"
                style={{ background: 'rgba(16,97,166,0.08)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Hard cap</p>
                <p className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>5%</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              {[
                'Fees are collected in USDC at program creation — a single transaction',
                'The fee never enters the prize pool; prize math is always fee-free',
                'Unused prize funds reclaimed by the sponsor are never subject to additional fees',
                'Fee rate and recipient are publicly readable on the contract',
                'The hard cap of 5% is enforced in the contract and cannot be overridden',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Security ──────────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <SectionLabel>Security</SectionLabel>
          <SectionHeading>What we have done — and what we have not</SectionHeading>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {/* What we have */}
          <div
            className="rounded-3xl p-6 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--success)' }}>
              <Shield className="size-4" />
              What is in place
            </h3>
            <div className="space-y-2">
              {[
                '157 Foundry tests (89 v3 + 68 v4) — happy paths, reverts, fuzz over fee math, both program modes, ranked prizes, and contest phases',
                'Automated security review and functional review by Arc Studio on every contract change',
                'OpenZeppelin SafeERC20 (safe transfer wrappers), ReentrancyGuard, and Ownable2Step',
                'Pull-claim payout pattern — winners call claim() themselves; no push loop that can revert-lock',
                'Post-deadline approval guard — reviewers cannot approve after the deadline passes',
                'Fee isolation — fees are structurally separated from prize pools at the storage level',
                'Contract source is fully open-source and verifiable on GitHub',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Honest disclosure */}
          <div
            className="rounded-3xl p-6 space-y-3"
            style={{ background: 'rgba(180,120,0,0.06)', border: '1px solid rgba(180,120,0,0.25)' }}
          >
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#b47800' }}>
              <RefreshCw className="size-4" />
              Honest disclosure
            </h3>
            <div className="space-y-2">
              {[
                'This contract has NOT been audited by an independent third-party security firm.',
                'Use small amounts. Do not lock funds you cannot afford to lose.',
                'The contract is not upgradeable. A bug cannot be patched without redeploying.',
                'Arc Mainnet is a production network. Transactions are irreversible.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-sm mt-0.5 flex-shrink-0" style={{ color: '#b47800' }}>!</span>
                  <p className="text-sm font-medium" style={{ color: '#92580a' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contract address */}
          <div
            className="rounded-2xl px-5 py-4 space-y-2"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Verified contract — Arc Mainnet
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="mono text-xs break-all" style={{ color: 'var(--ink-2)' }}>
                {GRANTFLOW_ADDRESS}
              </code>
              <CopyButton text={GRANTFLOW_ADDRESS} />
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
                href="https://github.com/khanhnttu/grantflow/blob/main/contracts/GrantFlow.sol"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--accent-hover)' }}
              >
                <Github className="size-3" /> Source
              </a>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <SectionLabel>FAQ</SectionLabel>
          <SectionHeading>Common questions</SectionHeading>
        </div>

        <div className="max-w-2xl mx-auto space-y-2">
          <FAQItem
            q="Which wallet do I need?"
            a="Any EVM wallet that supports Arc Mainnet (chain ID 5042). MetaMask, Coinbase Wallet, and WalletConnect-compatible wallets work. Add Arc Mainnet manually if it is not listed: RPC https://rpc.mainnet.arc.io, Chain ID 5042, currency symbol USDC."
          />
          <FAQItem
            q="Which network and token are used?"
            a="GrantFlow runs on Arc Mainnet. The token is USDC — and on Arc, USDC is also the native gas token, so you only need USDC in your wallet. No ETH or other token is required."
          />
          <FAQItem
            q="What happens if no winners are approved?"
            a="The sponsor can call reclaim() after the deadline to recover all unclaimed USDC from the prize pool. The 1% platform fee is not refunded — it was collected at program creation."
          />
          <FAQItem
            q="Can a sponsor withdraw funds early?"
            a="No. Funds are locked in the contract until the deadline passes. After the deadline, only the sponsor can reclaim unused slots. This guarantee is enforced by the smart contract, not by GrantFlow."
          />
          <FAQItem
            q="Who controls the platform fee?"
            a="The fee rate (currently 1%, hard-capped at 5%) and the fee recipient address are set in the contract constructor and can only be updated by the contract owner via Ownable2Step. The current owner is the deployer wallet. Both values are publicly readable onchain."
          />
          <FAQItem
            q="Is the contract upgradeable?"
            a="No. The contract is not upgradeable. There is no proxy, no admin key that can change the logic, and no pause function. What is deployed is what runs — permanently."
          />
        </div>
      </section>

      <Divider />

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="text-center py-8 space-y-4">
        <SectionHeading>Ready to run your first program?</SectionHeading>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          Connect your wallet and launch in under two minutes.
        </p>
        <button
          onClick={onLaunch}
          className="inline-flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Launch a program
          <ArrowRight className="size-4" />
        </button>
      </section>

    </div>
  );
}
