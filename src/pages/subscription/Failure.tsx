
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, CreditCard, MessageCircle } from 'lucide-react';

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
            😔 Ops! Algo deu errado
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              Não conseguimos processar seu pagamento neste momento.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              💡 Isso pode acontecer por diversos motivos, mas não se preocupe! 
              Você pode tentar novamente ou entrar em contato conosco.
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

          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center justify-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Precisa de ajuda? Entre em contato conosco!
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-400">
              Estamos aqui para ajudar você a resolver qualquer problema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionFailure;
