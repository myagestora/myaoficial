
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
  token?: string;
  installments?: number;
  issuer_id?: number;
}
