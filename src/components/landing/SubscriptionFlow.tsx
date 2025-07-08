import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
            setCurrentStep('checkout');
          } else {
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
      <CheckoutStep
        selectedPlan={selectedPlan}
        frequency={frequency}
        isMercadoPagoConfigured={isMercadoPagoConfigured}
        onClose={onClose}
      />
    );
  }

  // Se usuário está logado mas não tem plano selecionado, mostrar planos
  if (user && !selectedPlan) {
    return <PlanSelectionModal onClose={onClose} />;
  }

  return null;
};
