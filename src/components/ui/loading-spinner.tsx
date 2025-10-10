import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'medical';
  color?: 'primary' | 'secondary' | 'muted';
}

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', variant = 'default', color = 'primary', ...props }, ref) => {
    const sizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12'
    };

    const colorStyles = {
      primary: 'border-primary',
      secondary: 'border-secondary',
      muted: 'border-muted-foreground'
    };

    if (variant === 'dots') {
      return (
        <div ref={ref} className={cn('flex space-x-1', className)} {...props}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full bg-primary animate-pulse',
                size === 'sm' && 'w-1 h-1',
                size === 'md' && 'w-2 h-2',
                size === 'lg' && 'w-3 h-3',
                size === 'xl' && 'w-4 h-4'
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.4s'
              }}
            />
          ))}
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-full bg-primary animate-pulse',
            sizeStyles[size],
            className
          )}
          {...props}
        />
      );
    }

    if (variant === 'medical') {
      return (
        <div ref={ref} className={cn('relative', sizeStyles[size], className)} {...props}>
          {/* Outer ring */}
          <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin" />
          {/* Inner ring */}
          <div className="absolute inset-1 border-2 border-transparent border-t-secondary rounded-full animate-spin" 
               style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          {/* Medical cross */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/3 h-1/3 relative">
              <div className="absolute inset-x-1/3 inset-y-0 bg-primary rounded-full opacity-60" />
              <div className="absolute inset-y-1/3 inset-x-0 bg-primary rounded-full opacity-60" />
            </div>
          </div>
        </div>
      );
    }

    // Default spinner
    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full border-2 border-transparent',
          sizeStyles[size],
          colorStyles[color],
          'border-t-current',
          className
        )}
        {...props}
      />
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';