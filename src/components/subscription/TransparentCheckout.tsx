
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, QrCode, Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  // Credit card form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cpf, setCpf] = useState('');

  const currentPrice = frequency === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;
  const savings = selectedPlan.price_monthly && selectedPlan.price_yearly 
    ? Math.round(((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) / (selectedPlan.price_monthly * 12)) * 100)
    : 0;

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '');
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.length <= 19) {
      setCardNumber(formatted);
    }
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    if (formatted.length <= 14) {
      setCpf(formatted);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qr_code) {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast({
        title: "Código PIX copiado!",
        description: "Cole o código no seu app de pagamentos.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePixPayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-mercado-pago-payment', {
        body: {
          planId: selectedPlan.id,
          frequency,
          paymentMethod: 'pix'
        }
      });

      if (error) throw error;

      if (data.pix_data) {
        setPixData(data.pix_data);
        toast({
          title: "PIX gerado com sucesso!",
          description: "Escaneie o QR Code ou copie o código para pagamento.",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar pagamento PIX. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreditCardPayment = async () => {
    if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode || !cpf) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do cartão.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-mercado-pago-payment', {
        body: {
          planId: selectedPlan.id,
          frequency,
          paymentMethod: 'credit_card',
          cardData: {
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardholderName,
            expirationMonth: parseInt(expirationMonth),
            expirationYear: parseInt(expirationYear),
            securityCode,
            cpf: cpf.replace(/\D/g, '')
          }
        }
      });

      if (error) throw error;

      if (data.status === 'approved') {
        toast({
          title: "Pagamento aprovado!",
          description: "Sua assinatura foi ativada com sucesso.",
        });
        onClose();
      } else if (data.status === 'pending') {
        toast({
          title: "Pagamento em análise",
          description: "Sua assinatura será ativada após aprovação.",
        });
        onClose();
      } else {
        throw new Error(data.status_detail || 'Pagamento não aprovado');
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      toast({
        title: "Erro no pagamento",
        description: "Verifique os dados do cartão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo do Plano */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedPlan.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {frequency === 'monthly' ? 'Mensal' : 'Anual'}
                </Badge>
                {frequency === 'yearly' && savings > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    {savings}% OFF
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                R$ {currentPrice}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {frequency === 'monthly' ? 'por mês' : 'por ano'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seleção do Método de Pagamento */}
      <div>
        <Label className="text-base font-medium mb-3 block">Escolha a forma de pagamento:</Label>
        <RadioGroup value={paymentMethod} onValueChange={(value: 'pix' | 'credit_card') => setPaymentMethod(value)}>
          <div className="space-y-3">
            <Label htmlFor="pix" className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <RadioGroupItem value="pix" id="pix" />
              <QrCode className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">PIX</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pagamento instantâneo</div>
              </div>
            </Label>
            
            <Label htmlFor="credit_card" className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <RadioGroupItem value="credit_card" id="credit_card" />
              <CreditCard className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">Cartão de Crédito</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pagamento com cartão</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Formulário PIX */}
      {paymentMethod === 'pix' && !pixData && (
        <div className="space-y-4">
          <Button 
            onClick={handlePixPayment}
            disabled={loading}
            className="w-full flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            {loading ? 'Gerando PIX...' : 'Gerar PIX'}
          </Button>
        </div>
      )}

      {/* Dados do PIX */}
      {paymentMethod === 'pix' && pixData && (
        <Card>
          <CardContent className="p-4 text-center space-y-4">
            <h3 className="font-semibold">PIX gerado com sucesso!</h3>
            <div className="bg-white p-4 rounded-lg border">
              <img src={pixData.qr_code_base64} alt="QR Code PIX" className="mx-auto max-w-48" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Ou copie o código PIX:</Label>
              <div className="flex gap-2">
                <Input 
                  value={pixData.qr_code} 
                  readOnly 
                  className="text-xs"
                />
                <Button
                  onClick={copyPixCode}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Após o pagamento, sua assinatura será ativada automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulário Cartão de Crédito */}
      {paymentMethod === 'credit_card' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="cardNumber">Número do cartão</Label>
              <Input
                id="cardNumber"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
              />
            </div>
            
            <div>
              <Label htmlFor="cardholderName">Nome do titular</Label>
              <Input
                id="cardholderName"
                placeholder="Nome como está no cartão"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="expirationMonth">Mês</Label>
                <Input
                  id="expirationMonth"
                  placeholder="MM"
                  value={expirationMonth}
                  onChange={(e) => setExpirationMonth(e.target.value)}
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="expirationYear">Ano</Label>
                <Input
                  id="expirationYear"
                  placeholder="AAAA"
                  value={expirationYear}
                  onChange={(e) => setExpirationYear(e.target.value)}
                  maxLength={4}
                />
              </div>
              <div>
                <Label htmlFor="securityCode">CVV</Label>
                <Input
                  id="securityCode"
                  placeholder="000"
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="cpf">CPF do titular</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCPFChange}
                maxLength={14}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleCreditCardPayment}
            disabled={loading}
            className="w-full flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? 'Processando...' : `Pagar R$ ${currentPrice}`}
          </Button>
        </div>
      )}
    </div>
  );
};
