
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';

interface FilterOptions {
  type: string;
  category: string;
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

  const typeOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'income', label: 'Receita' },
    { value: 'expense', label: 'Despesa' }
  ];

  const clearFilters = () => {
    onFiltersChange({
      type: '',
      category: ''
    });
    onSearchChange('');
  };

  const hasActiveFilters = filters.type || filters.category || searchTerm;

  const getActiveFiltersCount = () => {
    return [filters.type, filters.category, searchTerm].filter(Boolean).length;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar agendamentos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros sempre visíveis */}
        <div className="space-y-4">
          {/* Header com badge de filtros ativos e botão limpar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Filtros</Label>
              {hasActiveFilters && (
                <Badge variant="secondary" className="h-5 text-xs">
                  {getActiveFiltersCount()} ativo{getActiveFiltersCount() > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Campos de filtro em grid responsivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tipo */}
            <div className="space-y-1">
              <Label htmlFor="type" className="text-xs text-muted-foreground">Tipo</Label>
              <select 
                value={filters.type} 
                onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs text-muted-foreground">Categoria</Label>
              <select 
                value={filters.category} 
                onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
