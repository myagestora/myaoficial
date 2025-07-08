
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

  // Atualizar o status da assinatura no perfil do usuário
  const { error: profileError } = await supabaseClient
    .from('profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentRecord.user_id);

  if (profileError) {
    console.error('Erro ao atualizar perfil:', profileError);
    // Não falhar o webhook por erro no perfil
  } else {
    console.log('Perfil atualizado com sucesso para usuário:', paymentRecord.user_id);
  }
}
