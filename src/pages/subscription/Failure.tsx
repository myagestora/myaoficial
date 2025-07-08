
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

const SubscriptionFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl text-red-600 dark:text-red-400">
            Pagamento Não Processado
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              Não foi possível processar seu pagamento neste momento.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Isso pode ter acontecido por diversos motivos. Você pode tentar novamente ou entrar em contato com nosso suporte.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/subscription')}
              className="w-full flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Tentar Novamente
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Se o problema persistir, entre em contato com nosso suporte técnico.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionFailure;
