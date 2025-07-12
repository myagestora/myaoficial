import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
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
import { ArrowLeft } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';

const transactionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  type: z.enum(['income', 'expense'], { required_error: 'Tipo é obrigatório' }),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  recurrence_interval: z.number().min(1).default(1),
  recurrence_end_date: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export const MobileTransactionForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

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
      date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      recurrence_interval: 1,
    },
  });

  const transactionType = watch('type');
  const isRecurring = watch('is_recurring');
  const selectedCategoryId = watch('category_id');

  // Buscar transação para edição
  const { data: transaction, isLoading: loadingTransaction } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      if (!id) return null;
      
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
      
      if (error) throw error;
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
    mutationFn: async (data: TransactionFormData) => {
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
      };

      if (data.is_recurring) {
        transactionData.recurrence_frequency = data.recurrence_frequency;
        transactionData.recurrence_interval = data.recurrence_interval;
        transactionData.recurrence_end_date = data.recurrence_end_date || null;
        
        const { data: nextDate } = await supabase
          .rpc('calculate_next_recurrence_date', {
            base_date: data.date,
            frequency: data.recurrence_frequency,
            interval_count: data.recurrence_interval
          });
        
        transactionData.next_recurrence_date = nextDate;
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
      if (!user || !transaction) throw new Error('Dados inválidos');

      const transactionData: any = {
        title: data.title,
        amount: data.amount,
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        description: data.description || null,
        is_recurring: data.is_recurring,
        updated_at: new Date().toISOString(),
      };

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

      const { error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', transaction.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação atualizada com sucesso.',
      });
      navigate('/transactions');
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

  const onSubmit = async (data: TransactionFormData) => {
    if (isEditing) {
      updateTransactionMutation.mutate(data);
    } else {
      createTransactionMutation.mutate(data);
    }
  };

  // Preencher formulário quando transação for carregada
  useEffect(() => {
    if (transaction && isEditing) {
      reset({
        title: transaction.title,
        amount: Number(transaction.amount),
        type: transaction.type,
        category_id: transaction.category_id || '',
        date: transaction.date,
        description: transaction.description || '',
        is_recurring: transaction.is_recurring || false,
        recurrence_frequency: transaction.recurrence_frequency || undefined,
        recurrence_interval: transaction.recurrence_interval || 1,
        recurrence_end_date: transaction.recurrence_end_date || '',
      });
    }
  }, [transaction, isEditing, reset]);

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/transactions')}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </h1>
        </div>
      </div>

      {/* Loading para transação em edição */}
      {isEditing && loadingTransaction && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando transação...</p>
        </div>
      )}

      {/* Formulário só é exibido se não estiver carregando */}
      {(!isEditing || (isEditing && !loadingTransaction && transaction)) && (

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    value={watch('recurrence_frequency') || ''} 
                    onValueChange={(value) => setValue('recurrence_frequency', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.recurrence_frequency && (
                    <p className="text-sm text-destructive">{errors.recurrence_frequency.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence_interval">Intervalo</Label>
                  <Input
                    id="recurrence_interval"
                    type="number"
                    min="1"
                    placeholder="1"
                    {...register('recurrence_interval', { valueAsNumber: true })}
                  />
                  {errors.recurrence_interval && (
                    <p className="text-sm text-destructive">{errors.recurrence_interval.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence_end_date">Data final (opcional)</Label>
                <Input
                  id="recurrence_end_date"
                  type="date"
                  {...register('recurrence_end_date')}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para recorrência indefinida
                </p>
              </div>
            </div>
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