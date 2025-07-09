
import { PaymentData, CardData } from './types.ts';

export const buildPaymentData = (
  amount: number,
  planName: string,
  frequency: string,
  externalReference: string,
  userEmail: string,
  userName: string,
  paymentMethod: 'pix' | 'credit_card',
  cardData?: CardData
): PaymentData => {
  console.log('=== CONSTRUINDO DADOS DO PAGAMENTO ===');
  console.log('Payment method:', paymentMethod);
  console.log('Amount:', amount);
  
  if (paymentMethod === 'pix') {
    console.log('Configurando pagamento PIX');
    return {
      transaction_amount: Number(amount),
      description: `${planName} - ${frequency === 'monthly' ? 'Mensal' : 'Anual'}`,
      external_reference: externalReference,
      payment_method_id: 'pix',
      payer: {
        email: userEmail || 'user@example.com',
        first_name: userName || 'Usuario',
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
    };
  } 
  
  if (paymentMethod === 'credit_card' && cardData) {
    console.log('Configurando pagamento com cartão de crédito');
    
    const cleanCardNumber = cardData.cardNumber.replace(/\s/g, '');
    const cleanCPF = cardData.cpf.replace(/\D/g, '');
    
    // Para cartão de crédito, não especificamos payment_method_id
    // O Mercado Pago detecta automaticamente baseado no número do cartão
    const paymentData: PaymentData = {
      transaction_amount: Number(amount),
      description: `${planName} - ${frequency === 'monthly' ? 'Mensal' : 'Anual'}`,
      external_reference: externalReference,
      installments: 1,
      payer: {
        email: userEmail || 'user@example.com',
        first_name: userName || 'Usuario',
        identification: {
          type: 'CPF',
          number: cleanCPF
        }
      },
      card: {
        card_number: cleanCardNumber,
        security_code: cardData.securityCode,
        expiration_month: parseInt(cardData.expirationMonth),
        expiration_year: parseInt(cardData.expirationYear),
        cardholder: {
          name: cardData.cardholderName.toUpperCase(),
          identification: {
            type: 'CPF',
            number: cleanCPF
          }
        }
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
    };

    console.log('Dados do cartão configurados:', {
      card_number_length: cleanCardNumber.length,
      cpf_length: cleanCPF.length,
      expiration_month: paymentData.card?.expiration_month,
      expiration_year: paymentData.card?.expiration_year,
      cardholder_name: paymentData.card?.cardholder.name,
      amount: paymentData.transaction_amount
    });

    return paymentData;
  }

  throw new Error('Método de pagamento inválido ou dados do cartão não fornecidos');
};
