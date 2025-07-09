
import { CardData } from './types.ts';

export const createCardToken = async (cardData: CardData, accessToken: string): Promise<string> => {
  console.log('=== CRIANDO TOKEN DO CARTÃO ===');
  
  const cleanCardNumber = cardData.cardNumber.replace(/\s/g, '');
  const cleanCPF = cardData.cpf.replace(/\D/g, '');
  
  const tokenData = {
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

  console.log('Dados para criação do token:', {
    card_number_length: cleanCardNumber.length,
    expiration_month: tokenData.expiration_month,
    expiration_year: tokenData.expiration_year,
    cardholder_name: tokenData.cardholder.name,
    cpf_length: cleanCPF.length
  });

  try {
    const response = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenData),
    });

    const responseText = await response.text();
    console.log('Resposta do token service:', response.status, responseText);

    if (!response.ok) {
      console.error('Erro ao criar token do cartão:', responseText);
      
      let errorMessage = 'Erro ao processar dados do cartão';
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson.cause && errorJson.cause.length > 0) {
          errorMessage = errorJson.cause.map((c: any) => c.description || c.code).join(', ');
        }
      } catch (e) {
        console.error('Erro ao fazer parse da resposta de erro:', e);
      }
      
      throw new Error(errorMessage);
    }

    const tokenResponse = JSON.parse(responseText);
    console.log('Token criado com sucesso:', tokenResponse.id);
    
    return tokenResponse.id;
  } catch (error) {
    console.error('Erro na criação do token:', error);
    throw new Error(`Erro ao criar token do cartão: ${error.message}`);
  }
};
