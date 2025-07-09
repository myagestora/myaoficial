
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const createSupabaseClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
};

export const getPlanData = async (supabaseClient: any, planId: string) => {
  console.log('Buscando plano no banco de dados...');
  const { data: planData, error: planError } = await supabaseClient
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) {
    console.error('Erro ao buscar plano:', planError);
    throw new Error('Erro ao buscar plano: ' + planError.message);
  }

  if (!planData) {
    console.error('Plano não encontrado:', planId);
    throw new Error('Plano não encontrado');
  }

  console.log('Plano encontrado:', planData.name);
  return planData;
};

export const getMercadoPagoToken = async (supabaseClient: any) => {
  console.log('Buscando token do Mercado Pago...');
  const { data: configData, error: configError } = await supabaseClient
    .from('system_config')
    .select('value')
    .eq('key', 'mercado_pago_access_token')
    .single();

  if (configError) {
    console.error('Erro ao buscar token do MP:', configError);
    throw new Error('Token do Mercado Pago não configurado: ' + configError.message);
  }

  if (!configData || !configData.value) {
    console.error('Token do MP não encontrado na configuração');
    throw new Error('Token do Mercado Pago não configurado');
  }

  const accessToken = typeof configData.value === 'string' ? 
    configData.value.replace(/^"|"$/g, '') : 
    String(configData.value).replace(/^"|"$/g, '');

  console.log('Token obtido:', accessToken ? 'OK' : 'VAZIO');
  return accessToken;
};

export const createOrGetSubscription = async (supabaseClient: any, userId: string, planId: string, frequency: string) => {
  let subscriptionId;
  const { data: existingSubscription } = await supabaseClient
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .maybeSingle();

  if (existingSubscription) {
    subscriptionId = existingSubscription.id;
  } else {
    // Criar nova assinatura
    const { data: newSubscription, error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'inactive',
        frequency: frequency,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (frequency === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Erro ao criar assinatura:', subscriptionError);
      throw new Error('Erro ao criar assinatura: ' + subscriptionError.message);
    }

    subscriptionId = newSubscription.id;
  }

  return subscriptionId;
};

export const savePaymentRecord = async (
  supabaseClient: any,
  userId: string,
  planId: string,
  subscriptionId: string,
  amount: number,
  paymentMethod: string,
  mpPayment: any,
  externalReference: string
) => {
  console.log('Salvando pagamento no banco de dados...');
  
  const { data: paymentRecord, error: paymentError } = await supabaseClient
    .from('payments')
    .insert({
      user_id: userId,
      plan_id: planId,
      subscription_id: subscriptionId,
      amount: Number(amount),
      currency: 'BRL',
      payment_method: paymentMethod,
      mercado_pago_payment_id: mpPayment.id.toString(),
      mercado_pago_preference_id: externalReference,
      status: mpPayment.status === 'approved' ? 'completed' : 'pending',
      payment_date: mpPayment.date_approved || mpPayment.date_created,
    })
    .select()
    .single();

  if (paymentError) {
    console.error('Erro ao salvar pagamento no banco:', paymentError);
    throw new Error('Erro ao salvar pagamento: ' + paymentError.message);
  }

  console.log('Pagamento salvo no banco:', paymentRecord.id);
  return paymentRecord;
};

export const activateSubscription = async (supabaseClient: any, subscriptionId: string, userId: string) => {
  console.log('Pagamento aprovado imediatamente - ativando assinatura...');
  
  await supabaseClient
    .from('user_subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId);

  // Atualizar perfil
  await supabaseClient
    .from('profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  console.log('Assinatura ativada');
};
