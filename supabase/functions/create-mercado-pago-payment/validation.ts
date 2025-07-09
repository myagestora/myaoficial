
import { CardData } from './types.ts';

export const validateCardData = (cardData: CardData): { isValid: boolean; error?: string } => {
  const { cardNumber, cardholderName, expirationMonth, expirationYear, securityCode, cpf } = cardData;
  
  if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode || !cpf) {
    return { isValid: false, error: 'Dados do cartão incompletos' };
  }

  // Validar formato do cartão
  const cleanCardNumber = cardNumber.replace(/\s/g, '');
  if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
    return { isValid: false, error: 'Número do cartão deve ter entre 13 e 19 dígitos' };
  }

  // Validar CPF (formato básico)
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) {
    return { isValid: false, error: 'CPF deve ter 11 dígitos' };
  }

  // Validar mês
  const month = parseInt(expirationMonth);
  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Mês de vencimento deve estar entre 01 e 12' };
  }

  // Validar ano
  const year = parseInt(expirationYear);
  const currentYear = new Date().getFullYear();
  if (year < currentYear || year > currentYear + 20) {
    return { isValid: false, error: 'Ano de vencimento inválido' };
  }

  return { isValid: true };
};

export const detectCardBrand = (cardNumber: string): string => {
  const cleanCardNumber = cardNumber.replace(/\s/g, '');
  const firstDigit = cleanCardNumber.charAt(0);
  const firstTwoDigits = cleanCardNumber.substring(0, 2);
  const firstFourDigits = cleanCardNumber.substring(0, 4);

  if (firstDigit === '4') {
    return 'visa';
  } else if (['51', '52', '53', '54', '55'].includes(firstTwoDigits) || 
             (parseInt(firstFourDigits) >= 2221 && parseInt(firstFourDigits) <= 2720)) {
    return 'master';
  } else if (['34', '37'].includes(firstTwoDigits)) {
    return 'amex';
  } else if (firstFourDigits === '6011' || firstTwoDigits === '65') {
    return 'discover';
  }

  return 'visa'; // padrão
};
