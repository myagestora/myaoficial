
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface PaymentMethodSelectorProps {
  paymentMethod: 'pix' | 'credit_card';
  onPaymentMethodChange: (method: 'pix' | 'credit_card') => void;
}

export const PaymentMethodSelector = ({ paymentMethod, onPaymentMethodChange }: PaymentMethodSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Escolha a forma de pagamento:</Label>
      <RadioGroup value={paymentMethod} onValueChange={onPaymentMethodChange}>
        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <RadioGroupItem value="pix" id="pix" />
          <Label htmlFor="pix" className="flex-1 cursor-pointer">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">PIX</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pagamento instantâneo
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Recomendado
              </Badge>
            </div>
          </Label>
        </div>

        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <RadioGroupItem value="credit_card" id="credit_card" />
          <Label htmlFor="credit_card" className="flex-1 cursor-pointer">
            <div>
              <div className="font-medium">Cartão de Crédito</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Pagamento com cartão
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
