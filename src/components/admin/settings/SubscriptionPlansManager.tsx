
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const SubscriptionPlansManager = () => {
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    features: ['']
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
      setNewPlan({ name: '', description: '', price_monthly: '', price_yearly: '', features: [''] });
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
      setNewPlan({ name: '', description: '', price_monthly: '', price_yearly: '', features: [''] });
      toast({
        title: 'Sucesso',
        description: 'Plano atualizado com sucesso',
      });
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Sucesso',
        description: 'Plano excluído com sucesso',
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

  // Plan management functions
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
      features: featuresArray
    });
  };

  const cancelEditingPlan = () => {
    setEditingPlan(null);
    setNewPlan({ name: '', description: '', price_monthly: '', price_yearly: '', features: [''] });
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço Mensal</TableHead>
              <TableHead>Preço Anual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans?.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {plan.price_monthly ? `R$ ${plan.price_monthly}` : '-'}
                </TableCell>
                <TableCell>
                  {plan.price_yearly ? `R$ ${plan.price_yearly}` : '-'}
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
                            Esta ação não pode ser desfeita e pode afetar usuários com assinaturas ativas.
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
