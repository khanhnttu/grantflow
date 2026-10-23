import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const glass = {
  card: {
    background: 'var(--surface)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 3px rgba(18,45,69,0.06), 0 4px 16px rgba(18,45,69,0.04)',
  } as React.CSSProperties,
  inner: {
    background: 'var(--surface-muted)',
    border: '1px solid var(--border)',
  } as React.CSSProperties,
};

export { glass };

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={cn('rounded-3xl p-5', className)}
      style={{ ...glass.card, ...style }}
    >
      {children}
    </div>
  );
}

export function InnerCard({ children, className, style }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl p-4', className)}
      style={{ ...glass.inner, ...style }}
    >
      {children}
    </div>
  );
}
