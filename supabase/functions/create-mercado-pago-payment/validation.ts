
import { CardData } from './types.ts';

export const validateCardData = (cardData: CardData): { isValid: boolean; error?: string } => {
  console.log('=== VALIDANDO DADOS DO CARTÃO ===');
  
  const { cardNumber, cardholderName, expirationMonth, expirationYear, securityCode, cpf } = cardData;
  
  // Verificar se todos os campos obrigatórios estão presentes
  if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode || !cpf) {
    console.error('Dados do cartão incompletos:', {
      hasCardNumber: !!cardNumber,
      hasCardholderName: !!cardholderName,
      hasExpirationMonth: !!expirationMonth,
      hasExpirationYear: !!expirationYear,
      hasSecurityCode: !!securityCode,
      hasCpf: !!cpf
    });
    return { isValid: false, error: 'Dados do cartão incompletos' };
  }

  // Validar formato do cartão
  const cleanCardNumber = cardNumber.replace(/\s/g, '');
  console.log('Card number length:', cleanCardNumber.length);
  
  if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
    console.error('Número do cartão com tamanho inválido:', cleanCardNumber.length);
    return { isValid: false, error: 'Número do cartão deve ter entre 13 e 19 dígitos' };
  }

  // Validar se o número contém apenas dígitos
  if (!/^\d+$/.test(cleanCardNumber)) {
    console.error('Número do cartão contém caracteres inválidos');
    return { isValid: false, error: 'Número do cartão deve conter apenas dígitos' };
  }

  // Validar CPF (formato básico)
  const cleanCPF = cpf.replace(/\D/g, '');
  console.log('CPF length:', cleanCPF.length);
  
  if (cleanCPF.length !== 11) {
    console.error('CPF com tamanho inválido:', cleanCPF.length);
    return { isValid: false, error: 'CPF deve ter 11 dígitos' };
  }

  // Validar se CPF não é uma sequência repetida
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    console.error('CPF com sequência repetida:', cleanCPF);
    return { isValid: false, error: 'CPF inválido' };
  }

  // Validar mês
  const month = parseInt(expirationMonth);
  console.log('Expiration month:', month);
  
  if (isNaN(month) || month < 1 || month > 12) {
    console.error('Mês de vencimento inválido:', month);
    return { isValid: false, error: 'Mês de vencimento deve estar entre 01 e 12' };
  }

  // Validar ano
  const year = parseInt(expirationYear);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  console.log('Expiration year:', year, 'Current year:', currentYear);
  
  if (isNaN(year) || year < currentYear || year > currentYear + 20) {
    console.error('Ano de vencimento inválido:', year);
    return { isValid: false, error: 'Ano de vencimento inválido' };
  }

  // Validar se o cartão não está vencido
  if (year === currentYear && month < currentMonth) {
    console.error('Cartão vencido:', { year, month, currentYear, currentMonth });
    return { isValid: false, error: 'Cartão vencido' };
  }

  // Validar CVV
  const cvv = securityCode.replace(/\D/g, '');
  console.log('CVV length:', cvv.length);
  
  if (cvv.length < 3 || cvv.length > 4) {
    console.error('CVV com tamanho inválido:', cvv.length);
    return { isValid: false, error: 'CVV deve ter 3 ou 4 dígitos' };
  }

  // Validar nome do portador
  if (cardholderName.trim().length < 2) {
    console.error('Nome do portador muito curto:', cardholderName.length);
    return { isValid: false, error: 'Nome do portador deve ter pelo menos 2 caracteres' };
  }

  console.log('=== VALIDAÇÃO DE CARTÃO CONCLUÍDA COM SUCESSO ===');
  return { isValid: true };
};

export const detectCardBrand = (cardNumber: string): string => {
  console.log('=== DETECTANDO BANDEIRA DO CARTÃO ===');
  
  const cleanCardNumber = cardNumber.replace(/\s/g, '');
  const firstDigit = cleanCardNumber.charAt(0);
  const firstTwoDigits = cleanCardNumber.substring(0, 2);
  const firstFourDigits = cleanCardNumber.substring(0, 4);
  
  console.log('Card analysis:', {
    firstDigit,
    firstTwoDigits,
    firstFourDigits,
    cardLength: cleanCardNumber.length
  });

  let brand = 'visa'; // padrão

  if (firstDigit === '4') {
    brand = 'visa';
  } else if (['51', '52', '53', '54', '55'].includes(firstTwoDigits) || 
             (parseInt(firstFourDigits) >= 2221 && parseInt(firstFourDigits) <= 2720)) {
    brand = 'master';
  } else if (['34', '37'].includes(firstTwoDigits)) {
    brand = 'amex';
  } else if (firstFourDigits === '6011' || firstTwoDigits === '65') {
    brand = 'discover';
  } else if (['38', '30'].includes(firstTwoDigits)) {
    brand = 'diners';
  } else if (['60', '62', '63', '64', '65'].includes(firstTwoDigits)) {
    brand = 'hipercard';
  } else if (firstFourDigits === '5067' || 
             (parseInt(firstFourDigits) >= 4011 && parseInt(firstFourDigits) <= 4389) ||
             (parseInt(firstFourDigits) >= 5041 && parseInt(firstFourDigits) <= 5049) ||
             (parseInt(firstFourDigits) >= 6500 && parseInt(firstFourDigits) <= 6516)) {
    brand = 'elo';
  }

  console.log('Detected card brand:', brand);
  return brand;
};
