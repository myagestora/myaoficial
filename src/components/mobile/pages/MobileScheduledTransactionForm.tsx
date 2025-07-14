import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export const MobileScheduledTransactionForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

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
    enabled: !!user?.id
  });

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

  // Reset form with existing data
  useEffect(() => {
    if (existingTransaction && isEditing) {
      reset({
        title: existingTransaction.title,
        amount: existingTransaction.amount,
        type: existingTransaction.type,
        category_id: existingTransaction.category_id || '',
        description: existingTransaction.description || '',
        recurrence_frequency: existingTransaction.recurrence_frequency || 'monthly',
        recurrence_interval: existingTransaction.recurrence_interval || 1,
        start_date: existingTransaction.date,
        end_date: existingTransaction.recurrence_end_date || '',
      });
    }
  }, [existingTransaction, isEditing, reset]);

  // Filter categories by type
  const filteredCategories = categories.filter(cat => cat.type === watchedType);

  const saveScheduledTransaction = useMutation({
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

      const transactionData = {
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
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);
        if (error) throw error;
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
    saveScheduledTransaction.mutate(data);
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
    <MobilePageWrapper>
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/scheduled')}
          className="mr-3 p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center">
            <Repeat className="h-5 w-5 mr-2" />
            {isEditing ? 'Editar Agendamento' : 'Nova Transação Agendada'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure uma transação que se repete automaticamente
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo */}
        <div>
          <Label className="text-base font-medium">Tipo *</Label>
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
          <Label htmlFor="title" className="text-base font-medium">Título *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Ex: Salário, Aluguel, Academia..."
            className="mt-2"
          />
          {errors.title && (
            <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Valor */}
        <div>
          <Label htmlFor="amount" className="text-base font-medium">Valor *</Label>
          <div className="relative mt-2">
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
          <Label className="text-base font-medium">Categoria *</Label>
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
          <Label htmlFor="description" className="text-base font-medium">Descrição</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Detalhes adicionais (opcional)"
            rows={3}
            className="mt-2"
          />
        </div>

        {/* Configuração de Recorrência */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center mb-4">
              <Repeat className="h-5 w-5 mr-2 text-primary" />
              <span className="font-medium">Configuração de Recorrência</span>
            </div>
            
            <div className="space-y-4">
              {/* Frequência */}
              <div>
                <Label className="text-base font-medium">Frequência *</Label>
                <MobileListSelect
                  value={watchedFrequency}
                  onValueChange={(value) => setValue('recurrence_frequency', value as any)}
                  options={frequencyOptions}
                  placeholder="Selecione a frequência"
                />
                {errors.recurrence_frequency && (
                  <p className="text-sm text-red-500 mt-1">{errors.recurrence_frequency.message}</p>
                )}
              </div>

              {/* Intervalo */}
              <div>
                <Label htmlFor="interval" className="text-base font-medium">A cada</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  {...register('recurrence_interval', { valueAsNumber: true })}
                  placeholder="1"
                  className="mt-2"
                />
                {errors.recurrence_interval && (
                  <p className="text-sm text-red-500 mt-1">{errors.recurrence_interval.message}</p>
                )}
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
        <div className="space-y-4">
          <div>
            <Label htmlFor="start_date" className="text-base font-medium">Data de Início *</Label>
            <Input
              id="start_date"
              type="date"
              {...register('start_date')}
              className="mt-2"
            />
            {errors.start_date && (
              <p className="text-sm text-red-500 mt-1">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="end_date" className="text-base font-medium">Data de Fim (opcional)</Label>
            <Input
              id="end_date"
              type="date"
              {...register('end_date')}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Deixe em branco para repetir indefinidamente
            </p>
            {errors.end_date && (
              <p className="text-sm text-red-500 mt-1">{errors.end_date.message}</p>
            )}
          </div>
        </div>

        {/* Botão de salvar */}
        <div className="pt-6 border-t">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                {isEditing ? 'Atualizando...' : 'Criando...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Atualizar Agendamento' : 'Criar Agendamento'}
              </>
            )}
          </Button>
        </div>
      </form>
    </MobilePageWrapper>
  );
};