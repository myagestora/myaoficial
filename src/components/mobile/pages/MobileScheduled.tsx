import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Repeat, Plus, Edit, Trash2, Clock, CreditCard, Wallet } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { MobileScheduledFilters } from '../MobileScheduledFilters';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';

export const MobileScheduled = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scheduledTransactions, isLoading, deleteScheduledTransaction, deleteRecurringSeries } = useScheduledTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ type: 'all', category: 'all', period: { from: null as Date | null, to: null as Date | null } });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recurringDeletingId, setRecurringDeletingId] = useState<string | null>(null);
  const { bankAccounts } = useBankAccounts();
  const { creditCards } = useCreditCards();
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));
  const formatFrequency = (frequency: string) => {
    const frequencies: Record<string, string> = {
      daily: 'Diária', weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', yearly: 'Anual', custom: 'Personalizada'
    };
    return frequencies[frequency] || frequency;
  };
  const formatDateFromString = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const getNextExecutionDate = (transaction: any) => {
    const targetDate = transaction.next_recurrence_date || transaction.date;
    const [year, month, day] = targetDate.split('-').map(Number);
    const transactionDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    transactionDate.setHours(0, 0, 0, 0);
    const diffTime = transactionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) return `${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''} atrás`;
    return `Em ${diffDays} dias`;
  };
  const filteredTransactions = useMemo(() => {
    return scheduledTransactions?.filter(transaction => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = transaction.title.toLowerCase().includes(searchLower) || transaction.description?.toLowerCase().includes(searchLower) || transaction.categories?.name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.type && filters.type !== 'all' && transaction.type !== filters.type) return false;
      if (filters.category && filters.category !== 'all' && transaction.category_id !== filters.category) return false;
      if (filters.period.from || filters.period.to) {
        const [year, month, day] = transaction.date.split('-').map(Number);
        const transactionDate = new Date(year, month - 1, day);
        transactionDate.setHours(0, 0, 0, 0);
        if (filters.period.from) {
          const fromDate = new Date(filters.period.from);
          fromDate.setHours(0, 0, 0, 0);
          if (transactionDate < fromDate) return false;
        }
        if (filters.period.to) {
          const toDate = new Date(filters.period.to);
          toDate.setHours(23, 59, 59, 999);
          if (transactionDate > toDate) return false;
        }
      }
      return true;
    }) || [];
  }, [scheduledTransactions, searchTerm, filters]);
  const handleDelete = async (transaction: any) => {
    const isRecurring = transaction.is_recurring || transaction.parent_transaction_id;
    if (isRecurring) setRecurringDeletingId(transaction.id);
    else setDeletingId(transaction.id);
  };
  const handleConfirmDelete = () => { if (!deletingId) return; deleteScheduledTransaction.mutate(deletingId); setDeletingId(null); };
  const handleDeleteSingle = () => { if (!recurringDeletingId) return; deleteScheduledTransaction.mutate(recurringDeletingId); setRecurringDeletingId(null); };
  const handleDeleteSeries = () => { if (!recurringDeletingId) return; const transaction = filteredTransactions.find(t => t.id === recurringDeletingId); if (!transaction) return; const parentId = transaction.parent_transaction_id || transaction.id; deleteRecurringSeries.mutate(parentId); setRecurringDeletingId(null); };
  const handleCancelDelete = () => { setDeletingId(null); setRecurringDeletingId(null); };
  const handleEdit = (transaction: any) => { navigate(`/scheduled/editar/${transaction.id}`); };
  const handleCreateNew = () => { navigate('/scheduled/nova'); };
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto p-2 space-y-4">
      {/* Header padrão mobile */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Agendadas</h1>
          <p className="text-[11px] text-gray-400">Gerencie suas transações recorrentes</p>
        </div>
        <div className="ml-auto flex gap-1">
          <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0" onClick={handleCreateNew}>
            <Plus size={16} />
            <span className="ml-1">Nova</span>
          </Button>
        </div>
      </div>
      {/* Filtro em linha única scrollável */}
      <div className="mb-2">
        <MobileScheduledFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
        />
      </div>
      {/* Lista de agendadas */}
      <div className="space-y-2">
        {filteredTransactions
          .filter(transaction => {
            // Mostrar apenas transações futuras (data > hoje)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Considerar próxima execução se for recorrente
            const dateStr = transaction.next_recurrence_date || transaction.date;
            const [year, month, day] = dateStr.split('-').map(Number);
            const txDate = new Date(year, month - 1, day);
            txDate.setHours(0, 0, 0, 0);
            return txDate > today;
          })
          .map((transaction) => {
          const isIncome = transaction.type === 'income';
          const iconBg = isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
          const icon = <Repeat className="w-5 h-5" />;
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
                <span className="text-[11px] text-gray-400">{transaction.date ? formatDateFromString(transaction.date) : ''}</span>
              </div>
              {/* Rodapé cinza com banco/cartão e ícones */}
              <div className="bg-gray-100 rounded-lg px-3 py-1 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {card && (
                    <span className="flex items-center gap-1 text-xs text-gray-700 truncate">
                      <CreditCard size={18} style={{ color: card.color || '#8B5CF6' }} />
                      {card.name}
                      {card.last_four_digits && (
                        <span className="text-[10px] text-gray-400 ml-1">•••• {card.last_four_digits}</span>
                      )}
                    </span>
                  )}
                  {account && (
                    <span className="flex items-center gap-1 text-xs text-gray-700 truncate">
                      <Wallet size={18} style={{ color: account.color || '#3B82F6' }} />
                      {account.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-1 rounded hover:bg-gray-200"
                    onClick={() => handleEdit(transaction)}
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-gray-200"
                    onClick={() => handleDelete(transaction)}
                    title="Remover"
                    disabled={deleteScheduledTransaction.isPending}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {deletingId === transaction.id && (
                <div className="bg-white border-t px-3 py-2 text-center text-sm">
                  <p className="mb-2">Deseja realmente excluir esta transação agendada?</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="destructive" onClick={handleConfirmDelete}>Confirmar</Button>
                    <Button size="sm" variant="outline" onClick={handleCancelDelete}>Cancelar</Button>
                  </div>
                </div>
              )}
              {recurringDeletingId === transaction.id && (
                <div className="bg-white border-t px-3 py-2 text-center text-sm">
                  <p className="mb-2">Excluir só esta ou toda a recorrência?</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="destructive" onClick={handleDeleteSingle}>Só esta</Button>
                    <Button size="sm" variant="destructive" onClick={handleDeleteSeries}>Toda série</Button>
                    <Button size="sm" variant="outline" onClick={handleCancelDelete}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filteredTransactions.length === 0 && !isLoading && (
        <div className="p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">
            {searchTerm || Object.values(filters).some(Boolean) 
              ? 'Nenhum agendamento encontrado' 
              : 'Nenhuma transação agendada'
            }
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm || Object.values(filters).some(Boolean)
              ? 'Tente ajustar os filtros ou busca.'
              : 'Crie transações recorrentes para automatizar seu controle financeiro'
            }
          </p>
          {!searchTerm && !Object.values(filters).some(Boolean) && (
            <Button onClick={handleCreateNew}>
              <Plus size={16} className="mr-2" />
              Criar primeira transação agendada
            </Button>
          )}
        </div>
      )}
    </div>
  );
};