import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted';
  className?: string;
}

const styles: Record<string, React.CSSProperties> = {
  default: { background: 'rgba(18,45,69,0.08)', color: 'var(--ink-2)' },
  success: { background: 'rgba(26,128,71,0.10)', color: 'var(--success)' },
  danger: { background: 'rgba(186,43,76,0.10)', color: 'var(--danger)' },
  warning: { background: 'rgba(180,120,0,0.10)', color: '#b47800' },
  muted: { background: 'var(--surface-muted)', color: 'var(--muted)' },
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}
      style={styles[variant]}
    >
      {children}
    </span>
  );
}
