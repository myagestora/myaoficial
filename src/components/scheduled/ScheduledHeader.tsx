
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
        className="bg-primary hover:bg-primary/90 min-h-[44px] min-w-[44px] text-sm font-medium md:w-auto w-auto px-3"
        size="lg"
      >
        <Plus className="h-5 w-5 md:mr-2 flex-shrink-0" />
        <span className="hidden md:inline">Novo Agenda</span>
      </Button>
    </div>
  );
};
