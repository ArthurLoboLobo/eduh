import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  clickable?: boolean;
}

export default function Card({ children, clickable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-surface border border-border rounded-md p-4
        ${clickable ? 'cursor-pointer hover:border-border-hover' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
