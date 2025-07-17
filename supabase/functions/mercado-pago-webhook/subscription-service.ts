
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { PaymentRecord } from "./types.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

export async function activateUserSubscription(paymentRecord: PaymentRecord): Promise<void> {
  console.log('Pagamento aprovado, ativando assinatura para usuário:', paymentRecord.user_id);
  
  // Buscar dados do plano para determinar a frequência
  const { data: planData, error: planError } = await supabaseClient
    .from('subscription_plans')
    .select('*')
    .eq('id', paymentRecord.plan_id)
    .single();

  if (planError) {
    console.error('Erro ao buscar plano:', planError);
    throw planError;
  }

  // Determinar frequência baseado no plano e valor do pagamento
  let frequency = 'monthly';
  if (planData.price_yearly && paymentRecord.amount >= planData.price_yearly) {
    frequency = 'yearly';
  } else if (planData.price_monthly && paymentRecord.amount >= planData.price_monthly) {
    frequency = 'monthly';
  }

  console.log('Frequência determinada:', frequency, 'para valor:', paymentRecord.amount);
  
  // Calcular datas do período
  const currentDate = new Date();
  const periodStart = new Date(currentDate);
  const periodEnd = new Date(currentDate);
  
  // Calcular período baseado na frequência
  if (frequency === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  console.log('Período calculado:', {
    start: periodStart.toISOString(),
    end: periodEnd.toISOString(),
    frequency
  });

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
        frequency: frequency,
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
        frequency: frequency,
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

export async function cancelUserSubscription(paymentRecord: PaymentRecord, reason: string): Promise<void> {
  console.log('Cancelando assinatura para usuário:', paymentRecord.user_id, 'razão:', reason);
  
  try {
    // Se tem subscription_id vinculado, cancelar a assinatura específica
    if (paymentRecord.subscription_id) {
      const { error: subscriptionError } = await supabaseClient
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.subscription_id);

      if (subscriptionError) {
        console.error('Erro ao cancelar assinatura específica:', subscriptionError);
        throw subscriptionError;
      }
      
      console.log('Assinatura específica cancelada:', paymentRecord.subscription_id);
    } else {
      // Fallback: buscar e cancelar assinatura por user_id e plan_id
      const { data: existingSubscription } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', paymentRecord.user_id)
        .eq('plan_id', paymentRecord.plan_id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSubscription) {
        const { error: subscriptionError } = await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);

        if (subscriptionError) {
          console.error('Erro ao cancelar assinatura:', subscriptionError);
          throw subscriptionError;
        }
        
        console.log('Assinatura cancelada por user_id/plan_id');
      } else {
        console.log('Nenhuma assinatura ativa encontrada para cancelar');
      }
    }

    // Atualizar perfil do usuário para refletir status cancelado
    // Só atualizar se não há outras assinaturas ativas
    const { data: otherActiveSubscriptions } = await supabaseClient
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', paymentRecord.user_id)
      .eq('status', 'active');

    if (!otherActiveSubscriptions || otherActiveSubscriptions.length === 0) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.user_id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
        // Não falhar o processo por erro no perfil
      } else {
        console.log('Perfil atualizado - assinatura cancelada');
      }
    } else {
      console.log('Usuário ainda possui outras assinaturas ativas - perfil não alterado');
    }

    console.log('Cancelamento de assinatura concluído com sucesso');
  } catch (error) {
    console.error('Erro durante cancelamento de assinatura:', error);
    throw error;
  }
}
