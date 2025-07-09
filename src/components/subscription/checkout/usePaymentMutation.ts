
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
          title: 'PIX gerado com sucesso!',
          description: 'Use o QR Code para finalizar o pagamento. Aguardando confirmação...',
        });
      } else if (data.status === 'approved') {
        // Invalidar queries para atualizar status de assinatura
        await queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
        await queryClient.invalidateQueries({ queryKey: ['user-active-subscription'] });
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        await queryClient.invalidateQueries({ queryKey: ['user-access-check'] });
        
        toast({
          title: 'Pagamento aprovado!',
          description: 'Sua assinatura foi ativada com sucesso.',
        });
        
        // Aguardar um pouco para dar tempo das queries serem invalidadas
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        toast({
          title: 'Pagamento processado',
          description: `Status: ${data.status_detail || data.status}`,
        });
      }
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      
      let errorMessage = 'Erro ao processar pagamento. Tente novamente.';
      
      if (error.message) {
        if (error.message.includes('Dados do cartão incompletos')) {
          errorMessage = 'Por favor, preencha todos os dados do cartão.';
        } else if (error.message.includes('Token do Mercado Pago não configurado')) {
          errorMessage = 'Sistema de pagamentos em configuração. Tente novamente em alguns minutos.';
        } else if (error.message.includes('Mercado Pago')) {
          errorMessage = 'Erro no processamento do pagamento. Verifique os dados do cartão e tente novamente.';
        } else if (error.message.includes('Número do cartão')) {
          errorMessage = 'Número do cartão inválido. Verifique e tente novamente.';
        } else if (error.message.includes('CPF')) {
          errorMessage = 'CPF inválido. Verifique e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Erro no pagamento',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });
};
