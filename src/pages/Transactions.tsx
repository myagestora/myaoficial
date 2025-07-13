import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Repeat } from 'lucide-react';
import { MobileOptimizedCard } from '@/components/ui/mobile-optimized-card';
import { MobileListItem } from '@/components/ui/mobile-list-item';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionStats } from '@/components/transactions/TransactionStats';
import { MobileRouteHandler } from '@/components/mobile/MobileRouteHandler';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { toast } from '@/hooks/use-toast';
import { shouldUseMobileLayout } from '@/hooks/useMobileDetection';

const Transactions = () => {
  const location = useLocation();
  const useMobile = shouldUseMobileLayout();
  
  // Se estiver em mobile e não for a rota base de transações, usar o mobile route handler
  if (useMobile && location.pathname !== '/transactions') {
    return <MobileRouteHandler />;
  }

  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
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
          category_id,
          categories (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Buscar categorias para os filtros
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-filters', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color, type')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const {
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    selectedType,
    setSelectedType,
    selectedCategory,
    setSelectedCategory,
    filteredTransactions,
    hasActiveFilters,
    clearFilters
  } = useTransactionFilters(transactions);

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação excluída com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao excluir transação.',
        variant: 'destructive',
      });
    }
  });

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteTransactionMutation.mutate(transactionId);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas receitas e despesas
          </p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)} 
          className="min-h-[44px] md:w-auto w-auto md:px-4 px-3 text-base font-medium"
          size="lg"
        >
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">Nova Transação</span>
        </Button>
      </div>

      {/* Statistics */}
      <TransactionStats transactions={filteredTransactions} />

      {/* Filters */}
      <TransactionFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Transactions List */}
      <MobileOptimizedCard 
        title="Lista de Transações"
        headerAction={
          <Badge variant="outline" className="ml-2">
            {filteredTransactions.length} de {transactions.length}
          </Badge>
        }
      >
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <ArrowUpCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {hasActiveFilters ? 'Nenhuma transação encontrada' : 'Nenhuma transação cadastrada'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Tente ajustar os filtros para encontrar suas transações.'
                  : 'Comece criando sua primeira transação!'
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="min-h-[44px]">
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <MobileListItem key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`p-3 rounded-full relative flex-shrink-0 ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                        : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpCircle className="h-6 w-6" />
                      ) : (
                        <ArrowDownCircle className="h-6 w-6" />
                      )}
                      {transaction.is_recurring && (
                        <Repeat className="h-3 w-3 absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-base truncate">{transaction.title}</p>
                        {transaction.parent_transaction_id && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {transaction.categories && (
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                            style={{ 
                              backgroundColor: transaction.categories.color + '20',
                              color: transaction.categories.color,
                              borderColor: transaction.categories.color
                            }}
                          >
                            {transaction.categories.name}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                        </span>
                        {transaction.is_recurring && (
                          <Badge variant="outline" className="text-xs">
                            <Repeat className="h-3 w-3 mr-1" />
                            {formatRecurrenceInfo(transaction)}
                          </Badge>
                        )}
                      </div>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{transaction.description}</p>
                      )}
                      {transaction.is_recurring && transaction.next_recurrence_date && (
                        <p className="text-xs text-blue-600 mt-1">
                          Próxima: {formatDate(transaction.next_recurrence_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-3 flex-shrink-0">
                    <div className="text-right">
                      <span className={`font-bold text-lg block ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : ''}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() => handleEditTransaction(transaction)}
                        title="Editar transação"
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 min-h-[44px] min-w-[44px]"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        title="Excluir transação"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </MobileListItem>
            ))
          )}
        </div>
      </MobileOptimizedCard>

      {/* Transaction Form Modal */}
      <TransactionForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm}
        transaction={editingTransaction}
      />
    </div>
  );
};

export default Transactions;
