
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

export interface MercadoPagoPaymentData {
  transaction_amount: number;
  token?: string;
  description: string;
  installments?: number;
  payment_method_id?: string;
  external_reference: string;
  statement_descriptor: string;
  notification_url: string;
  payer: {
    email: string;
    first_name: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

export interface CardTokenData {
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
}
