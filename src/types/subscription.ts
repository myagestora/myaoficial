
export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface SubscriptionWithProfile {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  frequency: string | null;
  mercado_pago_subscription_id: string | null;
  subscription_plans: {
    name: string;
    description: string | null;
    price_monthly: number | null;
    price_yearly: number | null;
  } | null;
  profiles: ProfileData | null;
}
