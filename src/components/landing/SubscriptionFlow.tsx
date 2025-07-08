
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { PlanSelectionStep } from './subscription/PlanSelectionStep';
import { AuthStep } from './subscription/AuthStep';
import { TransparentCheckout } from '@/components/subscription/TransparentCheckout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

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
  
  // Sempre começar com planSelection quando não há usuário logado e não há plano pré-selecionado
  const getInitialStep = (): FlowStep => {
    if (user && initialSelectedPlan) {
      return 'checkout';
    }
    if (user && !initialSelectedPlan) {
      return 'planSelection';
    }
    // Para usuários não logados, sempre começar com seleção de plano
    return 'planSelection';
  };

  const [currentStep, setCurrentStep] = useState<FlowStep>(getInitialStep());
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

  // Flow steps para usuários não logados ou seleção de plano
  if (currentStep === 'planSelection') {
    return (
      <PlanSelectionStep
        plans={plans}
        selectedPlan={selectedPlan}
        frequency={frequency}
        onPlanSelect={setSelectedPlan}
        onFrequencyChange={setFrequency}
        onNext={() => {
          if (user) {
            // Se usuário já está logado, vai direto para checkout
            setCurrentStep('checkout');
          } else {
            // Se não está logado, vai para autenticação
            setCurrentStep('auth');
          }
        }}
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

  // Se usuário está logado e tem plano selecionado, mostrar checkout transparente
  if ((user || currentStep === 'checkout') && selectedPlan) {
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

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full max-h-[calc(90vh-200px)]">
              <div className="p-6">
                {/* Verificação de configuração do Mercado Pago */}
                {!isMercadoPagoConfigured && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6">
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

                {isMercadoPagoConfigured && (
                  <TransparentCheckout
                    selectedPlan={selectedPlan}
                    frequency={frequency}
                    onClose={onClose}
                  />
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Botão de Cancelar */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Cancelar
            </Button>
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

  return null;
};
