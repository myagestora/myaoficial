import React from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  DollarSign, 
  Repeat, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Plus,
  X
} from 'lucide-react';
import { MobileListSelect } from './MobileListSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

const scheduledTransactionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  type: z.enum(['income', 'expense'], { required_error: 'Tipo é obrigatório' }),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().optional(),
  recurrence_frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], { required_error: 'Frequência é obrigatória' }),
  recurrence_interval: z.number().min(1, 'Intervalo deve ser maior que zero').default(1),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().optional(),
});

type ScheduledTransactionFormData = z.infer<typeof scheduledTransactionSchema>;

interface MobileScheduledTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: any;
}

export const MobileScheduledTransactionForm = ({ 
  isOpen, 
  onClose, 
  transaction 
}: MobileScheduledTransactionFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ScheduledTransactionFormData>({
    resolver: zodResolver(scheduledTransactionSchema),
    defaultValues: {
      type: 'expense',
      recurrence_frequency: 'monthly',
      recurrence_interval: 1,
      start_date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const watchedType = watch('type');
  const watchedFrequency = watch('recurrence_frequency');
  const watchedInterval = watch('recurrence_interval');

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
    enabled: !!user?.id && isOpen
  });

  // Filter categories by type
  const filteredCategories = categories.filter(cat => cat.type === watchedType);

  const createScheduledTransaction = useMutation({
    mutationFn: async (data: ScheduledTransactionFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Calculate next recurrence date
      const startDate = new Date(data.start_date);
      let nextRecurrenceDate = startDate;

      switch (data.recurrence_frequency) {
        case 'daily':
          nextRecurrenceDate = addDays(startDate, data.recurrence_interval);
          break;
        case 'weekly':
          nextRecurrenceDate = addWeeks(startDate, data.recurrence_interval);
          break;
        case 'monthly':
          nextRecurrenceDate = addMonths(startDate, data.recurrence_interval);
          break;
        case 'quarterly':
          nextRecurrenceDate = addMonths(startDate, data.recurrence_interval * 3);
          break;
        case 'yearly':
          nextRecurrenceDate = addYears(startDate, data.recurrence_interval);
          break;
      }

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description || '',
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          date: data.start_date,
          is_recurring: true,
          recurrence_frequency: data.recurrence_frequency,
          recurrence_interval: data.recurrence_interval,
          recurrence_end_date: data.end_date || null,
          next_recurrence_date: format(nextRecurrenceDate, 'yyyy-MM-dd')
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast.success('Transação agendada criada com sucesso!');
      onClose();
      reset();
    },
    onError: (error) => {
      console.error('Error creating scheduled transaction:', error);
      toast.error('Erro ao criar transação agendada');
    }
  });

  const onSubmit = (data: ScheduledTransactionFormData) => {
    createScheduledTransaction.mutate(data);
  };

  const typeOptions = [
    { value: 'expense', label: 'Despesa' },
    { value: 'income', label: 'Receita' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Diária' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' }
  ];

  const categoryOptions = filteredCategories.map(cat => ({
    value: cat.id,
    label: cat.name,
    color: cat.color
  }));

  const getFrequencyDescription = () => {
    const interval = watchedInterval || 1;
    const freq = watchedFrequency;
    
    if (interval === 1) {
      switch (freq) {
        case 'daily': return 'Todo dia';
        case 'weekly': return 'Toda semana';
        case 'monthly': return 'Todo mês';
        case 'quarterly': return 'Todo trimestre';
        case 'yearly': return 'Todo ano';
        default: return '';
      }
    } else {
      switch (freq) {
        case 'daily': return `A cada ${interval} dias`;
        case 'weekly': return `A cada ${interval} semanas`;
        case 'monthly': return `A cada ${interval} meses`;
        case 'quarterly': return `A cada ${interval} trimestres`;
        case 'yearly': return `A cada ${interval} anos`;
        default: return '';
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Repeat className="h-5 w-5 mr-2" />
            Nova Transação Agendada
          </DialogTitle>
          <DialogDescription>
            Configure uma transação que se repete automaticamente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo */}
          <div>
            <Label>Tipo *</Label>
            <MobileListSelect
              value={watchedType}
              onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
              options={typeOptions}
              placeholder="Selecione o tipo"
            />
            {errors.type && (
              <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Título */}
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ex: Salário, Aluguel, Academia..."
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Valor */}
          <div>
            <Label htmlFor="amount">Valor *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="pl-10"
                placeholder="0,00"
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <Label>Categoria *</Label>
            <MobileListSelect
              value={watch('category_id') || ''}
              onValueChange={(value) => setValue('category_id', value)}
              options={categoryOptions}
              placeholder="Selecione a categoria"
            />
            {errors.category_id && (
              <p className="text-sm text-red-500 mt-1">{errors.category_id.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detalhes adicionais (opcional)"
              rows={2}
            />
          </div>

          {/* Configuração de Recorrência */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center mb-3">
                <Repeat className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium text-sm">Configuração de Recorrência</span>
              </div>
              
              <div className="space-y-3">
                {/* Frequência */}
                <div>
                  <Label>Frequência *</Label>
                  <MobileListSelect
                    value={watchedFrequency}
                    onValueChange={(value) => setValue('recurrence_frequency', value as any)}
                    options={frequencyOptions}
                    placeholder="Selecione a frequência"
                  />
                </div>

                {/* Intervalo */}
                <div>
                  <Label htmlFor="interval">A cada</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    {...register('recurrence_interval', { valueAsNumber: true })}
                    placeholder="1"
                  />
                </div>

                {/* Preview da frequência */}
                {watchedFrequency && (
                  <Badge variant="secondary" className="w-fit">
                    {getFrequencyDescription()}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="start_date">Data de Início *</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && (
                <p className="text-sm text-red-500 mt-1">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="end_date">Data de Fim (opcional)</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para repetir indefinidamente
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createScheduledTransaction.isPending}
              className="flex items-center"
            >
              {createScheduledTransaction.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Agendamento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};