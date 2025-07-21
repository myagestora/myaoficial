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
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';

export const MobileScheduled = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scheduledTransactions, isLoading, editTransaction, deleteScheduledTransaction, deleteRecurringSeries } = useScheduledTransactions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    period: {
      from: null as Date | null,
      to: null as Date | null
    }
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recurringDeletingId, setRecurringDeletingId] = useState<string | null>(null);

  const { bankAccounts } = useBankAccounts();
  const { creditCards } = useCreditCards();

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
    if (diffDays < 0) return `${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''} atrás`;
    
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
      if (filters.type && filters.type !== 'all' && transaction.type !== filters.type) return false;

      // Category filter
      if (filters.category && filters.category !== 'all' && transaction.category_id !== filters.category) return false;

      // Period filter
      if (filters.period.from || filters.period.to) {
        // Parse manual da data para evitar problemas de timezone
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

  // Calculate statistics
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    
    // A partir de amanhã (não incluir hoje)
    const upcoming = scheduledTransactions?.filter(t => {
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // A partir de amanhã (comparação de strings)
      return t.date > todayString;
    }).length || 0;
    
    // Transações do dia
    const todayScheduled = scheduledTransactions?.filter(t => {
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // Comparar diretamente as strings de data no formato YYYY-MM-DD
      return t.date === todayString;
    }).length || 0;

    return {
      upcoming,
      todayScheduled
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
    <MobilePageWrapper className="bg-gradient-to-br from-background to-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center text-foreground">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg mr-3">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          Agendadas
        </h1>
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0"
          onClick={handleCreateNew}
        >
          <Plus size={16} />
          <span>Nova</span>
        </Button>
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
        {filteredTransactions.map((transaction) => {
          const account = transaction.account_id ? bankAccounts.find(a => a.id === transaction.account_id) : null;
          const card = transaction.card_id ? creditCards.find(c => c.id === transaction.card_id) : null;
          return (
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
                        <p className="text-xs text-muted-foreground mt-1">{transaction.description}</p>
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

                {/* Linha de badges de conta/cartão, acima das ações */}
                {(account || card) && (
                  <div className="flex flex-wrap gap-2 justify-center items-center w-full py-2">
                    {account && (
                      <Badge variant="outline" className="text-xs" style={{
                        backgroundColor: account.color + '20',
                        color: account.color,
                        borderColor: account.color
                      }}>
                        {account.name}
                      </Badge>
                    )}
                    {card && (
                      <Badge variant="outline" className="text-xs" style={{
                        backgroundColor: card.color + '20',
                        color: card.color,
                        borderColor: card.color
                      }}>
                        {card.name}{card.last_four_digits ? ` •••• ${card.last_four_digits}` : ''}
                      </Badge>
                    )}
                  </div>
                )}

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
        );
      })}
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