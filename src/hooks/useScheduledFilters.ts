
import { useState, useMemo } from 'react';

interface FilterOptions {
  type: string;
  category: string;
}

export const useScheduledFilters = (transactions: any[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    type: '',
    category: ''
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
