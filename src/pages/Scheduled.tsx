
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
  
  const { 
    scheduledTransactions, 
    isLoading, 
    toggleRecurringStatus, 
    deleteScheduledTransaction 
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
    const nextDate = new Date(t.next_recurrence_date);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const overdueScheduled = filteredTransactions.filter(t => {
    const nextDate = new Date(t.next_recurrence_date);
    const today = new Date();
    return nextDate < today;
  }).length;

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleRecurringStatus.mutate({ id, isActive });
  };

  const handleDelete = (id: string) => {
    deleteScheduledTransaction.mutate(id);
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
      />

      <TransactionForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
    </div>
  );
};

export default Scheduled;
