'use client';

import { ButtonHTMLAttributes } from 'react';
import Spinner from './Spinner';

type Variant = 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-oxblood hover:bg-oxblood-bright text-page-cream',
  danger: 'bg-confirm-danger hover:bg-confirm-danger-hover text-page-cream shadow-[inset_0_1px_0_rgb(from_var(--page-cream)_r_g_b_/_0.08)] active:shadow-[inset_0_2px_4px_rgb(from_var(--lamp-night)_r_g_b_/_0.28)]',
  ghost: 'bg-transparent hover:bg-desk-surface-hover text-page-cream border border-transparent',
};

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        px-[20px] py-[10px] rounded-[6px] font-label text-[13px]
        cursor-pointer transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'primary' ? 'shadow-[inset_0_1px_0_rgb(from_var(--page-cream)_r_g_b_/_0.08)] active:shadow-[inset_0_2px_4px_rgb(from_var(--lamp-night)_r_g_b_/_0.28)]' : ''}
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
