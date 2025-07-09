
import { toast } from '@/hooks/use-toast';
import { CardData } from './CreditCardForm';

export const usePaymentValidation = () => {
  const validateCardData = (cardData: CardData): boolean => {
    const { cardNumber, cardholderName, expirationMonth, expirationYear, securityCode, cpf } = cardData;
    
    if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode || !cpf) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, preencha todos os dados do cartão.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar formato do cartão
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      toast({
        title: 'Cartão inválido',
        description: 'Número do cartão deve ter entre 13 e 19 dígitos.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar se contém apenas números
    if (!/^\d+$/.test(cleanCardNumber)) {
      toast({
        title: 'Cartão inválido',
        description: 'Número do cartão deve conter apenas dígitos.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar CPF (formato básico)
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      toast({
        title: 'CPF inválido',
        description: 'CPF deve ter 11 dígitos.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar se CPF não é uma sequência repetida
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      toast({
        title: 'CPF inválido',
        description: 'CPF inválido.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar mês
    const month = parseInt(expirationMonth);
    if (isNaN(month) || month < 1 || month > 12) {
      toast({
        title: 'Data inválida',
        description: 'Mês de vencimento deve estar entre 01 e 12.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar ano
    const year = parseInt(expirationYear);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (isNaN(year) || year < currentYear || year > currentYear + 20) {
      toast({
        title: 'Data inválida',
        description: 'Ano de vencimento inválido.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar se o cartão não está vencido
    if (year === currentYear && month < currentMonth) {
      toast({
        title: 'Cartão vencido',
        description: 'Este cartão está vencido.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar CVV
    const cvv = securityCode.replace(/\D/g, '');
    if (cvv.length < 3 || cvv.length > 4) {
      toast({
        title: 'CVV inválido',
        description: 'CVV deve ter 3 ou 4 dígitos.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar nome do portador
    if (cardholderName.trim().length < 2) {
      toast({
        title: 'Nome inválido',
        description: 'Nome do portador deve ter pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  return { validateCardData };
};
