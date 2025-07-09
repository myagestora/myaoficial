
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CardData } from './CreditCardForm';

interface PaymentMutationData {
  planId: string;
  frequency: 'monthly' | 'yearly';
  paymentMethod: 'pix' | 'credit_card';
  cardData?: CardData;
}

interface UsePaymentMutationProps {
  onPixDataReceived: (pixData: any) => void;
}

export const usePaymentMutation = ({ onPixDataReceived }: UsePaymentMutationProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: PaymentMutationData) => {
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
    onSuccess: async (data) => {
      console.log('Payment created successfully:', data);
      
      if (data.pix_data) {
        onPixDataReceived({
          ...data.pix_data,
          payment_id: data.id
        });
        toast({
          title: '🎉 QR Code PIX gerado!',
          description: 'Seu PIX está pronto! Use o QR Code ou copie o código para finalizar o pagamento.',
        });
      } else if (data.status === 'approved') {
        // Invalidar queries para atualizar status de assinatura
        await queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
        await queryClient.invalidateQueries({ queryKey: ['user-active-subscription'] });
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        await queryClient.invalidateQueries({ queryKey: ['user-access-check'] });
        
        toast({
          title: '🎉 Pagamento aprovado!',
          description: 'Parabéns! Sua assinatura foi ativada com sucesso. Bem-vindo à nossa plataforma!',
        });
        
        // Aguardar um pouco para dar tempo das queries serem invalidadas
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        toast({
          title: '⏳ Pagamento em processamento',
          description: 'Estamos processando seu pagamento. Você será notificado assim que for confirmado.',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      
      let errorMessage = 'Algo deu errado ao processar seu pagamento. Que tal tentar novamente?';
      let errorTitle = '😔 Ops! Tivemos um probleminha';
      
      if (error.message) {
        if (error.message.includes('Dados do cartão incompletos')) {
          errorTitle = '📝 Dados incompletos';
          errorMessage = 'Por favor, preencha todos os campos do seu cartão para continuar.';
        } else if (error.message.includes('Token do Mercado Pago não configurado')) {
          errorTitle = '⚙️ Sistema em manutenção';
          errorMessage = 'Estamos ajustando nosso sistema de pagamentos. Tente novamente em alguns minutinhos!';
        } else if (error.message.includes('Mercado Pago')) {
          errorTitle = '💳 Problema com o cartão';
          errorMessage = 'Verifique os dados do seu cartão e tente novamente. Se persistir, tente outro cartão.';
        } else if (error.message.includes('Número do cartão')) {
          errorTitle = '🔢 Número do cartão inválido';
          errorMessage = 'O número do cartão parece estar incorreto. Pode verificar e tentar novamente?';
        } else if (error.message.includes('CPF')) {
          errorTitle = '📄 CPF inválido';
          errorMessage = 'O CPF informado não é válido. Por favor, verifique e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });
};
