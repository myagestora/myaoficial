import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Calendar, 
  DollarSign, 
  Repeat, 
  Save
} from 'lucide-react';
import { MobileListSelect } from '../MobileListSelect';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { generateRecurrenceDates, calculateTotalDuration } from '@/utils/recurrenceUtils';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';

const scheduledTransactionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  type: z.enum(['income', 'expense'], { required_error: 'Tipo é obrigatório' }),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'custom']).optional(),
  recurrence_interval: z.number().min(1).default(1).optional(),
  recurrence_count: z.number().min(1).max(365).optional(),
  custom_days: z.number().min(1).optional(),
  start_date: z.string().min(1, 'Data é obrigatória'),
}).refine((data) => {
  if (data.is_recurring) {
    return data.recurrence_frequency !== undefined && data.recurrence_count !== undefined && data.recurrence_count > 0;
  }
  return true;
}, {
  message: 'Frequência e número de repetições são obrigatórios para transações recorrentes',
  path: ['recurrence_frequency']
}).refine((data) => {
  if (data.is_recurring && data.recurrence_frequency === 'custom') {
    return data.custom_days !== undefined && data.custom_days > 0;
  }
  return true;
}, {
  message: 'Número de dias é obrigatório para frequência personalizada',
  path: ['custom_days']
});

type ScheduledTransactionFormData = z.infer<typeof scheduledTransactionSchema>;

