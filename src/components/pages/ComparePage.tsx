/**
 * Compare — fair comparison table: manual payouts vs platform escrow vs GrantFlow onchain.
 * No competitor names, no logos.
 */
import { Check, X, Minus } from 'lucide-react';

interface Row {
  label: string;
  note?: string;
  manual: string;
  platformEscrow: string;
  grantflow: string;
}

const ROWS: Row[] = [
  {
    label: 'Funds locked upfront',
    note: 'Prize pool is locked before judging begins',
    manual: 'no',
    platformEscrow: 'partial',
    grantflow: 'yes',
  },
  {
    label: 'Sponsor cannot withdraw after submissions',
    manual: 'no',
    platformEscrow: 'partial',
    grantflow: 'yes',
  },
  {
    label: 'Payout speed',
    manual: 'Days to weeks',
    platformEscrow: 'Hours to days',
    grantflow: 'Instant after finalize',
  },
  {
    label: 'Transparent on-chain record',
    note: 'Every action verifiable by anyone',
    manual: 'no',
    platformEscrow: 'partial',
    grantflow: 'yes',
  },
  {
    label: 'Refund guarantee if cancelled',
    manual: 'no',
    platformEscrow: 'partial',
    grantflow: 'yes',
  },
  {
    label: 'Platform fee',
    manual: '0%',
    platformEscrow: 'Varies',
    grantflow: '1% (capped 5%)',
  },
  {
    label: 'Custody of funds',
    manual: 'Sponsor wallet',
    platformEscrow: 'Platform holds',
    grantflow: 'Smart contract only',
  },
  {
    label: 'Requires platform trust',
    manual: 'yes',
    platformEscrow: 'yes',
    grantflow: 'no',
  },
  {
    label: 'Ranked prizes (1st, 2nd, 3rd…)',
    manual: 'yes',
    platformEscrow: 'partial',
    grantflow: 'yes',
  },
  {
    label: 'Judge vote recorded on-chain',
    manual: 'no',
    platformEscrow: 'no',
    grantflow: 'yes',
  },
  {
    label: 'Open source and auditable',
    manual: 'no',
    platformEscrow: 'no',
    grantflow: 'yes',
  },
];

function Mark({ value }: { value: string }) {
  if (value === 'yes') return <Check size={15} className="mx-auto" style={{ color: '#22c55e' }} />;
  if (value === 'no')  return <X    size={15} className="mx-auto" style={{ color: '#ef4444' }} />;
  if (value === 'partial') return <Minus size={15} className="mx-auto" style={{ color: '#f59e0b' }} />;
  return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{value}</span>;
}

export function ComparePage() {
  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="pt-4 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          Comparison
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
          Manual payouts vs escrow vs onchain
        </h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>
          A straightforward comparison of three ways to run a grant or bounty program.
          No competitor names — judge the properties, not the brand.
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-5 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5"><Check size={13} style={{ color: '#22c55e' }} /> Yes / native</span>
        <span className="flex items-center gap-1.5"><Minus size={13} style={{ color: '#f59e0b' }} /> Partial / depends</span>
        <span className="flex items-center gap-1.5"><X size={13} style={{ color: '#ef4444' }} /> No</span>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm" style={{ color: 'var(--text)' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-4 py-3 text-left font-medium text-xs" style={{ color: 'var(--text-muted)', width: '40%' }}>Property</th>
              <th className="px-4 py-3 text-center font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Manual payouts</th>
              <th className="px-4 py-3 text-center font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Platform escrow</th>
              <th className="px-4 py-3 text-center font-semibold text-xs" style={{ color: 'var(--accent)' }}>GrantFlow onchain</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label}
                style={{ borderBottom: i < ROWS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{row.label}</div>
                  {row.note && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{row.note}</div>}
                </td>
                <td className="px-4 py-3 text-center"><Mark value={row.manual} /></td>
                <td className="px-4 py-3 text-center"><Mark value={row.platformEscrow} /></td>
                <td className="px-4 py-3 text-center"
                  style={{ background: 'rgba(79,158,248,0.04)' }}>
                  <Mark value={row.grantflow} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        "Platform escrow" refers to a generic model where a centralised service holds funds on behalf
        of participants. Specific implementations vary. This table reflects general properties of each
        model, not any individual product. GrantFlow is experimental software — see the Terms page.
      </p>
    </div>
  );
}
