import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const inputBase =
  'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[--focus]';

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-muted)',
  border: '1px solid var(--border)',
  color: 'var(--ink)',
};

export function Input({ label, hint, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          {label}
        </label>
      )}
      <input
        className={cn(inputBase, className)}
        style={inputStyle}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          {label}
        </label>
      )}
      <textarea
        className={cn(inputBase, 'resize-none', className)}
        style={inputStyle}
        rows={3}
        {...props}
      />
      {hint && (
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
