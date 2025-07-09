
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

  // Validar se o número contém apenas dígitos
  if (!/^\d+$/.test(cleanCardNumber)) {
    return { isValid: false, error: 'Número do cartão deve conter apenas dígitos' };
  }

  // Validar CPF (formato básico)
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) {
    return { isValid: false, error: 'CPF deve ter 11 dígitos' };
  }

  // Validar se CPF não é uma sequência repetida
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { isValid: false, error: 'CPF inválido' };
  }

  // Validar mês
  const month = parseInt(expirationMonth);
  if (isNaN(month) || month < 1 || month > 12) {
    return { isValid: false, error: 'Mês de vencimento deve estar entre 01 e 12' };
  }

  // Validar ano
  const year = parseInt(expirationYear);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  if (isNaN(year) || year < currentYear || year > currentYear + 20) {
    return { isValid: false, error: 'Ano de vencimento inválido' };
  }

  // Validar se o cartão não está vencido
  if (year === currentYear && month < currentMonth) {
    return { isValid: false, error: 'Cartão vencido' };
  }

  // Validar CVV
  const cvv = securityCode.replace(/\D/g, '');
  if (cvv.length < 3 || cvv.length > 4) {
    return { isValid: false, error: 'CVV deve ter 3 ou 4 dígitos' };
  }

  // Validar nome do portador
  if (cardholderName.trim().length < 2) {
    return { isValid: false, error: 'Nome do portador deve ter pelo menos 2 caracteres' };
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
  } else if (['38', '30'].includes(firstTwoDigits)) {
    return 'diners';
  } else if (['60', '62', '63', '64', '65'].includes(firstTwoDigits)) {
    return 'hipercard';
  } else if (firstFourDigits === '5067') {
    return 'elo';
  }

  return 'visa'; // padrão para cartões não identificados
};
