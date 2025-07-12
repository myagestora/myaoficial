
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ScheduledHeaderProps {
  onNewSchedule: () => void;
}

export const ScheduledHeader = ({ onNewSchedule }: ScheduledHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Agendamentos</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Gerencie suas transações recorrentes</p>
      </div>
      <Button 
        onClick={onNewSchedule} 
        className="bg-primary hover:bg-primary/90 w-full sm:w-auto min-h-[44px] text-sm font-medium"
        size="lg"
      >
        <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">Novo Agenda</span>
      </Button>
    </div>
  );
};
