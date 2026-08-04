/** 通用 Button 组件 - Devin 风格 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-obs";

  const variantStyles = {
    primary: "bg-brand-500 text-white shadow-md hover:bg-brand-600 hover:shadow-lg active:scale-95 focus:ring-brand-500/50",
    secondary: "border border-obs-line bg-obs-2 text-obs-ink hover:bg-obs-line/30 hover:border-obs-ink3 focus:ring-obs-ink3/50",
    ghost: "text-obs-ink3 hover:bg-obs-line/30 hover:text-obs-ink focus:ring-obs-ink3/50"
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[13px]",
    md: "px-4 py-2 text-[14px]",
    lg: "px-5 py-2.5 text-[15px]"
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Card 组件 - Devin 风格 */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = '', noPadding = false }: CardProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-obs-line bg-obs-2 shadow-md transition-all duration-200 hover:shadow-lg ${className}`}>
      {noPadding ? children : <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-b border-obs-line px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

/** Badge 组件 */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'error';
  dot?: boolean;
}

export function Badge({ children, variant = 'default', dot = false }: BadgeProps) {
  const variantStyles = {
    default: "bg-obs-line text-obs-ink3",
    brand: "bg-brand-500/15 text-brand-400",
    success: "bg-success-500/15 text-success-500",
    warning: "bg-caution-500/15 text-caution-400",
    error: "bg-alert-500/15 text-alert-400"
  };

  const dotStyles = {
    default: "bg-obs-ink3",
    brand: "bg-brand-400",
    success: "bg-success-500",
    warning: "bg-caution-400",
    error: "bg-alert-400"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${variantStyles[variant]}`}>
      {dot && <div className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
}
