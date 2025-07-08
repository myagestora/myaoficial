
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

type FlowStep = 'planSelection' | 'auth' | 'checkout';

export const useSubscriptionFlow = (
  user: any,
  initialSelectedPlan?: SubscriptionPlan
) => {
  const getInitialStep = (): FlowStep => {
    if (user && initialSelectedPlan) {
      return 'checkout';
    }
    if (user && !initialSelectedPlan) {
      return 'planSelection';
    }
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

  return {
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
  };
};
