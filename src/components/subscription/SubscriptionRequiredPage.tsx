
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { SubscriptionFlow } from '@/components/landing/SubscriptionFlow';

export const SubscriptionRequiredPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Lock className="h-5 w-5" />
              Assinatura Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 dark:text-orange-300">
              Para acessar todas as funcionalidades da plataforma, você precisa de uma assinatura ativa.
              Escolha o plano que melhor atende às suas necessidades.
            </p>
          </CardContent>
        </Card>
        
        {/* Processo de assinatura integrado diretamente na página */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <SubscriptionFlow 
            onClose={() => {
              // Como não é modal, não há necessidade de fechar
              // O usuário será redirecionado após completar a assinatura
            }} 
          />
        </div>
      </div>
    </div>
  );
};
