
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ScheduledHeaderProps {
  onNewSchedule: () => void;
}

export const ScheduledHeader = ({ onNewSchedule }: ScheduledHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
        <p className="text-gray-600 dark:text-gray-400">Gerencie suas transações recorrentes</p>
      </div>
      <Button onClick={onNewSchedule} className="bg-primary hover:bg-primary/90">
        <Plus className="mr-2 h-4 w-4" />
        Novo Agendamento
      </Button>
    </div>
  );
};
