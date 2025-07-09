
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export const useTransactionFilters = (transactions: any[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const matchesSearch = !searchTerm || 
        transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = selectedType === 'all' || transaction.type === selectedType;

      // Category filter
      const matchesCategory = selectedCategory === 'all' || transaction.category_id === selectedCategory;

      // Date range filter
      const matchesDateRange = !dateRange?.from || !dateRange?.to || (() => {
        const transactionDate = new Date(transaction.date + 'T00:00:00');
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        
        // Set time to start/end of day for proper comparison
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        
        return transactionDate >= fromDate && transactionDate <= toDate;
      })();

      return matchesSearch && matchesType && matchesCategory && matchesDateRange;
    });
  }, [transactions, searchTerm, selectedType, selectedCategory, dateRange]);

  const hasActiveFilters = Boolean(
    searchTerm || 
    (selectedType && selectedType !== 'all') || 
    (selectedCategory && selectedCategory !== 'all') || 
    (dateRange?.from && dateRange?.to)
  );

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('all');
    setDateRange(undefined);
  };

  return {
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
  };
};
