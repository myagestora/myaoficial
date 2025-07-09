
import { useAuthForm } from './useAuthForm';
import { usePlanSelection } from './usePlanSelection';
import { useFlowNavigation } from './useFlowNavigation';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

export const useSubscriptionFlow = (
  user: any,
  initialSelectedPlan?: SubscriptionPlan
) => {
  const {
    currentStep,
    setCurrentStep,
    goToNextStep,
  } = useFlowNavigation(user);

  const {
    selectedPlan,
    setSelectedPlan,
    frequency,
    setFrequency,
  } = usePlanSelection(initialSelectedPlan);

  const {
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
  } = useAuthForm();

  const handleAuthWithCallback = (e: React.FormEvent) => {
    return handleAuth(e, () => setCurrentStep('checkout'));
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
    handleAuth: handleAuthWithCallback,
    goToNextStep,
  };
};
