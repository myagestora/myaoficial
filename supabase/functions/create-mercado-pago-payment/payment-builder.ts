
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
    basePaymentData.payment_method_id = 'pix';
  } else if (paymentMethod === 'credit_card' && cardData) {
    const cleanCardNumber = cardData.cardNumber.replace(/\s/g, '');
    const cleanCPF = cardData.cpf.replace(/\D/g, '');
    
    const paymentMethodId = detectCardBrand(cleanCardNumber);
    
    basePaymentData.payment_method_id = paymentMethodId;
    basePaymentData.installments = 1;
    
    // Dados do pagador
    basePaymentData.payer.identification = {
      type: 'CPF',
      number: cleanCPF
    };

    // Para teste, vamos usar o método direto (não recomendado em produção)
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
  }

  return basePaymentData;
};
