import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '@/hooks/useTransactions';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TransactionsSummary } from '../transactions/TransactionsSummary';
import { TransactionsFilters } from '../transactions/TransactionsFilters';
import { TransactionCard } from '../transactions/TransactionCard';
import { EmptyTransactionsState } from '../transactions/EmptyTransactionsState';

export const MobileTransactions = () => {
  const [selectedFilter, setSelectedFilter] = useState('todas');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transactions, isLoading, deleteTransaction } = useTransactions();
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Use transaction filters hook
  const {
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    selectedType,
    setSelectedType,
    selectedCategory,
    setSelectedCategory,
    filteredTransactions: hookFilteredTransactions,
    hasActiveFilters,
    clearFilters
  } = useTransactionFilters(transactions || []);

  // Função para confirmar exclusão
  const confirmDelete = (transactionId: string) => {
    setDeletingId(transactionId);
  };

  // Função para cancelar exclusão
  const cancelDelete = () => {
    setDeletingId(null);
  };

  // Função para deletar transação
  const handleDelete = (transactionId: string) => {
    deleteTransaction(transactionId);
    setDeletingId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return date;
    }
  };

  // Apply additional filter based on selectedFilter
  const filteredTransactions = hookFilteredTransactions.filter(transaction => {
    if (selectedFilter === 'todas') return true;
    if (selectedFilter === 'receitas') return transaction.type === 'income';
    if (selectedFilter === 'despesas') return transaction.type === 'expense';
    return true;
  });

  // Calcular estatísticas
  const income = (transactions || []).filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = (transactions || []).filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <MobilePageWrapper className="bg-gradient-to-br from-background to-primary/5">
      {/* Header com botão de nova transação */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Transações</h1>
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0"
          onClick={() => navigate('/transactions/nova')}
        >
          <Plus size={16} />
          <span>Nova</span>
        </Button>
      </div>

      <TransactionsSummary 
        income={income}
        expenses={expenses}
        formatCurrency={formatCurrency}
      />

      <TransactionsFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
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

      {/* Lista de transações */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              deletingId={deletingId}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onConfirmDelete={confirmDelete}
              onCancelDelete={cancelDelete}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {filteredTransactions.length === 0 && !isLoading && (
        <EmptyTransactionsState 
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
        />
      )}

    </MobilePageWrapper>
  );
};