
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DateRange } from 'react-day-picker';

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: any[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onClearFilters,
  hasActiveFilters
}: TransactionFiltersProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search and Clear Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={onClearFilters} className="whitespace-nowrap">
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Período
              </label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={onDateRangeChange}
              />
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo
              </label>
              <Select value={selectedType} onValueChange={onTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      Receitas
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      Despesas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoria
              </label>
              <Select value={selectedCategory} onValueChange={onCategoryChange}>
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

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select value="" onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="normal">Normais</SelectItem>
                  <SelectItem value="recurring">Recorrentes</SelectItem>
                  <SelectItem value="auto">Automáticas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Busca: "{searchTerm}"
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onSearchChange('')}
                  />
                </Badge>
              )}
              {selectedType && (
                <Badge variant="secondary" className="gap-1">
                  {selectedType === 'income' ? 'Receitas' : 'Despesas'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onTypeChange('')}
                  />
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onCategoryChange('')}
                  />
                </Badge>
              )}
              {dateRange?.from && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  Período selecionado
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onDateRangeChange(undefined)}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
