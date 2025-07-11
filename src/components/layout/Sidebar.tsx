import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, PieChart, Target, Calendar, FolderOpen, Settings, Crown, AlertTriangle, UserCheck, UserX, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppContactSection } from '@/components/ui/WhatsAppContactSection';

interface SidebarProps {
  className?: string;
}

const navigationItems = [{
  name: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard
}, {
  name: 'Transações',
  href: '/transactions',
  icon: CreditCard
}, {
  name: 'Relatórios',
  href: '/reports',
  icon: PieChart
}, {
  name: 'Metas',
  href: '/goals',
  icon: Target
}, {
  name: 'Agendadas',
  href: '/scheduled',
  icon: Calendar
}, {
  name: 'Categorias',
  href: '/categories',
  icon: FolderOpen
}];

export const Sidebar = ({
  className
}: SidebarProps) => {
  const { user } = useAuth();
  const { subscription, hasActiveSubscription } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar logo do sistema
  const {
    data: logoUrl
  } = useQuery({
    queryKey: ['system-config-logo'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_config').select('value').eq('key', 'app_logo').maybeSingle();
        if (error) {
          console.error('Error fetching logo:', error);
          return null;
        }
        const logoValue = data?.value;
        if (typeof logoValue === 'string') {
          return logoValue.replace(/^"|"$/g, '');
        }
        return logoValue ? JSON.stringify(logoValue).replace(/^"|"$/g, '') : null;
      } catch (error) {
        console.error('Error in logo query:', error);
        return null;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Buscar cor primária do sistema
  const {
    data: primaryColor
  } = useQuery({
    queryKey: ['system-config-primary-color'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_config').select('value').eq('key', 'primary_color').maybeSingle();
        if (error) {
          console.error('Error fetching primary color:', error);
          return '#222222'; // cor padrão
        }
        const colorValue = data?.value;
        if (typeof colorValue === 'string') {
          return colorValue.replace(/^"|"$/g, '');
        }
        return colorValue ? JSON.stringify(colorValue).replace(/^"|"$/g, '') : '#222222';
      } catch (error) {
        console.error('Error in primary color query:', error);
        return '#222222';
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Buscar frase motivacional aleatória
  const {
    data: motivationalPhrase
  } = useQuery({
    queryKey: ['motivational-phrase'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('motivational_phrases').select('phrase').eq('is_active', true);
        if (error) {
          console.error('Error fetching motivational phrases:', error);
          return 'Continue focado em seus objetivos!';
        }
        if (data && data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          return data[randomIndex].phrase;
        }
        return 'Continue focado em seus objetivos!';
      } catch (error) {
        console.error('Error in motivational phrase query:', error);
        return 'Continue focado em seus objetivos!';
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

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

  // Função helper para garantir que o perfil existe
  const ensureProfileExists = async () => {
    if (!user?.id) return null;

    console.log('Verificando se perfil existe para usuário:', user.id);
    
    // Primeiro tenta buscar o perfil existente
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erro ao buscar perfil:', fetchError);
      throw fetchError;
    }

    // Se perfil existe, retorna ele
    if (existingProfile) {
      console.log('Perfil encontrado:', existingProfile);
      return existingProfile;
    }

    // Se não existe, cria o perfil
    console.log('Perfil não encontrado, criando novo perfil...');
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      whatsapp: user.user_metadata?.whatsapp || user.user_metadata?.phone || '',
      account_status: 'active',
      subscription_status: 'inactive'
    };

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar perfil:', createError);
      throw createError;
    }

    console.log('Perfil criado com sucesso:', newProfile);
    return newProfile;
  };

  // Mutação para alterar status da conta
  const toggleAccountStatusMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'deactivated') => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      console.log('Alterando status da conta para:', newStatus);
      
      // Garantir que o perfil existe antes de tentar atualizar
      await ensureProfileExists();
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro ao alterar status da conta:', error);
        throw error;
      }

      console.log('Status da conta alterado com sucesso:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['account-status'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      const isActive = data?.account_status === 'active';
      toast({
        title: isActive ? "Conta ativada" : "Conta desativada",
        description: isActive ? "Sua conta foi ativada com sucesso!" : "Sua conta foi desativada com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Erro na alteração do status:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o status da conta.",
        variant: "destructive",
      });
    }
  });

  const handleToggleAccountStatus = () => {
    const currentStatus = accountStatus?.accountActive;
    const newStatus = currentStatus ? 'deactivated' : 'active';
    toggleAccountStatusMutation.mutate(newStatus);
  };

  // Verificar se a assinatura está próxima do vencimento (7 dias)
  const isNearExpiration = () => {
    if (!subscription?.current_period_end) return false;
    const expirationDate = new Date(subscription.current_period_end);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  // Formatar data de expiração
  const formatExpirationDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleRenewSubscription = () => {
    // Aqui você pode implementar a lógica para renovar a assinatura
    // Por exemplo, redirecionar para a página de checkout ou abrir um modal
    window.open('/subscription', '_blank');
  };
  
  return (
    <div className={cn("h-full w-full flex flex-col bg-white dark:bg-gray-900", className)}>
      <div className="flex-1 py-4">
        {/* Header com logo - fundo branco */}
        <div className="px-4 py-6">
          <div className="flex flex-col items-center space-y-3">
            {logoUrl && 
              <NavLink to="/dashboard" className="cursor-pointer">
                <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" onError={e => {
                  console.error('Erro ao carregar logo:', logoUrl);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }} />
              </NavLink>
            }
          </div>
        </div>

        {/* Frase motivacional */}
        {motivationalPhrase && (
          <div className="px-4 py-3 mx-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center italic">
              "{motivationalPhrase}"
            </p>
          </div>
        )}

        {/* Menu de navegação */}
        <div className="px-3 py-2 flex-1">
          <div className="space-y-1">
            {navigationItems.map(item => (
              <NavLink 
                key={item.name} 
                to={item.href} 
                className={({isActive}) => cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", 
                  isActive 
                    ? "text-white font-semibold" 
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )} 
                style={({isActive}) => ({
                  backgroundColor: isActive ? primaryColor || '#222222' : undefined
                })}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
            
            <NavLink 
              to="/settings" 
              className={({isActive}) => cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", 
                isActive 
                  ? "text-white font-semibold" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )} 
              style={({isActive}) => ({
                backgroundColor: isActive ? primaryColor || '#222222' : undefined
              })}
            >
              <Settings className="h-5 w-5" />
              Configurações
            </NavLink>
          </div>
        </div>

        {/* WhatsApp Contact Highlight */}
        <WhatsAppContactSection />
      </div>

      {/* Informações da Assinatura e Status da Conta no Rodapé */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        {/* Status da Conta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {accountStatus?.accountActive ? (
                <UserCheck className="h-4 w-4 text-green-500" />
              ) : (
                <UserX className="h-4 w-4 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {accountStatus?.accountActive ? 'Conta Ativa' : 'Conta Desativada'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Status da conta
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleAccountStatus}
              disabled={toggleAccountStatusMutation.isPending}
              className="flex items-center"
            >
              {accountStatus?.accountActive ? (
                <ToggleRight className="h-5 w-5 text-green-500 hover:text-green-600 transition-colors" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-gray-400 hover:text-gray-500 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Informações da Assinatura */}
        {hasActiveSubscription && subscription ? (
          <div className="space-y-3">
            {/* Plano Ativo */}
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {subscription.subscription_plans?.name || 'Plano Premium'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Plano ativo
                </p>
              </div>
            </div>

            {/* Data de Expiração */}
            {subscription.current_period_end && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Expira em
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatExpirationDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>

                {/* Botão de Renovar se próximo do vencimento */}
                {isNearExpiration() && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Sua assinatura expira em breve
                      </p>
                    </div>
                    <Button 
                      onClick={handleRenewSubscription}
                      size="sm" 
                      className="w-full text-sm"
                      style={{ backgroundColor: primaryColor || '#222222' }}
                    >
                      Renovar Agora
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Plano Gratuito
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Faça upgrade para mais recursos
                </p>
              </div>
            </div>
            <Button 
              onClick={() => window.open('/subscription', '_blank')}
              size="sm" 
              variant="outline"
              className="w-full text-sm"
            >
              Fazer Upgrade
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
