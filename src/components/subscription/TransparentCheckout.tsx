
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, CreditCard, QrCode, X, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface TransparentCheckoutProps {
  selectedPlan: SubscriptionPlan;
  frequency: 'monthly' | 'yearly';
  onClose: () => void;
}

interface CardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  cpf: string;
}

export const TransparentCheckout = ({ selectedPlan, frequency, onClose }: TransparentCheckoutProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardholderName: '',
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    cpf: ''
  });
  const [pixData, setPixData] = useState<{ qr_code?: string; qr_code_base64?: string; payment_id?: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when credit card is selected
  useEffect(() => {
    if (paymentMethod === 'credit_card' && containerRef.current) {
      const timer = setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          
          if (scrollHeight > clientHeight) {
            container.scrollTo({
              top: scrollHeight - clientHeight,
              behavior: 'smooth'
            });
          }
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [paymentMethod]);

  // Polling para verificar status do pagamento PIX
  const { data: paymentStatus } = useQuery({
    queryKey: ['payment-status', pixData?.payment_id],
    queryFn: async () => {
      if (!pixData?.payment_id || !user) return null;
      
      const { data, error } = await supabase
        .from('payments')
        .select('status, payment_date')
        .eq('mercado_pago_payment_id', pixData.payment_id.toString())
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!pixData?.payment_id && !!user,
    refetchInterval: pixData?.payment_id ? 3000 : false, // Verifica a cada 3 segundos
    refetchIntervalInBackground: true,
  });

  // Redirecionar quando pagamento for aprovado
  useEffect(() => {
    if (paymentStatus?.status === 'approved') {
      // Invalidar queries de assinatura
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-subscription'] });
      
      toast({
        title: 'Pagamento Confirmado! 🎉',
        description: 'Sua assinatura foi ativada com sucesso. Redirecionando...',
      });
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [paymentStatus, navigate, queryClient]);

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      planId: string;
      frequency: 'monthly' | 'yearly';
      paymentMethod: 'pix' | 'credit_card';
      cardData?: CardData;
    }) => {
      console.log('Calling create-mercado-pago-payment function with:', paymentData);
      
      const { data, error } = await supabase.functions.invoke('create-mercado-pago-payment', {
        body: paymentData
      });

      if (error) {
        console.error('Error calling function:', error);
        throw error;
      }
      
      console.log('Function response:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Payment created successfully:', data);
      
      if (data.pix_data) {
        setPixData({
          ...data.pix_data,
          payment_id: data.id
        });
        toast({
          title: 'PIX gerado com sucesso!',
          description: 'Use o QR Code para finalizar o pagamento. Aguardando confirmação...',
        });
      } else if (data.status === 'approved') {
        toast({
          title: 'Pagamento aprovado!',
          description: 'Sua assinatura foi ativada com sucesso.',
        });
        
        // Invalidar queries e redirecionar
        queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
        queryClient.invalidateQueries({ queryKey: ['user-active-subscription'] });
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        toast({
          title: 'Pagamento processado',
          description: `Status: ${data.status_detail || data.status}`,
        });
      }
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      toast({
        title: 'Erro no pagamento',
        description: error.message || 'Erro ao processar pagamento. Tente novamente.',
        variant: 'destructive',
      });
    }
  });

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para fazer um pagamento.',
        variant: 'destructive',
      });
      return;
    }

    // Validate card data if credit card is selected
    if (paymentMethod === 'credit_card') {
      const { cardNumber, cardholderName, expirationMonth, expirationYear, securityCode, cpf } = cardData;
      
      if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode || !cpf) {
        toast({
          title: 'Dados incompletos',
          description: 'Por favor, preencha todos os dados do cartão.',
          variant: 'destructive',
        });
        return;
      }
    }

    createPaymentMutation.mutate({
      planId: selectedPlan.id,
      frequency,
      paymentMethod,
      cardData: paymentMethod === 'credit_card' ? cardData : undefined
    });
  };

  const currentPrice = frequency === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;

  // Se pagamento foi aprovado, mostrar tela de sucesso
  if (paymentStatus?.status === 'approved') {
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
  }

  // If PIX QR code is available, show it
  if (pixData && pixData.qr_code) {
    const isWaitingPayment = paymentStatus?.status === 'pending' || !paymentStatus;
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode className="h-6 w-6" />
            <h3 className="text-lg font-semibold">Pagamento PIX</h3>
            {isWaitingPayment && (
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Clock className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Aguardando...</span>
              </div>
            )}
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isWaitingPayment 
              ? 'Escaneie o QR Code para finalizar o pagamento. Verificando automaticamente...'
              : 'Escaneie o QR Code abaixo para finalizar o pagamento'
            }
          </p>
          
          {pixData.qr_code_base64 && (
            <div className="flex justify-center mb-4">
              <img 
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                className="max-w-xs"
              />
            </div>
          )}
          
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <p className="text-sm font-medium mb-2">Código PIX:</p>
            <code className="text-xs break-all bg-white dark:bg-gray-900 p-2 rounded border block">
              {pixData.qr_code}
            </code>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Valor: <span className="font-bold">R$ {currentPrice}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isWaitingPayment 
                ? 'Assim que o pagamento for confirmado, você será redirecionado automaticamente.'
                : 'O pagamento será processado automaticamente após a confirmação.'
              }
            </p>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6 max-h-full overflow-y-auto">
      {/* Plan Header */}
      <div className="text-center">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {frequency === 'monthly' ? 'Mensal' : 'Anual'}
            </p>
            <h3 className="text-xl font-semibold">{selectedPlan.name}</h3>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">R$ {currentPrice}</div>
          </div>
        </div>
        {selectedPlan.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-center">{selectedPlan.description}</p>
        )}
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Escolha a forma de pagamento:</Label>
        <RadioGroup value={paymentMethod} onValueChange={(value: 'pix' | 'credit_card') => setPaymentMethod(value)}>
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

      {/* Credit Card Form */}
      {paymentMethod === 'credit_card' && (
        <div className="space-y-4 border-t pt-4">
          <Label className="text-sm font-medium">Dados do Cartão:</Label>
          <div className="space-y-4">
            {/* Número e Nome do Cartão - 50/50 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cardNumber" className="text-sm">Número do Cartão</Label>
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={cardData.cardNumber}
                  onChange={(e) => setCardData(prev => ({ ...prev, cardNumber: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cardholderName" className="text-sm">Nome no Cartão</Label>
                <Input
                  id="cardholderName"
                  placeholder="Nome completo"
                  value={cardData.cardholderName}
                  onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expirationMonth" className="text-sm">Mês</Label>
                <Input
                  id="expirationMonth"
                  placeholder="MM"
                  maxLength={2}
                  value={cardData.expirationMonth}
                  onChange={(e) => setCardData(prev => ({ ...prev, expirationMonth: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expirationYear" className="text-sm">Ano</Label>
                <Input
                  id="expirationYear"
                  placeholder="AAAA"
                  maxLength={4}
                  value={cardData.expirationYear}
                  onChange={(e) => setCardData(prev => ({ ...prev, expirationYear: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="securityCode" className="text-sm">CVV</Label>
                <Input
                  id="securityCode"
                  placeholder="000"
                  maxLength={4}
                  value={cardData.securityCode}
                  onChange={(e) => setCardData(prev => ({ ...prev, securityCode: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cpf" className="text-sm">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cardData.cpf}
                  onChange={(e) => setCardData(prev => ({ ...prev, cpf: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={createPaymentMutation.isPending}
          size="sm"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={handlePayment}
          disabled={createPaymentMutation.isPending}
          className="flex-1 flex items-center gap-2"
          size="sm"
        >
          {paymentMethod === 'pix' ? (
            <QrCode className="h-4 w-4" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {createPaymentMutation.isPending ? 'Processando...' : 
           paymentMethod === 'pix' ? 'Gerar PIX' : 'Pagar com Cartão'}
        </Button>
      </div>

      {/* Additional Info */}
      <div className="text-center text-xs text-gray-600 dark:text-gray-400 border-t pt-3">
        <p>Pagamento processado pelo Mercado Pago</p>
      </div>
    </div>
  );
};
