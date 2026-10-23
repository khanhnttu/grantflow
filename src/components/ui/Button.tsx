import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  loading,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2';

  const variants = {
    primary: 'text-white',
    secondary: '',
    ghost: 'text-sm',
    danger: 'text-white',
  };

  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: 'white' },
    secondary: { background: 'var(--surface-strong)', color: 'var(--ink)', border: '1px solid var(--border)' },
    ghost: { color: 'var(--muted)', background: 'transparent' },
    danger: { background: 'var(--danger)', color: 'white' },
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], className)}
      style={styles[variant]}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function TxButton({
  isConnected,
  wrongChain,
  chainLabel,
  isPending,
  isConfirming,
  label,
  onClick,
  disabled,
  className,
}: {
  isConnected: boolean;
  wrongChain: boolean;
  chainLabel?: string;
  isPending: boolean;
  isConfirming: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      disabled={!isConnected || isPending || isConfirming || disabled}
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center justify-center gap-2',
        className,
      )}
      style={{ background: 'var(--accent)' }}
    >
      {!isConnected ? (
        'Connect Wallet'
      ) : wrongChain ? (
        `Switch to ${chainLabel ?? 'correct network'}`
      ) : isPending ? (
        <><Loader2 className="size-4 animate-spin" /> Confirm in wallet...</>
      ) : isConfirming ? (
        <><Loader2 className="size-4 animate-spin" /> Confirming...</>
      ) : (
        label
      )}
    </button>
  );
}
