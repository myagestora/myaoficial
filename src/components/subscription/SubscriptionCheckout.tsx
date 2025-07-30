
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { invokeEdgeFunction } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, CreditCard, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCartTracking } from '@/hooks/useCartTracking';

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
  const { trackSession, completeSession } = useCartTracking();
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  // Gerar sessionId único quando o componente montar
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, []);

  // Rastrear sessão quando dados mudarem
  useEffect(() => {
    if (sessionId && user) {
      const currentPrice = frequency === 'monthly' ? plan.price_monthly : plan.price_yearly;
      
      trackSession({
        sessionId,
        planId: plan.id,
        frequency,
        amount: currentPrice || 0,
        userEmail: user.email,
        userWhatsapp: user.user_metadata?.whatsapp,
        userName: user.user_metadata?.full_name
      });
    }
  }, [sessionId, user, frequency, plan.id, plan.price_monthly, plan.price_yearly, trackSession]);

  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planId, subscriptionFrequency }: { planId: string; subscriptionFrequency: 'monthly' | 'yearly' }) => {
      const { data, error } = await invokeEdgeFunction('create-mercado-pago-subscription', {
        body: { planId, subscriptionFrequency }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Marcar sessão como completada
      if (sessionId) {
        completeSession(sessionId);
      }

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
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Mensal</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          R$ {plan.price_monthly}/mês
                        </p>
                      </div>
                      <Badge variant="outline">Padrão</Badge>
                    </div>
                  </Label>
                </div>
              )}

              {plan.price_yearly && (
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Anual</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          R$ {plan.price_yearly}/ano
                        </p>
                        {savings > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Economia de {savings}%
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">Recomendado</Badge>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Resumo do Plano */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Resumo do Plano</h3>
            <div className="space-y-3">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preço Total */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>R$ {currentPrice}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {frequency === 'monthly' ? 'Cobrança mensal' : 'Cobrança anual'}
            </p>
          </div>

          {/* Botões */}
          <div className="flex space-x-4 pt-6">
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
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Assinar Plano
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
