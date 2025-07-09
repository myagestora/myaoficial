
import { PaymentData, CardData } from './types.ts';
import { detectCardBrand } from './validation.ts';

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
  
  const basePaymentData: PaymentData = {
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
    basePaymentData.payment_method_id = 'pix';
  } else if (paymentMethod === 'credit_card' && cardData) {
    console.log('Configurando pagamento com cartão de crédito');
    
    const cleanCardNumber = cardData.cardNumber.replace(/\s/g, '');
    const cleanCPF = cardData.cpf.replace(/\D/g, '');
    
    // Detectar bandeira do cartão
    const paymentMethodId = detectCardBrand(cleanCardNumber);
    console.log('Payment method ID detectado:', paymentMethodId);
    
    basePaymentData.payment_method_id = paymentMethodId;
    basePaymentData.installments = 1;
    
    // Dados do pagador com CPF
    basePaymentData.payer.identification = {
      type: 'CPF',
      number: cleanCPF
    };

    // Dados do cartão
    basePaymentData.card = {
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
    };

    console.log('Dados do cartão configurados:', {
      payment_method_id: paymentMethodId,
      card_number_length: cleanCardNumber.length,
      cpf_length: cleanCPF.length,
      expiration_month: basePaymentData.card.expiration_month,
      expiration_year: basePaymentData.card.expiration_year,
      cardholder_name: basePaymentData.card.cardholder.name,
      amount: basePaymentData.transaction_amount
    });
  }

  console.log('=== DADOS DO PAGAMENTO CONSTRUÍDOS ===');
  return basePaymentData;
};
