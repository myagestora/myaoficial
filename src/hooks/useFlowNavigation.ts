
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type FlowStep = 'planSelection' | 'auth' | 'checkout';

export const useFlowNavigation = (user: any) => {
  const getInitialStep = (): FlowStep => {
    return 'planSelection';
  };

  const [currentStep, setCurrentStep] = useState<FlowStep>(getInitialStep());

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
    goToNextStep,
  };
};
