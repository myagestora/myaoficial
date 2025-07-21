import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, ArrowDownCircle, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { MobileOptimizedCard } from '@/components/ui/mobile-optimized-card';
import { MobileListItem } from '@/components/ui/mobile-list-item';
import { DateRange } from 'react-day-picker';
import { formatDateBrazilian } from '@/utils/timezoneUtils';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';

interface RecentTransactionsProps {
  dateRange?: DateRange;
}

export const RecentTransactions = ({ dateRange }: RecentTransactionsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bankAccounts } = useBankAccounts();
  const { creditCards } = useCreditCards();

  // Função utilitária para buscar nome da conta/cartão
  function getAccountName(account_id: string | null) {
    if (!account_id) return null;
    const acc = bankAccounts.find(a => a.id === account_id);
    return acc ? acc.name : null;
  }
  function getCardName(card_id: string | null) {
    if (!card_id) return null;
    const card = creditCards.find(c => c.id === card_id);
    return card ? `${card.name}${card.last_four_digits ? ' •••• ' + card.last_four_digits : ''}` : null;
  }

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['recent-transactions', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('transactions')
        .select(`
          id,
          title,
          description,
          amount,
          type,
          date,
          created_at,
          categories (
            name
          ),
          account_id,
          card_id
        `)
        .eq('user_id', user.id);

      // Aplicar filtro de período se especificado
      if (dateRange?.from && dateRange?.to) {
        query = query
          .gte('date', dateRange.from.toISOString().split('T')[0])
          .lte('date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  const formatDate = (dateString: string) => {
    return formatDateBrazilian(dateString, 'dd/MM/yyyy');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transações Recentes</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/transactions')}
          >
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma transação encontrada</p>
            <p className="text-sm text-gray-400 mt-2">
              Comece criando sua primeira transação!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <MobileOptimizedCard 
      title="Transações Recentes"
      headerAction={
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/transactions')}
          className="min-h-[44px] px-4"
        >
          Ver Todas
        </Button>
      }
    >
      <div className="space-y-3">
        {transactions.map((transaction: any) => (
          <div key={transaction.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 relative overflow-hidden">
            {/* Categoria integrada ao contorno do card */}
            <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-bl-lg rounded-tr-xl">
              {transaction.categories?.name || 'Sem categoria'}
            </div>
            
            {/* Primeira linha: Ícone + Título */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-full flex-shrink-0 ${
                transaction.type === 'income' 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                  : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
              }`}>
                {transaction.type === 'income' ? (
                  <ArrowUpCircle className="h-5 w-5" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5" />
                )}
              </div>
              
              {/* Título ocupando máximo de espaço - só evita sobrepor a categoria */}
              <h3 className="font-semibold text-base leading-tight flex-1 pr-16">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-base truncate">{transaction.title}</span>
                  {/* Exibir conta/cartão se houver */}
                  {transaction.account_id && getAccountName(transaction.account_id) && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Conta: {getAccountName(transaction.account_id)}
                    </Badge>
                  )}
                  {transaction.card_id && getCardName(transaction.card_id) && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Cartão: {getCardName(transaction.card_id)}
                    </Badge>
                  )}
                </div>
              </h3>
            </div>
            
            {/* Descrição ocupando toda a largura do card */}
            {transaction.description && (
              <div className="mb-3">
                <p className="text-sm text-muted-foreground">
                  {transaction.description}
                </p>
              </div>
            )}
            
            {/* Linha separadora */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              {/* Linha com valor e data */}
              <div className="flex items-center justify-between">
                <div className={`font-bold text-lg ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                
                <span className="text-muted-foreground font-medium text-sm">
                  {formatDate(transaction.date)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MobileOptimizedCard>
  );
};
