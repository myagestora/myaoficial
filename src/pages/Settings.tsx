
import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Palette } from 'lucide-react';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { SecurityTab } from '@/components/settings/SecurityTab';
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { useProfile } from '@/hooks/useProfile';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { usePreferences } from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SettingsPage = () => {
  const { user } = useAuth();
  const { 
    profile, 
    isLoading, 
    error, 
    whatsappValue, 
    setWhatsappValue, 
    updateProfileMutation 
  } = useProfile();
  const { handlePasswordChange, loading: passwordLoading } = usePasswordChange();
  const {
    darkTheme,
    animations,
    notificationSound,
    handleThemeToggle,
    handleAnimationsToggle,
    handleNotificationSoundToggle
  } = usePreferences();

  // Verificar status da conta
  const { data: accountStatus } = useQuery({
    queryKey: ['account-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return { accountActive: true };
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao verificar status da conta:', error);
        return { accountActive: true };
      }
      
      return {
        accountActive: profile?.account_status === 'active' || profile?.account_status === null
      };
    },
    enabled: !!user?.id
  });

  // Atualizar o valor do WhatsApp quando o perfil carregar
  useEffect(() => {
    if (profile?.whatsapp) {
      console.log('Definindo WhatsApp do perfil:', profile.whatsapp);
      setWhatsappValue(profile.whatsapp);
    }
  }, [profile, setWhatsappValue]);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const updates = {
      full_name: formData.get('full_name') as string,
      whatsapp: whatsappValue,
    };
    
    await updateProfileMutation.mutateAsync(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Erro na query do perfil:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <SettingsHeader 
          title="Configurações" 
          description="Gerencie suas informações pessoais e preferências da conta" 
        />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Preferências
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab
              user={user}
              profile={profile}
              whatsappValue={whatsappValue}
              loading={updateProfileMutation.isPending}
              accountActive={accountStatus?.accountActive ?? true}
              onWhatsappChange={setWhatsappValue}
              onSubmit={handleUpdateProfile}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab
              loading={passwordLoading}
              onSubmit={handlePasswordChange}
            />
          </TabsContent>

          <TabsContent value="preferences">
            <PreferencesTab
              darkTheme={darkTheme}
              animations={animations}
              notificationSound={notificationSound}
              onThemeToggle={handleThemeToggle}
              onAnimationsToggle={handleAnimationsToggle}
              onNotificationSoundToggle={handleNotificationSoundToggle}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
