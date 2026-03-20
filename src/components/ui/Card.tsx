import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  clickable?: boolean;
}

export default function Card({ children, clickable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-surface/60 backdrop-blur-sm border border-border-subtle rounded-2xl p-5
        transition-all duration-300 ease-out shadow-sm
        ${clickable ? 'cursor-pointer hover:bg-surface-hover/80 hover:border-accent-blue/30 hover:shadow-lg hover:-translate-y-0.5' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
