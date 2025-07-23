import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, ArrowUpCircle, ArrowDownCircle, CreditCard, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
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
  selectedAccount?: string;
  onAccountChange?: (value: string) => void;
  accounts?: any[];
  selectedCard?: string;
  onCardChange?: (value: string) => void;
  cards?: any[];
  selectedStatus?: string;
  onStatusChange?: (value: string) => void;
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
  selectedAccount = 'all',
  onAccountChange,
  accounts = [],
  selectedCard = 'all',
  onCardChange,
  cards = [],
  selectedStatus = 'all',
  onStatusChange,
  onClearFilters,
  hasActiveFilters = false
}: TransactionsFiltersProps) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const typeOptions = [
    { value: 'all', label: 'Todos os tipos', icon: null },
    { value: 'income', label: 'Receitas', icon: <ArrowUpCircle className="h-4 w-4 text-green-600" /> },
    { value: 'expense', label: 'Despesas', icon: <ArrowDownCircle className="h-4 w-4 text-red-600" /> }
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos os status' },
    { value: 'normal', label: 'Normais' },
    { value: 'recurring', label: 'Recorrentes' },
    { value: 'auto', label: 'Automáticas' }
  ];

  const filteredCategories = categories; // Não filtrar por tipo, mostrar todas

  // Separar categorias por tipo se selectedType === 'all'
  let categoryOptions: any[] = [];
  if (selectedType === 'all') {
    const incomeCats = filteredCategories.filter(cat => cat.type === 'income');
    const expenseCats = filteredCategories.filter(cat => cat.type === 'expense');
    categoryOptions = [
      { value: 'all', label: 'Todas as categorias', color: undefined },
      ...(incomeCats.length > 0 ? [{ value: '__label_income', label: 'Receitas', isLabel: true }] : []),
      ...incomeCats.map(cat => ({ value: cat.id, label: cat.name, color: cat.color, type: 'income' })),
      ...(expenseCats.length > 0 ? [{ value: '__label_expense', label: 'Despesas', isLabel: true }] : []),
      ...expenseCats.map(cat => ({ value: cat.id, label: cat.name, color: cat.color, type: 'expense' })),
    ];
  } else {
    categoryOptions = [
      { value: 'all', label: 'Todas as categorias', color: undefined },
      ...filteredCategories.map(cat => ({ value: cat.id, label: cat.name, color: cat.color, type: cat.type }))
    ];
  }

  const accountOptions = [
    { value: 'all', label: 'Todas as contas' },
    ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
  ];

  const cardOptions = [
    { value: 'all', label: 'Todos os cartões' },
    ...cards.map(card => ({ value: card.id, label: card.name + (card.last_four_digits ? ` •••• ${card.last_four_digits}` : '') }))
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
              options={categoryOptions.map(opt =>
                opt.isLabel
                  ? { ...opt, content: <span className="text-xs font-semibold text-muted-foreground pl-2 pr-2 py-1 uppercase tracking-wide">{opt.label}</span> }
                  : { ...opt, content: undefined }
              )}
              value={selectedCategory}
              onValueChange={onCategoryChange || (() => {})}
              placeholder="Selecione a categoria"
            />
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Conta</Label>
            <MobileListSelect
              options={accountOptions}
              value={selectedAccount}
              onValueChange={onAccountChange || (() => {})}
              placeholder="Selecione a conta"
            />
          </div>

          {/* Cartão */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cartão</Label>
            <MobileListSelect
              options={cardOptions}
              value={selectedCard}
              onValueChange={onCardChange || (() => {})}
              placeholder="Selecione o cartão"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <MobileListSelect
              options={statusOptions}
              value={selectedStatus}
              onValueChange={onStatusChange || (() => {})}
              placeholder="Selecione o status"
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
          {/* Badge de categoria */}
          {selectedCategory && selectedCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <span className="flex items-center gap-1">
                {categories.find(c => c.id === selectedCategory)?.color && (
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: categories.find(c => c.id === selectedCategory)?.color }} />
                )}
                {categories.find(c => c.id === selectedCategory)?.name}
              </span>
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onCategoryChange?.('all')}
              />
            </Badge>
          )}
          {/* Badge de conta */}
          {selectedAccount && selectedAccount !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {accounts.find(a => a.id === selectedAccount)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onAccountChange?.('all')}
              />
            </Badge>
          )}
          {/* Badge de cartão */}
          {selectedCard && selectedCard !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {cards.find(c => c.id === selectedCard)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onCardChange?.('all')}
              />
            </Badge>
          )}
          {/* Badge de status */}
          {selectedStatus && selectedStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {selectedStatus === 'normal' ? 'Normais' : selectedStatus === 'recurring' ? 'Recorrentes' : selectedStatus === 'auto' ? 'Automáticas' : selectedStatus}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onStatusChange?.('all')}
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