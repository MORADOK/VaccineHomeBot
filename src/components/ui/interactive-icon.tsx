import React from 'react';
import { cn } from '@/lib/utils';

interface InteractiveIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animation?: 'bounce' | 'pulse' | 'spin' | 'ping' | 'none';
  glow?: boolean;
}

export const InteractiveIcon = React.forwardRef<HTMLDivElement, InteractiveIconProps>(
  ({ 
    className, 
    icon, 
    variant = 'primary', 
    size = 'md', 
    animation = 'none',
    glow = false,
    ...props 
  }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white',
      secondary: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
      success: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
      warning: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
      info: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
      danger: 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
    };

    const sizes = {
      sm: 'w-8 h-8 p-2',
      md: 'w-12 h-12 p-3',
      lg: 'w-16 h-16 p-4',
      xl: 'w-20 h-20 p-5'
    };

    const animations = {
      bounce: 'animate-bounce',
      pulse: 'animate-pulse',
      spin: 'animate-spin',
      ping: 'animate-ping',
      none: ''
    };

    const glowColors = {
      primary: 'shadow-teal-500/50',
      secondary: 'shadow-blue-500/50',
      success: 'shadow-green-500/50',
      warning: 'shadow-amber-500/50',
      info: 'shadow-sky-500/50',
      danger: 'shadow-red-500/50'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl flex items-center justify-center transition-all duration-300',
          'hover:scale-110 hover:rotate-3 cursor-pointer',
          'shadow-lg hover:shadow-xl',
          variants[variant],
          sizes[size],
          animations[animation],
          glow && `hover:shadow-2xl ${glowColors[variant]}`,
          className
        )}
        {...props}
      >
        <div className="transition-transform duration-200 hover:scale-110">
          {icon}
        </div>
      </div>
    );
  }
);

InteractiveIcon.displayName = 'InteractiveIcon';