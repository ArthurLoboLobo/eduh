import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  clickable?: boolean;
}

export default function Card({ children, clickable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-desk-surface border border-hairline rounded-[10px] p-[20px] transition-colors duration-300
        ${clickable ? 'cursor-pointer hover:bg-desk-surface-hover' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
