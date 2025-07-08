
export interface WebhookData {
  type?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
  id?: string | number;
}

export interface PaymentData {
  id: number;
  status: string;
  status_detail?: string;
  date_approved?: string;
  date_created?: string;
  external_reference?: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  plan_id: string;
  mercado_pago_payment_id?: string;
  mercado_pago_preference_id?: string;
}

export interface ConfigData {
  mercado_pago_webhook_secret: string;
  mercado_pago_access_token: string;
}
