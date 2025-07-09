
import { CardData } from './types.ts';

export const validateCardData = (cardData: CardData): { isValid: boolean; error?: string } => {
  console.log('=== VALIDANDO DADOS DO CARTÃO ===');
  
  const { cardNumber, cardholderName, expirationMonth, expirationYear, securityCode, cpf } = cardData;
  
  // Verificar se todos os campos obrigatórios estão presentes
  if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode || !cpf) {
    console.error('Dados do cartão incompletos');
    return { isValid: false, error: 'Todos os campos do cartão são obrigatórios' };
  }

  // Validar formato do cartão
  const cleanCardNumber = cardNumber.replace(/\s/g, '');
  if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19 || !/^\d+$/.test(cleanCardNumber)) {
    console.error('Número do cartão inválido');
    return { isValid: false, error: 'Número do cartão inválido' };
  }

  // Validar CPF
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    console.error('CPF inválido');
    return { isValid: false, error: 'CPF inválido' };
  }

  // Validar data de vencimento
  const month = parseInt(expirationMonth);
  const year = parseInt(expirationYear);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  if (isNaN(month) || month < 1 || month > 12) {
    console.error('Mês de vencimento inválido');
    return { isValid: false, error: 'Mês de vencimento inválido' };
  }

  if (isNaN(year) || year < currentYear || year > currentYear + 20) {
    console.error('Ano de vencimento inválido');
    return { isValid: false, error: 'Ano de vencimento inválido' };
  }

  if (year === currentYear && month < currentMonth) {
    console.error('Cartão vencido');
    return { isValid: false, error: 'Cartão vencido' };
  }

  // Validar CVV
  const cvv = securityCode.replace(/\D/g, '');
  if (cvv.length < 3 || cvv.length > 4) {
    console.error('CVV inválido');
    return { isValid: false, error: 'CVV deve ter 3 ou 4 dígitos' };
  }

  // Validar nome do portador
  if (cardholderName.trim().length < 2) {
    console.error('Nome do portador muito curto');
    return { isValid: false, error: 'Nome do portador deve ter pelo menos 2 caracteres' };
  }

  console.log('=== VALIDAÇÃO DE CARTÃO CONCLUÍDA COM SUCESSO ===');
  return { isValid: true };
};
