import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  animated?: boolean;
}

export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ 
    className, 
    title, 
    value, 
    subtitle, 
    icon, 
    trend, 
    variant = 'default',
    animated = true,
    ...props 
  }, ref) => {
    const variants = {
      default: 'from-gray-50 to-white border-gray-200',
      success: 'from-green-50 to-white border-green-200',
      warning: 'from-amber-50 to-white border-amber-200',
      danger: 'from-red-50 to-white border-red-200',
      info: 'from-blue-50 to-white border-blue-200'
    };

    const iconColors = {
      default: 'text-gray-600 bg-gray-100',
      success: 'text-green-600 bg-green-100',
      warning: 'text-amber-600 bg-amber-100',
      danger: 'text-red-600 bg-red-100',
      info: 'text-blue-600 bg-blue-100'
    };

    const getTrendIcon = () => {
      if (!trend) return null;
      if (trend.value > 0) return <TrendingUp className="h-3 w-3" />;
      if (trend.value < 0) return <TrendingDown className="h-3 w-3" />;
      return <Minus className="h-3 w-3" />;
    };

    const getTrendColor = () => {
      if (!trend) return '';
      if (trend.value > 0) return 'text-green-600 bg-green-50';
      if (trend.value < 0) return 'text-red-600 bg-red-50';
      return 'text-gray-600 bg-gray-50';
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6',
          'transition-all duration-300 hover:shadow-lg',
          animated && 'hover:scale-[1.02] hover:-translate-y-1',
          variants[variant],
          className
        )}
        {...props}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-current" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-current" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {title}
              </p>
              <p className={cn(
                "text-3xl font-bold tracking-tight",
                animated && "transition-all duration-300 hover:scale-105"
              )}>
                {value}
              </p>
            </div>
            
            {icon && (
              <div className={cn(
                'rounded-xl p-3 transition-all duration-300 hover:scale-110',
                iconColors[variant]
              )}>
                {icon}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
            
            {trend && (
              <div className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                getTrendColor()
              )}>
                {getTrendIcon()}
                <span>
                  {Math.abs(trend.value)}%
                  {trend.label && ` ${trend.label}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

StatsCard.displayName = 'StatsCard';