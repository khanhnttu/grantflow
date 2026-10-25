/**
 * How It Works — lifecycle diagram and role breakdown. Fully i18n'd.
 */
import { ArrowRight, DollarSign, Send, Scale, CheckCircle, Download, RotateCcw } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

function Step({ icon, num, title, who, desc, last, stepLabel }: {
  icon: React.ReactNode; num: number; title: string; who: string;
  desc: string; last?: boolean; stepLabel: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}>{icon}</div>
        {!last && <div className="w-px flex-1 mt-2" style={{ background: 'var(--border)', minHeight: 48 }} />}
      </div>
      <div className="pb-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold rounded px-1.5 py-0.5"
            style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {stepLabel} {num}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(79,158,248,0.1)', color: 'var(--accent)' }}>{who}</span>
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
            <ArrowRight size={13} className="flex-shrink-0 mt-0.5" style={{ color }} />{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HowItWorksPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="pt-4 mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          {t('hiw.label')}
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t('hiw.title')}</h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>{t('hiw.sub')}</p>
      </div>

      <div className="mb-12">
        <Step num={1} icon={<DollarSign size={18} />} who={t('hiw.s1.who')} title={t('hiw.s1.title')} desc={t('hiw.s1.desc')} stepLabel={t('hiw.step')} />
        <Step num={2} icon={<Send size={18} />}       who={t('hiw.s2.who')} title={t('hiw.s2.title')} desc={t('hiw.s2.desc')} stepLabel={t('hiw.step')} />
        <Step num={3} icon={<Scale size={18} />}      who={t('hiw.s3.who')} title={t('hiw.s3.title')} desc={t('hiw.s3.desc')} stepLabel={t('hiw.step')} />
        <Step num={4} icon={<CheckCircle size={18} />} who={t('hiw.s4.who')} title={t('hiw.s4.title')} desc={t('hiw.s4.desc')} stepLabel={t('hiw.step')} />
        <Step num={5} icon={<Download size={18} />}   who={t('hiw.s5.who')} title={t('hiw.s5.title')} desc={t('hiw.s5.desc')} stepLabel={t('hiw.step')} last />
      </div>

      <div className="rounded-xl p-5 mb-10 flex items-start gap-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <RotateCcw size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{t('hiw.reclaim.title')}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('hiw.reclaim.body')}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>{t('hiw.roles.title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <RoleCard role={t('hiw.org.role')} color="#4f9ef8" items={[t('hiw.org.i1'), t('hiw.org.i2'), t('hiw.org.i3'), t('hiw.org.i4')]} />
        <RoleCard role={t('hiw.hacker.role')} color="#22c55e" items={[t('hiw.hacker.i1'), t('hiw.hacker.i2'), t('hiw.hacker.i3')]} />
        <RoleCard role={t('hiw.judge.role')} color="#f59e0b" items={[t('hiw.judge.i1'), t('hiw.judge.i2'), t('hiw.judge.i3'), t('hiw.judge.i4')]} />
      </div>

      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{t('hiw.cancel.title')}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('hiw.cancel.body')}</p>
      </div>
    </div>
  );
}
