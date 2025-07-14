import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MobileListSelect } from '../MobileListSelect';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';

const goalSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  target_amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  goal_type: z.enum(['savings', 'monthly_budget'], { required_error: 'Tipo é obrigatório' }),
  category_id: z.string().optional(),
  target_date: z.string().optional(),
  month_year: z.string().optional(),
  description: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

export const MobileGoalForm = () => {
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
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goal_type: 'savings',
    },
  });

  const goalType = watch('goal_type');

  // Buscar meta para edição
  const { data: goal } = useQuery({
    queryKey: ['goal', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Buscar categorias do banco de dados
  const { data: categories } = useQuery({
    queryKey: ['categories', 'expense', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'expense')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const goalData: any = {
        title: data.title,
        target_amount: data.target_amount,
        goal_type: data.goal_type,
        description: data.description || null,
        user_id: user.id,
        status: 'active',
        current_amount: 0,
      };

      if (data.goal_type === 'monthly_budget') {
        goalData.category_id = data.category_id;
        goalData.month_year = data.month_year;
      } else if (data.goal_type === 'savings') {
        goalData.target_date = data.target_date;
      }

      const { error } = await supabase
        .from('goals')
        .insert(goalData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Sucesso!',
        description: 'Meta salva com sucesso.',
      });
      navigate('/goals');
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao salvar meta.',
        variant: 'destructive',
      });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      if (!user || !goal) throw new Error('Dados inválidos');

      const goalData: any = {
        title: data.title,
        target_amount: data.target_amount,
        goal_type: data.goal_type,
        description: data.description || null,
        updated_at: new Date().toISOString(),
      };

      if (data.goal_type === 'monthly_budget') {
        goalData.category_id = data.category_id;
        goalData.month_year = data.month_year;
        goalData.target_date = null;
      } else if (data.goal_type === 'savings') {
        goalData.target_date = data.target_date;
        goalData.category_id = null;
        goalData.month_year = null;
      }

      const { error } = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', goal.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Sucesso!',
        description: 'Meta atualizada com sucesso.',
      });
      navigate('/goals');
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar meta.',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = async (data: GoalFormData) => {
    if (isEditing) {
      updateGoalMutation.mutate(data);
    } else {
      createGoalMutation.mutate(data);
    }
  };

  // Preencher formulário quando meta for carregada
  useEffect(() => {
    if (goal) {
      setValue('title', goal.title);
      setValue('target_amount', Number(goal.target_amount));
      setValue('goal_type', goal.goal_type as 'savings' | 'monthly_budget');
      setValue('description', goal.description || '');
      
      if (goal.goal_type === 'monthly_budget') {
        setValue('category_id', goal.category_id || '');
        setValue('month_year', goal.month_year || '');
      } else if (goal.goal_type === 'savings') {
        setValue('target_date', goal.target_date || '');
      }
    }
  }, [goal, setValue]);

  return (
    <MobilePageWrapper>
      {/* Header com botão voltar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/goals')}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">
            {isEditing ? 'Editar Meta' : 'Nova Meta'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Título e Valor */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Comprar carro, Viagem..."
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Valor da Meta</Label>
            <Input
              id="target_amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              {...register('target_amount', { valueAsNumber: true })}
            />
            {errors.target_amount && (
              <p className="text-sm text-destructive">{errors.target_amount.message}</p>
            )}
          </div>
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label htmlFor="goal_type">Tipo de Meta</Label>
          <MobileListSelect
            options={[
              { value: 'savings', label: 'Meta de Economia' },
              { value: 'monthly_budget', label: 'Orçamento Mensal' }
            ]}
            value={goalType}
            onValueChange={(value) => setValue('goal_type', value as 'savings' | 'monthly_budget')}
            placeholder="Selecione o tipo"
          />
          {errors.goal_type && (
            <p className="text-sm text-destructive">{errors.goal_type.message}</p>
          )}
        </div>

        {/* Campos condicionais */}
        {goalType === 'monthly_budget' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria</Label>
              <MobileListSelect
                options={[
                  { value: '', label: 'Selecione a categoria' },
                  ...(categories?.map(category => ({ 
                    value: category.id, 
                    label: category.name,
                    color: category.color 
                  })) || [])
                ]}
                value={watch('category_id') || ''}
                onValueChange={(value) => setValue('category_id', value)}
                placeholder="Selecione a categoria"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="month_year">Mês/Ano</Label>
              <Input
                id="month_year"
                type="month"
                {...register('month_year')}
              />
            </div>
          </div>
        )}

        {goalType === 'savings' && (
          <div className="space-y-2">
            <Label htmlFor="target_date">Data Limite (opcional)</Label>
            <Input
              id="target_date"
              type="date"
              {...register('target_date')}
            />
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            placeholder="Adicione uma descrição para sua meta..."
            className="resize-none"
            rows={3}
            {...register('description')}
          />
        </div>

        {/* Botões */}
        <div className="flex space-x-3 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate('/goals')}
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