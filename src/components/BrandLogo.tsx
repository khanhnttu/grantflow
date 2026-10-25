/**
 * BrandLogo — GrantFlow original logo mark.
 *
 * LogoMark: rounded-square badge, geometric mark.
 *   Shape inside: a smooth curved path (funds flowing left→right+up)
 *   ending with an arrowhead that merges into a four-point star (payout/win).
 *   Two-color flat — deep navy bg + white mark for light; deep navy bg + sky mark for dark.
 *
 * Logo: icon + "GrantFlow" wordmark, same variants.
 *
 * Props:
 *   size    — square size in px (LogoMark) / height in px (Logo, width auto)
 *   variant — 'light' (default) | 'dark'
 */

import type { SVGProps } from 'react';

export type LogoVariant = 'light' | 'dark';

interface LogoMarkProps extends SVGProps<SVGSVGElement> {
  size?: number;
  variant?: LogoVariant;
}
interface LogoProps {
  size?: number;          // height of the badge; wordmark scales to match
  variant?: LogoVariant;
  className?: string;
}

// ── Palette ───────────────────────────────────────────────────────────────────
// bg: deep navy-blue (#1555A0) — our primary accent, not Arc nor Circle teal
// mark-light: white (#FFFFFF) on navy bg
// mark-dark: bright sky (#7DB8F7) on navy bg (better on dark surfaces)
// The badge rx is 28% of size for a "squircle-ish" rounded square.

const BG = '#1555A0';
const MARK_LIGHT = '#FFFFFF';
const MARK_DARK  = '#91C6FF';

/**
 * Pure SVG mark — a flowing ribbon path (upward arc, left→right)
 * ending with a compact arrowhead + a four-point star burst.
 *
 * Geometry (32×32 viewBox):
 *   Ribbon: cubic Bézier from (5,22) to (20,10) with control pts pulling up-right.
 *   Arrowhead: triangle at (20,10) pointing up-right.
 *   Star: 4-point star centered at (24,8), r_outer=4.5, r_inner=2, rotated 45°.
 */
function Mark({ color }: { color: string }) {
  return (
    <>
      {/* Flowing ribbon / path  — stroke-based so it scales cleanly */}
      <path
        d="M5.5 22 C8 18, 11 14, 16 11 L19 9.5"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead at (19,9.5) pointing upper-right */}
      <polygon
        points="19,9.5 14.5,11.5 17,14.5"
        fill={color}
      />
      {/* 4-point star at (24,8) — prize / payout symbol */}
      <path
        d={star4(24, 8, 4.2, 1.7)}
        fill={color}
      />
    </>
  );
}

/** Generate a 4-point star SVG path centered at (cx,cy). */
function star4(cx: number, cy: number, r1: number, r2: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 4; // start at top
    const r = i % 2 === 0 ? r1 : r2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }
  return 'M' + pts.join(' L') + 'Z';
}

// ── LogoMark (icon only) ──────────────────────────────────────────────────────
export function LogoMark({ size = 32, variant = 'light', ...rest }: LogoMarkProps) {
  const rx = Math.round(size * 0.25); // 25% radius → rounded square
  const mark = variant === 'dark' ? MARK_DARK : MARK_LIGHT;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      {/* Badge background */}
      <rect width="32" height="32" rx={rx} fill={BG} />
      {/* Mark */}
      <Mark color={mark} />
    </svg>
  );
}

// ── Logo (icon + wordmark) ────────────────────────────────────────────────────
export function Logo({ size = 28, variant = 'light', className }: LogoProps) {
  const rx = Math.round(size * 0.25);
  const mark = variant === 'dark' ? MARK_DARK : MARK_LIGHT;
  const textColor = variant === 'dark' ? 'var(--ink, #0f172a)' : 'var(--ink, #0f172a)';
  const fontSize = Math.round(size * 0.46);
  const wordmarkGap = Math.round(size * 0.32);

  return (
    <span
      className={`inline-flex items-center gap-2 select-none${className ? ' ' + className : ''}`}
      style={{ lineHeight: 1 }}
    >
      {/* Badge */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx={rx} fill={BG} />
        <Mark color={mark} />
      </svg>
      {/* Wordmark */}
      <span
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: `${fontSize}px`,
          letterSpacing: '-0.02em',
          color: textColor,
          lineHeight: 1,
          paddingTop: `${wordmarkGap * 0.05}px`,
        }}
      >
        GrantFlow
      </span>
    </span>
  );
}
