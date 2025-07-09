
import { useState } from 'react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

export const usePlanSelection = (initialSelectedPlan?: SubscriptionPlan) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    initialSelectedPlan || null
  );
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');

  return {
    selectedPlan,
    setSelectedPlan,
    frequency,
    setFrequency,
  };
};
