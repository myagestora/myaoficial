
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, CreditCard, QrCode, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardholderName: '',
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    cpf: ''
  });
  const [pixData, setPixData] = useState<{ qr_code?: string; qr_code_base64?: string } | null>(null);

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
        setPixData(data.pix_data);
        toast({
          title: 'PIX gerado com sucesso!',
          description: 'Use o QR Code para finalizar o pagamento.',
        });
      } else if (data.status === 'approved') {
        toast({
          title: 'Pagamento aprovado!',
          description: 'Sua assinatura foi ativada com sucesso.',
        });
        onClose();
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
  const savings = selectedPlan.price_monthly && selectedPlan.price_yearly 
    ? Math.round(((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) / (selectedPlan.price_monthly * 12)) * 100)
    : 0;

  // If PIX QR code is available, show it
  if (pixData && pixData.qr_code) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-6 w-6" />
              Pagamento PIX
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Escaneie o QR Code abaixo para finalizar o pagamento
            </p>
            
            {pixData.qr_code_base64 && (
              <div className="flex justify-center">
                <img 
                  src={`data:image/png;base64,${pixData.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="max-w-xs"
                />
              </div>
            )}
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Código PIX:</p>
              <code className="text-xs break-all bg-white dark:bg-gray-900 p-2 rounded border">
                {pixData.qr_code}
              </code>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Valor: <span className="font-bold">R$ {currentPrice}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                O pagamento será processado automaticamente após a confirmação.
              </p>
            </div>

            <Button onClick={onClose} variant="outline" className="w-full">
              Fechar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{selectedPlan.name}</CardTitle>
          {selectedPlan.description && (
            <p className="text-gray-600 dark:text-gray-400">{selectedPlan.description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Escolha a forma de pagamento:</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: 'pix' | 'credit_card') => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
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

              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="cardNumber">Número do Cartão</Label>
                  <Input
                    id="cardNumber"
                    placeholder="0000 0000 0000 0000"
                    value={cardData.cardNumber}
                    onChange={(e) => setCardData(prev => ({ ...prev, cardNumber: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cardholderName">Nome no Cartão</Label>
                  <Input
                    id="cardholderName"
                    placeholder="Nome como está no cartão"
                    value={cardData.cardholderName}
                    onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expirationMonth">Mês</Label>
                    <Input
                      id="expirationMonth"
                      placeholder="MM"
                      maxLength={2}
                      value={cardData.expirationMonth}
                      onChange={(e) => setCardData(prev => ({ ...prev, expirationMonth: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expirationYear">Ano</Label>
                    <Input
                      id="expirationYear"
                      placeholder="AAAA"
                      maxLength={4}
                      value={cardData.expirationYear}
                      onChange={(e) => setCardData(prev => ({ ...prev, expirationYear: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="securityCode">CVV</Label>
                    <Input
                      id="securityCode"
                      placeholder="000"
                      maxLength={4}
                      value={cardData.securityCode}
                      onChange={(e) => setCardData(prev => ({ ...prev, securityCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cardData.cpf}
                      onChange={(e) => setCardData(prev => ({ ...prev, cpf: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plan Features */}
          {selectedPlan.features && selectedPlan.features.length > 0 && (
            <div className="space-y-3">
              <Label className="text-lg font-semibold">O que está incluído:</Label>
              <div className="space-y-2">
                {selectedPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span>Plano selecionado:</span>
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Frequência:</span>
              <span className="font-medium capitalize">
                {frequency === 'monthly' ? 'Mensal' : 'Anual'}
                {savings > 0 && frequency === 'yearly' && (
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                    {savings}% OFF
                  </Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span>R$ {currentPrice}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={createPaymentMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handlePayment}
              disabled={createPaymentMutation.isPending}
              className="flex-1 flex items-center gap-2"
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
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>Renovação automática • Cancele a qualquer momento</p>
            <p>Pagamento processado pelo Mercado Pago</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
