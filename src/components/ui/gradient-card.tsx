import React from 'react';
import { cn } from '@/lib/utils';

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  intensity?: 'light' | 'medium' | 'strong';
  animated?: boolean;
  glowEffect?: boolean;
}

export const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  ({ 
    className, 
    variant = 'primary', 
    intensity = 'medium', 
    animated = false, 
    glowEffect = false,
    children, 
    ...props 
  }, ref) => {
    const gradients = {
      primary: {
        light: 'bg-gradient-to-br from-teal-50 via-white to-cyan-50',
        medium: 'bg-gradient-to-br from-teal-100 via-white to-cyan-100',
        strong: 'bg-gradient-to-br from-teal-200 via-teal-50 to-cyan-200'
      },
      secondary: {
        light: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50',
        medium: 'bg-gradient-to-br from-blue-100 via-white to-indigo-100',
        strong: 'bg-gradient-to-br from-blue-200 via-blue-50 to-indigo-200'
      },
      success: {
        light: 'bg-gradient-to-br from-green-50 via-white to-emerald-50',
        medium: 'bg-gradient-to-br from-green-100 via-white to-emerald-100',
        strong: 'bg-gradient-to-br from-green-200 via-green-50 to-emerald-200'
      },
      warning: {
        light: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
        medium: 'bg-gradient-to-br from-amber-100 via-white to-orange-100',
        strong: 'bg-gradient-to-br from-amber-200 via-amber-50 to-orange-200'
      },
      info: {
        light: 'bg-gradient-to-br from-sky-50 via-white to-blue-50',
        medium: 'bg-gradient-to-br from-sky-100 via-white to-blue-100',
        strong: 'bg-gradient-to-br from-sky-200 via-sky-50 to-blue-200'
      }
    };

    const borders = {
      primary: 'border-teal-200/50',
      secondary: 'border-blue-200/50',
      success: 'border-green-200/50',
      warning: 'border-amber-200/50',
      info: 'border-sky-200/50'
    };

    const glows = {
      primary: 'shadow-teal-500/20',
      secondary: 'shadow-blue-500/20',
      success: 'shadow-green-500/20',
      warning: 'shadow-amber-500/20',
      info: 'shadow-sky-500/20'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl border backdrop-blur-sm transition-all duration-300',
          gradients[variant][intensity],
          borders[variant],
          animated && 'hover:scale-[1.02] hover:-translate-y-1',
          glowEffect && `hover:shadow-xl ${glows[variant]}`,
          'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none',
          className
        )}
        {...props}
      >
        <div className="relative z-10 p-6">
          {children}
        </div>
      </div>
    );
  }
);

GradientCard.displayName = 'GradientCard';