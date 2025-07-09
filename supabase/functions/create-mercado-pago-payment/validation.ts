
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
