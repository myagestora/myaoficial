
import React from 'react';
import { CheckCircle } from 'lucide-react';

export const PaymentSuccessScreen = () => {
  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
          Pagamento Confirmado! 🎉
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Sua assinatura foi ativada com sucesso!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Redirecionando para o dashboard...
        </p>
      </div>
    </div>
  );
};
