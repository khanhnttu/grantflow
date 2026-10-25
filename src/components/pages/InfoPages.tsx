import { ExternalLink, Github } from 'lucide-react';
import { GRANTFLOW_ADDRESS, addrUrl } from '@/lib/chainConfig';
import { useI18n } from '@/hooks/useI18n';

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

// ── AboutPage ────────────────────────────────────────────────────────────────

export function AboutPage({ onNav: _onNav }: { onNav?: (p: string) => void }) {
  const { t } = useI18n();
  return (
    <PageShell title={t('about.title')} subtitle={t('about.sub')}>
      <ProseSection title={t('about.what.title')}>
        <p>{t('about.what.p1')}</p>
        <p>{t('about.what.p2')}</p>
      </ProseSection>
      <ProseSection title={t('about.who.title')}>
        <p>{t('about.who.p1')}</p>
        <p>{t('about.who.p2')}</p>
      </ProseSection>
      <ProseSection title={t('about.contract.title')}>
        <div className="rounded-2xl px-4 py-3 space-y-1"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {t('about.contract.network')}
          </p>
          <code className="mono text-xs break-all" style={{ color: 'var(--ink-2)' }}>{GRANTFLOW_ADDRESS}</code>
          <div className="flex gap-3 pt-1">
            <a href={addrUrl(GRANTFLOW_ADDRESS)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent-hover)' }}>
              {t('about.contract.explorer')} <ExternalLink className="size-3" />
            </a>
            <a href="https://github.com/khanhnttu/grantflow" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent-hover)' }}>
              <Github className="size-3" /> GitHub
            </a>
          </div>
        </div>
      </ProseSection>
    </PageShell>
  );
}

// ── DocsPage ─────────────────────────────────────────────────────────────────

export function DocsPage({ onNav: _onNav }: { onNav?: (p: string) => void }) {
  const { t } = useI18n();
  return (
    <PageShell title={t('docs.title')} subtitle={t('docs.sub')}>
      <ProseSection title={t('docs.hiw.title')}>
        <p>{t('docs.hiw.p1')}</p>
        <p>{t('docs.hiw.p2')}</p>
        <p>{t('docs.hiw.p3')}</p>
        <p>{t('docs.hiw.p4')}</p>
      </ProseSection>
      <ProseSection title={t('docs.hacker.title')}>
        <p>{t('docs.hacker.p1')}</p>
        <p>{t('docs.hacker.p2')}</p>
        <p>{t('docs.hacker.p3')}</p>
      </ProseSection>
      <ProseSection title={t('docs.judge.title')}>
        <p>{t('docs.judge.p1')}</p>
        <p>{t('docs.judge.p2')}</p>
        <p>{t('docs.judge.p3')}</p>
      </ProseSection>
      <ProseSection title={t('docs.types.title')}>
        <p>{t('docs.types.onchain')}</p>
        <p>{t('docs.types.bounty')}</p>
      </ProseSection>
      <ProseSection title={t('docs.fee.title')}>
        <p>{t('docs.fee.body')}</p>
      </ProseSection>
      <ProseSection title={t('docs.network.title')}>
        <p>{t('docs.network.p1')}</p>
        <div className="rounded-2xl px-4 py-3 space-y-1 font-mono text-xs"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink-2)' }}>
          <p>Network name: Arc Mainnet</p>
          <p>RPC URL: https://rpc.mainnet.arc.io</p>
          <p>Chain ID: 5042</p>
          <p>Currency symbol: USDC</p>
          <p>Block explorer: https://explorer.arc.io</p>
        </div>
        <p>{t('docs.network.p2')}</p>
      </ProseSection>
    </PageShell>
  );
}

// ── TermsPage ─────────────────────────────────────────────────────────────────

export function TermsPage({ onNav: _onNav }: { onNav?: (p: string) => void }) {
  const { t } = useI18n();
  return (
    <PageShell title={t('terms.title')} subtitle={t('terms.sub')}>
      <ProseSection title={t('terms.noWarranties.title')}>
        <p>{t('terms.noWarranties.body')}</p>
      </ProseSection>
      <ProseSection title={t('terms.contractRisk.title')}>
        <p>{t('terms.contractRisk.p1')}</p>
        <p>{t('terms.contractRisk.p2')}</p>
      </ProseSection>
      <ProseSection title={t('terms.noIntermediary.title')}>
        <p>{t('terms.noIntermediary.body')}</p>
      </ProseSection>
      <ProseSection title={t('terms.responsibility.title')}>
        <p>{t('terms.responsibility.body')}</p>
      </ProseSection>
      <ProseSection title={t('terms.regulatory.title')}>
        <p>{t('terms.regulatory.body')}</p>
      </ProseSection>
      <ProseSection title={t('terms.contact.title')}>
        <p>
          {t('terms.contact.body')}{' '}
          <a href="https://github.com/khanhnttu/grantflow" target="_blank" rel="noreferrer"
            className="font-medium underline" style={{ color: 'var(--accent-hover)' }}>
            GitHub
          </a>.
        </p>
      </ProseSection>
    </PageShell>
  );
}
