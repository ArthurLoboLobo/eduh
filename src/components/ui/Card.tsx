import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  clickable?: boolean;
}

export default function Card({ children, clickable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-surface border border-border-subtle rounded-2xl p-5
        transition-colors
        ${clickable ? 'cursor-pointer hover:bg-surface-hover hover:border-border-hover' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
