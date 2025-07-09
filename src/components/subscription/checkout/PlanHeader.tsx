
import React from 'react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface PlanHeaderProps {
  selectedPlan: SubscriptionPlan;
  frequency: 'monthly' | 'yearly';
  currentPrice: number;
}

export const PlanHeader = ({ selectedPlan, frequency, currentPrice }: PlanHeaderProps) => {
  return (
    <div className="text-center">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {frequency === 'monthly' ? 'Mensal' : 'Anual'}
          </p>
          <h3 className="text-xl font-semibold">{selectedPlan.name}</h3>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">R$ {currentPrice}</div>
        </div>
      </div>
      {selectedPlan.description && (
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-center">{selectedPlan.description}</p>
      )}
    </div>
  );
};
