import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, AlertTriangle, Crown, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const SubscriptionPlansManager = () => {
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    features: [''],
    is_special: false
  });
  const queryClient = useQueryClient();

  // Query for subscription plans
  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Check if a plan has active subscriptions
  const checkPlanHasSubscriptions = async (planId: string) => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('plan_id', planId)
      .eq('status', 'active')
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0;
  };

  // Plan management mutations
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const { error } = await supabase
        .from('subscription_plans')
        .insert({
          ...planData,
          price_monthly: parseFloat(planData.price_monthly) || null,
          price_yearly: parseFloat(planData.price_yearly) || null,
          features: JSON.stringify(planData.features.filter((f: string) => f.trim()))
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setIsCreatingPlan(false);
      setNewPlan({ name: '', description: '', price_monthly: '', price_yearly: '', features: [''], is_special: false });
      toast({
        title: 'Sucesso',
        description: 'Plano criado com sucesso',
      });
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, planData }: { id: string; planData: any }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          ...planData,
          price_monthly: parseFloat(planData.price_monthly) || null,
          price_yearly: parseFloat(planData.price_yearly) || null,
          features: JSON.stringify(planData.features.filter((f: string) => f.trim()))
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setEditingPlan(null);
      setNewPlan({ name: '', description: '', price_monthly: '', price_yearly: '', features: [''], is_special: false });
      toast({
        title: 'Sucesso',
        description: 'Plano atualizado com sucesso',
      });
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      // First check if plan has active subscriptions
      const hasSubscriptions = await checkPlanHasSubscriptions(planId);
      
      if (hasSubscriptions) {
        throw new Error('Este plano não pode ser excluído pois possui assinaturas ativas. Desative o plano ao invés de excluí-lo.');
      }

      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);
      
      if (error) {
        console.error('Erro ao deletar plano:', error);
        if (error.code === '23503') {
          throw new Error('Este plano não pode ser excluído pois possui assinaturas vinculadas. Desative o plano ao invés de excluí-lo.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Sucesso',
        description: 'Plano excluído com sucesso',
      });
    },
    onError: (error: any) => {
      console.error('Erro na exclusão:', error);
      toast({
        title: 'Erro ao excluir plano',
        description: error.message || 'Não foi possível excluir o plano',
        variant: 'destructive',
      });
    }
  });

  const togglePlanStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Sucesso',
        description: 'Status do plano atualizado',
      });
    }
  });

  const startEditingPlan = (plan: any) => {
    setEditingPlan(plan.id);
    
    let featuresArray = [''];
    if (plan.features) {
      try {
        const parsedFeatures = Array.isArray(plan.features) 
          ? plan.features 
          : JSON.parse(plan.features);
        featuresArray = parsedFeatures.length > 0 ? parsedFeatures : [''];
      } catch (error) {
        featuresArray = [''];
      }
    }
    
    setNewPlan({
      name: plan.name || '',
      description: plan.description || '',
      price_monthly: plan.price_monthly ? plan.price_monthly.toString() : '',
      price_yearly: plan.price_yearly ? plan.price_yearly.toString() : '',
      features: featuresArray,
      is_special: plan.is_special || false
    });
  };

  const cancelEditingPlan = () => {
    setEditingPlan(null);
    setNewPlan({ name: '', description: '', price_monthly: '', price_yearly: '', features: [''], is_special: false });
  };

  const addFeature = () => {
    setNewPlan(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  const removeFeature = (index: number) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Planos de Assinatura</CardTitle>
        <Button onClick={() => setIsCreatingPlan(true)} disabled={editingPlan}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Plano
        </Button>
      </CardHeader>
      <CardContent>
        {(isCreatingPlan || editingPlan) && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold">
              {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Nome do plano"
                value={newPlan.name}
                onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Descrição"
                value={newPlan.description}
                onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
              />
              <Input
                placeholder="Preço mensal (R$)"
                type="number"
                step="0.01"
                value={newPlan.price_monthly}
                onChange={(e) => setNewPlan(prev => ({ ...prev, price_monthly: e.target.value }))}
              />
              <Input
                placeholder="Preço anual (R$)"
                type="number"
                step="0.01"
                value={newPlan.price_yearly}
                onChange={(e) => setNewPlan(prev => ({ ...prev, price_yearly: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Funcionalidades</label>
              {newPlan.features.map((feature, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Descreva uma funcionalidade"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFeature(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                Adicionar Funcionalidade
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isSpecial"
                checked={newPlan.is_special}
                onCheckedChange={(checked) => setNewPlan(prev => ({ ...prev, is_special: checked as boolean }))}
              />
              <Label htmlFor="isSpecial" className="text-sm">
                Plano Especial (não aparece na landing page)
              </Label>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (editingPlan) {
                    updatePlanMutation.mutate({ id: editingPlan, planData: newPlan });
                  } else {
                    createPlanMutation.mutate(newPlan);
                  }
                }}
              >
                {editingPlan ? 'Atualizar Plano' : 'Criar Plano'}
              </Button>
              <Button 
                variant="outline" 
                onClick={editingPlan ? cancelEditingPlan : () => setIsCreatingPlan(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                ⚠️ Importante sobre exclusão de planos:
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Planos que possuem assinaturas ativas não podem ser excluídos. 
                Nestes casos, recomendamos <strong>desativar</strong> o plano ao invés de excluí-lo.
                Isso mantém o histórico de assinaturas intacto.
              </p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço Mensal</TableHead>
              <TableHead>Preço Anual</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans?.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {plan.is_special && <Crown className="h-4 w-4 text-amber-500" />}
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {plan.price_monthly ? `R$ ${plan.price_monthly}` : '-'}
                </TableCell>
                <TableCell>
                  {plan.price_yearly ? `R$ ${plan.price_yearly}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.is_special ? 'outline' : 'default'} className={plan.is_special ? 'border-amber-500 text-amber-700' : ''}>
                    {plan.is_special ? 'Especial' : 'Normal'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePlanStatus.mutate({
                        id: plan.id,
                        is_active: plan.is_active
                      })}
                    >
                      {plan.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startEditingPlan(plan)}
                      disabled={isCreatingPlan || editingPlan}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={isCreatingPlan || editingPlan}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o plano "{plan.name}"? 
                            <br /><br />
                            <strong>Atenção:</strong> Se este plano possuir assinaturas ativas, 
                            a exclusão não será possível. Neste caso, recomendamos desativar o plano.
                            <br /><br />
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePlanMutation.mutate(plan.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
