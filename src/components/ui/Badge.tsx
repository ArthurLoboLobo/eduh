type BadgeVariant = 'default' | 'blue' | 'green' | 'red' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-primary-text',
  blue: 'bg-accent-blue/20 text-accent-blue',
  green: 'bg-success-green/20 text-success-green',
  red: 'bg-danger-red/20 text-danger-red',
  muted: 'bg-white/5 text-muted-text',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
