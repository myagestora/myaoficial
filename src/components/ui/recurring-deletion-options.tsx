import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface RecurringDeletionOptionsProps {
  onDeleteSingle: () => void;
  onDeleteSeries: () => void;
  onCancel: () => void;
  isParent?: boolean;
}

export const RecurringDeletionOptions = ({
  onDeleteSingle,
  onDeleteSeries,
  onCancel,
  isParent = false
}: RecurringDeletionOptionsProps) => {
  return (
    <div className="w-full bg-card border rounded-lg shadow-lg p-3 min-w-72">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">
          {isParent ? 'Excluir agendamento recorrente?' : 'Excluir transação recorrente?'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSingle}
          className="w-full justify-start"
        >
          {isParent ? 'Excluir apenas este agendamento' : 'Excluir apenas esta transação'}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteSeries}
          className="w-full justify-start"
        >
          Excluir toda a série
        </Button>
      </div>
    </div>
  );
};