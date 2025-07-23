import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Plus, Calendar, ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Wallet, CreditCard } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '@/hooks/useTransactions';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TransactionsFilters } from '../transactions/TransactionsFilters';
import { EmptyTransactionsState } from '../transactions/EmptyTransactionsState';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { TransactionCard } from '../transactions/TransactionCard';

export const MobileTransactions = () => {
  const [selectedFilter, setSelectedFilter] = useState('todas');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCard, setSelectedCard] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transactions, isLoading, deleteTransaction } = useTransactions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { bankAccounts } = useBankAccounts();
  const { creditCards } = useCreditCards();
  
  // Fetch categories (padrão e do usuário)
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Use transaction filters hook
  const {
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    selectedType,
    setSelectedType,
    selectedCategory,
    setSelectedCategory,
    filteredTransactions: hookFilteredTransactions,
    hasActiveFilters,
    clearFilters
  } = useTransactionFilters(transactions || []);

  // Filtrar categorias conforme o tipo selecionado
  const filteredCategories = selectedType === 'all'
    ? categories
    : categories.filter(cat => cat.type === selectedType);

  // Função para limpar todos os filtros
  const handleClearFilters = () => {
    clearFilters();
    setSelectedAccount('all');
    setSelectedCard('all');
    setSelectedStatus('all');
  };

  // Filtragem combinada de todos os filtros
  const filteredTransactions = hookFilteredTransactions.filter(transaction => {
    // Filtro rápido (todas, receitas, despesas)
    if (selectedFilter === 'receitas' && transaction.type !== 'income') return false;
    if (selectedFilter === 'despesas' && transaction.type !== 'expense') return false;

    // Filtro de tipo
    if (selectedType && selectedType !== 'all' && transaction.type !== selectedType) return false;
    // Filtro de categoria
    if (selectedCategory && selectedCategory !== 'all' && transaction.category_id !== selectedCategory) return false;
    // Filtro de conta
    if (selectedAccount && selectedAccount !== 'all' && transaction.account_id !== selectedAccount) return false;
    // Filtro de cartão
    if (selectedCard && selectedCard !== 'all' && transaction.card_id !== selectedCard) return false;
    // Filtro de status (exemplo: recorrente, normal, auto)
    if (selectedStatus && selectedStatus !== 'all') {
      if (selectedStatus === 'recurring' && !transaction.is_recurring) return false;
      if (selectedStatus === 'auto' && !transaction.is_automatic) return false;
      if (selectedStatus === 'normal' && (transaction.is_recurring || transaction.is_automatic)) return false;
    }
    // Filtro de período
    if (dateRange?.from && new Date(transaction.date) < dateRange.from) return false;
    if (dateRange?.to && new Date(transaction.date) > dateRange.to) return false;
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matches =
        transaction.title?.toLowerCase().includes(searchLower) ||
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.categories?.name?.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    return true;
  });

  // Calcular estatísticas baseadas nas transações filtradas
  const income = hookFilteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = hookFilteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  // Período de referência
  const periodLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
    : '';

  return (
    <div className="bg-[#F6F8FA] min-h-screen p-2 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Transações</h1>
          <p className="text-[11px] text-gray-400">Resumo e histórico de movimentações</p>
        </div>
        <div className="ml-auto">
        <Button 
          size="sm" 
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0 px-3 h-9 text-sm"
          onClick={() => navigate('/transactions/nova')}
        >
            <Plus size={15} className="mr-1" />
            Nova
        </Button>
        </div>
      </div>

      {/* Período de referência */}
      {periodLabel && (
        <div className="mb-1 text-xs text-gray-500 font-medium text-center">
          Período: {periodLabel}
        </div>
      )}

      {/* Cards de resumo - layout mobile responsivo */}
      <div className="mb-2">
        <div className="flex gap-2 mb-1">
          {/* Receita */}
          <div className="flex-1 bg-white rounded-lg border border-gray-100 shadow-sm px-3 py-2 flex flex-col items-center min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-5 h-5 text-green-600 bg-green-50 rounded p-1" />
              <span className="text-xs text-gray-500 font-medium">Receitas</span>
            </div>
            <span className="text-base font-bold text-green-700 text-center whitespace-nowrap">{formatCurrency(income)}</span>
          </div>
          {/* Despesa */}
          <div className="flex-1 bg-white rounded-lg border border-gray-100 shadow-sm px-3 py-2 flex flex-col items-center min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-5 h-5 text-red-600 bg-red-50 rounded p-1" />
              <span className="text-xs text-gray-500 font-medium">Despesas</span>
            </div>
            <span className="text-base font-bold text-red-700 text-center whitespace-nowrap">{formatCurrency(expenses)}</span>
          </div>
        </div>
        {/* Saldo */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-3 py-2 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-5 h-5 text-blue-600 bg-blue-50 rounded p-1" />
            <span className="text-xs text-gray-500 font-medium">Saldo</span>
          </div>
          <span className={`text-base font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'} text-right whitespace-nowrap`}>{(balance >= 0 ? '' : '-') + formatCurrency(Math.abs(balance))}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-2">
      <TransactionsFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
          categories={filteredCategories}
          selectedAccount={selectedAccount}
          onAccountChange={setSelectedAccount}
          accounts={bankAccounts}
          selectedCard={selectedCard}
          onCardChange={setSelectedCard}
          cards={creditCards}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters || selectedAccount !== 'all' || selectedCard !== 'all' || selectedStatus !== 'all'}
        />
      </div>

      {/* Lista de transações */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : filteredTransactions.length === 0 ? (
          <EmptyTransactionsState 
            searchTerm={searchTerm}
            selectedFilter={selectedFilter}
          />
        ) : (
          filteredTransactions.map((transaction) => {
            const isIncome = transaction.type === 'income';
            const iconBg = isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
            const icon = isIncome ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />;
            const valueColor = isIncome ? 'text-green-700' : 'text-red-700';
            const account = transaction.account_id ? bankAccounts.find(a => a.id === transaction.account_id) : null;
            const card = transaction.card_id ? creditCards.find(c => c.id === transaction.card_id) : null;
            return (
              <div key={transaction.id} className="rounded-xl border border-gray-100 shadow-sm p-2 flex flex-col gap-1 relative bg-white">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${iconBg}`}>{icon}</div>
                  <span className="font-semibold text-sm text-gray-900 truncate flex-1">{transaction.title}</span>
                  {transaction.categories?.name && <span className="text-[11px] text-gray-500 ml-2">{transaction.categories.name}</span>}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className={`font-bold ${valueColor} text-base`}>{isIncome ? '+' : '-'}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[11px] text-gray-400">{transaction.date ? (() => { const [y, m, d] = transaction.date.split('-'); return `${d}/${m}/${y}` })() : ''}</span>
                </div>
                {/* Rodapé cinza com banco/cartão e ícones */}
                <div className="bg-gray-100 rounded-lg px-3 py-1 mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {card && (
                      <span className="flex items-center gap-1 text-xs text-gray-700 truncate">
                        <CreditCard size={13} style={{ color: card.color || '#8B5CF6' }} />
                        {card.name}
                        {card.last_four_digits && (
                          <span className="text-[10px] text-gray-400 ml-1">•••• {card.last_four_digits}</span>
                        )}
                      </span>
                    )}
                    {account && (
                      <span className="flex items-center gap-1 text-xs text-gray-700 truncate">
                        <Wallet size={13} style={{ color: account.color || '#3B82F6' }} />
                        {account.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1 rounded hover:bg-gray-200"
                      onClick={() => navigate(`/transactions/editar/${transaction.id}`)}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-gray-200"
                      onClick={() => setDeletingId(transaction.id)}
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {deletingId === transaction.id && (
                  <div className="bg-white border-t px-3 py-2 text-center text-sm">
                    <p className="mb-2">Deseja realmente excluir esta transação?</p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="destructive" onClick={() => { deleteTransaction(transaction.id); setDeletingId(null); }}>Confirmar</Button>
                      <Button size="sm" variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};