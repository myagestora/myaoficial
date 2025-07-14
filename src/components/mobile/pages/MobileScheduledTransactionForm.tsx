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
        is_recurring: existingTransaction.is_recurring || false,
        recurrence_frequency: existingTransaction.recurrence_frequency || 'monthly',
        recurrence_interval: existingTransaction.recurrence_interval || 1,
        recurrence_count: existingTransaction.recurrence_count || 12,
        custom_days: 1,
        start_date: existingTransaction.date,
      });
    }
  }, [existingTransaction, isEditing, reset]);

  // Filter categories by type
  const filteredCategories = categories.filter(cat => cat.type === watchedType);

  const saveScheduledTransaction = useMutation({
    mutationFn: async (data: ScheduledTransactionFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      if (isEditing && id) {
        // Para edição, apenas atualizar a transação existente
        const transactionData: any = {
          title: data.title,
          description: data.description || '',
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          date: data.start_date,
          is_recurring: data.is_recurring || false,
          updated_at: new Date().toISOString(),
        };

        if (data.is_recurring && data.recurrence_frequency) {
          transactionData.recurrence_frequency = data.recurrence_frequency;
          transactionData.recurrence_interval = data.recurrence_interval || 1;
          transactionData.recurrence_count = data.recurrence_count || 12;
        }

        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', id);
        if (error) throw error;
      } else {
        // Para criação nova
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
    saveScheduledTransaction.mutate(data);
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
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure uma transação única ou recorrente
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              <p className="text-sm text-destructive">{errors.type.message}</p>
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
              <p className="text-sm text-destructive">{errors.amount.message}</p>
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

        {/* Categoria */}
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

        {/* Descrição */}
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

        {/* Configuração de Recorrência */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={watchedIsRecurring}
              onCheckedChange={(checked) => setValue('is_recurring', !!checked)}
            />
            <Label htmlFor="is_recurring" className="text-base font-medium cursor-pointer">
              Transação recorrente
            </Label>
          </div>
          
          {watchedIsRecurring && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center mb-4">
                  <Repeat className="h-5 w-5 mr-2 text-primary" />
                  <span className="font-medium">Configuração de Recorrência</span>
                </div>
                
                <div className="space-y-4">
                   {/* Frequência */}
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <MobileListSelect
                      value={watchedFrequency || ''}
                      onValueChange={(value) => setValue('recurrence_frequency', value as any)}
                      options={frequencyOptions}
                      placeholder="Selecione a frequência"
                    />
                    {errors.recurrence_frequency && (
                      <p className="text-sm text-destructive">{errors.recurrence_frequency.message}</p>
                    )}
                  </div>

                  {/* Preview da frequência */}
                  {watchedFrequency && (
                    <Badge variant="secondary" className="w-fit">
                      {getFrequencyDescription()}
                    </Badge>
                  )}

                  {/* Campo personalizado para frequência custom */}
                  {watchedFrequency === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="custom_days">Repetir a cada quantos dias?</Label>
                      <Input
                        id="custom_days"
                        type="number"
                        min="1"
                        {...register('custom_days', { valueAsNumber: true })}
                        placeholder="7"
                      />
                      {errors.custom_days && (
                        <p className="text-sm text-destructive">{errors.custom_days.message}</p>
                      )}
                    </div>
                  )}

                  {/* Número de Repetições */}
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_count">Número de Repetições *</Label>
                    <Input
                      id="recurrence_count"
                      type="number"
                      min="1"
                      max="365"
                      {...register('recurrence_count', { valueAsNumber: true })}
                      placeholder="12"
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantas transações serão criadas (máximo 365)
                    </p>
                    {errors.recurrence_count && (
                      <p className="text-sm text-destructive">{errors.recurrence_count.message}</p>
                    )}
                  </div>

                  {/* Preview das transações */}
                  {getPreviewInfo() && (
                    <div className="p-3 bg-background/50 rounded-lg border-2 border-dashed border-primary/30">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{getPreviewInfo()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Data de Início */}
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