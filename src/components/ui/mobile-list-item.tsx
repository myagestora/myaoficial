import React from 'react';
import { cn } from '@/lib/utils';

interface MobileListItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export const MobileListItem = ({ 
  children, 
  className, 
  onClick,
  variant = 'default'
}: MobileListItemProps) => {
  const isClickable = !!onClick;
  
  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm",
        variant === 'compact' ? "p-3" : "p-4",
        "transition-all duration-200",
        isClickable && [
          "cursor-pointer touch-manipulation",
          "hover:bg-accent/50 hover:border-border",
          "active:bg-accent active:scale-[0.98]",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        ],
        className
      )}
      onClick={onClick}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? "button" : undefined}
    >
      {children}
    </div>
  );
};