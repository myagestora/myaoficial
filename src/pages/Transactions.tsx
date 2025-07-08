
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Repeat } from 'lucide-react';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Transactions = () => {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
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
          is_recurring,
          recurrence_frequency,
          recurrence_interval,
          recurrence_end_date,
          next_recurrence_date,
          parent_transaction_id,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  const filteredTransactions = transactions?.filter(transaction =>
    transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatRecurrenceInfo = (transaction: any) => {
    if (!transaction.is_recurring) return null;
    
    const frequencyMap = {
      daily: 'Diário',
      weekly: 'Semanal', 
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    
    const frequency = frequencyMap[transaction.recurrence_frequency as keyof typeof frequencyMap];
    const interval = transaction.recurrence_interval > 1 ? ` (${transaction.recurrence_interval}x)` : '';
    
    return `${frequency}${interval}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações</h1>
            <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie suas receitas e despesas</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma transação encontrada</p>
                <p className="text-sm text-gray-400 mt-2">
                  Comece criando sua primeira transação!
                </p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
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
                      {transaction.is_recurring && (
                        <Repeat className="h-3 w-3 absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-lg">{transaction.title}</p>
                        {transaction.parent_transaction_id && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
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
                        <span className="text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </span>
                        {transaction.is_recurring && (
                          <Badge variant="outline" className="text-xs">
                            <Repeat className="h-3 w-3 mr-1" />
                            {formatRecurrenceInfo(transaction)}
                          </Badge>
                        )}
                      </div>
                      {transaction.description && (
                        <p className="text-sm text-gray-500 mt-1">{transaction.description}</p>
                      )}
                      {transaction.is_recurring && transaction.next_recurrence_date && (
                        <p className="text-xs text-blue-600 mt-1">
                          Próxima: {new Date(transaction.next_recurrence_date).toLocaleDateString('pt-BR')}
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
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Form Modal */}
      <TransactionForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
    </div>
  );
};

export default Transactions;
