import React from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  value?: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon?: React.ReactNode;
  chart?: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  variant?: 'default' | 'compact' | 'detailed';
  loading?: boolean;
}

export const DashboardWidget = React.forwardRef<HTMLDivElement, DashboardWidgetProps>(
  ({ 
    className, 
    title, 
    subtitle, 
    value, 
    change, 
    icon, 
    chart, 
    actions, 
    variant = 'default',
    loading = false,
    ...props 
  }, ref) => {
    const isPositiveChange = change && change.value > 0;
    const isNegativeChange = change && change.value < 0;

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-2xl border bg-white p-6 animate-pulse',
            className
          )}
          {...props}
        >
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'group relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm p-6',
          'transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
          'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/50 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="relative z-10 flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                {icon}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          
          {actions && actions.length > 0 && (
            <div className="relative">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Value & Change */}
        {value && (
          <div className="relative z-10 mb-4">
            <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:scale-105 transition-transform">
              {value}
            </div>
            
            {change && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  isPositiveChange && 'bg-green-100 text-green-700',
                  isNegativeChange && 'bg-red-100 text-red-700',
                  !isPositiveChange && !isNegativeChange && 'bg-gray-100 text-gray-700'
                )}>
                  {isPositiveChange && <TrendingUp className="h-3 w-3" />}
                  {isNegativeChange && <TrendingDown className="h-3 w-3" />}
                  <span>
                    {isPositiveChange && '+'}
                    {change.value}%
                  </span>
                </div>
                <span className="text-sm text-gray-500">{change.period}</span>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        {chart && (
          <div className="relative z-10 mt-4">
            {chart}
          </div>
        )}

        {/* Hover Effect Border */}
        <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 transition-colors duration-300 group-hover:border-primary/20 pointer-events-none" />
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-secondary" />
        </div>
      </div>
    );
  }
);

DashboardWidget.displayName = 'DashboardWidget';