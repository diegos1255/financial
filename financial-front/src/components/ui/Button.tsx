import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'outline';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-soft',
  ghost: 'bg-transparent hover:bg-bg-elevated text-slate-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-soft',
  outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  return <button {...rest} className={`${base} ${VARIANT_CLASSES[variant]} ${className}`} />;
}
