import React, { useEffect } from 'react';
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

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: any;
}

export const TransactionForm = ({ isOpen, onClose, transaction }: TransactionFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;

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

  // Buscar categorias do banco de dados
  const { data: categories } = useQuery({
    queryKey: ['categories', transactionType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', transactionType)
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

      // Se for recorrente, adicionar campos específicos
      if (data.is_recurring) {
        transactionData.recurrence_frequency = data.recurrence_frequency;
        transactionData.recurrence_interval = data.recurrence_interval;
        transactionData.recurrence_end_date = data.recurrence_end_date || null;
        
        // Calcular próxima data de recorrência
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

      // Se for recorrente, adicionar campos específicos
      if (data.is_recurring) {
        transactionData.recurrence_frequency = data.recurrence_frequency;
        transactionData.recurrence_interval = data.recurrence_interval;
        transactionData.recurrence_end_date = data.recurrence_end_date || null;
        
        // Calcular próxima data de recorrência apenas se não existir
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
        // Se não for mais recorrente, limpar campos
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

  const onSubmit = async (data: TransactionFormData) => {
    if (isEditing) {
      updateTransactionMutation.mutate(data);
    } else {
      createTransactionMutation.mutate(data);
    }
  };

  // Reset form when dialog closes or transaction changes
  useEffect(() => {
    if (!isOpen) {
      reset();
    } else if (transaction) {
      // Preencher formulário com dados da transação para edição
      setValue('title', transaction.title);
      setValue('amount', Number(transaction.amount));
      setValue('type', transaction.type);
      setValue('category_id', transaction.category_id || '');
      setValue('date', transaction.date);
      setValue('description', transaction.description || '');
      setValue('is_recurring', transaction.is_recurring || false);
      
      if (transaction.is_recurring) {
        setValue('recurrence_frequency', transaction.recurrence_frequency);
        setValue('recurrence_interval', transaction.recurrence_interval || 1);
        setValue('recurrence_end_date', transaction.recurrence_end_date || '');
      }
    }
  }, [isOpen, transaction, reset, setValue]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da transação abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={transactionType}
                onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
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
                <p className="text-sm text-red-600">{errors.type.message}</p>
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
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Supermercado, Salário..."
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria</Label>
              <Select onValueChange={(value) => setValue('category_id', value)}>
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
                        {category.name}
                        {(category as any).is_default && (
                          <span className="text-xs text-muted-foreground">(padrão)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-red-600">{errors.category_id.message}</p>
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
                <p className="text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Observações (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Adicione observações..."
              {...register('description')}
            />
          </div>

          {/* Seção de Recorrência */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setValue('is_recurring', !!checked)}
              />
              <Label htmlFor="is_recurring" className="text-sm font-medium">
                Transação recorrente
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_frequency">Frequência</Label>
                    <Select onValueChange={(value) => setValue('recurrence_frequency', value as any)}>
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
                      <p className="text-sm text-red-600">{errors.recurrence_frequency.message}</p>
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
                      <p className="text-sm text-red-600">{errors.recurrence_interval.message}</p>
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
                  <p className="text-xs text-gray-500">
                    Deixe em branco para recorrência indefinida
                  </p>
                </div>
              </div>
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
};
