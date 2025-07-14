import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  Repeat,
  Plus,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { MobileScheduledFilters } from '../MobileScheduledFilters';
import { MobileScheduledStats } from '../MobileScheduledStats';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { InlineConfirmation } from '@/components/ui/inline-confirmation';
import { RecurringDeletionOptions } from '@/components/ui/recurring-deletion-options';

export const MobileScheduled = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scheduledTransactions, isLoading, editTransaction, deleteScheduledTransaction, deleteRecurringSeries } = useScheduledTransactions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    category: ''
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recurringDeletingId, setRecurringDeletingId] = useState<string | null>(null);

  // Fetch categories for filters
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const formatFrequency = (frequency: string) => {
    const frequencies: Record<string, string> = {
      daily: 'Diária',
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      yearly: 'Anual',
      custom: 'Personalizada'
    };
    return frequencies[frequency] || frequency;
  };

  // Função para formatar data a partir de string evitando problemas de fuso horário
  const formatDateFromString = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month é 0-indexed
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const getNextExecutionDate = (transaction: any) => {
    // Usar next_recurrence_date se disponível, senão usar date
    const targetDate = transaction.next_recurrence_date || transaction.date;
    
    // Parse manual para evitar problemas de timezone
    const [year, month, day] = targetDate.split('-').map(Number);
    const transactionDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horas para comparação precisa
    transactionDate.setHours(0, 0, 0, 0);
    
    const diffTime = transactionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) return 'Vencida';
    
    return `Em ${diffDays} dias`;
  };

  // Filter and search logic
  const filteredTransactions = useMemo(() => {
    return scheduledTransactions?.filter(transaction => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          transaction.title.toLowerCase().includes(searchLower) ||
          transaction.description?.toLowerCase().includes(searchLower) ||
          transaction.categories?.name?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type && transaction.type !== filters.type) return false;

      // Category filter
      if (filters.category && transaction.categories?.name !== categories.find(c => c.id === filters.category)?.name) return false;

      return true;
    }) || [];
  }, [scheduledTransactions, searchTerm, filters, categories]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = scheduledTransactions?.length || 0;
    const active = scheduledTransactions?.filter(t => t.is_recurring).length || 0;
    const paused = total - active;
    
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);
    
    const upcoming = scheduledTransactions?.filter(t => {
      const targetDate = t.date; // Usar apenas date em vez de next_recurrence_date
      const transactionDate = startOfDay(new Date(targetDate));
      // Incluir transações desde amanhã até próximos 7 dias (não incluir hoje)
      return isAfter(transactionDate, today) && !isAfter(transactionDate, nextWeek);
    }).length || 0;
    
    // Transações do dia
    const todayScheduled = scheduledTransactions?.filter(t => {
      const targetDate = t.date;
      const transactionDate = startOfDay(new Date(targetDate));
      return transactionDate.getTime() === today.getTime();
    }).length || 0;
    
    // Transações atrasadas (antes de hoje)
    const overdue = scheduledTransactions?.filter(t => {
      const targetDate = t.date;
      const transactionDate = startOfDay(new Date(targetDate));
      return isBefore(transactionDate, today);
    }).length || 0;

    // Calculate monthly impact
    const monthlyIncome = scheduledTransactions?.filter(t => t.type === 'income' && t.is_recurring)
      .reduce((sum, t) => {
        let monthlyAmount = t.amount;
        switch (t.recurrence_frequency) {
          case 'daily': monthlyAmount = t.amount * 30; break;
          case 'weekly': monthlyAmount = t.amount * 4; break;
          case 'biweekly': monthlyAmount = t.amount * 2; break;
          case 'quarterly': monthlyAmount = t.amount / 3; break;
          case 'semiannual': monthlyAmount = t.amount / 6; break;
          case 'yearly': monthlyAmount = t.amount / 12; break;
          case 'custom': monthlyAmount = t.amount * (30 / ((t.recurrence_interval || 1) * 1)); break; // aproximação
          default: monthlyAmount = t.amount; // monthly
        }
        return sum + monthlyAmount;
      }, 0) || 0;

    const monthlyExpenses = scheduledTransactions?.filter(t => t.type === 'expense' && t.is_recurring)
      .reduce((sum, t) => {
        let monthlyAmount = t.amount;
        switch (t.recurrence_frequency) {
          case 'daily': monthlyAmount = t.amount * 30; break;
          case 'weekly': monthlyAmount = t.amount * 4; break;
          case 'biweekly': monthlyAmount = t.amount * 2; break;
          case 'quarterly': monthlyAmount = t.amount / 3; break;
          case 'semiannual': monthlyAmount = t.amount / 6; break;
          case 'yearly': monthlyAmount = t.amount / 12; break;
          case 'custom': monthlyAmount = t.amount * (30 / ((t.recurrence_interval || 1) * 1)); break; // aproximação
          default: monthlyAmount = t.amount; // monthly
        }
        return sum + monthlyAmount;
      }, 0) || 0;

    return {
      total,
      active,
      paused,
      upcoming,
      todayScheduled,
      overdue,
      monthlyIncome,
      monthlyExpenses
    };
  }, [scheduledTransactions]);

  const handleToggleStatus = async (transaction: any) => {
    // Esta funcionalidade foi removida no novo sistema
    toast({
      title: 'Funcionalidade descontinuada',
      description: 'Use editar para alterar a transação.',
    });
  };

  const handleDelete = async (transaction: any) => {
    // Verificar se é uma transação recorrente (pai ou filho)
    const isRecurring = transaction.is_recurring || transaction.parent_transaction_id;
    
    if (isRecurring) {
      setRecurringDeletingId(transaction.id);
    } else {
      setDeletingId(transaction.id);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    deleteScheduledTransaction.mutate(deletingId);
    setDeletingId(null);
  };

  const handleDeleteSingle = () => {
    if (!recurringDeletingId) return;
    deleteScheduledTransaction.mutate(recurringDeletingId);
    setRecurringDeletingId(null);
  };

  const handleDeleteSeries = () => {
    if (!recurringDeletingId) return;
    const transaction = filteredTransactions.find(t => t.id === recurringDeletingId);
    if (!transaction) return;
    
    const parentId = transaction.parent_transaction_id || transaction.id;
    deleteRecurringSeries.mutate(parentId);
    setRecurringDeletingId(null);
  };

  const handleCancelDelete = () => {
    setDeletingId(null);
    setRecurringDeletingId(null);
  };

  const handleEdit = (transaction: any) => {
    navigate(`/scheduled/editar/${transaction.id}`);
  };

  const handleCreateNew = () => {
    navigate('/scheduled/nova');
  };

  if (isLoading) {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Calendar className="h-6 w-6 mr-2" />
          Agendadas
        </h1>
        <Button 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={handleCreateNew}
        >
          <Plus size={16} />
          <span>Nova</span>
        </Button>
      </div>

      {/* Statistics */}
      <div className="mb-6">
        <MobileScheduledStats
          totalScheduled={stats.total}
          activeScheduled={stats.active}
          pausedScheduled={stats.paused}
          upcomingExecutions={stats.upcoming}
          todayScheduled={stats.todayScheduled}
          overdueScheduled={stats.overdue}
          totalMonthlyIncome={stats.monthlyIncome}
          totalMonthlyExpenses={stats.monthlyExpenses}
        />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <MobileScheduledFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
        />
      </div>

      {/* Lista de transações agendadas */}
      <div className="space-y-3">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header da transação */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <Repeat size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.title}</p>
                      <p className="text-xs text-muted-foreground">{transaction.description}</p>
                      {transaction.categories && (
                        <div className="flex items-center mt-1">
                          <div 
                            className="w-2 h-2 rounded-full mr-1" 
                            style={{ backgroundColor: transaction.categories.color }}
                          />
                          <span className="text-xs text-muted-foreground">{transaction.categories.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>

                {/* Informações de agendamento */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Clock size={10} />
                      <span>{formatFrequency(transaction.recurrence_frequency || '')}</span>
                    </Badge>
                    <div className="flex flex-col text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar size={10} className="mr-1" />
                        {formatDateFromString(transaction.date)}
                      </span>
                      <span className="text-xs">
                        {getNextExecutionDate(transaction)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex space-x-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(transaction)}
                  >
                    <Edit size={14} className="mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(transaction)}
                    disabled={deleteScheduledTransaction.isPending}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                
                {/* Confirmações abaixo das ações - empurram conteúdo para baixo */}
                {deletingId === transaction.id && (
                  <div className="border-t pt-3">
                    <InlineConfirmation
                      message="Confirmar exclusão?"
                      onConfirm={handleConfirmDelete}
                      onCancel={handleCancelDelete}
                      confirmText="Excluir"
                      cancelText="Cancelar"
                    />
                  </div>
                )}
                
                {recurringDeletingId === transaction.id && (
                  <div className="border-t pt-3">
                    <RecurringDeletionOptions
                      onDeleteSingle={handleDeleteSingle}
                      onDeleteSeries={handleDeleteSeries}
                      onCancel={handleCancelDelete}
                      isParent={transaction.is_recurring}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTransactions.length === 0 && !isLoading && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
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
          </CardContent>
        </Card>
      )}

    </MobilePageWrapper>
  );
};