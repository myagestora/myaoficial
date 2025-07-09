
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
        
        // Após criar conta, ir para checkout
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
        
        // Após login, ir para checkout
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

  const goToNextStep = async () => {
    console.log('goToNextStep called - currentStep:', currentStep, 'user:', !!user);
    
    if (currentStep === 'planSelection') {
      // SEMPRE verificar se o usuário está logado E se existe no banco
      if (!user) {
        console.log('User not logged in, going to auth step');
        setCurrentStep('auth');
        return;
      }

      // Verificar se o usuário realmente existe no banco de dados
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !profile) {
          console.log('User profile not found in database, clearing session and going to auth');
          // Limpar sessão inválida
          await supabase.auth.signOut();
          setCurrentStep('auth');
          toast({
            title: 'Sessão inválida',
            description: 'Por favor, faça login novamente.',
            variant: 'destructive',
          });
          return;
        }

        console.log('User logged in and profile exists, going to checkout');
        setCurrentStep('checkout');
      } catch (error) {
        console.error('Error checking user profile:', error);
        // Em caso de erro, limpar sessão e ir para auth
        await supabase.auth.signOut();
        setCurrentStep('auth');
        toast({
          title: 'Erro de verificação',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
      }
    } else if (currentStep === 'auth') {
      setCurrentStep('checkout');
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
    goToNextStep,
  };
};
