import React from 'react';
import { cn } from '@/lib/utils';

interface MobilePageWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const MobilePageWrapper = ({ 
  children, 
  title, 
  className,
  showBackButton = false,
  onBack 
}: MobilePageWrapperProps) => {
  return (
    <div className={cn("min-h-full", className)}>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};