import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending' | 'in-progress';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  icon?: React.ReactNode;
}

export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, size = 'md', animated = false, icon, children, ...props }, ref) => {
    const statusStyles = {
      scheduled: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
      completed: 'bg-green-50 text-green-700 border-green-200 ring-green-600/20',
      cancelled: 'bg-red-50 text-red-700 border-red-200 ring-red-600/20',
      pending: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
      'in-progress': 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20'
    };

    const sizeStyles = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base'
    };

    const statusDots = {
      scheduled: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
      pending: 'bg-amber-500',
      'in-progress': 'bg-purple-500'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 font-medium border rounded-full ring-1 ring-inset transition-all duration-200',
          statusStyles[status],
          sizeStyles[size],
          animated && 'hover:scale-105',
          className
        )}
        {...props}
      >
        {!icon && (
          <div 
            className={cn(
              'w-2 h-2 rounded-full',
              statusDots[status],
              animated && status === 'in-progress' && 'animate-pulse'
            )}
          />
        )}
        {icon && (
          <span className={animated ? 'animate-pulse' : ''}>
            {icon}
          </span>
        )}
        {children}
      </div>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';