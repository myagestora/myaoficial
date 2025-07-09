
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionRequiredPage } from './SubscriptionRequiredPage';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user, loading: authLoading } = useAuth();

  const { data: userAccess, isLoading } = useQuery({
    queryKey: ['user-access-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return { hasActiveSubscription: false, profileExists: false };
      
      // Primeiro verificar se o perfil existe
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Erro ao verificar perfil:', profileError);
        return { hasActiveSubscription: false, profileExists: false };
      }
      
      if (!profile) {
        console.log('Perfil não encontrado para usuário:', user.id);
        return { hasActiveSubscription: false, profileExists: false };
      }
      
      // Verificar se existe assinatura ativa
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (subError) {
        console.error('Erro ao verificar assinatura:', subError);
      }
      
      return {
        hasActiveSubscription: !!subscription,
        profileExists: true
      };
    },
    enabled: !!user?.id
  });

  // Enquanto carrega a autenticação
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não tem usuário logado, não mostra nada (AuthProvider deve redirecionar)
  if (!user) {
    return null;
  }

  // Se o perfil não existe no banco, limpar sessão e mostrar página de assinatura
  if (userAccess && !userAccess.profileExists) {
    console.log('Perfil não existe, limpando sessão');
    supabase.auth.signOut();
    return <SubscriptionRequiredPage />;
  }

  // Se não tem assinatura ativa, mostra a página de assinatura necessária
  if (userAccess && !userAccess.hasActiveSubscription) {
    return <SubscriptionRequiredPage />;
  }

  // Se tem assinatura ativa, permite acesso completo
  return <>{children}</>;
};
