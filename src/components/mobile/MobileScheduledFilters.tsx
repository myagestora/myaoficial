import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MobileScheduledFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string;
    category: string;
    period: {
      from: Date | null;
      to: Date | null;
    };
  };
  onFiltersChange: (filters: any) => void;
  categories: Array<{ id: string; name: string; color?: string }>;
}

export const MobileScheduledFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  categories
}: MobileScheduledFiltersProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const clearFilters = () => {
    onSearchChange('');
    onFiltersChange({
      type: '',
      category: '',
      period: { from: null, to: null }
    });
    setIsSheetOpen(false);
  };

  const hasActiveFilters = searchTerm || filters.type || filters.category || filters.period.from || filters.period.to;

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

        {/* Filter Button */}
        <div className="flex items-center justify-between">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter size={16} />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 ml-1">
                    {[filters.type, filters.category, filters.period.from, filters.period.to, searchTerm].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
          
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 mt-6">
              {/* Type Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os tipos</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Categoria</label>
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
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period From */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.period.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.period.from ? format(filters.period.from, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.period.from}
                      onSelect={(date) => onFiltersChange({ 
                        ...filters, 
                        period: { ...filters.period, from: date } 
                      })}
                      className={cn("p-3 pointer-events-auto")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Period To */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.period.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.period.to ? format(filters.period.to, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.period.to}
                      onSelect={(date) => onFiltersChange({ 
                        ...filters, 
                        period: { ...filters.period, to: date } 
                      })}
                      className={cn("p-3 pointer-events-auto")}
                      initialFocus
                      disabled={(date) => filters.period.from ? date < filters.period.from : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Limpar todos os filtros
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={16} className="mr-1" />
            Limpar
          </Button>
        )}
        </div>
      </CardContent>
    </Card>
  );
};