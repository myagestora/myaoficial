
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { FilterDialog } from './FilterDialog';

interface FilterOptions {
  type: string;
  category: string;
  frequency: string;
  status: string;
  nextExecution: string;
}

interface ScheduledFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  categories: Array<{ id: string; name: string; color: string }>;
}

export const ScheduledFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  categories
}: ScheduledFiltersProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar agendamentos..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <FilterDialog 
            filters={filters}
            onFiltersChange={onFiltersChange}
            categories={categories}
          />
        </div>
      </CardContent>
    </Card>
  );
};
