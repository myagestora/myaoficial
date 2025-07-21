import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
  account_id: z.string().uuid().optional().nullable(),
  card_id: z.string().uuid().optional().nullable(),
});

type ScheduledTransactionFormData = z.infer<typeof scheduledTransactionSchema>;

interface ScheduledTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: any;
}

export const ScheduledTransactionForm = ({ isOpen, onClose, transaction }: ScheduledTransactionFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;

  const { bankAccounts, defaultAccount } = useBankAccounts();
  const { creditCards, defaultCard } = useCreditCards();

  const [mentionAccount, setMentionAccount] = useState(false);
  const [mentionCard, setMentionCard] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
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
    },
  });

  // Buscar categorias do banco de dados
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', watch('type'), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', watch('type'))
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOpen,
  });

  // Sincronizar estado local e form ao abrir para editar
  useEffect(() => {
    if (!isOpen) {
      setMentionAccount(false);
      setMentionCard(false);
      setSelectedAccountId(undefined);
      setSelectedCardId(undefined);
      reset();
    } else if (transaction) {
      reset({
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id || '',
        description: transaction.description || '',
        is_recurring: transaction.is_recurring || false,
        recurrence_frequency: transaction.recurrence_frequency || 'monthly',
        recurrence_interval: transaction.recurrence_interval || 1,
        recurrence_count: transaction.recurrence_count || 12,
        custom_days: 1,
        start_date: transaction.date,
        account_id: (transaction as any).account_id ?? null,
        card_id: (transaction as any).card_id ?? null,
      });
    }
  }, [isOpen, transaction, reset, setValue]);

  // Efeito separado para garantir que, se o id existir e os dados carregarem depois, o estado local será atualizado corretamente
  useEffect(() => {
    if (!isOpen || !transaction) return;
    const accId = (transaction as any).account_id;
    if (accId) {
      setMentionAccount(true);
      const foundAccount = bankAccounts.find(a => a.id === accId);
      if (foundAccount) {
        setSelectedAccountId(accId);
        setValue('account_id', accId);
      }
    }
    const cardId = (transaction as any).card_id;
    if (cardId) {
      setMentionCard(true);
      const foundCard = creditCards.find(c => c.id === cardId);
      if (foundCard) {
        setSelectedCardId(cardId);
        setValue('card_id', cardId);
      }
    }
  }, [isOpen, transaction, bankAccounts, creditCards, setValue]);

  // Se marcar o checkbox de conta e só houver uma conta, selecionar automaticamente
  useEffect(() => {
    if (mentionAccount && !selectedAccountId && bankAccounts.length === 1) {
      setSelectedAccountId(bankAccounts[0].id);
      setValue('account_id', bankAccounts[0].id);
    }
  }, [mentionAccount, bankAccounts, selectedAccountId, setValue]);

  // Se desmarcar, limpar o valor
  useEffect(() => {
    if (!mentionAccount) {
      setSelectedAccountId(undefined);
      setValue('account_id', null);
    }
    if (!mentionCard) {
      setSelectedCardId(undefined);
      setValue('card_id', null);
    }
  }, [mentionAccount, mentionCard, setValue]);

  const onSubmit = async (data: ScheduledTransactionFormData) => {
    // Se marcar e não selecionar, usar padrão
    let account_id = mentionAccount ? (selectedAccountId ?? defaultAccount?.id ?? null) : null;
    let card_id = mentionCard ? (selectedCardId ?? defaultCard?.id ?? null) : null;
    if (!mentionAccount) account_id = null;
    if (!mentionCard) card_id = null;
    const payload: any = { ...data, account_id };
    payload.card_id = card_id;

    if (!user?.id) {
      toast({ title: 'Erro!', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }

    if (isEditing) {
      // Atualizar transação existente
      const transactionData: any = {
        title: data.title,
        description: data.description || '',
        amount: data.amount,
        type: data.type,
        category_id: data.category_id,
        date: data.start_date,
        is_recurring: data.is_recurring || false,
        updated_at: new Date().toISOString(),
        account_id,
        card_id,
      };
      if (data.is_recurring && data.recurrence_frequency) {
        transactionData.recurrence_frequency = data.recurrence_frequency;
        transactionData.recurrence_interval = data.recurrence_interval || 1;
        transactionData.recurrence_count = data.recurrence_count || 12;
      }
      const { error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', transaction.id);
      if (error) {
        toast({ title: 'Erro!', description: 'Erro ao atualizar agendamento.', variant: 'destructive' });
        return;
      }
    } else {
      // Criação nova
      if (!data.is_recurring) {
        // Transação única
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
          card_id,
        };
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);
        if (error) {
          toast({ title: 'Erro!', description: 'Erro ao criar agendamento.', variant: 'destructive' });
          return;
        }
      } else if (data.recurrence_frequency && data.recurrence_count) {
        // Transação recorrente
        const recurrenceDates = generateRecurrenceDates({
          frequency: data.recurrence_frequency,
          interval: data.recurrence_interval || 1,
          startDate: data.start_date,
          count: data.recurrence_count,
          customDays: data.custom_days
        });
        if (recurrenceDates.length === 0) {
          toast({ title: 'Erro!', description: 'Nenhuma data de transação gerada. Verifique as configurações de recorrência.', variant: 'destructive' });
          return;
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
          card_id,
        };
        const { data: parentTransaction, error: parentError } = await supabase
          .from('transactions')
          .insert(parentTransactionData)
          .select()
          .single();
        if (parentError) {
          toast({ title: 'Erro!', description: 'Erro ao criar agendamento.', variant: 'destructive' });
          return;
        }
        // Criar transações filhas
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
          card_id,
        }));
        const { error: childError } = await supabase
          .from('transactions')
          .insert(childTransactions);
        if (childError) {
          toast({ title: 'Erro!', description: 'Erro ao criar execuções recorrentes.', variant: 'destructive' });
          return;
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
    toast({ title: isEditing ? 'Agendamento atualizado!' : 'Agendamento criado!', description: isEditing ? 'A transação agendada foi atualizada com sucesso.' : 'A transação agendada foi criada com sucesso.' });
    reset();
    onClose();
  };

  // Adicionar o bloco de return com o formulário completo
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          <DialogDescription>
            Preencha os dados da transação agendada abaixo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={watch('type')}
                onValueChange={value => setValue('type', value as 'income' | 'expense')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
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
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          {/* Categoria e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria</Label>
              <Select
                value={watch('category_id') || ''}
                onValueChange={value => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span>{category.name}</span>
                        {category.is_default && (
                          <span className="text-xs text-muted-foreground">(padrão)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && <p className="text-sm text-destructive">{errors.category_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Data</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
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
                checked={watch('is_recurring')}
                onCheckedChange={checked => setValue('is_recurring', !!checked)}
              />
              <Label htmlFor="is_recurring">Transação recorrente</Label>
            </div>
            {watch('is_recurring') && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_frequency">Frequência</Label>
                    <Select
                      value={watch('recurrence_frequency') || ''}
                      onValueChange={value => setValue('recurrence_frequency', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="semiannual">Semestral</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.recurrence_frequency && <p className="text-sm text-destructive">{errors.recurrence_frequency.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_count">Número de Repetições</Label>
                    <Input
                      id="recurrence_count"
                      type="number"
                      min="1"
                      max="365"
                      placeholder="12"
                      {...register('recurrence_count', { valueAsNumber: true })}
                    />
                    {errors.recurrence_count && <p className="text-sm text-destructive">{errors.recurrence_count.message}</p>}
                  </div>
                </div>
                {watch('recurrence_frequency') === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom_days">Repetir a cada quantos dias?</Label>
                    <Input
                      id="custom_days"
                      type="number"
                      min="1"
                      placeholder="30"
                      {...register('custom_days', { valueAsNumber: true })}
                    />
                    {errors.custom_days && <p className="text-sm text-destructive">{errors.custom_days.message}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Seleção de Conta/Cartão */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="mention-account"
                checked={mentionAccount}
                onCheckedChange={checked => {
                  setMentionAccount(!!checked);
                  if (!checked) {
                    setSelectedAccountId(undefined);
                    setValue('account_id', null);
                  } else if (bankAccounts.length === 1) {
                    setSelectedAccountId(bankAccounts[0].id);
                    setValue('account_id', bankAccounts[0].id);
                  }
                }}
              />
              <Label htmlFor="mention-account">Mencionar Conta bancária</Label>
            </div>
            {mentionAccount && (
              <Select
                value={selectedAccountId || ''}
                onValueChange={value => {
                  setSelectedAccountId(value);
                  setValue('account_id', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} {account.is_default && '(Padrão)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="mention-card"
                checked={mentionCard}
                onCheckedChange={checked => {
                  setMentionCard(!!checked);
                  if (!checked) {
                    setSelectedCardId(undefined);
                    setValue('card_id', null);
                  }
                }}
              />
              <Label htmlFor="mention-card">Mencionar Cartão de Crédito</Label>
            </div>
            {mentionCard && (
              <Select
                value={selectedCardId || ''}
                onValueChange={value => {
                  setSelectedCardId(value);
                  setValue('card_id', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.map(card => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} {card.last_four_digits ? `•••• ${card.last_four_digits}` : ''} {card.is_default && '(Padrão)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
