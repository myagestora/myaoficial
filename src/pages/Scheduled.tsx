
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { ScheduledHeader } from '@/components/scheduled/ScheduledHeader';
import { ScheduledStats } from '@/components/scheduled/ScheduledStats';
import { ScheduledFilters } from '@/components/scheduled/ScheduledFilters';
import { ScheduledTransactionsList } from '@/components/scheduled/ScheduledTransactionsList';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { useScheduledFilters } from '@/hooks/useScheduledFilters';

const Scheduled = () => {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recurringDeletingId, setRecurringDeletingId] = useState<string | null>(null);
  
  const { 
    scheduledTransactions, 
    isLoading, 
    editTransaction,
    deleteScheduledTransaction,
    deleteRecurringSeries
  } = useScheduledTransactions();

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredTransactions,
    hasFiltersOrSearch
  } = useScheduledFilters(scheduledTransactions);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .or(`user_id.eq.${user.id},is_default.eq.true`);

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Calcular estatísticas
  const upcomingExecutions = filteredTransactions.filter(t => {
    const targetDate = new Date(t.date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const overdueScheduled = 0; // Não há mais transações atrasadas, pois só mostramos futuras

  const handleToggleStatus = (id: string, isActive: boolean) => {
    // Esta funcionalidade foi removida no novo sistema
    console.log('Funcionalidade de toggle foi descontinuada');
  };

  const handleDelete = (id: string) => {
    const transaction = filteredTransactions.find(t => t.id === id);
    if (!transaction) return;

    // Verificar se é uma transação recorrente (pai ou filho)
    const isRecurring = transaction.is_recurring || transaction.parent_transaction_id;
    
    if (isRecurring) {
      setRecurringDeletingId(id);
    } else {
      setDeletingId(id);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    deleteScheduledTransaction.mutate(deletingId);
    setDeletingId(null);
  };

  const handleDeleteSingle = () => {
    if (!recurringDeletingId) return;
    deleteScheduledTransaction.mutate(recurringDeletingId);
    setRecurringDeletingId(null);
  };

  const handleDeleteSeries = () => {
    if (!recurringDeletingId) return;
    const transaction = filteredTransactions.find(t => t.id === recurringDeletingId);
    if (!transaction) return;
    
    const parentId = transaction.parent_transaction_id || transaction.id;
    deleteRecurringSeries.mutate(parentId);
    setRecurringDeletingId(null);
  };

  const handleCancelDelete = () => {
    setDeletingId(null);
    setRecurringDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
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
      <ScheduledHeader onNewSchedule={() => setIsFormOpen(true)} />
      
      <ScheduledStats 
        totalScheduled={filteredTransactions.length}
        upcomingExecutions={upcomingExecutions}
        overdueScheduled={overdueScheduled}
      />

      <ScheduledFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
      />

      <ScheduledTransactionsList
        transactions={filteredTransactions}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        hasFiltersOrSearch={hasFiltersOrSearch}
        deletingId={deletingId}
        recurringDeletingId={recurringDeletingId}
        onConfirmDelete={handleConfirmDelete}
        onDeleteSingle={handleDeleteSingle}
        onDeleteSeries={handleDeleteSeries}
        onCancelDelete={handleCancelDelete}
      />

      <TransactionForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
    </div>
  );
};

export default Scheduled;
