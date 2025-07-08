
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { PlanSelectionStep } from './subscription/PlanSelectionStep';
import { AuthStep } from './subscription/AuthStep';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface SubscriptionFlowProps {
  onClose: () => void;
  selectedPlan?: SubscriptionPlan;
}

type FlowStep = 'planSelection' | 'auth' | 'checkout';

export const SubscriptionFlow = ({ onClose, selectedPlan: initialSelectedPlan }: SubscriptionFlowProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<FlowStep>(
    initialSelectedPlan ? 'auth' : 'planSelection'
  );
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    initialSelectedPlan || null
  );
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  
  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (error) throw error;
      return data?.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : 
                  (plan.features ? JSON.parse(plan.features as string) : [])
      }));
    }
  });

  // Verificar configurações do Mercado Pago
  const { data: mercadoPagoConfig } = useQuery({
    queryKey: ['mercado-pago-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['mercado_pago_enabled', 'mercado_pago_access_token']);
      
      if (error) throw error;
      
      const config: Record<string, string> = {};
      data.forEach(item => {
        config[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      return config;
    }
  });

  const isMercadoPagoConfigured = mercadoPagoConfig?.mercado_pago_enabled === 'true' && 
                                  mercadoPagoConfig?.mercado_pago_access_token;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              whatsapp: whatsapp,
            }
          }
        });

        if (error) {
          toast({
            title: 'Erro no cadastro',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Conta criada!',
          description: 'Verifique seu email para confirmar a conta.',
        });
        
        // Avançar para o checkout após o cadastro
        setCurrentStep('checkout');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: 'Erro no login',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Login realizado!',
          description: 'Redirecionando para o checkout...',
        });
        
        // Avançar para o checkout após o login
        setCurrentStep('checkout');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para assinar um plano.',
        variant: 'destructive',
      });
      return;
    }

    if (!isMercadoPagoConfigured) {
      toast({
        title: 'Serviço Temporariamente Indisponível',
        description: 'O sistema de pagamentos está sendo configurado. Tente novamente em alguns minutos.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Tentando criar assinatura...', { planId: plan.id, frequency });
      
      const { data, error } = await supabase.functions.invoke('create-mercado-pago-subscription', {
        body: { 
          planId: plan.id, 
          subscriptionFrequency: frequency 
        }
      });

      if (error) {
        console.error('Erro da edge function:', error);
        throw error;
      }

      console.log('Resposta da edge function:', data);

      if (data.init_point) {
        window.open(data.init_point, '_blank');
        toast({
          title: 'Redirecionamento',
          description: 'Você será redirecionado para completar sua assinatura.',
        });
      } else {
        throw new Error('URL de pagamento não fornecida');
      }
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar assinatura. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Se usuário está logado e tem plano selecionado, mostrar checkout
  if ((user || currentStep === 'checkout') && selectedPlan) {
    const currentPrice = frequency === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;
    const savings = selectedPlan.price_monthly && selectedPlan.price_yearly 
      ? Math.round(((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) / (selectedPlan.price_monthly * 12)) * 100)
      : 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Finalizar Assinatura</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Informações do Plano */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                  {selectedPlan.name}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {selectedPlan.description}
                </p>
              </div>

              {/* Verificação de configuração do Mercado Pago */}
              {!isMercadoPagoConfigured && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-5 w-5" />
                    <h4 className="font-medium">Sistema de Pagamentos em Configuração</h4>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                    Estamos finalizando a configuração do sistema de pagamentos. 
                    Por favor, tente novamente em alguns minutos.
                  </p>
                </div>
              )}

              {/* Resumo */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total a pagar:</span>
                  <span className="text-blue-600">R$ {currentPrice}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {frequency === 'monthly' ? 'Pagamento mensal' : 'Pagamento anual'}
                  {frequency === 'yearly' && savings > 0 && (
                    <span className="text-green-600 ml-2">(Economize {savings}%)</span>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Botões de Ação */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={loading || !isMercadoPagoConfigured}
                className="flex-1 flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {loading ? 'Processando...' : 'Assinar Agora'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se usuário está logado mas não tem plano selecionado, mostrar planos
  if (user && !selectedPlan) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6">
              <SubscriptionPlans />
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Flow steps para usuários não logados
  if (currentStep === 'planSelection') {
    return (
      <PlanSelectionStep
        plans={plans}
        selectedPlan={selectedPlan}
        frequency={frequency}
        onPlanSelect={setSelectedPlan}
        onFrequencyChange={setFrequency}
        onNext={() => setCurrentStep('auth')}
        onClose={onClose}
      />
    );
  }

  if (currentStep === 'auth' && selectedPlan) {
    return (
      <AuthStep
        selectedPlan={selectedPlan}
        frequency={frequency}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        fullName={fullName}
        setFullName={setFullName}
        whatsapp={whatsapp}
        setWhatsapp={setWhatsapp}
        loading={loading}
        isSignUp={isSignUp}
        setIsSignUp={setIsSignUp}
        onSubmit={handleAuth}
        onBack={() => setCurrentStep('planSelection')}
        onClose={onClose}
      />
    );
  }

  return null;
};
