import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

interface TransactionsFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedFilter: string;
  setSelectedFilter: (filter: string) => void;
}

export const TransactionsFilters = ({ 
  searchTerm, 
  setSearchTerm, 
  selectedFilter, 
  setSelectedFilter 
}: TransactionsFiltersProps) => {
  return (
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
        <Button variant="outline" size="sm" className="flex-shrink-0">
          <Filter size={16} className="mr-1" />
          Mais filtros
        </Button>
      </div>
    </div>
  );
};