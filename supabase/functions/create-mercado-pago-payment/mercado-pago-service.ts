
import { PaymentData } from './types.ts';

export const createMercadoPagoPayment = async (
  paymentData: PaymentData,
  accessToken: string,
  externalReference: string
) => {
  console.log('=== CRIANDO PAGAMENTO NO MERCADO PAGO ===');
  console.log('Payment type:', paymentData.payment_method_id ? 'PIX' : 'Credit Card');
  console.log('Amount:', paymentData.transaction_amount);
  console.log('External reference:', externalReference);

  // Validar dados obrigatórios
  if (!paymentData.transaction_amount || paymentData.transaction_amount <= 0) {
    throw new Error('Valor do pagamento inválido');
  }

  if (!paymentData.payer?.email) {
    throw new Error('Email do pagador não especificado');
  }

  // Validar token de acesso
  if (!accessToken || accessToken.trim() === '') {
    throw new Error('Token de acesso do Mercado Pago inválido');
  }

  // Log dos dados do pagamento (sem dados sensíveis)
  console.log('Payment data structure:', {
    transaction_amount: paymentData.transaction_amount,
    description: paymentData.description,
    payment_method_id: paymentData.payment_method_id || 'auto-detect',
    has_card_data: !!paymentData.card,
    has_payer_identification: !!paymentData.payer.identification,
    installments: paymentData.installments,
    payer_email: paymentData.payer.email,
    payer_first_name: paymentData.payer.first_name
  });

  console.log('Fazendo chamada para API do Mercado Pago...');

  try {
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
    console.log('Headers da resposta:', Object.fromEntries(mpResponse.headers.entries()));

    const responseText = await mpResponse.text();
    console.log('Response body completo:', responseText);

    if (!mpResponse.ok) {
      console.error('=== ERRO DO MERCADO PAGO ===');
      console.error('Status:', mpResponse.status);
      console.error('Status Text:', mpResponse.statusText);
      console.error('Response:', responseText);
      
      let errorMessage = `Erro do Mercado Pago (${mpResponse.status})`;
      let errorDetails = {};
      
      try {
        const errorJson = JSON.parse(responseText);
        errorDetails = errorJson;
        console.error('Erro JSON detalhado:', JSON.stringify(errorJson, null, 2));
        
        if (errorJson.message) {
          errorMessage += `: ${errorJson.message}`;
        } else if (errorJson.cause && Array.isArray(errorJson.cause) && errorJson.cause.length > 0) {
          const causes = errorJson.cause.map((c: any) => {
            if (c.description) return c.description;
            if (c.code) return `Código: ${c.code}`;
            return JSON.stringify(c);
          }).join(', ');
          errorMessage += `: ${causes}`;
        } else if (errorJson.error) {
          errorMessage += `: ${errorJson.error}`;
        } else if (errorJson.error_description) {
          errorMessage += `: ${errorJson.error_description}`;
        } else {
          errorMessage += `: Verifique os dados do cartão e tente novamente`;
        }
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta JSON:', parseError);
        errorMessage += `: Erro na validação dos dados. Verifique as informações do cartão.`;
      }
      
      const detailedError = new Error(errorMessage);
      (detailedError as any).details = errorDetails;
      (detailedError as any).status = mpResponse.status;
      (detailedError as any).statusText = mpResponse.statusText;
      
      throw detailedError;
    }

    let mpPayment;
    try {
      mpPayment = JSON.parse(responseText);
      console.log('=== PAGAMENTO CRIADO COM SUCESSO ===');
      console.log('Payment ID:', mpPayment.id);
      console.log('Status:', mpPayment.status);
      console.log('Status detail:', mpPayment.status_detail);
      console.log('Payment method ID:', mpPayment.payment_method_id);
      
      if (!mpPayment.id) {
        throw new Error('Resposta do Mercado Pago não contém ID do pagamento');
      }
      
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta de sucesso:', parseError);
      throw new Error(`Erro ao processar resposta do Mercado Pago: ${parseError.message}`);
    }

    return mpPayment;
    
  } catch (networkError) {
    console.error('=== ERRO DE REDE NA CHAMADA DO MERCADO PAGO ===');
    console.error('Network Error:', networkError);
    
    if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
      throw new Error('Erro de conexão com o Mercado Pago. Verifique sua conexão com a internet.');
    }
    
    throw networkError;
  }
};
