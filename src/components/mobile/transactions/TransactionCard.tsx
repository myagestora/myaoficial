import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Edit, Trash2, CreditCard, Ban as Bank } from 'lucide-react';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  categories?: {
    name: string;
    color: string;
  };
  account_id?: string;
  account_name?: string;
  card_id?: string;
  card_name?: string;
  card_last_four_digits?: string;
}

interface TransactionCardProps {
  transaction: Transaction;
  deletingId: string | null;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDelete: (id: string) => void;
  // Novos props para exibir nome do banco/cartão
  bankName?: string;
  cardName?: string;
  cardLastFour?: string;
}

export const TransactionCard = ({ 
  transaction, 
  deletingId, 
  formatCurrency, 
  formatDate, 
  onConfirmDelete, 
  onCancelDelete, 
  onDelete 
}: TransactionCardProps) => {
  const navigate = useNavigate();

  // Função para formatar data completa
  const formatDateFromString = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Função para calcular tempo relativo
  const getRelativeTime = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const transactionDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    transactionDate.setHours(0, 0, 0, 0);
    
    const diffTime = transactionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays === -1) return 'Ontem';
    if (diffDays < 0) return `Há ${Math.abs(diffDays)} dias`;
    
    return `Em ${diffDays} dias`;
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 pb-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                transaction.type === 'income' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {transaction.type === 'income' ? 
                  <TrendingUp size={18} /> : 
                  <TrendingDown size={18} />
                }
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{transaction.title}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.categories?.name || 'Sem categoria'}
                  </Badge>
                  <div className="flex flex-col text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <Calendar size={10} className="mr-1" />
                      {formatDateFromString(transaction.date)}
                    </span>
                    <span className="text-xs">
                      {getRelativeTime(transaction.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
          
          {/* Ações */}
          {/* Rodapé cinza com banco/cartão e ícones */}
          <div className="bg-gray-100 px-3 py-2 flex items-center justify-between rounded-b-lg border-t">
            <div className="flex items-center gap-2 min-w-0">
              {transaction.account_id && (
                <span className="flex items-center gap-1 text-xs text-gray-700 truncate">
                  <Bank size={13} className="text-blue-600" />
                  {transaction.account_name || 'Conta'}
                </span>
              )}
              {transaction.card_id && (
                <span className="flex items-center gap-1 text-xs text-gray-700 truncate">
                  <CreditCard size={13} className="text-purple-600" />
                  {transaction.card_name || 'Cartão'}
                  {transaction.card_last_four_digits && (
                    <span className="text-[10px] text-gray-400 ml-1">•••• {transaction.card_last_four_digits}</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-1 rounded hover:bg-gray-200"
                onClick={() => navigate(`/transactions/editar/${transaction.id}`)}
                title="Editar"
              >
                <Edit size={16} />
              </button>
              <button
                className="p-1 rounded hover:bg-gray-200"
                onClick={() => onConfirmDelete(transaction.id)}
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {/* Confirmação inline de remoção */}
          {deletingId === transaction.id && (
            <div className="bg-white border-t px-3 py-2 text-center text-sm">
              <p className="mb-2">Deseja realmente excluir esta transação?</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="destructive" onClick={() => onDelete(transaction.id)}>Confirmar</Button>
                <Button size="sm" variant="outline" onClick={onCancelDelete}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};