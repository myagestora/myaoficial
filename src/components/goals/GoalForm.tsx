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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Goal } from '@/hooks/useGoals';

const goalSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  target_amount: z.number().min(0.01, 'Valor meta deve ser maior que zero'),
  current_amount: z.number().min(0, 'Valor atual deve ser maior ou igual a zero').optional(),
  target_date: z.string().optional(),
  goal_type: z.enum(['savings', 'monthly_budget']),
  category_id: z.string().optional(),
  month_year: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: Goal;
  onSubmit: (data: GoalFormData) => void;
}

export const GoalForm = ({ isOpen, onClose, goal, onSubmit }: GoalFormProps) => {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      current_amount: 0,
      goal_type: 'savings',
      status: 'active',
    },
  });

  const goalType = watch('goal_type');

  const { data: categories } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'expense')
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (goal) {
      reset({
        title: goal.title,
        description: goal.description || '',
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        target_date: goal.target_date || '',
        goal_type: goal.goal_type,
        category_id: goal.category_id || '',
        month_year: goal.month_year || '',
        status: goal.status,
      });
    } else {
      reset({
        current_amount: 0,
        goal_type: 'savings',
        status: 'active',
      });
    }
  }, [goal, reset]);

  const handleFormSubmit = (data: GoalFormData) => {
    // Limpar campos não relevantes baseado no tipo de meta
    const cleanData = { ...data };
    
    if (data.goal_type === 'savings') {
      cleanData.category_id = undefined;
      cleanData.month_year = undefined;
    } else if (data.goal_type === 'monthly_budget') {
      cleanData.target_date = undefined;
      cleanData.current_amount = 0; // Metas mensais sempre começam com 0
    }

    onSubmit(cleanData);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Gerar opções de mês/ano para os próximos 12 meses
  const getMonthYearOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthYear = date.toISOString().slice(0, 7); // YYYY-MM
      const displayName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value: monthYear, label: displayName });
    }
    
    return options;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {goal ? 'Editar Meta' : 'Nova Meta Financeira'}
          </DialogTitle>
          <DialogDescription>
            {goalType === 'monthly_budget' 
              ? 'Defina uma meta de gastos mensais para uma categoria específica.'
              : 'Defina uma meta de economia para acompanhar seu progresso.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal_type">Tipo de Meta</Label>
            <Select onValueChange={(value) => setValue('goal_type', value as 'savings' | 'monthly_budget')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de meta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Meta de Economia</SelectItem>
                <SelectItem value="monthly_budget">Meta de Gastos Mensais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título da Meta</Label>
            <Input
              id="title"
              placeholder="Ex: Reserva de Emergência, Limite Alimentação..."
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva sua meta..."
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">
                {goalType === 'monthly_budget' ? 'Limite de Gastos' : 'Valor Meta'}
              </Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...register('target_amount', { valueAsNumber: true })}
              />
              {errors.target_amount && (
                <p className="text-sm text-red-600">{errors.target_amount.message}</p>
              )}
            </div>

            {goalType === 'savings' && (
              <div className="space-y-2">
                <Label htmlFor="current_amount">Valor Atual</Label>
                <Input
                  id="current_amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...register('current_amount', { valueAsNumber: true })}
                />
                {errors.current_amount && (
                  <p className="text-sm text-red-600">{errors.current_amount.message}</p>
                )}
              </div>
            )}
          </div>

          {goalType === 'monthly_budget' ? (
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
                <Label htmlFor="month_year">Mês/Ano</Label>
                <Select onValueChange={(value) => setValue('month_year', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthYearOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.month_year && (
                  <p className="text-sm text-red-600">{errors.month_year.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="target_date">Data Limite (opcional)</Label>
              <Input
                id="target_date"
                type="date"
                {...register('target_date')}
              />
              {errors.target_date && (
                <p className="text-sm text-red-600">{errors.target_date.message}</p>
              )}
            </div>
          )}

          {goal && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => setValue('status', value as 'active' | 'completed' | 'paused' | 'cancelled')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
