import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';

interface FloatingActionButtonProps extends ButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  icon?: React.ReactNode;
  tooltip?: string;
  pulse?: boolean;
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ 
    className, 
    position = 'bottom-right', 
    icon, 
    tooltip, 
    pulse = false,
    children, 
    ...props 
  }, ref) => {
    const positions = {
      'bottom-right': 'fixed bottom-6 right-6',
      'bottom-left': 'fixed bottom-6 left-6',
      'top-right': 'fixed top-6 right-6',
      'top-left': 'fixed top-6 left-6'
    };

    return (
      <div className="group">
        <Button
          ref={ref}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300',
            'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary',
            'border-2 border-white/20 backdrop-blur-sm',
            'hover:scale-110 active:scale-95',
            pulse && 'animate-pulse',
            positions[position],
            'z-50',
            className
          )}
          {...props}
        >
          {icon && (
            <span className="transition-transform duration-200 group-hover:scale-110">
              {icon}
            </span>
          )}
          {children}
        </Button>
        
        {tooltip && (
          <div className={cn(
            'absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap',
            'pointer-events-none z-50',
            position.includes('right') ? 'right-16 top-1/2 -translate-y-1/2' : 'left-16 top-1/2 -translate-y-1/2'
          )}>
            {tooltip}
            <div className={cn(
              'absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45',
              position.includes('right') ? '-right-1' : '-left-1'
            )} />
          </div>
        )}
      </div>
    );
  }
);

FloatingActionButton.displayName = 'FloatingActionButton';