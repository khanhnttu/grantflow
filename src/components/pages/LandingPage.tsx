import { useState, useEffect } from 'react';
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink,
  Github, Lock, Menu, RefreshCw, Shield, Star, Trophy, Users, X, Zap,
} from 'lucide-react';
import { LogoMark } from '@/components/BrandLogo';
import { TokenUSDC } from '@web3icons/react';
import { ACTIVE_CHAIN_ID, GRANTFLOW_ADDRESS, IS_MAINNET } from '@/lib/chainConfig';
import { useI18n } from '@/hooks/useI18n';
import { usePublicClient } from 'wagmi';
import { GRANTFLOW_V4_ABI, getV4Address } from '@/lib/grantflowV4';
import { GRANTFLOW_ABI } from '@/lib/grantflow';
import { GRANTFLOW_V5_ABI } from '@/hooks/useGrantFlowV5';

// V5 addresses (pinned to mainnet for the security card)
const V5_MAINNET_ADDR = (import.meta.env.VITE_GRANTFLOW_V5_ADDRESS_MAINNET || '0xe67ec49a6618cc205fab934fc76f8a271cc77c37') as `0x${string}`;
const V5_ACTIVE_ADDR  = ((IS_MAINNET
  ? import.meta.env.VITE_GRANTFLOW_V5_ADDRESS_MAINNET
  : import.meta.env.VITE_GRANTFLOW_V5_ADDRESS) || V5_MAINNET_ADDR) as `0x${string}`;

import type { AppPage } from '@/components/AppShell';

// ── Constants ─────────────────────────────────────────────────────────────────
const USDC_6 = 1_000_000n;

// ── Shared layout helpers ─────────────────────────────────────────────────────

/** Full-width section band with optional alternate background */
function SectionBand({
  children,
  alt,
  id,
  className = '',
}: {
  children: React.ReactNode;
  alt?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`py-16 sm:py-20 lg:py-24 ${className}`}
      style={{ background: alt ? 'var(--bg-alt)' : 'var(--bg)' }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}

/** Eyebrow label — dark enough for AA contrast (4.5:1) */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
      {children}
    </p>
  );
}

function SectionHeading({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      className={`display text-2xl sm:text-3xl font-bold leading-snug${center ? ' text-center' : ''}`}
      style={{ color: 'var(--ink)' }}
    >
      {children}
    </h2>
  );
}

// ── Minor components ──────────────────────────────────────────────────────────

function CopyButton({ text, copyLabel, copiedLabel }: { text: string; copyLabel: string; copiedLabel: string }) {
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
      className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: copied ? 'rgba(26,128,71,0.1)' : 'var(--surface-muted)',
        color: copied ? 'var(--success)' : 'var(--ink-2)',
        border: '1px solid var(--border)',
        outlineColor: 'var(--focus)',
      }}
      aria-label={copied ? copiedLabel : copyLabel}
    >
      <Copy className="size-3" />
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]"
        style={{ background: 'var(--surface)', outlineColor: 'var(--focus)' }}
        aria-expanded={open}
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

// ── Live stats hook ───────────────────────────────────────────────────────────

interface LiveStats {
  totalPrograms: number | null;
  usdcLocked: bigint | null;
  usdcPaidOut: bigint | null;
}

