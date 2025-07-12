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

export const RecentTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['recent-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          description,
          amount,
          type,
          date,
          categories (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
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
    const date = new Date(dateString + 'T00:00:00'); // Força interpretação como data local
    return date.toLocaleDateString('pt-BR');
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
          <div key={transaction.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 relative">
            {/* Categoria no canto superior direito */}
            <Badge variant="secondary" className="absolute top-3 right-3 text-xs px-2 py-1">
              {transaction.categories?.name || 'Sem categoria'}
            </Badge>
            
            <div className="flex items-start space-x-3">
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
              
              <div className="flex-1 min-w-0 space-y-2 pr-20">
                {/* Título em uma linha */}
                <h3 className="font-semibold text-base leading-tight truncate">{transaction.title}</h3>
                
                {/* Descrição abaixo */}
                {transaction.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {transaction.description}
                  </p>
                )}
                
                {/* Linha com valor e data */}
                <div className="flex items-center justify-between text-sm">
                  <div className={`font-bold text-lg ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  
                  <span className="text-muted-foreground font-medium">
                    {formatDate(transaction.date)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MobileOptimizedCard>
  );
};
