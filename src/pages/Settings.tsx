import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneInput } from '@/components/ui/phone-input';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Palette, Info } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [whatsappValue, setWhatsappValue] = useState('');

  // Estados para as preferências
  const [darkTheme, setDarkTheme] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);

  // Buscar dados do perfil
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Buscando perfil para usuário:', user.id);
      
      // Primeiro, tentar buscar o perfil existente
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, whatsapp, subscription_status')
        .eq('id', user.id)
        .maybeSingle();
      
      // Se encontrou o perfil, retornar
      if (existingProfile) {
        console.log('Perfil encontrado:', existingProfile);
        return existingProfile;
      }
      
      // Se não encontrou e não há erro, ou se o erro é "não encontrado"
      if (!selectError || selectError.code === 'PGRST116') {
        console.log('Perfil não encontrado, usando dados do usuário autenticado');
        
        // Retornar dados baseados no usuário autenticado
        const profileFromAuth = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || null,
          whatsapp: user.user_metadata?.whatsapp || user.user_metadata?.phone || '',
          subscription_status: 'inactive'
        };
        
        console.log('Usando dados do auth:', profileFromAuth);
        return profileFromAuth;
      }
      
      // Se houve outro tipo de erro
      console.error('Erro ao buscar perfil:', selectError);
      throw selectError;
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30000,
  });

  // Effect para carregar preferências do usuário
  React.useEffect(() => {
    // Carregar preferências salvas no localStorage
    const savedDarkTheme = localStorage.getItem('darkTheme') === 'true';
    const savedAnimations = localStorage.getItem('animations') !== 'false'; // padrão true
    const savedNotificationSound = localStorage.getItem('notificationSound') !== 'false'; // padrão true
    
    setDarkTheme(savedDarkTheme);
    setAnimations(savedAnimations);
    setNotificationSound(savedNotificationSound);
  }, []);

  // Atualizar o valor do WhatsApp quando o perfil carregar
  React.useEffect(() => {
    if (profile?.whatsapp) {
      console.log('Definindo WhatsApp do perfil:', profile.whatsapp);
      setWhatsappValue(profile.whatsapp);
    }
  }, [profile]);

  // Mutação para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!user?.id) throw new Error('User not found');
      
      console.log('Atualizando perfil com dados:', updates);
      
      // Primeiro, tentar fazer UPDATE
      const { data: updatedData, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .maybeSingle();
      
      // Se UPDATE falhou porque não existe registro, fazer INSERT
      if (updateError && updateError.code === 'PGRST116') {
        console.log('Registro não existe, criando novo perfil...');
        
        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            ...updates
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Erro ao criar perfil:', insertError);
          throw insertError;
        }
        
        return insertedData;
      }
      
      if (updateError) {
        console.error('Erro ao atualizar perfil:', updateError);
        throw updateError;
      }
      
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro na mutação:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const updates = {
      full_name: formData.get('full_name') as string,
      whatsapp: whatsappValue,
    };
    
    await updateProfileMutation.mutateAsync(updates);
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('current_password') as string;
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    
    if (!currentPassword) {
      toast({
        title: "Erro",
        description: "Digite sua senha atual.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      // Primeiro, verificar se a senha atual está correta
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Se a senha atual estiver correta, atualizar para a nova senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível alterar a senha.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha alterada",
          description: "Sua senha foi alterada com sucesso!",
        });
        (e.target as HTMLFormElement).reset();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao verificar a senha atual.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleThemeToggle = (checked: boolean) => {
    setDarkTheme(checked);
    localStorage.setItem('darkTheme', checked.toString());
    
    // Aplicar tema escuro no documento
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast({
      title: "Tema atualizado",
      description: `Tema ${checked ? 'escuro' : 'claro'} ativado!`,
    });
  };

  const handleAnimationsToggle = (checked: boolean) => {
    setAnimations(checked);
    localStorage.setItem('animations', checked.toString());
    
    // Aplicar ou remover classe de animações
    if (checked) {
      document.documentElement.style.setProperty('--transition-duration', '0.3s');
    } else {
      document.documentElement.style.setProperty('--transition-duration', '0s');
    }
    
    toast({
      title: "Animações atualizadas",
      description: `Animações ${checked ? 'ativadas' : 'desativadas'}!`,
    });
  };

  const handleNotificationSoundToggle = (checked: boolean) => {
    setNotificationSound(checked);
    localStorage.setItem('notificationSound', checked.toString());
    
    toast({
      title: "Som das notificações",
      description: `Som das notificações ${checked ? 'ativado' : 'desativado'}!`,
    });
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie suas informações pessoais e preferências da conta
          </p>
        </div>

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
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais e de contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{profile?.full_name || 'Usuário'}</h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        defaultValue={profile?.full_name || ''}
                        placeholder="Digite seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-100 dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500">
                        O email não pode ser alterado
                      </p>
                    </div>
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
                        Certifique-se de que é o número correto para receber notificações e interagir com o sistema.
                      </p>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Segurança da Conta</CardTitle>
                <CardDescription>
                  Altere sua senha e gerencie a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Senha Atual</Label>
                    <Input
                      id="current_password"
                      name="current_password"
                      type="password"
                      placeholder="Digite sua senha atual"
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
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
                <CardDescription>
                  Personalize sua experiência no aplicativo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tema Escuro</Label>
                    <p className="text-sm text-gray-500">
                      Ativar tema escuro automaticamente
                    </p>
                  </div>
                  <Switch 
                    checked={darkTheme}
                    onCheckedChange={handleThemeToggle}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animações</Label>
                    <p className="text-sm text-gray-500">
                      Habilitar animações na interface
                    </p>
                  </div>
                  <Switch 
                    checked={animations}
                    onCheckedChange={handleAnimationsToggle}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Som das Notificações</Label>
                    <p className="text-sm text-gray-500">
                      Reproduzir som ao receber notificações
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSound}
                    onCheckedChange={handleNotificationSoundToggle}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
