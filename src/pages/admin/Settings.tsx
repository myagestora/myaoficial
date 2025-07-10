
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BrandingSettings } from '@/components/admin/settings/BrandingSettings';
import { AppearanceSettings } from '@/components/admin/settings/AppearanceSettings';
import { NotificationSettings } from '@/components/admin/settings/NotificationSettings';
import { SubscriptionPlansManager } from '@/components/admin/settings/SubscriptionPlansManager';
import { MotivationalPhrasesManager } from '@/components/admin/MotivationalPhrasesManager';
import { SEOSettings } from '@/components/admin/SEOSettings';
import { PaymentSettings } from '@/components/admin/PaymentSettings';
import { APISettings } from '@/components/admin/settings/APISettings';

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
      queryClient.invalidateQueries({ queryKey: ['system-config-admin'] });
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
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="phrases">Frases Motivacionais</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <BrandingSettings
            settings={settings}
            onInputChange={handleInputChange}
            onLogoChange={handleLogoChange}
            onFaviconChange={handleFaviconChange}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <AppearanceSettings
            settings={settings}
            onInputChange={handleInputChange}
          />
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <APISettings
            settings={settings}
            onInputChange={handleInputChange}
          />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <SubscriptionPlansManager />
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
          <NotificationSettings
            settings={settings}
            onInputChange={handleInputChange}
          />
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
