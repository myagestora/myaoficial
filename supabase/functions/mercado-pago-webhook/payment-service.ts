
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { PaymentData, PaymentRecord } from "./types.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

export async function fetchPaymentFromMercadoPago(paymentId: string, accessToken: string): Promise<PaymentData> {
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!paymentResponse.ok) {
    const errorText = await paymentResponse.text();
    console.error('Erro ao buscar pagamento no Mercado Pago:', paymentResponse.status, errorText);
    throw new Error(`Erro ${paymentResponse.status} ao buscar pagamento no Mercado Pago`);
  }

  return await paymentResponse.json();
}

export async function findPaymentRecord(paymentData: PaymentData): Promise<PaymentRecord | null> {
  // Buscar o pagamento no banco usando o ID do Mercado Pago
  const { data: paymentRecord } = await supabaseClient
    .from('payments')
    .select('*')
    .eq('mercado_pago_payment_id', paymentData.id.toString())
    .maybeSingle();

  let finalPaymentRecord = paymentRecord;

  // Se não encontrou pelo payment_id, tentar buscar pela external_reference ou preference_id
  if (!finalPaymentRecord && paymentData.external_reference) {
    console.log('Buscando por external_reference:', paymentData.external_reference);
    
    const { data: altPaymentRecord } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('mercado_pago_preference_id', paymentData.external_reference)
      .maybeSingle();

    finalPaymentRecord = altPaymentRecord;
  }

  return finalPaymentRecord;
}

export async function updatePaymentStatus(paymentRecord: PaymentRecord, paymentData: PaymentData): Promise<void> {
  // Determinar o novo status
  let newStatus = 'pending';
  if (paymentData.status === 'approved') {
    newStatus = 'completed';
  } else if (paymentData.status === 'rejected') {
    newStatus = 'failed';
  } else if (paymentData.status === 'cancelled') {
    newStatus = 'cancelled';
  }

  // Atualizar status do pagamento no banco
  const { error: updateError } = await supabaseClient
    .from('payments')
    .update({
      status: newStatus,
      mercado_pago_payment_id: paymentData.id.toString(),
      payment_date: paymentData.date_approved || paymentData.date_created,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentRecord.id);

  if (updateError) {
    console.error('Erro ao atualizar pagamento:', updateError);
    throw updateError;
  } else {
    console.log('Pagamento atualizado com sucesso para status:', newStatus);
  }
}
