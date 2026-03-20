'use client';

import { ButtonHTMLAttributes } from 'react';
import Spinner from './Spinner';

type Variant = 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent-blue hover:bg-accent-blue-hover text-background',
  danger: 'bg-danger-red hover:opacity-90 text-background',
  ghost: 'bg-transparent hover:bg-surface-hover text-primary-text transition-colors',
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
        px-5 py-2.5 rounded-full text-sm font-medium
        cursor-pointer transition-all duration-200 ease-out active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
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
