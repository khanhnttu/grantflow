/**
 * AppFooter — product-grade footer with column nav + live-data tagline.
 */
import { ExternalLink } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import type { AppPage } from '@/components/AppShell';
import { LogoMark } from '@/components/BrandLogo';

interface FooterProps {
  onNav: (p: AppPage) => void;
}


interface NavLinkProps {
  page?: AppPage;
  href?: string;
  onNav: (p: AppPage) => void;
  children: React.ReactNode;
}
function FooterLink({ page, href, onNav, children }: NavLinkProps) {
  const cls = 'text-xs transition-colors hover:opacity-100 opacity-70';
  const style = { color: 'var(--text-muted)' };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls + ' flex items-center gap-1'} style={style}>
        {children} <ExternalLink size={9} />
      </a>
    );
  }
  return (
    <button onClick={() => page && onNav(page)} className={cls + ' text-left'} style={style}>
      {children}
    </button>
  );
}

export function AppFooter({ onNav }: FooterProps) {
  const { t } = useI18n();

  return (
    <footer className="mt-auto pt-12 pb-8 px-6 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Top row: logo + mission + columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <LogoMark size={22} variant="light" />
              <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>GrantFlow</span>
            </div>
            <p className="text-xs leading-relaxed opacity-70" style={{ color: 'var(--text-muted)' }}>
              {t('footer.tagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('footer.product')}
            </p>
            <nav className="flex flex-col gap-2" aria-label="Product navigation">
              <FooterLink page="v4-explore" onNav={onNav}>{t('nav.explore')}</FooterLink>
              <FooterLink page="v4-create"  onNav={onNav}>{t('nav.create')}</FooterLink>
              <FooterLink page="how-it-works" onNav={onNav}>{t('nav.howItWorks')}</FooterLink>
              <FooterLink page="compare"    onNav={onNav}>{t('nav.compare')}</FooterLink>
            </nav>
          </div>

          {/* Build */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('footer.build')}
            </p>
            <nav className="flex flex-col gap-2" aria-label="Build navigation">
              <FooterLink page="developers"     onNav={onNav}>{t('nav.developers')}</FooterLink>
              <FooterLink href="https://github.com/khanhnttu/grantflow" onNav={onNav}>{t('footer.source')}</FooterLink>
              <FooterLink page="built-vs-planned" onNav={onNav}>{t('nav.builtVsPlanned')}</FooterLink>
              <FooterLink href="https://explorer.arc.io/address/0x41ffdab65fca60bda9beb455285d29ab753c3d2e" onNav={onNav}>{t('footer.explorer')}</FooterLink>
            </nav>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('footer.company')}
            </p>
            <nav className="flex flex-col gap-2" aria-label="Company navigation">
              <FooterLink page="about" onNav={onNav}>{t('nav.about')}</FooterLink>
              <FooterLink page="terms" onNav={onNav}>{t('nav.terms')}</FooterLink>
              <FooterLink href="https://github.com/khanhnttu/grantflow/issues" onNav={onNav}>{t('footer.contact')}</FooterLink>
            </nav>
          </div>
        </div>

        {/* Live-data statement */}
        <div className="rounded-xl px-4 py-3 mb-6 text-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          {t('footer.live')}
        </div>

        {/* Bottom */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          <span>© 2026 GrantFlow</span>
          <span>Built with Arc Studio · open source</span>
        </div>
      </div>
    </footer>
  );
}
