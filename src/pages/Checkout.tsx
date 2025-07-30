import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { TransparentCheckout } from '@/components/subscription/TransparentCheckout';

interface CartSession {
  id: string;
  session_id: string;
  plan_id: string;
  frequency: 'monthly' | 'yearly';
  amount: number;
  status: 'active' | 'abandoned' | 'completed';
  user_email: string;
  user_whatsapp: string;
  user_name: string;
  subscription_plans: {
    id: string;
    name: string;
    description?: string;
    price_monthly?: number;
    price_yearly?: number;
    features: string[];
  };
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  
  const sessionId = searchParams.get('session');

  // Buscar dados da sessão do carrinho
  const { data: cartSession, isLoading, error } = useQuery({
    queryKey: ['cart-session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID não fornecido');

      const { data, error } = await supabase
        .from('cart_sessions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            description,
            price_monthly,
            price_yearly,
            features
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data as CartSession;
    },
    enabled: !!sessionId,
    retry: 1,
  });

  // Verificar se usuário está logado
  useEffect(() => {
    if (!isLoading && !error && cartSession) {
      if (!user) {
        // Redirecionar para login com retorno para checkout
        navigate(`/login?redirect=/checkout?session=${sessionId}`);
        return;
      }

      // Verificar se o email da sessão corresponde ao usuário logado
      if (cartSession.user_email !== user.email) {
        toast({
          title: 'Sessão inválida',
          description: 'Esta sessão de checkout não pertence ao seu usuário.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      // Mostrar checkout se tudo estiver ok
      setShowCheckout(true);
    }
  }, [cartSession, user, isLoading, error, sessionId, navigate]);

  // Marcar sessão como completada quando checkout for iniciado
  useEffect(() => {
    if (showCheckout && cartSession) {
      // Atualizar status da sessão para indicar que checkout foi acessado
      supabase
        .from('cart_sessions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', cartSession.id)
        .then(({ error }) => {
          if (error) {
            console.error('Erro ao atualizar sessão:', error);
          }
        });
    }
  }, [showCheckout, cartSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !cartSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Sessão Inválida</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Esta sessão de checkout não foi encontrada ou expirou.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!showCheckout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // Preparar dados do plano para o TransparentCheckout
  const plan = {
    id: cartSession.subscription_plans.id,
    name: cartSession.subscription_plans.name,
    description: cartSession.subscription_plans.description,
    price_monthly: cartSession.subscription_plans.price_monthly,
    price_yearly: cartSession.subscription_plans.price_yearly,
    features: Array.isArray(cartSession.subscription_plans.features) 
      ? cartSession.subscription_plans.features 
      : (cartSession.subscription_plans.features ? JSON.parse(cartSession.subscription_plans.features as string) : [])
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h1 className="text-xl font-semibold">Finalizar Assinatura</h1>
                <p className="text-sm text-gray-600">
                  {plan.name} - {cartSession.frequency === 'monthly' ? 'Mensal' : 'Anual'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              R$ {cartSession.amount.toFixed(2).replace('.', ',')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Checkout Component */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <TransparentCheckout
          selectedPlan={plan}
          frequency={cartSession.frequency}
          onClose={() => navigate('/dashboard')}
        />
      </div>
    </div>
  );
} 