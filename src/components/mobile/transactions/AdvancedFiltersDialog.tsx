import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DateRange } from 'react-day-picker';
import { MobileListSelect } from '../MobileListSelect';
import { X, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AdvancedFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const AdvancedFiltersDialog = ({
  open,
  onOpenChange,
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
}: AdvancedFiltersDialogProps) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Filtros Avançados</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Busca */}
          <div className="space-y-2">
            <Label>Buscar</Label>
            <Input
              placeholder="Buscar por título ou descrição..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Período */}
          <div className="space-y-2">
            <Label>Período</Label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={onDateRangeChange}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <MobileListSelect
              options={typeOptions}
              value={selectedType}
              onValueChange={onTypeChange}
              placeholder="Selecione o tipo"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <MobileListSelect
              options={categoryOptions}
              value={selectedCategory}
              onValueChange={onCategoryChange}
              placeholder="Selecione a categoria"
            />
          </div>

          {/* Filtros Ativos */}
          {hasActiveFilters && (
            <div className="space-y-2">
              <Label>Filtros Ativos</Label>
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
                {selectedType && selectedType !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedType === 'income' ? 'Receitas' : 'Despesas'}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => onTypeChange('all')}
                    />
                  </Badge>
                )}
                {selectedCategory && selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {categories.find(c => c.id === selectedCategory)?.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => onCategoryChange('all')}
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
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            {hasActiveFilters && (
              <Button variant="outline" onClick={onClearFilters} className="flex-1">
                Limpar Filtros
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};