
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CreditCard, QrCode, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Import new components
import { PaymentMethodSelector } from './checkout/PaymentMethodSelector';
import { CreditCardForm, CardData } from './checkout/CreditCardForm';
import { PixDisplay } from './checkout/PixDisplay';
import { PaymentSuccessScreen } from './checkout/PaymentSuccessScreen';
import { PlanHeader } from './checkout/PlanHeader';
import { usePaymentMutation } from './checkout/usePaymentMutation';
import { usePaymentValidation } from './checkout/usePaymentValidation';

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

  const { validateCardData } = usePaymentValidation();
  const createPaymentMutation = usePaymentMutation({
    onPixDataReceived: setPixData
  });

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
    refetchInterval: pixData?.payment_id ? 3000 : false,
    refetchIntervalInBackground: true,
  });

  // Redirecionar quando pagamento for aprovado
  useEffect(() => {
    if (paymentStatus?.status === 'completed') {
      // Invalidar todas as queries necessárias
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-access-check'] });
      
      toast({
        title: 'Pagamento Confirmado! 🎉',
        description: 'Sua assinatura foi ativada com sucesso. Redirecionando...',
      });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [paymentStatus, navigate, queryClient]);

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
    if (paymentMethod === 'credit_card' && !validateCardData(cardData)) {
      return;
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
  if (paymentStatus?.status === 'completed') {
    return <PaymentSuccessScreen />;
  }

  // If PIX QR code is available, show it
  if (pixData && pixData.qr_code) {
    const isWaitingPayment = paymentStatus?.status === 'pending' || !paymentStatus;
    
    return (
      <PixDisplay
        pixData={pixData}
        currentPrice={currentPrice!}
        isWaitingPayment={isWaitingPayment}
        onClose={onClose}
      />
    );
  }

  return (
    <div ref={containerRef} className="space-y-6 max-h-full overflow-y-auto">
      
      {/* Plan Header */}
      <PlanHeader
        selectedPlan={selectedPlan}
        frequency={frequency}
        currentPrice={currentPrice!}
      />

      {/* Payment Method Selection */}
      <PaymentMethodSelector
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
      />

      {/* Credit Card Form */}
      {paymentMethod === 'credit_card' && (
        <CreditCardForm
          cardData={cardData}
          onCardDataChange={setCardData}
        />
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
