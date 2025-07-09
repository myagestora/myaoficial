import { MercadoPagoPaymentData, CardData } from './types.ts';

export const buildPaymentData = (
  amount: number,
  planName: string,
  frequency: string,
  externalReference: string,
  userEmail: string,
  userName: string,
  paymentMethod: 'pix' | 'credit_card',
  cardData?: CardData
): MercadoPagoPaymentData => {
  console.log('=== CONSTRUINDO DADOS DO PAGAMENTO ===');
  console.log('Payment method:', paymentMethod);
  console.log('Amount:', amount);
  
  const basePaymentData: MercadoPagoPaymentData = {
    transaction_amount: Number(amount),
    description: `${planName} - ${frequency === 'monthly' ? 'Mensal' : 'Anual'}`,
    external_reference: externalReference,
    payer: {
      email: userEmail || 'user@example.com',
      first_name: userName || 'Usuario',
    },
    notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
  };

  if (paymentMethod === 'pix') {
    console.log('Configurando pagamento PIX');
    return {
      ...basePaymentData,
      payment_method_id: 'pix',
    };
  }
  
  if (paymentMethod === 'credit_card' && cardData) {
    console.log('Configurando pagamento com cartão de crédito');
    
    const cleanCPF = cardData.cpf.replace(/\D/g, '');
    
    return {
      ...basePaymentData,
      token: 'card_token_placeholder', // Será substituído pelo token real
      installments: 1,
      payer: {
        ...basePaymentData.payer,
        identification: {
          type: 'CPF',
          number: cleanCPF
        }
      }
    };
  }

  throw new Error('Método de pagamento inválido ou dados do cartão não fornecidos');
};
