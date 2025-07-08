
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, ArrowDownCircle, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const RecentTransactions = () => {
  const { user } = useAuth();

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
          <Button variant="outline" size="sm">
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transações Recentes</CardTitle>
        <Button variant="outline" size="sm">
          Ver Todas
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction: any) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'income' 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                    : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpCircle className="h-4 w-4" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{transaction.title}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.categories?.name || 'Sem categoria'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`font-bold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
