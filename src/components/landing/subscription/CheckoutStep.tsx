
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { TransparentCheckout } from '@/components/subscription/TransparentCheckout';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface CheckoutStepProps {
  selectedPlan: SubscriptionPlan;
  frequency: 'monthly' | 'yearly';
  isMercadoPagoConfigured: boolean;
  onClose: () => void;
}

export const CheckoutStep = ({
  selectedPlan,
  frequency,
  isMercadoPagoConfigured,
  onClose
}: CheckoutStepProps) => {
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
};
