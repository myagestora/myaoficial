
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { ScheduledTransactionItem } from './ScheduledTransactionItem';

interface ScheduledTransactionsListProps {
  transactions: any[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  hasFiltersOrSearch: boolean;
  deletingId?: string | null;
  recurringDeletingId?: string | null;
  onConfirmDelete?: () => void;
  onDeleteSingle?: () => void;
  onDeleteSeries?: () => void;
  onCancelDelete?: () => void;
}

export const ScheduledTransactionsList = ({ 
  transactions, 
  onToggleStatus, 
  onDelete,
  hasFiltersOrSearch,
  deletingId,
  recurringDeletingId,
  onConfirmDelete,
  onDeleteSingle,
  onDeleteSeries,
  onCancelDelete
}: ScheduledTransactionsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Agendadas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum agendamento encontrado</p>
              <p className="text-sm text-gray-400 mt-2">
                {hasFiltersOrSearch ? 
                  'Tente ajustar os filtros ou busca.' :
                  'Comece criando seu primeiro agendamento!'
                }
              </p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <ScheduledTransactionItem
                key={transaction.id}
                transaction={transaction}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
                deletingId={deletingId}
                recurringDeletingId={recurringDeletingId}
                onConfirmDelete={onConfirmDelete}
                onDeleteSingle={onDeleteSingle}
                onDeleteSeries={onDeleteSeries}
                onCancelDelete={onCancelDelete}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
