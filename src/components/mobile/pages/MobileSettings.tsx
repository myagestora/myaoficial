import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneInput } from '@/components/ui/phone-input';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  User, 
  Shield, 
  Palette, 
  ChevronRight, 
  ArrowLeft, 
  Info,
  Check,
  X
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { usePreferences } from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MobileOptimizedCard } from '@/components/ui/mobile-optimized-card';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { toast } from '@/hooks/use-toast';

type SettingsSection = 'main' | 'profile' | 'security' | 'preferences';

export const MobileSettings = () => {
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');
  
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
    
    try {
      await updateProfileMutation.mutateAsync(updates);
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('current_password') as string;
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await handlePasswordChange(e);
      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso',
      });
      // Reset form
      e.currentTarget.reset();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar senha',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <MobileOptimizedCard key={i} className="animate-pulse">
              <div className="p-4">
                <div className="h-16 bg-muted rounded" />
              </div>
            </MobileOptimizedCard>
          ))}
        </div>
      </MobilePageWrapper>
    );
  }

  // Seção Principal
  if (currentSection === 'main') {
    return (
      <MobilePageWrapper className="bg-gradient-to-br from-background to-primary/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center text-foreground">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg mr-3">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            Configurações
          </h1>
        </div>

        {/* Status da Conta */}
        <MobileOptimizedCard className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-sm bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{profile?.full_name || 'Usuário'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Badge variant={accountStatus?.accountActive ? 'default' : 'destructive'} className="shadow-sm">
              {accountStatus?.accountActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </MobileOptimizedCard>

        {/* Menu de Opções */}
        <div className="space-y-3">
          <MobileOptimizedCard className="shadow-md border-primary/10 hover:shadow-lg transition-shadow">
            <button
              onClick={() => setCurrentSection('profile')}
              className="w-full flex items-center justify-between p-0 bg-transparent border-none text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Perfil</p>
                  <p className="text-sm text-muted-foreground">
                    Informações pessoais e contato
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </MobileOptimizedCard>

          <MobileOptimizedCard className="shadow-md border-orange-500/10 hover:shadow-lg transition-shadow">
            <button
              onClick={() => setCurrentSection('security')}
              className="w-full flex items-center justify-between p-0 bg-transparent border-none text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-xl">
                  <Shield className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Segurança</p>
                  <p className="text-sm text-muted-foreground">
                    Senha e configurações de segurança
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </MobileOptimizedCard>

          <MobileOptimizedCard className="shadow-md border-purple-500/10 hover:shadow-lg transition-shadow">
            <button
              onClick={() => setCurrentSection('preferences')}
              className="w-full flex items-center justify-between p-0 bg-transparent border-none text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-xl">
                  <Palette className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Preferências</p>
                  <p className="text-sm text-muted-foreground">
                    Tema, animações e notificações
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </MobileOptimizedCard>
        </div>
      </MobilePageWrapper>
    );
  }

  // Seção de Perfil
  if (currentSection === 'profile') {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSection('main')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Perfil</h1>
            <div className="w-9" />
          </div>

          {/* Avatar e Info Básica */}
          <MobileOptimizedCard>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-lg">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-medium">{profile?.full_name || 'Usuário'}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant={accountStatus?.accountActive ? 'default' : 'destructive'} className="text-xs">
                  {accountStatus?.accountActive ? 'Conta Ativa' : 'Conta Inativa'}
                </Badge>
              </div>
            </div>
          </MobileOptimizedCard>

          {/* Formulário de Perfil */}
          <MobileOptimizedCard>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile?.full_name || ''}
                  placeholder="Digite seu nome completo"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted text-base"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <PhoneInput
                  id="whatsapp"
                  value={whatsappValue}
                  onChange={(value) => setWhatsappValue(value || '')}
                  className="w-full"
                />
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Importante:</strong> Este número será autorizado a enviar mensagens para a Mya, nossa assistente de IA.
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="w-full h-12 text-base"
              >
                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </MobileOptimizedCard>
        </div>
      </MobilePageWrapper>
    );
  }

  // Seção de Segurança
  if (currentSection === 'security') {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSection('main')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Segurança</h1>
            <div className="w-9" />
          </div>

          {/* Formulário de Mudança de Senha */}
          <MobileOptimizedCard>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Alterar Senha</h3>
                <p className="text-sm text-muted-foreground">
                  Altere sua senha para manter sua conta segura
                </p>
              </div>

              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <Input
                    id="current_password"
                    name="current_password"
                    type="password"
                    placeholder="Digite sua senha atual"
                    className="text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova Senha</Label>
                  <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    placeholder="Digite sua nova senha"
                    className="text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    className="text-base"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="w-full h-12 text-base"
                >
                  {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </div>
          </MobileOptimizedCard>
        </div>
      </MobilePageWrapper>
    );
  }

  // Seção de Preferências
  if (currentSection === 'preferences') {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSection('main')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Preferências</h1>
            <div className="w-9" />
          </div>

          {/* Opções de Preferências */}
          <div className="space-y-3">
            <MobileOptimizedCard>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Tema Escuro</p>
                  <p className="text-sm text-muted-foreground">
                    Ativar tema escuro automaticamente
                  </p>
                </div>
                <Switch 
                  checked={darkTheme}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </MobileOptimizedCard>

            <MobileOptimizedCard>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Animações</p>
                  <p className="text-sm text-muted-foreground">
                    Habilitar animações na interface
                  </p>
                </div>
                <Switch 
                  checked={animations}
                  onCheckedChange={handleAnimationsToggle}
                />
              </div>
            </MobileOptimizedCard>

            <MobileOptimizedCard>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Som das Notificações</p>
                  <p className="text-sm text-muted-foreground">
                    Reproduzir som ao receber notificações
                  </p>
                </div>
                <Switch 
                  checked={notificationSound}
                  onCheckedChange={handleNotificationSoundToggle}
                />
              </div>
            </MobileOptimizedCard>
          </div>
        </div>
      </MobilePageWrapper>
    );
  }

  return null;
};