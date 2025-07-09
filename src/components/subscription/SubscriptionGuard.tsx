
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionPlans } from './SubscriptionPlans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user, loading: authLoading } = useAuth();

  const { data: userAccess, isLoading } = useQuery({
    queryKey: ['user-access-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return { hasActiveSubscription: false };
      
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
        hasActiveSubscription: !!subscription
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

  // Se não tem assinatura ativa, mostra os planos
  if (userAccess && !userAccess.hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Lock className="h-5 w-5" />
                Assinatura Necessária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 dark:text-orange-300">
                Para acessar todas as funcionalidades da plataforma, você precisa de uma assinatura ativa.
                Escolha o plano que melhor atende às suas necessidades.
              </p>
            </CardContent>
          </Card>
          
          <SubscriptionPlans />
        </div>
      </div>
    );
  }

  // Se tem assinatura ativa, permite acesso independente do status da conta
  // O status da conta será mostrado dentro das configurações
  return <>{children}</>;
};
