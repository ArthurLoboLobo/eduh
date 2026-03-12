'use client';

import { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export default function Checkbox({ label, className = '', id, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        className="
          w-4 h-4 rounded
          border border-border bg-background
          checked:bg-accent-blue checked:border-accent-blue
          focus:outline-none focus:ring-1 focus:ring-accent-blue
          cursor-pointer
          accent-accent-blue
        "
        {...props}
      />
      {label && <span className="text-sm text-primary-text">{label}</span>}
    </label>
  );
}
