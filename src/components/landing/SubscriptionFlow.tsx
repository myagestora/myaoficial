
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PlanSelectionStep } from './subscription/PlanSelectionStep';
import { AuthStep } from './subscription/AuthStep';
import { CheckoutStep } from './subscription/CheckoutStep';
import { PlanSelectionModal } from './subscription/PlanSelectionModal';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';

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

export const SubscriptionFlow = ({ onClose, selectedPlan: initialSelectedPlan }: SubscriptionFlowProps) => {
  const { user } = useAuth();
  
  console.log('SubscriptionFlow render - user:', !!user, 'initialSelectedPlan:', !!initialSelectedPlan);
  
  const {
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan,
    frequency,
    setFrequency,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    whatsapp,
    setWhatsapp,
    loading,
    isSignUp,
    setIsSignUp,
    handleAuth,
    goToNextStep,
  } = useSubscriptionFlow(user, initialSelectedPlan);

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

  const isMercadoPagoConfigured = Boolean(
    mercadoPagoConfig?.mercado_pago_enabled === 'true' && 
    mercadoPagoConfig?.mercado_pago_access_token
  );

  console.log('Current flow state:', {
    currentStep,
    hasUser: !!user,
    hasSelectedPlan: !!selectedPlan
  });

  // Fluxo: planSelection -> auth (se não logado) -> checkout
  if (currentStep === 'planSelection') {
    return (
      <PlanSelectionStep
        plans={plans}
        selectedPlan={selectedPlan}
        frequency={frequency}
        onPlanSelect={setSelectedPlan}
        onFrequencyChange={setFrequency}
        onNext={() => {
          if (!selectedPlan) {
            toast({
              title: 'Selecione um plano',
              description: 'Por favor, selecione um plano antes de continuar.',
              variant: 'destructive',
            });
            return;
          }
          goToNextStep();
        }}
        onClose={onClose}
      />
    );
  }

  // Etapa de autenticação (obrigatória para usuários não logados)
  if (currentStep === 'auth') {
    if (!selectedPlan) {
      // Se chegou até aqui sem plano, voltar para seleção
      setCurrentStep('planSelection');
      return null;
    }

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

  // Etapa de checkout (usuário logado e plano selecionado)
  if (currentStep === 'checkout') {
    if (!selectedPlan) {
      // Se não tem plano, voltar para seleção
      setCurrentStep('planSelection');
      return null;
    }

    if (!user) {
      // Se não tem usuário, voltar para autenticação
      setCurrentStep('auth');
      return null;
    }

    return (
      <CheckoutStep
        selectedPlan={selectedPlan}
        frequency={frequency}
        isMercadoPagoConfigured={isMercadoPagoConfigured}
        onClose={onClose}
      />
    );
  }

  // Fallback - voltar para seleção de planos
  return (
    <PlanSelectionStep
      plans={plans}
      selectedPlan={selectedPlan}
      frequency={frequency}
      onPlanSelect={setSelectedPlan}
      onFrequencyChange={setFrequency}
      onNext={goToNextStep}
      onClose={onClose}
    />
  );
};
