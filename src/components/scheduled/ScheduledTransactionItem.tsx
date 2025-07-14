
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Repeat } from 'lucide-react';

interface ScheduledTransactionItemProps {
  transaction: any;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export const ScheduledTransactionItem = ({ 
  transaction, 
  onToggleStatus, 
  onDelete 
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
    
    return `${frequency}${interval}`;
  };

  const getNextExecutionDate = (transaction: any) => {
    const transactionDate = new Date(transaction.date);
    const today = new Date();
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
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
          <Repeat className="h-3 w-3 absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5" />
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
            <Badge variant="outline" className="text-xs">
              <Repeat className="h-3 w-3 mr-1" />
              {formatRecurrenceInfo(transaction)}
            </Badge>
            <span className="text-sm text-gray-500">
              {getNextExecutionDate(transaction)}
            </span>
          </div>
          {transaction.description && (
            <p className="text-sm text-gray-500 mt-1">{transaction.description}</p>
          )}
          <p className="text-xs text-blue-600 mt-1">
            Data: {new Date(transaction.date).toLocaleDateString('pt-BR')}
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
          <Button variant="ghost" size="sm" title="Editar agendamento">
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
  );
};
