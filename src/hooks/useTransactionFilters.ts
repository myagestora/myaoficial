
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';

const getCurrentMonthRange = (): DateRange => {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now)
  };
};

export const useTransactionFilters = (transactions: any[], selectedAccount: string, selectedCard: string) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getCurrentMonthRange());
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => {
        const matchesSearch = 
          transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });
    }

    // Type filter
    if (selectedType && selectedType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === selectedType);
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(transaction => transaction.category_id === selectedCategory);
    }

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date + 'T00:00:00');
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        
        // Set time to start/end of day for proper comparison
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        
        return transactionDate >= fromDate && transactionDate <= toDate;
      });
    }

    // Account filter
    if (selectedAccount && selectedAccount !== 'all') {
      filtered = filtered.filter(transaction => transaction.account_id === selectedAccount);
    }

    // Card filter
    if (selectedCard && selectedCard !== 'all') {
      filtered = filtered.filter(transaction => transaction.card_id === selectedCard);
    }

    return filtered;
  }, [transactions, searchTerm, selectedType, selectedCategory, dateRange, selectedAccount, selectedCard]);

  const hasActiveFilters = Boolean(
    searchTerm || 
    (selectedType && selectedType !== 'all') || 
    (selectedCategory && selectedCategory !== 'all') || 
    (dateRange?.from && dateRange?.to && (
      dateRange.from.getTime() !== getCurrentMonthRange().from?.getTime() ||
      dateRange.to.getTime() !== getCurrentMonthRange().to?.getTime()
    )) ||
    (selectedAccount && selectedAccount !== 'all') ||
    (selectedCard && selectedCard !== 'all')
  );

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('all');
    setDateRange(getCurrentMonthRange());
    setSelectedAccount('all');
    setSelectedCard('all');
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
