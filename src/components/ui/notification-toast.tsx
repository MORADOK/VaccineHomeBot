import React from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface NotificationToastProps {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  title,
  message,
  type = 'info',
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const variants = {
    success: {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: 'text-green-800',
      message: 'text-green-700'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200',
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      title: 'text-red-800',
      message: 'text-red-700'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      title: 'text-amber-800',
      message: 'text-amber-700'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200',
      icon: <Info className="h-5 w-5 text-blue-600" />,
      title: 'text-blue-800',
      message: 'text-blue-700'
    }
  };

  const variant = variants[type];

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 max-w-sm w-full',
      'animate-slide-up'
    )}>
      <div className={cn(
        'rounded-2xl border p-4 shadow-lg backdrop-blur-sm',
        'transition-all duration-300 hover:shadow-xl',
        variant.bg
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {variant.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-semibold text-sm mb-1', variant.title)}>
              {title}
            </h4>
            {message && (
              <p className={cn('text-sm leading-relaxed', variant.message)}>
                {message}
              </p>
            )}
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
        
        {autoClose && (
          <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-current opacity-30 animate-progress-bar"
              style={{ animationDuration: `${duration}ms` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};