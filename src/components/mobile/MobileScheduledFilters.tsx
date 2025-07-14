import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  ArrowUpCircle, 
  ArrowDownCircle,
  X
} from 'lucide-react';
import { MobileListSelect } from './MobileListSelect';

interface FilterOptions {
  type: string;
  category: string;
}

interface MobileScheduledFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  categories: Array<{ id: string; name: string; color: string }>;
}

export const MobileScheduledFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  categories
}: MobileScheduledFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const typeOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'income', label: 'Receita' },
    { value: 'expense', label: 'Despesa' }
  ];

  const categoryOptions = [
    { value: '', label: 'Todas as categorias', color: undefined },
    ...categories.map(cat => ({ value: cat.id, label: cat.name, color: cat.color }))
  ];

  const clearFilters = () => {
    onFiltersChange({
      type: '',
      category: ''
    });
    onSearchChange('');
  };

  const hasActiveFilters = filters.type || filters.category || searchTerm;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar agendamentos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter size={16} />
            <span>Filtros</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {[filters.type, filters.category, searchTerm].filter(Boolean).length}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={16} className="mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Search size={12} />
                <span>"{searchTerm}"</span>
              </Badge>
            )}
            {filters.type && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                {filters.type === 'income' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                <span>{typeOptions.find(opt => opt.value === filters.type)?.label}</span>
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: categories.find(cat => cat.id === filters.category)?.color }}
                />
                <span>{categories.find(cat => cat.id === filters.category)?.name}</span>
              </Badge>
            )}
          </div>
        )}

        {/* Expanded Filters */}
        {showFilters && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <MobileListSelect
                value={filters.type}
                onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
                options={typeOptions}
                placeholder="Selecione o tipo"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <MobileListSelect
                value={filters.category}
                onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
                options={categoryOptions}
                placeholder="Selecione a categoria"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};