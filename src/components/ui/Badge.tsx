type BadgeVariant = 'default' | 'blue' | 'green' | 'red' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[rgba(236,229,214,0.08)] text-page-cream',
  blue: 'bg-oxblood-tint text-oxblood-bright',
  green: 'bg-forest-success/20 text-forest-success',
  red: 'bg-rust-danger/20 text-rust-danger',
  muted: 'bg-[rgba(236,229,214,0.08)] text-page-cream-faint',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-[10px] py-[2px] rounded-full font-label text-[13px]
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
