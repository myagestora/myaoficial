
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidar queries relacionadas à assinatura para atualizar o status
    queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
    queryClient.invalidateQueries({ queryKey: ['user-active-subscription'] });
    
    toast({
      title: 'Assinatura Confirmada!',
      description: 'Sua assinatura foi processada com sucesso. Bem-vindo!',
    });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-600 dark:text-green-400">
            Assinatura Confirmada!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              Parabéns! Sua assinatura foi processada com sucesso.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Agora você tem acesso completo a todas as funcionalidades da plataforma.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Ir para Dashboard
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Gerenciar Assinatura
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Você receberá um email de confirmação em breve com os detalhes da sua assinatura.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
