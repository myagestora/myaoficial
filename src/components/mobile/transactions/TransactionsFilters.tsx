import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { AdvancedFiltersDialog } from './AdvancedFiltersDialog';

interface TransactionsFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedFilter: string;
  setSelectedFilter: (filter: string) => void;
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  selectedType?: string;
  onTypeChange?: (value: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (value: string) => void;
  categories?: any[];
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export const TransactionsFilters = ({ 
  searchTerm, 
  setSearchTerm, 
  selectedFilter, 
  setSelectedFilter,
  dateRange,
  onDateRangeChange,
  selectedType = 'all',
  onTypeChange,
  selectedCategory = 'all',
  onCategoryChange,
  categories = [],
  onClearFilters,
  hasActiveFilters = false
}: TransactionsFiltersProps) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <>
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {['todas', 'receitas', 'despesas'].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0 capitalize"
              onClick={() => setSelectedFilter(filter)}
            >
              {filter}
            </Button>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-shrink-0"
            onClick={() => setShowAdvancedFilters(true)}
          >
            <Filter size={16} className="mr-1" />
            Mais filtros
          </Button>
        </div>
      </div>

      <AdvancedFiltersDialog
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange || (() => {})}
        selectedType={selectedType}
        onTypeChange={onTypeChange || (() => {})}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange || (() => {})}
        categories={categories}
        onClearFilters={onClearFilters || (() => {})}
        hasActiveFilters={hasActiveFilters}
      />
    </>
  );
};