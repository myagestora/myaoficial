import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileOptimizedCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  compact?: boolean;
}

export const MobileOptimizedCard = ({ 
  title, 
  children, 
  className,
  headerAction,
  compact = false 
}: MobileOptimizedCardProps) => {
  return (
    <Card className={cn(
      "w-full touch-manipulation",
      "shadow-sm border border-border/50",
      "bg-card/95 backdrop-blur-sm",
      compact ? "p-3 md:p-4" : "p-4 md:p-6",
      className
    )}>
      {title && (
        <CardHeader className={cn(
          "flex flex-row items-center justify-between space-y-0",
          compact ? "pb-2" : "pb-4"
        )}>
          <CardTitle className={cn(
            "font-semibold text-foreground",
            compact ? "text-base" : "text-lg md:text-xl"
          )}>
            {title}
          </CardTitle>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(
        compact ? "p-0 pt-2" : "p-0 pt-4"
      )}>
        {children}
      </CardContent>
    </Card>
  );
};