
export interface CardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  cpf: string;
}

export interface PaymentRequest {
  planId: string;
  frequency: 'monthly' | 'yearly';
  paymentMethod: 'pix' | 'credit_card';
  cardData?: CardData;
}

export interface PaymentData {
  transaction_amount: number;
  description: string;
  external_reference: string;
  payer: {
    email: string;
    first_name: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  notification_url: string;
  payment_method_id?: string;
  installments?: number;
  token?: string;
  card?: {
    card_number: string;
    security_code: string;
    expiration_month: number;
    expiration_year: number;
    cardholder: {
      name: string;
      identification: {
        type: string;
        number: string;
      };
    };
  };
}
