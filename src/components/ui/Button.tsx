'use client';

import { ButtonHTMLAttributes } from 'react';
import Spinner from './Spinner';

type Variant = 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent-blue hover:bg-accent-blue-hover text-white',
  danger: 'bg-danger-red hover:opacity-90 text-white',
  ghost: 'bg-transparent hover:bg-white/5 text-primary-text border border-border hover:border-border-hover',
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
        px-4 py-2 rounded-md text-sm font-medium
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
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
