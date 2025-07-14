
import { useState, useMemo } from 'react';

interface FilterOptions {
  type: string;
  category: string;
  period: {
    from: Date | null;
    to: Date | null;
  };
}

export const useScheduledFilters = (transactions: any[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    category: 'all',
    period: {
      from: null,
      to: null
    }
  });

  const applyFilters = (transaction: any) => {
    // Filtro por tipo
    if (filters.type && filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }

    // Filtro por categoria
    if (filters.category && filters.category !== 'all' && transaction.category_id !== filters.category) {
      return false;
    }

    // Filtro por período
    if (filters.period.from || filters.period.to) {
      // Parse manual da data para evitar problemas de timezone
      const [year, month, day] = transaction.date.split('-').map(Number);
      const transactionDate = new Date(year, month - 1, day);
      transactionDate.setHours(0, 0, 0, 0);
      
      if (filters.period.from) {
        const fromDate = new Date(filters.period.from);
        fromDate.setHours(0, 0, 0, 0);
        if (transactionDate < fromDate) return false;
      }
      
      if (filters.period.to) {
        const toDate = new Date(filters.period.to);
        toDate.setHours(23, 59, 59, 999);
        if (transactionDate > toDate) return false;
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

  const hasFiltersOrSearch = Boolean(searchTerm !== '' || (filters.type !== 'all') || (filters.category !== 'all') || filters.period.from || filters.period.to);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredTransactions,
    hasFiltersOrSearch
  };
};
