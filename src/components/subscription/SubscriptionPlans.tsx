
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SubscriptionPlans = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: userSubscription } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const createPaymentMutation = useMutation({
    mutationFn: async ({ planId, billingType }: { planId: string; billingType: 'monthly' | 'yearly' }) => {
      const { data, error } = await supabase.functions.invoke('create-mercado-pago-payment', {
        body: { planId, billingType }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.preference_url) {
        window.open(data.preference_url, '_blank');
        toast({
          title: 'Redirecionamento',
          description: 'Você será redirecionado para completar o pagamento.',
        });
      }
    },
    onError: (error) => {
      console.error('Erro ao criar pagamento:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar pagamento. Tente novamente.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleSubscribe = async (planId: string, billingType: 'monthly' | 'yearly') => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para assinar um plano.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    createPaymentMutation.mutate({ planId, billingType });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Escolha seu Plano
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Selecione o plano que melhor atende às suas necessidades
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans?.map((plan) => {
          const isCurrentPlan = userSubscription?.plan_id === plan.id;
          const features = Array.isArray(plan.features) ? plan.features : 
                          (plan.features ? JSON.parse(plan.features as string) : []);

          return (
            <Card key={plan.id} className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
              {isCurrentPlan && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Plano Atual
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  {plan.name}
                </CardTitle>
                {plan.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {plan.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-center">
                  {plan.price_monthly && (
                    <div className="mb-4">
                      <div className="text-3xl font-bold">
                        R$ {plan.price_monthly}
                        <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                          /mês
                        </span>
                      </div>
                      {plan.price_yearly && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          ou R$ {plan.price_yearly}/ano (economize{' '}
                          {Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)}%)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {features.length > 0 && (
                  <div className="space-y-2">
                    {features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isCurrentPlan && (
                  <div className="space-y-2">
                    {plan.price_monthly && (
                      <Button
                        onClick={() => handleSubscribe(plan.id, 'monthly')}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        {isProcessing ? 'Processando...' : `Assinar Mensal - R$ ${plan.price_monthly}`}
                      </Button>
                    )}
                    {plan.price_yearly && (
                      <Button
                        onClick={() => handleSubscribe(plan.id, 'yearly')}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full"
                      >
                        {isProcessing ? 'Processando...' : `Assinar Anual - R$ ${plan.price_yearly}`}
                      </Button>
                    )}
                  </div>
                )}

                {isCurrentPlan && (
                  <Button disabled className="w-full">
                    Plano Ativo
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
