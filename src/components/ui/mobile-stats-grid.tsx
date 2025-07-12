import React from 'react';
import { cn } from '@/lib/utils';
import { MobileOptimizedCard } from './mobile-optimized-card';

interface StatItem {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'destructive';
  trend?: 'up' | 'down' | 'neutral';
}

interface MobileStatsGridProps {
  stats: StatItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}

const colorClasses = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-orange-600 dark:text-orange-400',
  destructive: 'text-red-600 dark:text-red-400'
};

export const MobileStatsGrid = ({ 
  stats, 
  columns = 2,
  className 
}: MobileStatsGridProps) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  };

  return (
    <div className={cn(
      "grid gap-3 md:gap-4",
      gridCols[columns],
      className
    )}>
      {stats.map((stat, index) => (
        <MobileOptimizedCard key={index} compact className="min-h-[100px]">
          <div className="flex items-start justify-between h-full">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {stat.icon && (
                  <div className="flex-shrink-0 text-muted-foreground">
                    {stat.icon}
                  </div>
                )}
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {stat.title}
                </p>
              </div>
              
              <p className={cn(
                "text-xl md:text-2xl font-bold truncate",
                stat.color ? colorClasses[stat.color] : colorClasses.default
              )}>
                {stat.value}
              </p>
              
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {stat.subtitle}
                </p>
              )}
            </div>
            
            {stat.trend && (
              <div className={cn(
                "flex-shrink-0 text-xs font-medium",
                stat.trend === 'up' && "text-green-600",
                stat.trend === 'down' && "text-red-600",
                stat.trend === 'neutral' && "text-muted-foreground"
              )}>
                {stat.trend === 'up' && '↑'}
                {stat.trend === 'down' && '↓'}
                {stat.trend === 'neutral' && '→'}
              </div>
            )}
          </div>
        </MobileOptimizedCard>
      ))}
    </div>
  );
};