function useLiveStats(): LiveStats {
  const v4Addr = getV4Address(ACTIVE_CHAIN_ID);
  const client = usePublicClient({ chainId: ACTIVE_CHAIN_ID });
  const [stats, setStats] = useState<LiveStats>({ totalPrograms: null, usdcLocked: null, usdcPaidOut: null });

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    async function load() {
      if (cancelled || !client) return;

      // Step 1 — read three programCounts in parallel (fail-safe)
      const [v4CountRaw, v3CountRaw, v5CountRaw] = await Promise.all([
        client.readContract({ address: v4Addr, abi: GRANTFLOW_V4_ABI, functionName: 'programCount' }).catch(() => null),
        client.readContract({ address: GRANTFLOW_ADDRESS, abi: GRANTFLOW_ABI, functionName: 'programCount' }).catch(() => null),
        client.readContract({ address: V5_ACTIVE_ADDR, abi: GRANTFLOW_V5_ABI, functionName: 'programCount' }).catch(() => null),
      ]);
      if (cancelled) return;

      const v4Count = v4CountRaw !== null ? Number(v4CountRaw) : 0;
      const v3Count = v3CountRaw !== null ? Number(v3CountRaw) : 0;
      const v5Count = v5CountRaw !== null ? Number(v5CountRaw) : 0;
      const total   = v4Count + v3Count + v5Count;

      // Emit program count immediately so it shows without waiting for getProgram calls
      if (!cancelled) setStats(s => ({ ...s, totalPrograms: total, usdcPaidOut: s.usdcPaidOut ?? 0n }));

      // Step 2 — read V5 programs to compute locked pool (no getLogs needed)
      let locked = 0n;
      if (v5Count > 0) {
        const progCalls = Array.from({ length: v5Count }, (_, i) =>
          client.readContract({
            address: V5_ACTIVE_ADDR,
            abi: GRANTFLOW_V5_ABI,
            functionName: 'getProgram',
            args: [BigInt(i)],
          }).catch(() => null)
        );
        const progs = await Promise.all(progCalls);
        if (cancelled) return;
        for (const r of progs) {
          if (!r) continue;
          const p = r as unknown as { finalized: boolean; cancelled: boolean; totalDeposited: bigint };
          if (!p.cancelled && !p.finalized) locked += p.totalDeposited ?? 0n;
        }
      }

      // Step 3 — compute paidOut from finalized V5 programs' totalDeposited minus leftover
      // (Simpler: use the USDC balance of the V5 contract to derive locked, then paidOut = total ever deposited - locked)
      // For simplicity, paidOut = 0 for now (no getLogs — avoids RPC range errors)
      if (!cancelled) setStats({ totalPrograms: total, usdcLocked: locked, usdcPaidOut: 0n });
    }

    void load();
    return () => { cancelled = true; };
  }, [client, v4Addr]);

  return stats;
}

