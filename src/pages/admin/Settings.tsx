import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { MotivationalPhrasesManager } from '@/components/admin/MotivationalPhrasesManager';
import { PhoneInput } from '@/components/ui/phone-input';
import { FaviconUpload } from '@/components/admin/FaviconUpload';
import { SEOSettings } from '@/components/admin/SEOSettings';
import { PaymentSettings } from '@/components/admin/PaymentSettings';

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
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

  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*');
      
      if (error) throw error;
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      setSettings(configObj);
      return configObj;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: Record<string, string>) => {
      console.log('Salvando configurações:', settingsData);
      
      for (const [key, value] of Object.entries(settingsData)) {
        const cleanValue = value || '';
        console.log('Salvando configuração:', { key, value: cleanValue });
        
        // Primeiro verifica se o registro já existe
        const { data: existing } = await supabase
          .from('system_config')
          .select('id')
          .eq('key', key)
          .maybeSingle();

        if (existing) {
          // Se existe, faz UPDATE
          const { error } = await supabase
            .from('system_config')
            .update({
              value: JSON.stringify(cleanValue),
              updated_at: new Date().toISOString()
            })
            .eq('key', key);
          
          if (error) {
            console.error('Erro ao atualizar configuração:', key, error);
            throw error;
          }
        } else {
          // Se não existe, faz INSERT
          const { error } = await supabase
            .from('system_config')
            .insert({
              key: key,
              value: JSON.stringify(cleanValue),
              updated_at: new Date().toISOString()
            });
          
          if (error) {
            console.error('Erro ao inserir configuração:', key, error);
            throw error;
          }
        }
      }
    },
    onSuccess: () => {
      // Invalidar todos os caches relacionados às configurações
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-header'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-sidebar'] });
      queryClient.invalidateQueries({ queryKey: ['seo-config'] });
      
      toast({
        title: 'Sucesso',
        description: 'Configurações atualizadas com sucesso',
      });
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar configurações',
        variant: 'destructive',
      });
    }
  });

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

  useEffect(() => {
    if (systemConfig) {
      setSettings(systemConfig);
    }
  }, [systemConfig]);

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value || ''
    }));
  };

  const handleLogoChange = (newUrl: string) => {
    handleInputChange('app_logo', newUrl || '');
  };

  const handleFaviconChange = (newUrl: string) => {
    handleInputChange('app_favicon', newUrl || '');
  };

  const handleSave = () => {
    console.log('Salvando configurações:', settings);
    updateSettingsMutation.mutate(settings);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações do Sistema</h1>
        <p className="text-gray-600 dark:text-gray-400">Configure a aparência e comportamento do sistema</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding">Marca</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="phrases">Frases Motivacionais</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Marca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="app_name">Nome da Aplicação</Label>
                <Input
                  id="app_name"
                  value={settings.app_name || ''}
                  onChange={(e) => handleInputChange('app_name', e.target.value)}
                  placeholder="Ex: MYA Gestora"
                />
              </div>

              <LogoUpload 
                currentLogoUrl={settings.app_logo || ''}
                onLogoChange={handleLogoChange}
                onSave={handleSave}
              />

              <FaviconUpload 
                currentFaviconUrl={settings.app_favicon || ''}
                onFaviconChange={handleFaviconChange}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={settings.primary_color || '#3B82F6'}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={settings.primary_color || '#3B82F6'}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={settings.secondary_color || '#10B981'}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={settings.secondary_color || '#10B981'}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      placeholder="#10B981"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="default_theme">Tema Padrão</Label>
                <select 
                  id="default_theme"
                  className="w-full p-2 border rounded-md"
                  value={settings.default_theme || 'light'}
                  onChange={(e) => handleInputChange('default_theme', e.target.value)}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="currency_symbol">Símbolo da Moeda</Label>
                <Input
                  id="currency_symbol"
                  value={settings.currency_symbol || 'R$'}
                  onChange={(e) => handleInputChange('currency_symbol', e.target.value)}
                  placeholder="R$"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentSettings 
            settings={settings}
            onInputChange={handleInputChange}
            onSave={handleSave}
            isLoading={updateSettingsMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="support_email">Email de Suporte</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => handleInputChange('support_email', e.target.value)}
                  placeholder="suporte@empresa.com"
                />
              </div>
              
              <div>
                <Label htmlFor="support_phone">Telefone de Suporte</Label>
                <PhoneInput
                  id="support_phone"
                  value={settings.support_phone || ''}
                  onChange={(value) => handleInputChange('support_phone', value || '')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <SEOSettings 
            settings={settings}
            onInputChange={handleInputChange}
          />
        </TabsContent>

        <TabsContent value="phrases" className="space-y-6">
          <MotivationalPhrasesManager />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
