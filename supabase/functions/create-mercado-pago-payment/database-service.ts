
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const createSupabaseClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
};

export const getPlanData = async (supabaseClient: any, planId: string) => {
  console.log('Buscando dados do plano:', planId);
  
  const { data: planData, error: planError } = await supabaseClient
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !planData) {
    console.error('Erro ao buscar plano:', planError);
    throw new Error('Plano não encontrado');
  }

  return planData;
};

export const getMercadoPagoToken = async (supabaseClient: any) => {
  console.log('Buscando token do Mercado Pago...');
  
  const { data: configData, error: configError } = await supabaseClient
    .from('system_config')
    .select('value')
    .eq('key', 'mercado_pago_access_token')
    .maybeSingle();

  if (configError) {
    console.error('Erro ao buscar configuração do Mercado Pago:', configError);
    throw new Error('Erro ao buscar configuração de pagamento');
  }

  if (!configData?.value) {
    console.error('Token do Mercado Pago não configurado');
    return null;
  }

  // Extrair o valor do JSON
  const tokenValue = typeof configData.value === 'string' ? 
    configData.value.replace(/^"|"$/g, '') : 
    JSON.stringify(configData.value).replace(/^"|"$/g, '');

  return tokenValue;
};

export const createOrGetSubscription = async (supabaseClient: any, userId: string, planId: string, frequency: string) => {
  console.log('Criando/buscando assinatura para usuário:', userId);
  
  // Primeiro verificar se já existe uma assinatura
  const { data: existingSubscription } = await supabaseClient
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .maybeSingle();

  if (existingSubscription) {
    console.log('Assinatura existente encontrada:', existingSubscription.id);
    return existingSubscription.id;
  }

  // Criar nova assinatura
  const { data: newSubscription, error: subscriptionError } = await supabaseClient
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      frequency,
      status: 'inactive'
    })
    .select('id')
    .single();

  if (subscriptionError) {
    console.error('Erro ao criar assinatura:', subscriptionError);
    throw new Error('Erro ao criar assinatura');
  }

  console.log('Nova assinatura criada:', newSubscription.id);
  return newSubscription.id;
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
  console.log('Salvando registro de pagamento...');
  
  const paymentData = {
    user_id: userId,
    plan_id: planId,
    subscription_id: subscriptionId,
    amount: Number(amount),
    payment_method: paymentMethod,
    status: mpPayment.status || 'pending',
    currency: 'BRL',
    mercado_pago_payment_id: mpPayment.id?.toString(),
    payment_date: mpPayment.date_approved ? new Date(mpPayment.date_approved).toISOString() : null
  };

  const { data: paymentRecord, error: paymentError } = await supabaseClient
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (paymentError) {
    console.error('Erro ao salvar pagamento:', paymentError);
    throw new Error('Erro ao salvar registro de pagamento');
  }

  console.log('Registro de pagamento salvo:', paymentRecord.id);
  return paymentRecord;
};

export const activateSubscription = async (supabaseClient: any, subscriptionId: string, userId: string) => {
  console.log('Ativando assinatura:', subscriptionId);
  
  const currentDate = new Date();
  const periodStart = new Date(currentDate);
  const periodEnd = new Date(currentDate);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Atualizar assinatura
  const { error: subscriptionError } = await supabaseClient
    .from('user_subscriptions')
    .update({
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId);

  if (subscriptionError) {
    console.error('Erro ao ativar assinatura:', subscriptionError);
    throw subscriptionError;
  }

  // Garantir que o perfil existe e está atualizado
  await ensureProfileExists(supabaseClient, userId);
  
  console.log('Assinatura ativada com sucesso');
};

const ensureProfileExists = async (supabaseClient: any, userId: string) => {
  console.log('Garantindo que perfil existe para usuário:', userId);
  
  // Verificar se o perfil já existe
  const { data: existingProfile, error: fetchError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Erro ao buscar perfil:', fetchError);
    throw fetchError;
  }

  // Se perfil existe, apenas atualizar o status da assinatura
  if (existingProfile) {
    console.log('Perfil encontrado, atualizando status da assinatura');
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        subscription_status: 'active',
        account_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
    } else {
      console.log('Perfil atualizado com sucesso para usuário:', userId);
    }
  } else {
    // Se não existe, buscar dados do usuário e criar perfil
    console.log('Perfil não encontrado, criando novo perfil...');
    
    // Buscar dados básicos do usuário no auth.users
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Erro ao buscar dados do usuário:', authError);
    }

    const profileData = {
      id: userId,
      email: authUser?.user?.email || null,
      full_name: authUser?.user?.user_metadata?.full_name || authUser?.user?.user_metadata?.name || null,
      whatsapp: authUser?.user?.user_metadata?.whatsapp || authUser?.user?.user_metadata?.phone || null,
      account_status: 'active',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newProfile, error: createError } = await supabaseClient
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar perfil:', createError);
    } else {
      console.log('Perfil criado com sucesso:', newProfile);
    }
  }
};
