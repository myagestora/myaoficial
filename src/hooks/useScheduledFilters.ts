
import { useState, useMemo } from 'react';

interface FilterOptions {
  type: string;
  category: string;
  frequency: string;
  status: string;
  nextExecution: string;
}

export const useScheduledFilters = (transactions: any[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    type: '',
    category: '',
    frequency: '',
    status: '',
    nextExecution: ''
  });

  const applyFilters = (transaction: any) => {
    // Filtro por tipo
    if (filters.type && transaction.type !== filters.type) {
      return false;
    }

    // Filtro por categoria
    if (filters.category && transaction.category_id !== filters.category) {
      return false;
    }

    // Filtro por frequência
    if (filters.frequency && transaction.recurrence_frequency !== filters.frequency) {
      return false;
    }

    // Filtro por status
    if (filters.status) {
      const isActive = transaction.is_recurring;
      if ((filters.status === 'active' && !isActive) || (filters.status === 'paused' && isActive)) {
        return false;
      }
    }

    // Filtro por próxima execução  
    if (filters.nextExecution && transaction.next_recurrence_date) {
      const nextDate = new Date(transaction.next_recurrence_date);
      const today = new Date();
      const diffTime = nextDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (filters.nextExecution) {
        case 'today':
          if (diffDays !== 0) return false;
          break;
        case 'tomorrow':
          if (diffDays !== 1) return false;
          break;
        case 'week':
          if (diffDays < 0 || diffDays > 7) return false;
          break;
        case 'month':
          if (diffDays < 0 || diffDays > 30) return false;
          break;
        case 'overdue':
          if (diffDays >= 0) return false;
          break;
      }
    }

    return true;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Aplicar filtro de busca por texto
      const matchesSearch = transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Aplicar filtros avançados
      const matchesFilters = applyFilters(transaction);
      
      return matchesSearch && matchesFilters;
    });
  }, [transactions, searchTerm, filters]);

  const hasFiltersOrSearch = searchTerm !== '' || Object.values(filters).some(f => f !== '');

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredTransactions,
    hasFiltersOrSearch
  };
};
