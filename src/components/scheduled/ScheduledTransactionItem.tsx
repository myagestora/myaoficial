
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Repeat } from 'lucide-react';
import { InlineConfirmation } from '@/components/ui/inline-confirmation';
import { RecurringDeletionOptions } from '@/components/ui/recurring-deletion-options';

interface ScheduledTransactionItemProps {
  transaction: any;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  deletingId?: string | null;
  recurringDeletingId?: string | null;
  onConfirmDelete?: () => void;
  onDeleteSingle?: () => void;
  onDeleteSeries?: () => void;
  onCancelDelete?: () => void;
}

export const ScheduledTransactionItem = ({ 
  transaction, 
  onToggleStatus, 
  onDelete,
  onEdit,
  deletingId,
  recurringDeletingId,
  onConfirmDelete,
  onDeleteSingle,
  onDeleteSeries,
  onCancelDelete
}: ScheduledTransactionItemProps) => {
  const formatRecurrenceInfo = (transaction: any) => {
    const frequencyMap = {
      daily: 'Diário',
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      yearly: 'Anual',
      custom: 'Personalizado'
    };
    
    const frequency = frequencyMap[transaction.recurrence_frequency as keyof typeof frequencyMap] || transaction.recurrence_frequency;
    const interval = transaction.recurrence_interval > 1 ? ` (${transaction.recurrence_interval}x)` : '';
    
    // Para datas que podem não existir em todos os meses, mostrar informação adicional
    if (['monthly', 'quarterly', 'semiannual', 'yearly'].includes(transaction.recurrence_frequency)) {
      const transactionDate = new Date(transaction.date);
      const day = transactionDate.getDate();
      if (day > 28) {
        return `${frequency}${interval} (dia ${day} ou último do mês)`;
      }
    }
    
    return `${frequency}${interval}`;
  };

  // Função para formatar data a partir de string evitando problemas de fuso horário
  const formatDateFromString = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month é 0-indexed
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const getNextExecutionDate = (transaction: any) => {
    // Usar next_recurrence_date se disponível, senão usar date
    const targetDate = transaction.next_recurrence_date || transaction.date;
    
    // Parse manual para evitar problemas de timezone
    const [year, month, day] = targetDate.split('-').map(Number);
    const transactionDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horas para comparação precisa
    transactionDate.setHours(0, 0, 0, 0);
    
    const diffTime = transactionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) return 'Vencida';
    
    return `Em ${diffDays} dias`;
  };

  const getStatusColor = (transaction: any) => {
    const transactionDate = new Date(transaction.date);
    const today = new Date();
    const diffTime = transactionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'bg-red-500';
    if (diffDays <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full relative ${
            transaction.type === 'income' 
              ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
              : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
          }`}>
            {transaction.type === 'income' ? (
              <ArrowUpCircle className="h-5 w-5" />
            ) : (
              <ArrowDownCircle className="h-5 w-5" />
            )}
            {/* Ícone de recorrência só aparece para transações recorrentes */}
            {(transaction.is_recurring || transaction.parent_transaction_id) && (
              <Repeat className="h-3 w-3 absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-lg">{transaction.title}</p>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(transaction)}`} />
            </div>
            <div className="flex items-center space-x-3 mt-1">
              {transaction.categories && (
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: transaction.categories.color + '20',
                    color: transaction.categories.color,
                    borderColor: transaction.categories.color
                  }}
                >
                  {transaction.categories.name}
                </Badge>
              )}
              {transaction.recurrence_frequency && (
                <Badge variant="outline" className="text-xs">
                  <Repeat className="h-3 w-3 mr-1" />
                  {formatRecurrenceInfo(transaction)}
                </Badge>
              )}
              <span className="text-sm text-gray-500">
                {getNextExecutionDate(transaction)}
              </span>
            </div>
            {transaction.description && (
              <p className="text-sm text-gray-500 mt-1">{transaction.description}</p>
            )}
            <p className="text-xs text-blue-600 mt-1">
              {formatDateFromString(transaction.next_recurrence_date || transaction.date)}
            </p>
            {transaction.recurrence_count && (
              <p className="text-xs text-gray-500 mt-1">
                {transaction.recurrence_count} repetições
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`font-bold text-xl ${
            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
          }`}>
            {transaction.type === 'income' ? '+' : ''}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              title="Editar agendamento"
              onClick={() => onEdit?.(transaction.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-700"
              onClick={() => onDelete(transaction.id)}
              title="Excluir agendamento"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Confirmações abaixo do card - empurram conteúdo para baixo */}
      {deletingId === transaction.id && onConfirmDelete && onCancelDelete && (
        <div className="border-t p-4">
          <InlineConfirmation
            message="Confirmar exclusão?"
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
            confirmText="Excluir"
            cancelText="Cancelar"
          />
        </div>
      )}
      
      {recurringDeletingId === transaction.id && onDeleteSingle && onDeleteSeries && onCancelDelete && (
        <div className="border-t p-4">
          <RecurringDeletionOptions
            onDeleteSingle={onDeleteSingle}
            onDeleteSeries={onDeleteSeries}
            onCancel={onCancelDelete}
            isParent={transaction.is_recurring}
          />
        </div>
      )}
    </div>
  );
};
