
import { PaymentData } from './types.ts';

export const createMercadoPagoPayment = async (
  paymentData: PaymentData,
  accessToken: string,
  externalReference: string
) => {
  console.log('Criando pagamento no Mercado Pago...');
  console.log('Payment method:', paymentData.payment_method_id);
  console.log('Amount:', paymentData.transaction_amount);

  const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': externalReference
    },
    body: JSON.stringify(paymentData),
  });

  console.log('Status da resposta do MP:', mpResponse.status);

  if (!mpResponse.ok) {
    const errorText = await mpResponse.text();
    console.error('Erro do Mercado Pago - Status:', mpResponse.status);
    console.error('Erro do Mercado Pago - Response:', errorText);
    
    let errorMessage = `Erro do Mercado Pago (${mpResponse.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      console.error('Erro JSON:', errorJson);
      
      if (errorJson.message) {
        errorMessage += `: ${errorJson.message}`;
      } else if (errorJson.cause && errorJson.cause.length > 0) {
        const causes = errorJson.cause.map((c: any) => c.description || c.code).join(', ');
        errorMessage += `: ${causes}`;
      } else if (errorJson.error) {
        errorMessage += `: ${errorJson.error}`;
      }
    } catch {
      errorMessage += `: ${errorText.substring(0, 200)}`;
    }
    
    throw new Error(errorMessage);
  }

  const mpPayment = await mpResponse.json();
  console.log('Pagamento criado no MP:', {
    id: mpPayment.id,
    status: mpPayment.status,
    payment_method_id: mpPayment.payment_method_id
  });

  return mpPayment;
};
