
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Filter, X } from 'lucide-react';

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
  const [showFilters, setShowFilters] = useState(false);

  const typeOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'income', label: 'Receita' },
    { value: 'expense', label: 'Despesa' }
  ];

  const frequencyOptions = [
    { value: '', label: 'Todas as frequências' },
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'yearly', label: 'Anual' },
    { value: 'custom', label: 'Personalizado' }
  ];

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'active', label: 'Ativo' },
    { value: 'inactive', label: 'Inativo' }
  ];

  const nextExecutionOptions = [
    { value: '', label: 'Todos os períodos' },
    { value: 'today', label: 'Hoje' },
    { value: 'tomorrow', label: 'Amanhã' },
    { value: 'week', label: 'Próximos 7 dias' },
    { value: 'month', label: 'Próximos 30 dias' },
    { value: 'overdue', label: 'Atrasados' }
  ];

  const clearFilters = () => {
    onFiltersChange({
      type: '',
      category: '',
      frequency: '',
      status: '',
      nextExecution: ''
    });
    onSearchChange('');
  };

  const hasActiveFilters = filters.type || filters.category || filters.frequency || filters.status || filters.nextExecution || searchTerm;

  const getActiveFiltersCount = () => {
    return [filters.type, filters.category, filters.frequency, filters.status, filters.nextExecution, searchTerm].filter(Boolean).length;
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

        {/* Botão de filtros e limpar */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Campos de filtro expandidos */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={filters.category} 
                onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequência */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select 
                value={filters.frequency} 
                onValueChange={(value) => onFiltersChange({ ...filters, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as frequências" />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Próxima Execução */}
            <div className="space-y-2">
              <Label htmlFor="nextExecution">Próxima Execução</Label>
              <Select 
                value={filters.nextExecution} 
                onValueChange={(value) => onFiltersChange({ ...filters, nextExecution: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  {nextExecutionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
