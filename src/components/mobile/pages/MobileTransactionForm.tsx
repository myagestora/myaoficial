import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileListSelect } from '@/components/mobile/MobileListSelect';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { getCurrentDateForInput, getBrazilianTimestamp } from '@/utils/timezoneUtils';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { generateRecurrenceDates, formatRecurrenceInfo, calculateTotalDuration } from '@/utils/recurrenceUtils';

const transactionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  type: z.enum(['income', 'expense'], { required_error: 'Tipo é obrigatório' }),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum([
    'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'custom'
  ]).optional(),
  recurrence_count: z.number().min(0).max(365).optional(), // Permitir 0 no form
  custom_days: z.number().min(1).optional(),
  recurrence_interval: z.number().min(1).default(1),
  recurrence_end_date: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

// Função utilitária para máscara de moeda
function formatCurrencyInput(value: string) {
  // Remove tudo que não for número
  const onlyNumbers = value.replace(/\D/g, '');
  // Converte para centavos
  const cents = parseInt(onlyNumbers, 10);
  if (isNaN(cents)) return 'R$ 0,00';
  const formatted = (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
  return formatted;
}

export const MobileTransactionForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  console.log('🚀 MobileTransactionForm iniciado:', { id, isEditing, user: !!user });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: getCurrentDateForInput(),
      is_recurring: false,
      recurrence_interval: 1,
      recurrence_count: 0, // Iniciar em 0
      custom_days: 30,
    },
  });

  const transactionType = watch('type');
  const isRecurring = watch('is_recurring');
  const selectedCategoryId = watch('category_id');

  const { bankAccounts, defaultAccount } = useBankAccounts();
  const { creditCards, defaultCard } = useCreditCards();

  const [mentionAccount, setMentionAccount] = React.useState(false);
  const [mentionCard, setMentionCard] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | undefined>(undefined);
  const [selectedCardId, setSelectedCardId] = React.useState<string | undefined>(undefined);

  // Reset selects ao abrir/fechar
  useEffect(() => {
    setMentionAccount(false);
    setMentionCard(false);
    setSelectedAccountId(undefined);
    setSelectedCardId(undefined);
  }, [isEditing, id]);

  // Novo estado para valor formatado
  const [amountMasked, setAmountMasked] = React.useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar valor do formulário com a máscara
  useEffect(() => {
    if (watch('amount') !== undefined && watch('amount') !== null && !isNaN(watch('amount'))) {
      setAmountMasked(formatCurrencyInput(String(Math.round(Number(watch('amount') * 100)))));
    } else {
      setAmountMasked('R$ 0,00');
    }
  }, [watch('amount')]);

  // Buscar transação para edição
  const { data: transaction, isLoading: loadingTransaction, error: transactionError } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      if (!id) return null;
      
      console.log('🔍 Buscando transação com ID:', id, 'para usuário:', user?.id);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('id', id)
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erro ao buscar transação:', error);
        throw error;
      }
      
      console.log('✅ Transação encontrada:', data);
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  // Buscar categorias do banco de dados
  const { data: categories } = useQuery({
    queryKey: ['categories', transactionType, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', transactionType)
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData & { account_id?: string | null, card_id?: string | null }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const transactionData: any = {
        title: data.title,
        amount: data.amount,
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        description: data.description || null,
        user_id: user.id,
        is_recurring: data.is_recurring,
        account_id: data.account_id || null,
        card_id: data.card_id || null,
      };

      if (data.is_recurring) {
        transactionData.recurrence_frequency = data.recurrence_frequency;
        transactionData.recurrence_count = data.recurrence_count;
        if (data.recurrence_frequency === 'custom') {
          transactionData.custom_days = data.custom_days;
        }
        transactionData.recurrence_interval = data.recurrence_interval || 1;
      }

      const { error } = await supabase
        .from('transactions')
        .insert(transactionData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação salva com sucesso.',
      });
      navigate('/transactions');
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao salvar transação.',
        variant: 'destructive',
      });
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      console.log('🔄 Iniciando atualização da transação...', { data, transaction, user: !!user });
      
      if (!user || !transaction) {
        console.error('❌ Dados inválidos:', { user: !!user, transaction: !!transaction });
        throw new Error('Dados inválidos');
      }

      const transactionData: any = {
        title: data.title,
        amount: data.amount,
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        description: data.description || null,
        is_recurring: data.is_recurring,
        updated_at: getBrazilianTimestamp(),
        account_id: (data as any).account_id ?? null,
        card_id: (data as any).card_id ?? null,
      };

      console.log('📝 Dados que serão atualizados:', transactionData);

      if (data.is_recurring) {
        transactionData.recurrence_frequency = data.recurrence_frequency;
        transactionData.recurrence_interval = data.recurrence_interval;
        transactionData.recurrence_end_date = data.recurrence_end_date || null;
        
        if (!transaction.next_recurrence_date) {
          const { data: nextDate } = await supabase
            .rpc('calculate_next_recurrence_date', {
              base_date: data.date,
              frequency: data.recurrence_frequency,
              interval_count: data.recurrence_interval
            });
          
          transactionData.next_recurrence_date = nextDate;
        }
      } else {
        transactionData.recurrence_frequency = null;
        transactionData.recurrence_interval = null;
        transactionData.recurrence_end_date = null;
        transactionData.next_recurrence_date = null;
      }

      console.log('💾 Executando update no Supabase para transação ID:', transaction.id);

      const { error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', transaction.id);
      
      if (error) {
        console.error('❌ Erro ao atualizar transação:', error);
        throw error;
      }
      
      console.log('✅ Transação atualizada com sucesso');
    },
    onSuccess: () => {
      console.log('🎉 Callback onSuccess executado');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação atualizada com sucesso.',
      });
      navigate('/transactions');
    },
    onError: (error) => {
      console.error('❌ Erro na atualização:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar transação.',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = async (data: TransactionFormData) => {
    // Se recorrente, exigir pelo menos 1 repetição
    if (data.is_recurring && (!data.recurrence_count || data.recurrence_count < 1)) {
      toast({
        title: 'Erro!',
        description: 'Informe o número de repetições para recorrência.',
        variant: 'destructive',
      });
      return;
    }
    // Checagem manual de campos obrigatórios
    const missingFields: string[] = [];
    if (!data.title) missingFields.push('Título');
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) missingFields.push('Valor');
    if (!data.type) missingFields.push('Tipo');
    if (!data.category_id) missingFields.push('Categoria');
    if (!data.date) missingFields.push('Data');
    if (data.is_recurring && !data.recurrence_frequency) missingFields.push('Frequência da recorrência');
    if (data.is_recurring && (!data.recurrence_count || data.recurrence_count < 1)) missingFields.push('Nº de repetições');
    if (data.is_recurring && data.recurrence_frequency === 'custom' && (!data.custom_days || data.custom_days < 1)) missingFields.push('Dias personalizados da recorrência');
    if (missingFields.length > 0) {
      toast({
        title: 'Erro ao salvar transação!',
        description: `Preencha os campos obrigatórios: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    // Se não houver conta selecionada nem padrão, salva como null
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

    if (isEditing) {
      updateTransactionMutation.mutate({ ...(data as any), account_id, card_id } as any);
    } else {
      createTransactionMutation.mutate({ ...(data as any), account_id, card_id } as any);
    }
  };

  // Preencher formulário quando transação for carregada
  useEffect(() => {
    console.log('🔄 useEffect executado:', { transaction, isEditing, hasTransaction: !!transaction });
    
    if (transaction && isEditing) {
      console.log('📝 Preenchendo formulário com dados:', transaction);
      
      // Primeiro fazer o reset dos dados
      reset({
        title: transaction.title,
        amount: Number(transaction.amount),
        type: transaction.type,
        category_id: transaction.category_id || '',
        date: transaction.date,
        description: transaction.description || '',
        is_recurring: transaction.is_recurring || false,
        recurrence_frequency: transaction.recurrence_frequency as any || undefined,
        recurrence_interval: transaction.recurrence_interval || 1,
        recurrence_end_date: transaction.recurrence_end_date || '',
        recurrence_count: transaction.recurrence_count || 12,
        custom_days: 'custom_days' in transaction ? Number(transaction.custom_days) : 30,
      });
      // Garantir que os valores dos selects sejam definidos explicitamente
      setValue('type', transaction.type);
      setValue('category_id', transaction.category_id || '');
      // Preencher conta/cartão
      if ((transaction as any)?.account_id) {
        setMentionAccount(true);
        setSelectedAccountId((transaction as any).account_id);
      } else {
        setMentionAccount(false);
        setSelectedAccountId(undefined);
      }
      if ((transaction as any)?.card_id) {
        setMentionCard(true);
        setSelectedCardId((transaction as any).card_id);
      } else {
        setMentionCard(false);
        setSelectedCardId(undefined);
      }
      console.log('✅ Formulário preenchido com sucesso');
      console.log('🔍 Valores setados:', {
        type: transaction.type,
        category_id: transaction.category_id
      });
    }
  }, [transaction, isEditing, reset, setValue]);

  // Definir categoria após as categorias serem carregadas
  useEffect(() => {
    if (transaction && isEditing && categories && categories.length > 0 && transaction.category_id) {
      console.log('📂 Categorias carregadas, definindo categoria:', transaction.category_id);
      setValue('category_id', transaction.category_id);
    }
  }, [transaction, isEditing, categories, setValue]);

  // Estados para preview de recorrência
  const recurrenceFrequency = watch('recurrence_frequency');
  const recurrenceInterval = watch('recurrence_interval') || 1;
  const recurrenceEndDate = watch('recurrence_end_date');
  const recurrenceCount = watch('recurrence_count') || 12;
  const customDays = watch('custom_days') || 30;
  const startDate = watch('date');
  const [previewDates, setPreviewDates] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isRecurring && recurrenceFrequency && recurrenceCount && startDate) {
      try {
        const dates = generateRecurrenceDates({
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
          startDate: startDate,
          count: Math.min(recurrenceCount, 5),
          customDays: recurrenceFrequency === 'custom' ? customDays : undefined
        });
        setPreviewDates(dates);
      } catch (error) {
        setPreviewDates([]);
      }
    } else {
      setPreviewDates([]);
    }
  }, [isRecurring, recurrenceFrequency, recurrenceInterval, recurrenceCount, startDate, customDays]);

  // Verificar se transação não existe ou não pertence ao usuário
  if (isEditing && !loadingTransaction && !transaction) {
    return (
      <MobilePageWrapper>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/transactions')}
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">Transação não encontrada</h1>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            A transação que você está tentando editar não foi encontrada.
          </p>
          <Button onClick={() => navigate('/transactions')}>
            Voltar para Transações
          </Button>
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Header com botão voltar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/transactions')}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </h1>
        </div>
      </div>

      {/* Aviso se não houver conta cadastrada */}
      {bankAccounts.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-3 rounded mb-4 text-sm">
          <b>Atenção:</b> Você ainda não cadastrou nenhuma conta bancária. Recomenda-se cadastrar uma para melhor controle financeiro, mas você pode continuar normalmente.
        </div>
      )}

      {/* Loading para transação em edição */}
      {isEditing && loadingTransaction && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando transação...</p>
        </div>
      )}

      {/* Formulário só é exibido se não estiver carregando */}
      {(!isEditing || (isEditing && !loadingTransaction && transaction)) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white rounded-lg shadow-sm p-4 border">
          {/* Tipo e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <MobileListSelect
                value={transactionType}
                onValueChange={(value) => {
                  setValue('type', value as 'income' | 'expense');
                  setValue('category_id', '');
                }}
                placeholder="Selecione o tipo"
                options={[
                  { value: 'income', label: 'Receita' },
                  { value: 'expense', label: 'Despesa' }
                ]}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                ref={amountInputRef}
                value={amountMasked}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmountMasked(formatCurrencyInput(e.target.value));
                  // Atualiza o valor do formulário em centavos
                  setValue('amount', Number(raw) / 100, { shouldValidate: true });
                }}
                placeholder="R$ 0,00"
                className="font-mono text-lg"
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
              placeholder="Ex: Supermercado, Salário..."
              {...register('title')}
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
                value={selectedCategoryId || ''}
                onValueChange={(value) => setValue('category_id', value)}
                placeholder="Selecione a categoria"
                options={categories?.map(category => ({
                  value: category.id,
                  label: category.name,
                  content: (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  )
                })) || []}
              />
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="description">Observações (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Adicione observações..."
              className="resize-none"
              rows={3}
              {...register('description')}
            />
          </div>

          {/* Recorrência */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setValue('is_recurring', !!checked)}
              />
              <Label htmlFor="is_recurring">
                Transação recorrente
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_frequency">Frequência</Label>
                    <MobileListSelect
                      value={recurrenceFrequency || ''}
                      onValueChange={(value) => setValue('recurrence_frequency', value as any)}
                      placeholder="Selecione a frequência"
                      options={[
                        { value: 'daily', label: 'Diário' },
                        { value: 'weekly', label: 'Semanal' },
                        { value: 'biweekly', label: 'Quinzenal' },
                        { value: 'monthly', label: 'Mensal' },
                        { value: 'quarterly', label: 'Trimestral' },
                        { value: 'semiannual', label: 'Semestral' },
                        { value: 'yearly', label: 'Anual' },
                        { value: 'custom', label: 'Personalizado' }
                      ]}
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
                      min="0"
                      max="365"
                      placeholder="0"
                      {...register('recurrence_count', { valueAsNumber: true })}
                    />
                    {errors.recurrence_count && (
                      <p className="text-xs text-destructive">{errors.recurrence_count.message}</p>
                    )}
                  </div>
                </div>
                {recurrenceFrequency === 'custom' && (
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
                {/* Remover campo Data Final */}
                {/* Resumo e preview só aparecem se frequência e repetições preenchidos */}
                {(recurrenceFrequency && recurrenceCount > 0) && (
                  <div className="space-y-2">
                    <Label>Resumo</Label>
                    <div className="text-xs text-muted-foreground">
                      <p>
                        {formatRecurrenceInfo(recurrenceFrequency, recurrenceInterval, customDays)} • {recurrenceCount} repetições
                      </p>
                      <p>
                        Duração total: {calculateTotalDuration(recurrenceFrequency, recurrenceInterval, recurrenceCount, customDays)}
                      </p>
                    </div>
                    {previewDates.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Primeiras datas ({previewDates.length}):
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {previewDates.map((date, index) => (
                            <span key={index}>
                              {new Date(date).toLocaleDateString('pt-BR')}
                              {index < previewDates.length - 1 && ', '}
                            </span>
                          ))}
                          {recurrenceCount > 5 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NOVO BLOCO: Seleção de Conta/Cartão */}
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

          {/* Botões */}
          <div className="flex space-x-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/transactions')}
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
      )}
    </MobilePageWrapper>
  );
};