import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Edit, Trash2 } from 'lucide-react';

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
}

interface TransactionCardProps {
  transaction: Transaction;
  deletingId: string | null;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDelete: (id: string) => void;
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

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
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
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {formatDate(transaction.date)}
                  </span>
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
          {deletingId === transaction.id ? (
            // Confirmação inline
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm text-center text-muted-foreground">
                Deseja realmente excluir esta transação?
              </p>
              <div className="flex space-x-2">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onDelete(transaction.id)}
                >
                  Confirmar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={onCancelDelete}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2 pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => navigate(`/transactions/editar/${transaction.id}`)}
              >
                <Edit size={14} className="mr-1" />
                Editar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onConfirmDelete(transaction.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};