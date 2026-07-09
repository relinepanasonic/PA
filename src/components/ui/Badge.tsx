interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-surface-lighter text-text-secondary border-border',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  accent: 'bg-accent/10 text-accent-light border-accent/20',
  muted: 'bg-surface-light text-text-muted border-border',
};

export default function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center border rounded-full font-medium ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
