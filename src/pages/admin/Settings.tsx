
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogoUpload } from '@/components/admin/LogoUpload';

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
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
          JSON.stringify(item.value);
      });
      
      setSettings(configObj);
      return configObj;
    }
  });

  // Sincronizar settings quando systemConfig muda
  useEffect(() => {
    if (systemConfig) {
      setSettings(systemConfig);
    }
  }, [systemConfig]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: Record<string, string>) => {
      const updates = Object.entries(settingsData).map(([key, value]) => ({
        key,
        value: value || '' // Garantir que valores vazios sejam strings vazias
      }));

      for (const update of updates) {
        console.log('Salvando configuração:', update);
        const { error } = await supabase
          .from('system_config')
          .upsert({
            key: update.key,
            value: JSON.stringify(update.value),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Erro ao salvar configuração:', update.key, error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-header'] });
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

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value || '' // Garantir que valores vazios sejam strings vazias
    }));
  };

  const handleLogoChange = (newUrl: string) => {
    handleInputChange('app_logo', newUrl || ''); // Garantir que valores vazios sejam strings vazias
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
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
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
                <Input
                  id="support_phone"
                  value={settings.support_phone || ''}
                  onChange={(e) => handleInputChange('support_phone', e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </CardContent>
          </Card>
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
