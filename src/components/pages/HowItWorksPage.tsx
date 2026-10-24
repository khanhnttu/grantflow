/**
 * How It Works — lifecycle diagram and role breakdown.
 */
import { ArrowRight, DollarSign, Send, Scale, CheckCircle, Download, RotateCcw } from 'lucide-react';

interface StepProps {
  icon: React.ReactNode;
  num: number;
  title: string;
  who: string;
  desc: string;
  last?: boolean;
}

function Step({ icon, num, title, who, desc, last }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {icon}
        </div>
        {!last && <div className="w-px flex-1 mt-2" style={{ background: 'var(--border)', minHeight: 48 }} />}
      </div>
      <div className="pb-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold rounded px-1.5 py-0.5"
            style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Step {num}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(79,158,248,0.1)', color: 'var(--accent)' }}>
            {who}
          </span>
        </div>
        <h3 className="text-base font-bold mt-1.5" style={{ color: 'var(--text)' }}>{title}</h3>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
    </div>
  );
}

function RoleCard({ role, color, items }: { role: string; color: string; items: string[] }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-sm font-bold" style={{ color }}>{role}</div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <ArrowRight size={13} className="flex-shrink-0 mt-0.5" style={{ color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HowItWorksPage() {
  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="pt-4 mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          Lifecycle
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>How GrantFlow works</h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>
          Five on-chain steps from funding to payout — every action is a transaction you sign.
          No trust in an operator required.
        </p>
      </div>

      {/* Lifecycle steps */}
      <div className="mb-12">
        <Step num={1} icon={<DollarSign size={18} />} who="Organizer"
          title="Fund — Create and lock the prize pool"
          desc="The organizer creates a program with a ranked prize list (1st, 2nd, 3rd…), two deadlines (submission and judging), and a panel of judges. USDC is transferred to the contract in the same transaction. A 1% platform fee is deducted upfront. The pool is locked — the organizer cannot withdraw it while submissions exist." />
        <Step num={2} icon={<Send size={18} />} who="Hacker"
          title="Submit — Send your work during the submission window"
          desc="Any wallet except the organizer and judges can submit. Onchain Build programs require a deployed contract address. Open Bounty programs accept a link. One submission per wallet per program. The submission deadline is enforced by the contract — not a UI clock." />
        <Step num={3} icon={<Scale size={18} />} who="Judge"
          title="Judge — Vote with a fixed ballot"
          desc="After the submission deadline, judges can vote. Each judge receives exactly N votes, where N equals the number of prize tiers. A judge can vote on any submission except their own, and cannot vote on the same submission twice. The judging deadline is enforced on-chain." />
        <Step num={4} icon={<CheckCircle size={18} />} who="Anyone"
          title="Finalize — Anyone triggers the ranking"
          desc="After the judging deadline passes, any wallet can call finalize(). The contract ranks all submissions by vote count (ties broken by earlier submission ID). Submissions with at least one vote receive prizes in rank order. The remaining unawarded pool stays for the organizer to reclaim." />
        <Step num={5} icon={<Download size={18} />} who="Winner"
          title="Claim — Winners pull their USDC"
          desc="Winners call claim() to receive their USDC. This is a pull pattern — nobody pushes funds to winners. Only the winner's wallet can claim. The transaction is trustless." last />
      </div>

      {/* Reclaim note */}
      <div className="rounded-xl p-5 mb-10 flex items-start gap-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <RotateCcw size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>Reclaim unawarded prizes</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            If fewer valid submissions than prize tiers exist (e.g. only 2 submissions for a 3-prize pool),
            the organizer can reclaim the unawarded portion after finalization.
          </p>
        </div>
      </div>

      {/* Role breakdown */}
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Who can do what</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <RoleCard role="Organizer" color="#4f9ef8" items={[
          'Create a program and fund it',
          'Cannot submit to own program',
          'Reclaim unawarded prizes after finalize',
          'Cancel before first submission',
        ]} />
        <RoleCard role="Hacker" color="#22c55e" items={[
          'Submit during submission phase',
          'One submission per program',
          'Pull-claim prize after finalize',
        ]} />
        <RoleCard role="Judge" color="#f59e0b" items={[
          'Vote during judging phase',
          'N votes where N = prize tiers',
          'Cannot vote on own submission',
          'Cannot vote twice on same submission',
        ]} />
      </div>

      {/* Cancel */}
      <div className="rounded-xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Cancel (before any submission)</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          The organizer can cancel the program and recover the full prize pool — but only before the first submission exists.
          The platform fee is not refunded on cancel.
        </p>
      </div>
    </div>
  );
}