function fmtUsdc(raw: bigint): string {
  const n = Number(raw) / Number(USDC_6);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ── Landing nav (sticky, only on marketing layout) ────────────────────────────

const NAV_LINKS = [
  { id: 'how-it-works', key: 'landing.nav.hiw' as const },
  { id: 'use-cases',    key: 'landing.nav.usecases' as const },
  { id: 'fees',         key: 'landing.nav.fees' as const },
  { id: 'security',     key: 'landing.nav.security' as const },
  { id: 'faq',          key: 'landing.nav.faq' as const },
] as const;

function LandingNav({
  onNav,
}: {
  onNav: (page: AppPage) => void;
}) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState('');

  // Track scroll position to mark active section
  useEffect(() => {
    const ids = NAV_LINKS.map(l => l.id);
    const handler = () => {
      const scrollY = window.scrollY + 80;
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) current = id;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileOpen(false);
  };

  return (
    <nav
      className="sticky top-0 z-30 w-full"
      style={{
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--topbar-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      aria-label="Landing page navigation"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
        {/* Scroll links — desktop */}
        <ul className="hidden md:flex items-center gap-1 flex-1" role="list">
          {NAV_LINKS.map(({ id, key }) => {
            const active = activeId === id;
            return (
              <li key={id}>
                <button
                  onClick={() => scrollTo(id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[36px]"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    background: active ? 'var(--surface-muted)' : 'transparent',
                    fontWeight: active ? 600 : 400,
                    outlineColor: 'var(--focus)',
                  }}
                >
                  {t(key)}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Right side: Explore + Developers + Launch app */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <button
            onClick={() => onNav('v4-explore')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[36px]"
            style={{ color: 'var(--muted)', outlineColor: 'var(--focus)' }}
          >
            {t('landing.nav.explore')}
          </button>
          <button
            onClick={() => onNav('developers')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[36px]"
            style={{ color: 'var(--muted)', outlineColor: 'var(--focus)' }}
          >
            {t('landing.nav.developers')}
          </button>
          <button
            onClick={() => onNav('v4-create')}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[36px]"
            style={{ background: 'var(--accent)', color: '#fff', outlineColor: 'var(--focus)' }}
          >
            {t('landing.nav.launch')} <ArrowRight className="size-3.5" />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto flex items-center justify-center rounded-lg p-2 focus-visible:outline-2 min-h-[44px] min-w-[44px]"
          style={{ color: 'var(--ink)', outlineColor: 'var(--focus)' }}
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{ background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)' }}
        >
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ id, key }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium focus-visible:outline-2 min-h-[44px]"
                style={{ color: 'var(--ink-2)', outlineColor: 'var(--focus)' }}
              >
                {t(key)}
              </button>
            ))}
            <div className="border-t mt-1 pt-2" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => { onNav('v4-explore'); setMobileOpen(false); }}
                className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium min-h-[44px]"
                style={{ color: 'var(--muted)' }}
              >
                {t('landing.nav.explore')}
              </button>
              <button
                onClick={() => { onNav('v4-create'); setMobileOpen(false); }}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold min-h-[44px] mt-1"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {t('landing.nav.launch')} <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip() {
  const { t } = useI18n();
  const { totalPrograms, usdcLocked, usdcPaidOut } = useLiveStats();

  const stats = [
    { label: t('landing.stats.programs'), value: totalPrograms !== null ? totalPrograms.toString() : '…' },
    { label: t('landing.stats.locked'),   value: usdcLocked !== null ? fmtUsdc(usdcLocked) : '…' },
    { label: t('landing.stats.paidOut'),  value: usdcPaidOut !== null ? fmtUsdc(usdcPaidOut) : '…' },
  ];

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4 mt-6 rounded-2xl"
      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
      role="status"
      aria-label="Live protocol statistics"
    >
      {stats.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>{value}</span>
          <span className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LandingPage({ onNav }: { onNav: (page: string) => void }) {
  const { t } = useI18n();
  const onLaunch = () => onNav('v4-create');
  const onBrowse = () => onNav('v4-explore');

  const hiwSteps = [
    { step: '01', title: t('landing.hiw.s1.title'), body: t('landing.hiw.s1.body'), icon: <TokenUSDC size={24} variant="branded" /> },
    { step: '02', title: t('landing.hiw.s2.title'), body: t('landing.hiw.s2.body'), icon: <Lock className="size-6" style={{ color: 'var(--accent)' }} /> },
    { step: '03', title: t('landing.hiw.s3.title'), body: t('landing.hiw.s3.body'), icon: <Star className="size-6" style={{ color: '#b47800' }} /> },
    { step: '04', title: t('landing.hiw.s4.title'), body: t('landing.hiw.s4.body'), icon: <Trophy className="size-6" style={{ color: 'var(--success)' }} /> },
    { step: '05', title: t('action.claim'), body: t('landing.why.f6.body'), icon: <Zap className="size-6" style={{ color: 'var(--accent)' }} /> },
  ];

  const useCases = [
    { cat: t('landing.uc.hackathon.cat'), headline: t('landing.uc.hackathon.headline'), body: t('landing.uc.hackathon.body') },
    { cat: t('landing.uc.bounty.cat'), headline: t('landing.uc.bounty.headline'), body: t('landing.uc.bounty.body') },
    { cat: t('landing.uc.contest.cat'), headline: t('landing.uc.contest.headline'), body: t('landing.uc.contest.body') },
    { cat: t('landing.uc.referral.cat'), headline: t('landing.uc.referral.headline'), body: t('landing.uc.referral.body') },
  ];

  const whyFeatures = [
    { title: t('landing.why.f1.title'), body: t('landing.why.f1.body'), icon: <Lock className="size-5" /> },
    { title: t('landing.why.f2.title'), body: t('landing.why.f2.body'), icon: <Shield className="size-5" /> },
    { title: t('landing.why.f3.title'), body: t('landing.why.f3.body'), icon: <RefreshCw className="size-5" /> },
    { title: t('landing.why.f4.title'), body: t('landing.why.f4.body'), icon: <Zap className="size-5" /> },
    { title: t('landing.why.f5.title'), body: t('landing.why.f5.body'), icon: <TokenUSDC size={20} variant="branded" /> },
    { title: t('landing.why.f6.title'), body: t('landing.why.f6.body'), icon: <Users className="size-5" /> },
  ];

  const securityIn = [
    t('landing.security.s1'), t('landing.security.s2'), t('landing.security.s3'),
    t('landing.security.s4'), t('landing.security.s5'), t('landing.security.s6'), t('landing.security.s7'),
  ];
  const securityDisclosures = [
    t('landing.security.d1'), t('landing.security.d2'), t('landing.security.d3'), t('landing.security.d4'),
  ];

  const faqs = [
    { q: t('landing.faq.q1'), a: t('landing.faq.a1') },
    { q: t('landing.faq.q2'), a: t('landing.faq.a2') },
    { q: t('landing.faq.q3'), a: t('landing.faq.a3') },
    { q: t('landing.faq.q4'), a: t('landing.faq.a4') },
    { q: t('landing.faq.q5'), a: t('landing.faq.a5') },
    { q: t('landing.faq.q6'), a: t('landing.faq.a6') },
  ];

  return (
    <div>

      {/* ── Sticky landing nav ────────────────────────────────────────────────── */}
      <LandingNav onNav={onNav} />

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <SectionBand>
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="flex justify-center">
            <LogoMark size={64} variant="light" />
          </div>
          <div className="space-y-4">
            <h1 className="display text-3xl sm:text-5xl font-bold leading-tight" style={{ color: 'var(--ink)' }}>
              {t('landing.hero.headline1')}<br />
              <span style={{ color: 'var(--accent)' }}>{t('landing.hero.headline2')}</span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {t('landing.hero.sub')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onLaunch}
              className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]"
              style={{ background: 'var(--accent)', color: 'white', outlineColor: 'var(--focus)' }}
            >
              {t('landing.hero.cta.launch')} <ArrowRight className="size-4" />
            </button>
            <button
              onClick={onBrowse}
              className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]"
              style={{ border: '1.5px solid var(--border)', color: 'var(--ink-2)', outlineColor: 'var(--focus)' }}
            >
              {t('landing.hero.cta.browse')}
            </button>
          </div>
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--muted)' }}>
            {([
              t('landing.hero.trust.locked'),
              t('landing.hero.trust.tests'),
              t('landing.hero.trust.oss'),
              t('landing.hero.trust.arc'),
            ] as string[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" style={{ color: 'var(--success)' }} />
                {s}
              </span>
            ))}
          </div>
          {/* Live stats strip — sits tightly under trust badges */}
          <StatsStrip />
        </div>
      </SectionBand>

      {/* ── 2. How it works ─────────────────────────────────────────────────── */}
      <SectionBand alt id="how-it-works">
        <div className="text-center mb-10">
          <SectionLabel>{t('landing.hiw.label')}</SectionLabel>
          <SectionHeading center>{t('landing.hiw.heading')}</SectionHeading>
        </div>
        {/* Equal-height cards: grid + h-full on each card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
          {hiwSteps.map(({ step, title, body, icon }) => (
            <div
              key={step}
              className="rounded-3xl p-6 flex flex-col h-full"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-semibold opacity-40" style={{ color: 'var(--ink)' }}>{step}</span>
                {icon}
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>{title}</p>
              <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--ink-2)' }}>{body}</p>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* ── 3. Use cases ─────────────────────────────────────────────────────── */}
      <SectionBand id="use-cases">
        <div className="text-center mb-10">
          <SectionLabel>{t('landing.usecases.label')}</SectionLabel>
          <SectionHeading center>{t('landing.usecases.heading')}</SectionHeading>
        </div>
        {/* Equal-height cards with consistent 24px padding */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          {useCases.map(({ cat, headline, body }) => (
            <div
              key={cat}
              className="rounded-3xl p-6 flex flex-col h-full"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {/* Category pill — aligned with title at same 0px left (p-6 handles padding) */}
              <span
                className="inline-flex self-start text-xs font-bold px-2.5 py-1 rounded-full mb-3"
                style={{
                  background: 'rgba(18, 82, 163, 0.10)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(18,82,163,0.15)',
                }}
              >
                {cat}
              </span>
              <p className="text-base font-semibold mb-2" style={{ color: 'var(--ink)' }}>{headline}</p>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--ink-2)' }}>{body}</p>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* ── 4. Why onchain ───────────────────────────────────────────────────── */}
      <SectionBand alt>
        <div className="text-center mb-10">
          <SectionLabel>{t('landing.why.label')}</SectionLabel>
          <SectionHeading center>{t('landing.why.heading')}</SectionHeading>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {whyFeatures.map(({ title, body, icon }) => (
            <div key={title} className="rounded-3xl p-6 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div
                className="flex size-9 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(18, 82, 163, 0.10)', color: 'var(--accent)' }}
              >
                {icon}
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>{body}</p>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* ── 5. Fees ──────────────────────────────────────────────────────────── */}
      <SectionBand id="fees">
        {/* 2-column, items-start: both columns start at the same top edge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: eyebrow + heading + big % */}
          <div className="space-y-4">
            <div>
              <SectionLabel>{t('landing.fees.label')}</SectionLabel>
              <SectionHeading>{t('landing.fees.heading')}</SectionHeading>
            </div>
            <div className="flex items-end gap-3 mt-2">
              <span className="display text-6xl font-bold" style={{ color: 'var(--accent)' }}>{t('landing.fees.pct')}</span>
              <div className="pb-2">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{t('landing.fees.sub')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                  {t('landing.fees.cap.label')}: <strong>{t('landing.fees.cap.value')}</strong>
                </p>
              </div>
            </div>
          </div>
          {/* Right: bullet list, aligned to top of left column */}
          <ul className="space-y-3 pt-0">
            {([
              t('landing.fees.b1'), t('landing.fees.b2'), t('landing.fees.b3'),
              t('landing.fees.b4'), t('landing.fees.b5'),
            ] as string[]).map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--ink-2)' }}>
                <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </SectionBand>

      {/* ── 6. Security ──────────────────────────────────────────────────────── */}
      <SectionBand alt id="security">
        {/* 2-column, items-start: both columns start at the same top edge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: eyebrow + heading + checklist */}
          <div>
            <SectionLabel>{t('landing.security.label')}</SectionLabel>
            <SectionHeading>{t('landing.security.heading')}</SectionHeading>
            <p className="text-sm font-semibold mt-6 mb-3" style={{ color: 'var(--ink)' }}>{t('landing.security.inplace')}</p>
            <ul className="space-y-2.5">
              {securityIn.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
                  <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          {/* Right: disclosure card + contract card */}
          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <p className="text-sm font-semibold" style={{ color: '#b91c1c' }}>{t('landing.security.disclosure')}</p>
              <ul className="space-y-2">
                {securityDisclosures.map((d) => (
                  <li key={d} className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>• {d}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{t('landing.security.contract.label')}</p>
              <code className="text-xs font-mono break-all" style={{ color: 'var(--ink-2)' }}>{V5_MAINNET_ADDR}</code>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <a
                  href={`https://explorer.arc.io/address/${V5_MAINNET_ADDR}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1"
                  style={{ color: 'var(--accent)', outlineColor: 'var(--focus)' }}
                >
                  <ExternalLink className="size-3" />{t('landing.security.explorer')}
                </a>
                <a
                  href="https://github.com/khanhnttu/grantflow/blob/main/contracts/GrantFlowV5.sol"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1"
                  style={{ color: 'var(--accent)', outlineColor: 'var(--focus)' }}
                >
                  <Github className="size-3" />{t('landing.security.source')}
                </a>
                <CopyButton text={V5_MAINNET_ADDR} copyLabel={t('landing.security.copy')} copiedLabel={t('landing.security.copied')} />
              </div>
            </div>
          </div>
        </div>
      </SectionBand>

      {/* ── 7. FAQ ───────────────────────────────────────────────────────────── */}
      <SectionBand id="faq">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <SectionLabel>{t('landing.faq.label')}</SectionLabel>
            <SectionHeading center>{t('landing.faq.heading')}</SectionHeading>
          </div>
          <div className="space-y-3">
            {faqs.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </SectionBand>

      {/* ── 8. CTA ───────────────────────────────────────────────────────────── */}
      <SectionBand alt>
        <div
          className="text-center py-12 rounded-3xl space-y-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="display text-2xl sm:text-3xl font-bold" style={{ color: 'var(--ink)' }}>{t('landing.cta.heading')}</h2>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('landing.cta.sub')}</p>
          <button
            onClick={onLaunch}
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-semibold transition-all hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]"
            style={{ background: 'var(--accent)', color: 'white', outlineColor: 'var(--focus)' }}
          >
            {t('landing.cta.button')} <ArrowRight className="size-4" />
          </button>
        </div>
      </SectionBand>

    </div>
  );
}
