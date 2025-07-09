
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { PaymentRecord } from "./types.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

export async function activateUserSubscription(paymentRecord: PaymentRecord): Promise<void> {
  console.log('Pagamento aprovado, ativando assinatura para usuário:', paymentRecord.user_id);
  
  // Calcular datas do período
  const currentDate = new Date();
  const periodStart = new Date(currentDate);
  const periodEnd = new Date(currentDate);
  
  // Assumir que é mensal por padrão (pode ser ajustado conforme necessário)
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Verificar se já existe uma assinatura para este usuário e plano
  const { data: existingSubscription } = await supabaseClient
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', paymentRecord.user_id)
    .eq('plan_id', paymentRecord.plan_id)
    .maybeSingle();

  if (existingSubscription) {
    // Atualizar assinatura existente
    const { error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .update({
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id);

    if (subscriptionError) {
      console.error('Erro ao atualizar assinatura:', subscriptionError);
      throw subscriptionError;
    } else {
      console.log('Assinatura atualizada com sucesso');
    }
  } else {
    // Criar nova assinatura
    const { error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: paymentRecord.user_id,
        plan_id: paymentRecord.plan_id,
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      console.error('Erro ao criar assinatura:', subscriptionError);
      throw subscriptionError;
    } else {
      console.log('Assinatura criada com sucesso');
    }
  }

  // Garantir que o perfil existe e está atualizado
  await ensureProfileExists(paymentRecord.user_id);
}

async function ensureProfileExists(userId: string): Promise<void> {
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
        account_status: 'active', // Garantir que a conta também está ativa
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
      // Não falhar o webhook por erro no perfil, mas logar
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
      // Criar perfil com dados mínimos
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
      // Não falhar o webhook por erro no perfil, mas logar
    } else {
      console.log('Perfil criado com sucesso:', newProfile);
    }
  }
}
