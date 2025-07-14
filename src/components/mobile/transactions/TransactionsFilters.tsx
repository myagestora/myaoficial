import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { MobileListSelect } from '../MobileListSelect';

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

  const typeOptions = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'income', label: 'Receitas' },
    { value: 'expense', label: 'Despesas' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'Todas as categorias' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  return (
    <div className="space-y-4 mb-4">
      {/* Busca principal */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar transações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros básicos */}
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
          variant={showAdvancedFilters ? 'default' : 'outline'}
          size="sm" 
          className="flex-shrink-0"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter size={16} className="mr-1" />
          Mais filtros
          {showAdvancedFilters ? (
            <ChevronUp size={16} className="ml-1" />
          ) : (
            <ChevronDown size={16} className="ml-1" />
          )}
        </Button>
      </div>

      {/* Filtros avançados expansíveis */}
      {showAdvancedFilters && (
        <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
          {/* Período */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Período</Label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={onDateRangeChange || (() => {})}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo</Label>
            <MobileListSelect
              options={typeOptions}
              value={selectedType}
              onValueChange={onTypeChange || (() => {})}
              placeholder="Selecione o tipo"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categoria</Label>
            <MobileListSelect
              options={categoryOptions}
              value={selectedCategory}
              onValueChange={onCategoryChange || (() => {})}
              placeholder="Selecione a categoria"
            />
          </div>

          {/* Botão limpar filtros */}
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              onClick={onClearFilters || (() => {})} 
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </div>
      )}

      {/* Filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{searchTerm}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setSearchTerm('')}
              />
            </Badge>
          )}
          {selectedType && selectedType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {selectedType === 'income' ? 'Receitas' : 'Despesas'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onTypeChange?.('all')}
              />
            </Badge>
          )}
          {selectedCategory && selectedCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {categories.find(c => c.id === selectedCategory)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onCategoryChange?.('all')}
              />
            </Badge>
          )}
          {dateRange?.from && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              Período selecionado
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onDateRangeChange?.(undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};