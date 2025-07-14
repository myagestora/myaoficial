
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface ScheduledStatsProps {
  totalScheduled: number;
  upcomingExecutions: number;
  overdueScheduled: number;
}

export const ScheduledStats = ({ 
  totalScheduled, 
  upcomingExecutions, 
  overdueScheduled 
}: ScheduledStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalScheduled}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Próximas Execuções</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{upcomingExecutions}</div>
          <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
        </CardContent>
      </Card>
    </div>
  );
};
