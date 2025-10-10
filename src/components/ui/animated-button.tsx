import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';

interface AnimatedButtonProps extends ButtonProps {
  animation?: 'bounce' | 'pulse' | 'glow' | 'slide' | 'none';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    animation = 'bounce', 
    icon, 
    iconPosition = 'left', 
    children, 
    ...props 
  }, ref) => {
    const animations = {
      bounce: 'hover:scale-105 active:scale-95 transition-transform duration-200',
      pulse: 'hover:animate-pulse',
      glow: 'hover:shadow-lg hover:shadow-primary/25 transition-shadow duration-300',
      slide: 'relative overflow-hidden before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500',
      none: ''
    };

    return (
      <Button
        ref={ref}
        className={cn(
          'relative group',
          animations[animation],
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-2">
          {icon && iconPosition === 'left' && (
            <span className="transition-transform duration-200 group-hover:scale-110">
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="transition-transform duration-200 group-hover:scale-110">
              {icon}
            </span>
          )}
        </span>
      </Button>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';