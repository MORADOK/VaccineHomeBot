import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  image?: string;
  badge?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    external?: boolean;
  };
  variant?: 'default' | 'featured' | 'compact';
  animated?: boolean;
}

export const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ 
    className, 
    title, 
    description, 
    icon, 
    image, 
    badge, 
    action, 
    variant = 'default',
    animated = true,
    ...props 
  }, ref) => {
    const variants = {
      default: 'p-6',
      featured: 'p-8 bg-gradient-to-br from-primary/5 via-white to-secondary/5 border-primary/20',
      compact: 'p-4'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm',
          'transition-all duration-300 hover:shadow-xl',
          animated && 'hover:scale-[1.02] hover:-translate-y-2',
          variant === 'featured' && 'ring-1 ring-primary/10',
          variants[variant],
          className
        )}
        {...props}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badge */}
        {badge && (
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {badge}
            </span>
          </div>
        )}

        {/* Image */}
        {image && (
          <div className="relative mb-6 overflow-hidden rounded-xl">
            <img 
              src={image} 
              alt={title}
              className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            {icon && (
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-primary/10 p-3 text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                  {icon}
                </div>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-foreground mb-2 transition-colors duration-300",
                variant === 'featured' ? 'text-xl' : 'text-lg',
                "group-hover:text-primary"
              )}>
                {title}
              </h3>
              
              <p className={cn(
                "text-muted-foreground leading-relaxed",
                variant === 'compact' ? 'text-sm' : 'text-base'
              )}>
                {description}
              </p>
            </div>
          </div>

          {/* Action */}
          {action && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="group/btn text-primary hover:text-primary hover:bg-primary/10 transition-all duration-200"
                onClick={action.onClick}
              >
                <span className="mr-2">{action.label}</span>
                {action.external ? (
                  <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110" />
                ) : (
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Hover Effect Border */}
        <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 transition-colors duration-300 group-hover:border-primary/20 pointer-events-none" />
      </div>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';