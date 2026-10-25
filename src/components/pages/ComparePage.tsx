/**
 * Compare — fair comparison table. Fully i18n'd.
 */
import { Check, X, Minus } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import type { StringKey } from '@/lib/i18n';

type MarkValue = string;

function Mark({ value }: { value: MarkValue }) {
  if (value === 'yes') return <Check size={15} className="mx-auto" style={{ color: '#22c55e' }} />;
  if (value === 'no')  return <X     size={15} className="mx-auto" style={{ color: '#ef4444' }} />;
  if (value === 'partial') return <Minus size={15} className="mx-auto" style={{ color: '#f59e0b' }} />;
  return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{value}</span>;
}

export function ComparePage() {
  const { t } = useI18n();

  const rows: { labelKey: StringKey; manual: MarkValue; escrow: MarkValue; gf: MarkValue }[] = [
    { labelKey: 'compare.row.fundsLocked',     manual: t('compare.manual.fundsLocked'),     escrow: t('compare.escrow.fundsLocked'),     gf: t('compare.gf.fundsLocked') },
    { labelKey: 'compare.row.payoutSpeed',     manual: t('compare.manual.payoutSpeed'),     escrow: t('compare.escrow.payoutSpeed'),     gf: t('compare.gf.payoutSpeed') },
    { labelKey: 'compare.row.transparency',    manual: t('compare.manual.transparency'),    escrow: t('compare.escrow.transparency'),    gf: t('compare.gf.transparency') },
    { labelKey: 'compare.row.refundGuarantee', manual: t('compare.manual.refundGuarantee'), escrow: t('compare.escrow.refundGuarantee'), gf: t('compare.gf.refundGuarantee') },
    { labelKey: 'compare.row.fees',            manual: t('compare.manual.fees'),            escrow: t('compare.escrow.fees'),            gf: t('compare.gf.fees') },
    { labelKey: 'compare.row.custody',         manual: t('compare.manual.custody'),         escrow: t('compare.escrow.custody'),         gf: t('compare.gf.custody') },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="pt-4 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          {t('compare.title')}
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t('compare.title')}</h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>{t('compare.sub')}</p>
      </div>

      <div className="flex gap-5 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5"><Check size={13} style={{ color: '#22c55e' }} /> Yes</span>
        <span className="flex items-center gap-1.5"><Minus size={13} style={{ color: '#f59e0b' }} /> Partial</span>
        <span className="flex items-center gap-1.5"><X size={13} style={{ color: '#ef4444' }} /> No</span>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm" style={{ color: 'var(--text)' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-4 py-3 text-left font-medium text-xs" style={{ color: 'var(--text-muted)', width: '36%' }}>
                {t('compare.col.method')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{t('compare.col.manual')}</th>
              <th className="px-4 py-3 text-center font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{t('compare.col.escrow')}</th>
              <th className="px-4 py-3 text-center font-semibold text-xs" style={{ color: 'var(--accent)' }}>{t('compare.col.grantflow')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ labelKey, manual, escrow, gf }, i) => (
              <tr key={labelKey} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--text)' }}>{t(labelKey)}</td>
                <td className="px-4 py-3 text-center"><Mark value={manual} /></td>
                <td className="px-4 py-3 text-center"><Mark value={escrow} /></td>
                <td className="px-4 py-3 text-center" style={{ background: 'rgba(79,158,248,0.04)' }}>
                  <Mark value={gf} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