export const MobileScheduledTransactionForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const { bankAccounts, defaultAccount } = useBankAccounts();
  const { creditCards, defaultCard } = useCreditCards();

  const [mentionAccount, setMentionAccount] = React.useState(false);
  const [mentionCard, setMentionCard] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | undefined>(undefined);
  const [selectedCardId, setSelectedCardId] = React.useState<string | undefined>(undefined);

  // Fetch existing transaction for editing
  const { data: existingTransaction } = useQuery({
    queryKey: ['scheduled-transaction', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id
  });

  // Reset selects ao abrir/fechar
  useEffect(() => {
    setMentionAccount(false);
    setMentionCard(false);
    setSelectedAccountId(undefined);
    setSelectedCardId(undefined);
    if (existingTransaction && isEditing) {
      if ((existingTransaction as any).account_id) {
        setMentionAccount(true);
        setSelectedAccountId((existingTransaction as any).account_id);
      } else {
        setMentionAccount(false);
        setSelectedAccountId(undefined);
      }
      if ((existingTransaction as any).card_id) {
        setMentionCard(true);
        setSelectedCardId((existingTransaction as any).card_id);
      } else {
        setMentionCard(false);
        setSelectedCardId(undefined);
      }
    }
  }, [isEditing, id, existingTransaction]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<ScheduledTransactionFormData>({
    resolver: zodResolver(scheduledTransactionSchema),
    defaultValues: {
      type: 'expense',
      is_recurring: false,
      recurrence_frequency: 'monthly',
      recurrence_interval: 1,
      recurrence_count: 12,
      custom_days: 1,
      start_date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const watchedType = watch('type');
  const watchedFrequency = watch('recurrence_frequency');
  const watchedInterval = watch('recurrence_interval');
  const watchedCount = watch('recurrence_count');
  const watchedCustomDays = watch('custom_days');
  const watchedIsRecurring = watch('is_recurring');

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color, type')
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Reset form with existing data
  useEffect(() => {
    if (existingTransaction && isEditing) {
      reset({
        title: existingTransaction.title,
        amount: existingTransaction.amount,
        type: existingTransaction.type,
        category_id: existingTransaction.category_id || '',
        description: existingTransaction.description || '',
        is_recurring: existingTransaction.is_recurring || false,
        recurrence_frequency: existingTransaction.recurrence_frequency || 'monthly',
        recurrence_interval: existingTransaction.recurrence_interval || 1,
        recurrence_count: existingTransaction.recurrence_count || 12,
        custom_days: 1,
        start_date: existingTransaction.date,
      });
      // Sincronizar estados locais de conta/cartão
      const accId = (existingTransaction as any).account_id;
      const cardId = (existingTransaction as any).card_id;
      if (accId) {
        setMentionAccount(true);
        setSelectedAccountId(accId);
        setValue('account_id', accId);
      } else {
        setMentionAccount(false);
        setSelectedAccountId(undefined);
        setValue('account_id', null);
      }
      if (cardId) {
        setMentionCard(true);
        setSelectedCardId(cardId);
        setValue('card_id', cardId);
      } else {
        setMentionCard(false);
        setSelectedCardId(undefined);
        setValue('card_id', null);
      }
    }
  }, [existingTransaction, isEditing, reset, setValue]);

  // Filter categories by type
  const filteredCategories = categories.filter(cat => cat.type === watchedType);

  const saveScheduledTransaction = useMutation({
    mutationFn: async (data: ScheduledTransactionFormData & { account_id?: string | null, card_id?: string | null }) => {
      if (!user?.id) throw new Error('User not authenticated');
      // Normalizar: só um dos campos pode ser preenchido
      let account_id = data.account_id || null;
      let card_id = data.card_id || null;
      if (account_id) card_id = null;
      if (card_id) account_id = null;

      if (isEditing && id) {
        // Para edição, atualizar todas as transações filhas se recorrente e conta/cartão alterados
        const transactionData: any = {
          title: data.title,
          description: data.description || '',
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          date: data.start_date,
          is_recurring: data.is_recurring || false,
          updated_at: new Date().toISOString(),
          account_id: account_id || null,
        };
        if ((data as any).card_id !== undefined) transactionData.card_id = (data as any).card_id;
        if (data.is_recurring && data.recurrence_frequency) {
          transactionData.recurrence_frequency = data.recurrence_frequency;
          transactionData.recurrence_interval = data.recurrence_interval || 1;
          transactionData.recurrence_count = data.recurrence_count || 12;
        }
        // Atualizar o template
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', id);
        if (error) throw error;
        // Se recorrente, atualizar todas as filhas
        if (data.is_recurring) {
          const updateFields: any = {};
          if ((data as any).account_id !== undefined) updateFields.account_id = (data as any).account_id || null;
          if ((data as any).card_id !== undefined) updateFields.card_id = (data as any).card_id || null;
          if (Object.keys(updateFields).length > 0) {
            const { error: childError } = await supabase
              .from('transactions')
              .update(updateFields)
              .eq('parent_transaction_id', id);
            if (childError) throw childError;
          }
        }
      } else {
        // Para criação nova
        // Sempre usar conta padrão se não selecionar conta/cartão
        let account_id = mentionAccount ? selectedAccountId : (defaultAccount ? defaultAccount.id : null);
        let card_id = mentionCard ? selectedCardId : undefined;
        if (!account_id && !card_id && defaultAccount) {
          account_id = defaultAccount.id;
        }
        if (!data.is_recurring) {
          // Transação única - criar apenas uma transação
          const transactionData = {
            user_id: user.id,
            title: data.title,
            description: data.description || '',
            amount: data.amount,
            type: data.type,
            category_id: data.category_id,
            date: data.start_date,
            is_recurring: false,
            account_id,
            card_id: card_id || null,
          };
          const { error } = await supabase
            .from('transactions')
            .insert(transactionData);
          if (error) throw error;
        } else if (data.recurrence_frequency && data.recurrence_count) {
          // Transação recorrente - gerar todas as datas e criar transações
          const recurrenceDates = generateRecurrenceDates({
            frequency: data.recurrence_frequency,
            interval: data.recurrence_interval || 1,
            startDate: data.start_date,
            count: data.recurrence_count,
            customDays: data.custom_days
          });
          if (recurrenceDates.length === 0) {
            throw new Error('Nenhuma data de transação gerada. Verifique as configurações de recorrência.');
          }
          // Criar transação pai (template)
          const parentTransactionData = {
            user_id: user.id,
            title: data.title,
            description: data.description || '',
            amount: data.amount,
            type: data.type,
            category_id: data.category_id,
            date: data.start_date,
            is_recurring: true,
            is_parent_template: true,
            recurrence_frequency: data.recurrence_frequency,
            recurrence_interval: data.recurrence_interval || 1,
            recurrence_count: data.recurrence_count,
            account_id,
            card_id: card_id || null,
          };
          const { data: parentTransaction, error: parentError } = await supabase
            .from('transactions')
            .insert(parentTransactionData)
            .select()
            .single();
          if (parentError) throw parentError;
          // Criar transações filhas para cada data
          const childTransactions = recurrenceDates.map(date => ({
            user_id: user.id,
            title: data.title,
            description: (data.description || '') + ' (Recorrente)',
            amount: data.amount,
            type: data.type,
            category_id: data.category_id,
            date: date,
            is_recurring: false,
            parent_transaction_id: parentTransaction.id,
            account_id,
            card_id: card_id || null,
          }));
          const { error: childError } = await supabase
            .from('transactions')
            .insert(childTransactions);
          if (childError) throw childError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast({
        title: isEditing ? 'Agendamento atualizado!' : 'Agendamento criado!',
        description: isEditing 
          ? 'A transação agendada foi atualizada com sucesso.' 
          : 'A transação agendada foi criada com sucesso.',
      });
      navigate('/scheduled');
    },
    onError: (error) => {
      console.error('Error saving scheduled transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Ocorreu um erro ao salvar a transação agendada.',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: ScheduledTransactionFormData) => {
    let account_id: string | null = null;
    let card_id: string | null = null;
    if (mentionAccount) {
      account_id = selectedAccountId;
      card_id = null;
    } else if (mentionCard) {
      card_id = selectedCardId;
      account_id = null;
    } else if (defaultAccount) {
      account_id = defaultAccount.id;
      card_id = null;
    }
    saveScheduledTransaction.mutate({ ...(data as any), account_id, card_id } as any);
  };

  const typeOptions = [
    { value: 'expense', label: 'Despesa' },
    { value: 'income', label: 'Receita' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Diária' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'yearly', label: 'Anual' },
    { value: 'custom', label: 'Personalizada' }
  ];

  const categoryOptions = filteredCategories.map(cat => ({
    value: cat.id,
    label: cat.name,
    color: cat.color
  }));

  const getFrequencyDescription = () => {
    const interval = watchedInterval || 1;
    const freq = watchedFrequency;
    const customDays = watchedCustomDays || 1;
    
    if (freq === 'custom') {
      return `A cada ${customDays} dias`;
    }
    
    if (interval === 1) {
      switch (freq) {
        case 'daily': return 'Todo dia';
        case 'weekly': return 'Toda semana';
        case 'biweekly': return 'A cada 2 semanas';
        case 'monthly': return 'Todo mês';
        case 'quarterly': return 'Todo trimestre';
        case 'semiannual': return 'A cada 6 meses';
        case 'yearly': return 'Todo ano';
        default: return '';
      }
    } else {
      switch (freq) {
        case 'daily': return `A cada ${interval} dias`;
        case 'weekly': return `A cada ${interval} semanas`;
        case 'biweekly': return `A cada ${interval * 2} semanas`;
        case 'monthly': return `A cada ${interval} meses`;
        case 'quarterly': return `A cada ${interval} trimestres`;
        case 'semiannual': return `A cada ${interval * 6} meses`;
        case 'yearly': return `A cada ${interval} anos`;
        default: return '';
      }
    }
  };

  const getPreviewInfo = () => {
    if (!watchedIsRecurring || !watchedFrequency || !watchedCount) return '';
    
    const count = watchedCount;
    const interval = watchedInterval || 1;
    const customDays = watchedCustomDays || 1;
    
    const duration = calculateTotalDuration(watchedFrequency, interval, count, customDays);
    return `${count} repetições • Duração: ${duration}`;
  };

  return (
    <MobilePageWrapper>
      {/* Header igual transações */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/scheduled')}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar Transação Agendada' : 'Nova Transação Agendada'}
          </h1>
        </div>
      </div>

      {/* Aviso se não houver conta cadastrada */}
      {bankAccounts.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-3 rounded mb-4 text-sm">
          <b>Atenção:</b> Você ainda não cadastrou nenhuma conta bancária. Recomenda-se cadastrar uma para melhor controle financeiro, mas você pode continuar normalmente.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white rounded-lg shadow-sm p-4 border">
        {/* Tipo e Valor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <MobileListSelect
              value={watchedType}
              onValueChange={(value) => {
                setValue('type', value as 'income' | 'expense');
                setValue('category_id', '');
              }}
              placeholder="Selecione o tipo"
              options={typeOptions}
            />
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0,00"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Ex: Salário, Aluguel, Academia..."
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Categoria e Data */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoria</Label>
            <MobileListSelect
              value={watch('category_id') || ''}
              onValueChange={(value) => setValue('category_id', value)}
              placeholder="Selecione a categoria"
              options={categoryOptions.map(category => ({
                value: category.value,
                label: category.label,
                content: (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.label}</span>
                  </div>
                )
              }))}
            />
            {errors.category_id && (
              <p className="text-sm text-destructive">{errors.category_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_date">{watchedIsRecurring ? 'Data de Início' : 'Data'}</Label>
            <Input
              id="start_date"
              type="date"
              {...register('start_date')}
            />
            {errors.start_date && (
              <p className="text-sm text-destructive">{errors.start_date.message}</p>
            )}
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <Label htmlFor="description">Observações (opcional)</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Adicione observações..."
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Recorrência igual transações, sem Card extra */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={watchedIsRecurring}
              onCheckedChange={(checked) => setValue('is_recurring', !!checked)}
            />
            <Label htmlFor="is_recurring">
              Transação recorrente
            </Label>
          </div>
          {watchedIsRecurring && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <MobileListSelect
                    value={watchedFrequency || ''}
                    onValueChange={(value) => setValue('recurrence_frequency', value as any)}
                    options={frequencyOptions}
                    placeholder="Selecione a frequência"
                  />
                  {errors.recurrence_frequency && (
                    <p className="text-xs text-destructive">{errors.recurrence_frequency.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrence_count">Nº de repetições</Label>
                  <Input
                    id="recurrence_count"
                    type="number"
                    min="1"
                    max="365"
                    placeholder="12"
                    {...register('recurrence_count', { valueAsNumber: true })}
                  />
                  {errors.recurrence_count && (
                    <p className="text-xs text-destructive">{errors.recurrence_count.message}</p>
                  )}
                </div>
              </div>
              {watchedFrequency === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom_days">Repetir a cada quantos dias?</Label>
                  <Input
                    id="custom_days"
                    type="number"
                    min="1"
                    placeholder="30"
                    {...register('custom_days', { valueAsNumber: true })}
                  />
                  {errors.custom_days && (
                    <p className="text-xs text-destructive">{errors.custom_days.message}</p>
                  )}
                </div>
              )}
              {/* Preview igual transações */}
              {(watchedFrequency && watchedCount > 0) && (
                <div className="space-y-2">
                  <Label>Resumo</Label>
                  <div className="text-xs text-muted-foreground">
                    <p>
                      {getFrequencyDescription()} • {watchedCount} repetições
                    </p>
                    <p>
                      Duração total: {calculateTotalDuration(watchedFrequency, watchedInterval, watchedCount, watchedCustomDays)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seleção de Conta/Cartão igual transações */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="mention-account"
              checked={mentionAccount}
              onCheckedChange={checked => {
                setMentionAccount(!!checked);
                if (checked) {
                  setMentionCard(false);
                  setSelectedCardId(undefined);
                }
              }}
              disabled={mentionCard}
            />
            <Label htmlFor="mention-account">Mencionar Conta bancária</Label>
          </div>
          {mentionAccount && (
            <MobileListSelect
              value={selectedAccountId || ''}
              onValueChange={setSelectedAccountId}
              placeholder="Selecione a conta"
              options={bankAccounts.map(account => ({
                value: account.id,
                label: `${account.name}${account.is_default ? ' (Padrão)' : ''}`,
              }))}
            />
          )}
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              id="mention-card"
              checked={mentionCard}
              onCheckedChange={checked => {
                setMentionCard(!!checked);
                if (checked) {
                  setMentionAccount(false);
                  setSelectedAccountId(undefined);
                }
              }}
              disabled={mentionAccount}
            />
            <Label htmlFor="mention-card">Mencionar Cartão de Crédito</Label>
          </div>
          {mentionCard && (
            <MobileListSelect
              value={selectedCardId || ''}
              onValueChange={setSelectedCardId}
              placeholder="Selecione o cartão"
              options={creditCards.map(card => ({
                value: card.id,
                label: `${card.name}${card.last_four_digits ? ` •••• ${card.last_four_digits}` : ''}${card.is_default ? ' (Padrão)' : ''}`,
              }))}
            />
          )}
        </div>

        {/* Botões iguais transações */}
        <div className="flex space-x-3 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate('/scheduled')}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
          </Button>
        </div>
      </form>
    </MobilePageWrapper>
  );
};