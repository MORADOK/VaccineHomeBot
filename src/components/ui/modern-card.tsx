import React from 'react';
import { cn } from '@/lib/utils';

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  hover?: boolean;
  glow?: boolean;
}

export const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant = 'default', hover = true, glow = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-card border border-border shadow-sm',
      glass: 'bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg',
      gradient: 'bg-gradient-to-br from-card to-card/50 border border-border shadow-md',
      elevated: 'bg-card border border-border shadow-lg'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl p-6 transition-all duration-300',
          variants[variant],
          hover && 'hover:shadow-lg hover:-translate-y-1',
          glow && 'hover:shadow-primary/20',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModernCard.displayName = 'ModernCard';