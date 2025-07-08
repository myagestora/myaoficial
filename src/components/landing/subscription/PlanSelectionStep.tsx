
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface PlanSelectionStepProps {
  plans: SubscriptionPlan[] | undefined;
  selectedPlan: SubscriptionPlan | null;
  frequency: 'monthly' | 'yearly';
  onPlanSelect: (plan: SubscriptionPlan) => void;
  onFrequencyChange: (frequency: 'monthly' | 'yearly') => void;
  onNext: () => void;
  onClose: () => void;
}

export const PlanSelectionStep = ({
  plans,
  selectedPlan,
  frequency,
  onPlanSelect,
  onFrequencyChange,
  onNext,
  onClose
}: PlanSelectionStepProps) => {
  const savings = selectedPlan?.price_monthly && selectedPlan?.price_yearly 
    ? Math.round(((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) / (selectedPlan.price_monthly * 12)) * 100)
    : 0;

  const currentPrice = frequency === 'monthly' ? selectedPlan?.price_monthly : selectedPlan?.price_yearly;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Escolha seu Plano</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                Selecione o plano que melhor atende às suas necessidades
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Seleção de Frequência */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">Frequência de pagamento:</Label>
            <RadioGroup 
              value={frequency} 
              onValueChange={(value: 'monthly' | 'yearly') => onFrequencyChange(value)}
              className="flex gap-3"
            >
              <Label htmlFor="freq-monthly" className="flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
                <RadioGroupItem value="monthly" id="freq-monthly" />
                <span>Mensal</span>
              </Label>
              <Label htmlFor="freq-yearly" className="flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
                <RadioGroupItem value="yearly" id="freq-yearly" />
                <div className="flex items-center gap-2">
                  <span>Anual</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    Economize até 20%
                  </Badge>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Lista de Planos */}
          <div className="space-y-3 mb-6">
            {plans?.map((plan) => {
              const planPrice = frequency === 'monthly' ? plan.price_monthly : plan.price_yearly;
              const planSavings = plan.price_monthly && plan.price_yearly 
                ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
                : 0;

              return (
                <div
                  key={plan.id}
                  onClick={() => onPlanSelect(plan)}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {selectedPlan?.id === plan.id && (
                    <div className="absolute top-3 right-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {plan.description}
                      </p>
                    )}
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      R$ {planPrice}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      por {frequency === 'monthly' ? 'mês' : 'ano'}
                    </div>
                    {frequency === 'yearly' && planSavings > 0 && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        Economize {planSavings}%
                      </div>
                    )}
                  </div>

                  {plan.features.length > 0 && (
                    <div className="space-y-1">
                      {plan.features.slice(0, 3).map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{plan.features.length - 3} recursos adicionais
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumo do Plano Selecionado */}
          {selectedPlan && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">Plano selecionado:</span>
                  <span className="ml-2 text-sm">{selectedPlan.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    R$ {currentPrice}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {frequency === 'monthly' ? 'por mês' : 'por ano'}
                  </div>
                  {frequency === 'yearly' && savings > 0 && (
                    <div className="text-xs text-green-600">
                      Economize {savings}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={onNext}
              disabled={!selectedPlan}
              className="flex-1 flex items-center gap-2"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
