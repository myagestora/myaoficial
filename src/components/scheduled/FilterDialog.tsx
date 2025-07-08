
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';

interface FilterOptions {
  type: string;
  category: string;
  frequency: string;
  status: string;
  nextExecution: string;
}

interface FilterDialogProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  categories: Array<{ id: string; name: string; color: string }>;
}

export const FilterDialog = ({ filters, onFiltersChange, categories }: FilterDialogProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<FilterOptions>(filters);

  const frequencyOptions = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Ativo' },
    { value: 'paused', label: 'Pausado' }
  ];

  const nextExecutionOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'tomorrow', label: 'Amanhã' },
    { value: 'week', label: 'Próximos 7 dias' },
    { value: 'month', label: 'Próximos 30 dias' },
    { value: 'overdue', label: 'Atrasados' }
  ];

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      type: '',
      category: '',
      frequency: '',
      status: '',
      nextExecution: ''
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setIsOpen(false);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  const getActiveFilterLabels = () => {
    const labels = [];
    if (filters.type) labels.push(filters.type === 'income' ? 'Receita' : 'Despesa');
    if (filters.category) {
      const category = categories.find(c => c.id === filters.category);
      if (category) labels.push(category.name);
    }
    if (filters.frequency) {
      const freq = frequencyOptions.find(f => f.value === filters.frequency);
      if (freq) labels.push(freq.label);
    }
    if (filters.status) {
      const status = statusOptions.find(s => s.value === filters.status);
      if (status) labels.push(status.label);
    }
    if (filters.nextExecution) {
      const exec = nextExecutionOptions.find(e => e.value === filters.nextExecution);
      if (exec) labels.push(exec.label);
    }
    return labels;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
          {getActiveFiltersCount() > 0 && (
            <Badge 
              className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground"
            >
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtrar Agendamentos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filtros ativos */}
          {getActiveFiltersCount() > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtros Ativos:</Label>
              <div className="flex flex-wrap gap-2">
                {getActiveFilterLabels().map((label, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select 
              value={localFilters.type} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, type: value }))}
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

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select 
              value={localFilters.category} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, category: value }))}
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
              value={localFilters.frequency} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, frequency: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as frequências" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as frequências</SelectItem>
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
              value={localFilters.status} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
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
              value={localFilters.nextExecution} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, nextExecution: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os períodos</SelectItem>
                {nextExecutionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between gap-3 mt-6">
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters}>
            Aplicar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
