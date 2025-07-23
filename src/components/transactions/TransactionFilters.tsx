
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
  selectedAccount: string;
  onAccountChange: (value: string) => void;
  accounts: any[];
  selectedCard: string;
  onCardChange: (value: string) => void;
  cards: any[];
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
  selectedAccount,
  onAccountChange,
  accounts,
  selectedCard,
  onCardChange,
  cards,
  onClearFilters,
  hasActiveFilters
}: TransactionFiltersProps) => {
  // Adicionar estado para status
  const [selectedStatus, setSelectedStatus] = React.useState('all');

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search and Clear Filters */}
          <div className="flex flex-col gap-2 mb-2 md:flex-row md:items-center md:gap-4">
            <div className="w-full md:w-1/3 relative">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 text-sm h-10"
                />
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Período</label>
                <DatePickerWithRange date={dateRange} onDateChange={onDateRangeChange} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                <Select value={selectedType} onValueChange={onTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="income"><div className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-green-600" />Receitas</div></SelectItem>
                    <SelectItem value="expense"><div className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-red-600" />Despesas</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
              <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta</label>
              <Select value={selectedAccount} onValueChange={onAccountChange}>
                <SelectTrigger><SelectValue placeholder="Todas as contas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
                        {account.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Card Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cartão</label>
              <Select value={selectedCard} onValueChange={onCardChange}>
                <SelectTrigger><SelectValue placeholder="Todos os cartões" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cartões</SelectItem>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                        {card.name}{card.last_four_digits ? ` •••• ${card.last_four_digits}` : ''}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="normal">Normais</SelectItem>
                  <SelectItem value="recurring">Recorrentes</SelectItem>
                  <SelectItem value="auto">Automáticas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display e Limpar Filtros */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center mt-2">
              {/* Limpar Filtros como badge vermelho no início */}
              <Badge variant="destructive" className="gap-1 cursor-pointer" onClick={onClearFilters}>
                <X className="h-3 w-3" /> Limpar Filtros
              </Badge>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Busca: "{searchTerm}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onSearchChange('')} />
                </Badge>
              )}
              {selectedType && selectedType !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {selectedType === 'income' ? 'Receitas' : 'Despesas'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onTypeChange('all')} />
                </Badge>
              )}
              {selectedCategory && selectedCategory !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onCategoryChange('all')} />
                </Badge>
              )}
              {selectedAccount && selectedAccount !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {accounts.find(a => a.id === selectedAccount)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onAccountChange('all')} />
                </Badge>
              )}
              {selectedCard && selectedCard !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {cards.find(c => c.id === selectedCard)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onCardChange('all')} />
                </Badge>
              )}
              {selectedStatus && selectedStatus !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {selectedStatus === 'normal' ? 'Normais' : selectedStatus === 'recurring' ? 'Recorrentes' : 'Automáticas'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedStatus('all')} />
                </Badge>
              )}
              {dateRange?.from && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  Período selecionado
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onDateRangeChange(undefined)} />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
