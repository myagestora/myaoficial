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
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { usePreferences } from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMutation } from '@tanstack/react-query';

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
    updateProfileMutation,
  } = useProfile();

  const { handlePasswordChange, loading: passwordLoading } = usePasswordChange();
  const {
    darkTheme,
    animations,
    notificationSound,
    handleThemeToggle,
    handleAnimationsToggle,
    handleNotificationSoundToggle,
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
        return { accountActive: true };
      }
      return {
        accountActive: profile?.account_status === 'active' || profile?.account_status === null,
      };
    },
    enabled: !!user?.id,
  });

  // Mutação para desativar conta
  const { signOut } = useAuth();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const deactivateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não encontrado');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ account_status: 'deactivated' })
        .eq('id', user.id);
      if (updateError) throw updateError;
      await signOut();
    },
    onSuccess: () => {
      toast({
        title: 'Conta desativada',
        description: 'Sua conta foi desativada e você foi desconectado. Sua assinatura permanece ativa.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível desativar a conta.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsDeactivating(false);
    },
  });
  const handleDeactivateAccount = async () => {
    setIsDeactivating(true);
    await deactivateAccountMutation.mutateAsync();
  };

  // Mutação para ativar conta
  const [isActivating, setIsActivating] = useState(false);
  const activateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não encontrado');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', user.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: 'Conta reativada',
        description: 'Sua conta foi reativada com sucesso!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reativar a conta.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsActivating(false);
    },
  });
  const handleActivateAccount = async () => {
    setIsActivating(true);
    await activateAccountMutation.mutateAsync();
  };

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
      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar perfil', variant: 'destructive' });
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('current_password') as string;
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    try {
      await handlePasswordChange(e);
      toast({ title: 'Sucesso', description: 'Senha alterada com sucesso' });
      e.currentTarget.reset();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao alterar senha', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <MobilePageWrapper>
        <div className="space-y-4 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </MobilePageWrapper>
    );
  }

  // Header padrão mobile
  const renderHeader = (title: string, subtitle?: string, icon?: React.ReactNode) => (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
        {icon || <Settings className="w-5 h-5 text-blue-700" />}
      </div>
      <div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
      </div>
      {currentSection !== 'main' && (
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setCurrentSection('main')}>
          <ArrowLeft size={20} />
        </Button>
      )}
    </div>
  );

  // Seção Principal
  if (currentSection === 'main') {
    return (
      <MobilePageWrapper>
        {renderHeader('Configurações', 'Gerencie seu perfil, segurança e preferências', <Settings className="w-5 h-5 text-blue-700" />)}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-white">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-sm bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-foreground">{profile?.full_name || 'Usuário'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Badge variant={accountStatus?.accountActive ? 'default' : 'destructive'}>
              {accountStatus?.accountActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <div className="divide-y rounded-lg border bg-white overflow-hidden">
            <button className="flex items-center w-full px-4 py-3 gap-3" onClick={() => setCurrentSection('profile')}>
              <User size={20} className="text-primary" />
              <span className="flex-1 text-left">Perfil</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
            <button className="flex items-center w-full px-4 py-3 gap-3" onClick={() => setCurrentSection('security')}>
              <Shield size={20} className="text-orange-500" />
              <span className="flex-1 text-left">Segurança</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
            <button className="flex items-center w-full px-4 py-3 gap-3" onClick={() => setCurrentSection('preferences')}>
              <Palette size={20} className="text-purple-500" />
              <span className="flex-1 text-left">Preferências</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          </div>
          {/* Seção Desativar/Ativar Conta */}
          <div className="bg-white border border-destructive/20 rounded-lg p-4 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">{accountStatus?.accountActive ? 'Desativar Conta' : 'Conta Inativa'}</span>
            </div>
            {accountStatus?.accountActive ? (
              <>
                <p className="text-xs text-gray-600 mb-3">Ao desativar sua conta, você será desconectado e perderá acesso ao sistema até reativá-la. Sua assinatura permanece ativa.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeactivating} className="w-full">
                      {isDeactivating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Desativando...</>) : 'Desativar Conta'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="mx-2 w-full max-w-sm p-4 rounded-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Confirmar Desativação da Conta
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <div>Tem certeza de que deseja desativar sua conta?</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Desconectar você imediatamente</li>
                          <li>Bloquear seu acesso ao sistema</li>
                          <li>Manter sua assinatura ativa (não será cancelada)</li>
                          <li>Permitir reativação posterior caso queira voltar</li>
                        </ul>
                        <div className="text-blue-600 font-medium">Você pode reativar sua conta a qualquer momento fazendo login novamente.</div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeactivateAccount}
                        disabled={isDeactivating}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeactivating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Desativando...</>) : 'Sim, Desativar Conta'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-3">Sua conta está inativa. Para voltar a usar o sistema, ative sua conta novamente.</p>
                <Button 
                  variant="default" 
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={isActivating}
                  onClick={handleActivateAccount}
                >
                  {isActivating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ativando...</>) : 'Ativar Conta'}
                </Button>
              </>
            )}
          </div>
        </div>
      </MobilePageWrapper>
    );
  }

  // Seção de Perfil
  if (currentSection === 'profile') {
    return (
      <MobilePageWrapper>
        {renderHeader('Perfil', 'Informações pessoais e contato', <User className="w-5 h-5 text-blue-700" />)}
        <form onSubmit={handleUpdateProfile} className="space-y-4 bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-4 mb-2">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-lg">
                {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{profile?.full_name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <Badge variant={accountStatus?.accountActive ? 'default' : 'destructive'} className="text-xs">
                {accountStatus?.accountActive ? 'Conta Ativa' : 'Conta Inativa'}
              </Badge>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name || ''}
                placeholder="Digite seu nome completo"
                className="text-base"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted text-base"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <PhoneInput
                id="whatsapp"
                value={whatsappValue}
                onChange={(value) => setWhatsappValue(value || '')}
                className="w-full"
              />
              <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md mt-1">
                <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Importante:</strong> Este número será autorizado a enviar mensagens para a Mya, nossa assistente de IA.
                </p>
              </div>
            </div>
          </div>
          <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full h-12 text-base">
            {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </MobilePageWrapper>
    );
  }

  // Seção de Segurança
  if (currentSection === 'security') {
    return (
      <MobilePageWrapper>
        {renderHeader('Segurança', 'Senha e configurações de segurança', <Shield className="w-5 h-5 text-blue-700" />)}
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 bg-white p-4 rounded-lg border">
          <div className="space-y-2">
            <h3 className="font-medium">Alterar Senha</h3>
            <p className="text-sm text-muted-foreground">Altere sua senha para manter sua conta segura</p>
          </div>
          <div className="grid gap-3">
            <div className="space-y-1">
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
            <div className="space-y-1">
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
            <div className="space-y-1">
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
          </div>
          <Button type="submit" disabled={passwordLoading} className="w-full h-12 text-base">
            {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>
      </MobilePageWrapper>
    );
  }

  // Seção de Preferências
  if (currentSection === 'preferences') {
    return (
      <MobilePageWrapper>
        {renderHeader('Preferências', 'Tema, animações e notificações', <Palette className="w-5 h-5 text-blue-700" />)}
        <div className="space-y-3 bg-white p-4 rounded-lg border">
          {/* Removido Tema Escuro */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Animações</p>
              <p className="text-xs text-muted-foreground">Habilitar animações na interface</p>
            </div>
            <Switch checked={animations} onCheckedChange={handleAnimationsToggle} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Som das Notificações</p>
              <p className="text-xs text-muted-foreground">Reproduzir som ao receber notificações</p>
            </div>
            <Switch checked={notificationSound} onCheckedChange={handleNotificationSoundToggle} />
          </div>
        </div>
      </MobilePageWrapper>
    );
  }

  return null;
};