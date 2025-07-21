import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateRecurrenceDates, formatRecurrenceInfo, calculateTotalDuration } from '@/utils/recurrenceUtils';
import { getCurrentDateForInput, getBrazilianTimestamp } from '@/utils/timezoneUtils';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';

const transactionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  type: z.enum(['income', 'expense'], { required_error: 'Tipo é obrigatório' }),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'custom']).optional(),
  recurrence_count: z.number().min(1).max(365).optional(),
  custom_days: z.number().min(1).optional(),
  account_id: z.string().uuid().optional().nullable(),
  card_id: z.string().uuid().optional().nullable(),
}).refine((data) => {
  if (data.is_recurring) {
    if (!data.recurrence_frequency || !data.recurrence_count) {
      return false;
    }
    if (data.recurrence_frequency === 'custom' && !data.custom_days) {
      return false;
    }
  }
  return true;
}, {
  message: "Campos de recorrência são obrigatórios quando a transação é recorrente",
  path: ["recurrence_frequency"]
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: any;
}

export const TransactionForm = ({ isOpen, onClose, transaction }: TransactionFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;
  const [previewDates, setPreviewDates] = useState<string[]>([]);

  const { bankAccounts, defaultAccount } = useBankAccounts();
  const { creditCards, defaultCard } = useCreditCards();

  // Estados para exibir selects
  const [mentionAccount, setMentionAccount] = useState(false);
  const [mentionCard, setMentionCard] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);

  // Reset selects ao abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setMentionAccount(false);
      setMentionCard(false);
      setSelectedAccountId(undefined);
      setSelectedCardId(undefined);
    } else if (transaction) {
      // Preencher selects/checks de conta/cartão ao editar
      const accId = (transaction as any).account_id;
      const cardId = (transaction as any).card_id;
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
  }, [isOpen, transaction]);

  // Se marcar o checkbox de conta e só houver uma conta, selecionar automaticamente
  useEffect(() => {
    if (mentionAccount && !selectedAccountId && bankAccounts.length === 1) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [mentionAccount, bankAccounts, selectedAccountId]);

  // Se desmarcar, limpar o valor
  useEffect(() => {
    if (!mentionAccount) setSelectedAccountId(undefined);
    if (!mentionCard) setSelectedCardId(undefined);
  }, [mentionAccount, mentionCard]);

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
      recurrence_count: 12,
      custom_days: 30,
    },
  });

  const transactionType = watch('type');
  const isRecurring = watch('is_recurring');
  const selectedCategoryId = watch('category_id');
  const recurrenceFrequency = watch('recurrence_frequency');
  const recurrenceCount = watch('recurrence_count');
  const customDays = watch('custom_days');
  const startDate = watch('date');

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
    enabled: !!user && isOpen,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!user) throw new Error('Usuário não autenticado');

      if (data.is_recurring && data.recurrence_frequency && data.recurrence_count) {
        // Para transações recorrentes, gerar todas as datas e criar múltiplas transações
        const dates = generateRecurrenceDates({
          frequency: data.recurrence_frequency,
          interval: 1,
          startDate: data.date,
          count: data.recurrence_count,
          customDays: data.custom_days
        });

        // Criar transação template (pai) - não usar data de execução
        const templateTransaction = {
          title: data.title,
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          date: data.date, // Data original do formulário
          description: data.description || null,
          user_id: user.id,
          is_recurring: true,
          is_parent_template: true,
          recurrence_frequency: data.recurrence_frequency,
          recurrence_interval: 1,
          recurrence_count: data.recurrence_count,
          next_recurrence_date: dates.length > 0 ? dates[0] : null // Primeira execução programada
        };

        // Criar apenas as transações filhas (execuções)
        const childTransactions = dates.map((date) => ({
          title: data.title,
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          date: date,
          description: data.description || null,
          user_id: user.id,
          is_recurring: false,
          is_parent_template: false
        }));

        // Inserir transação template (pai)
        const { data: parentTransaction, error: parentError } = await supabase
          .from('transactions')
          .insert(templateTransaction)
          .select()
          .single();

        if (parentError) throw parentError;

        // Inserir transações filhas com referência ao parent
        const childTransactionsWithParent = childTransactions.map(t => ({
          ...t,
          parent_transaction_id: parentTransaction.id
        }));

        const { error: childError } = await supabase
          .from('transactions')
          .insert(childTransactionsWithParent);

        if (childError) throw childError;
      } else {
        // Transação única
        const transactionData = {
          title: data.title,
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          date: data.date,
          description: data.description || null,
          user_id: user.id,
          is_recurring: false,
          account_id: (data as any).account_id || null,
        } as any;
        if ((data as any).card_id) transactionData.card_id = (data as any).card_id;

        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação salva com sucesso.',
      });
      reset();
      onClose();
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
    mutationFn: async (data: TransactionFormData & { account_id: string | null, card_id?: string | null }) => {
      if (!user || !transaction) throw new Error('Dados inválidos');

      const transactionData: any = {
        title: data.title,
        amount: data.amount,
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        description: data.description || null,
        updated_at: getBrazilianTimestamp(),
        account_id: data.account_id ?? null,
        card_id: data.card_id !== undefined ? data.card_id : null,
      };

      const { error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', transaction.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação atualizada com sucesso.',
      });
      reset();
      onClose();
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar transação.',
        variant: 'destructive',
      });
    }
  });

  // Update preview when recurrence settings change
  useEffect(() => {
    if (isRecurring && recurrenceFrequency && recurrenceCount && startDate) {
      try {
        const dates = generateRecurrenceDates({
          frequency: recurrenceFrequency,
          interval: 1,
          startDate: startDate,
          count: Math.min(recurrenceCount, 5), // Show max 5 for preview
          customDays: customDays
        });
        setPreviewDates(dates);
      } catch (error) {
        setPreviewDates([]);
      }
    } else {
      setPreviewDates([]);
    }
  }, [isRecurring, recurrenceFrequency, recurrenceCount, startDate, customDays]);

  // Reset form when dialog closes or transaction changes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setPreviewDates([]);
    } else if (transaction) {
      // Preencher formulário com dados da transação para edição
      setValue('title', transaction.title);
      setValue('amount', Number(transaction.amount));
      setValue('type', transaction.type);
      setValue('date', transaction.date);
      setValue('description', transaction.description || '');
      setValue('is_recurring', false); // Disable recurring for edits
    }
  }, [isOpen, transaction, reset, setValue]);

  // Efeito para definir a categoria após as categorias serem carregadas
  useEffect(() => {
    if (transaction && categories && categories.length > 0) {
      // Verificar se a categoria da transação existe nas categorias carregadas
      const categoryExists = categories.find(cat => cat.id === transaction.category_id);
      if (categoryExists) {
        setValue('category_id', transaction.category_id);
      }
    }
  }, [transaction, categories, setValue]);

  // Ajuste no submit para incluir account_id e card_id
  const onSubmit = async (data: TransactionFormData) => {
    // Garantir que account_id seja sempre enviado corretamente
    const account_id = mentionAccount ? selectedAccountId ?? null : null;
    const card_id = mentionCard ? selectedCardId ?? null : null;

    const payload: any = { ...data, account_id };
    // Só adiciona card_id se marcado, senão envia null explicitamente
    payload.card_id = mentionCard ? card_id : null;

    if (isEditing) {
      updateTransactionMutation.mutate(payload);
    } else {
      createTransactionMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da transação abaixo.
          </DialogDescription>
          {bankAccounts.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-3 rounded mb-4 text-sm">
              <b>Atenção:</b> Você ainda não cadastrou nenhuma conta bancária. Recomenda-se cadastrar uma para melhor controle financeiro, mas você pode continuar normalmente.
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={transactionType}
                onValueChange={(value) => {
                  setValue('type', value as 'income' | 'expense');
                  setValue('category_id', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
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
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
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
              <Select 
                value={selectedCategoryId || ''} 
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                        {(category as any).is_default && (
                          <span className="text-xs text-muted-foreground">(padrão)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {!isEditing && (
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
                      <Select 
                        value={recurrenceFrequency || ''} 
                        onValueChange={(value) => setValue('recurrence_frequency', value as any)}
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
                      {errors.recurrence_frequency && (
                        <p className="text-sm text-destructive">{errors.recurrence_frequency.message}</p>
                      )}
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
                      {errors.recurrence_count && (
                        <p className="text-sm text-destructive">{errors.recurrence_count.message}</p>
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
                        <p className="text-sm text-destructive">{errors.custom_days.message}</p>
                      )}
                    </div>
                  )}

                  {/* Preview */}
                  {recurrenceFrequency && recurrenceCount && (
                    <div className="space-y-2">
                      <Label>Resumo</Label>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          {formatRecurrenceInfo(recurrenceFrequency, 1, customDays)} • {recurrenceCount} repetições
                        </p>
                        <p>
                          Duração total: {calculateTotalDuration(recurrenceFrequency, 1, recurrenceCount, customDays)}
                        </p>
                      </div>
                      
                      {previewDates.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Primeiras datas ({previewDates.length > 5 ? '5 de ' + recurrenceCount : previewDates.length}):
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
          )}

          {/* NOVO BLOCO: Seleção de Conta/Cartão */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="mention-account"
                checked={mentionAccount}
                onCheckedChange={checked => {
                  setMentionAccount(!!checked);
                  if (!checked) setSelectedAccountId(undefined);
                  // Se marcar e só houver uma conta, selecionar automaticamente
                  if (checked && bankAccounts.length === 1) {
                    setSelectedAccountId(bankAccounts[0].id);
                  }
                }}
              />
              <Label htmlFor="mention-account">Mencionar Conta bancária</Label>
            </div>
            {mentionAccount && (
              <Select
                value={selectedAccountId || ''}
                onValueChange={setSelectedAccountId}
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
                  if (!checked) setSelectedCardId(undefined);
                }}
              />
              <Label htmlFor="mention-card">Mencionar Cartão de Crédito</Label>
            </div>
            {mentionCard && (
              <Select
                value={selectedCardId || ''}
                onValueChange={setSelectedCardId}
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
