
import React from 'react';
import { CheckCircle } from 'lucide-react';

export const PaymentSuccessScreen = () => {
  return (
    <div className="space-y-6 text-center p-6">
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-2xl font-semibold text-green-600 dark:text-green-400">
          Pagamento Confirmado! 🎉
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-base">
          <strong>Sua assinatura foi ativada com sucesso!</strong>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          🚀 Agora você tem acesso completo a todas as funcionalidades. Redirecionando para o dashboard...
        </p>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          📧 Você receberá um email de confirmação em breve com todos os detalhes da sua assinatura.
        </p>
      </div>
    </div>
  );
};
