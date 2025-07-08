
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, CreditCard, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface SubscriptionCheckoutProps {
  plan: SubscriptionPlan;
  onCancel: () => void;
}

export const SubscriptionCheckout = ({ plan, onCancel }: SubscriptionCheckoutProps) => {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planId, subscriptionFrequency }: { planId: string; subscriptionFrequency: 'monthly' | 'yearly' }) => {
      const { data, error } = await supabase.functions.invoke('create-mercado-pago-subscription', {
        body: { planId, subscriptionFrequency }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.init_point) {
        window.open(data.init_point, '_blank');
        toast({
          title: 'Redirecionamento',
          description: 'Você será redirecionado para completar sua assinatura.',
        });
      }
    },
    onError: (error) => {
      console.error('Erro ao criar assinatura:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar assinatura. Tente novamente.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para assinar um plano.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    createSubscriptionMutation.mutate({ planId: plan.id, subscriptionFrequency: frequency });
  };

  const currentPrice = frequency === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const savings = plan.price_monthly && plan.price_yearly 
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          {plan.description && (
            <p className="text-gray-600 dark:text-gray-400">{plan.description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Seleção de Frequência */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Escolha a frequência de pagamento:</Label>
            <RadioGroup value={frequency} onValueChange={(value: 'monthly' | 'yearly') => setFrequency(value)}>
              {plan.price_monthly && (
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Mensal</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Cobrança todo mês
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">R$ {plan.price_monthly}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">por mês</div>
                      </div>
                    </div>
                  </Label>
                </div>
              )}

              {plan.price_yearly && (
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          Anual
                          {savings > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {savings}% OFF
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Cobrança anual (economize {savings}%)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">R$ {plan.price_yearly}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">por ano</div>
                      </div>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Features do Plano */}
          {plan.features && plan.features.length > 0 && (
            <div className="space-y-3">
              <Label className="text-lg font-semibold">O que está incluído:</Label>
              <div className="space-y-2">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo do Pagamento */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span>Plano selecionado:</span>
              <span className="font-medium">{plan.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Frequência:</span>
              <span className="font-medium capitalize">{frequency === 'monthly' ? 'Mensal' : 'Anual'}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span>R$ {currentPrice}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="flex-1 flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {isProcessing ? 'Processando...' : 'Assinar Agora'}
            </Button>
          </div>

          {/* Informações Adicionais */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p className="flex items-center justify-center gap-1">
              <Calendar className="h-4 w-4" />
              Renovação automática • Cancele a qualquer momento
            </p>
            <p>Pagamento processado pelo Mercado Pago</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
