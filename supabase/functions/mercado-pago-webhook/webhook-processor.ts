
import type { WebhookData, PaymentData } from "./types.ts";
import { fetchPaymentFromMercadoPago, findPaymentRecord, updatePaymentStatus } from "./payment-service.ts";
import { activateUserSubscription } from "./subscription-service.ts";

export async function processWebhook(webhookData: WebhookData, accessToken: string): Promise<void> {
  console.log('Dados do webhook processados:', webhookData);

  // Verificar se é um evento de pagamento
  if (webhookData.type === 'payment' || webhookData.action === 'payment.updated') {
    const paymentId = webhookData.data?.id || webhookData.id;
    
    if (!paymentId) {
      console.error('ID do pagamento não encontrado no webhook');
      throw new Error('ID do pagamento não encontrado');
    }

    console.log('Processando pagamento ID:', paymentId);
    
    // Buscar detalhes do pagamento no Mercado Pago
    const paymentData = await fetchPaymentFromMercadoPago(paymentId.toString(), accessToken);
    console.log('Dados do pagamento do MP:', paymentData);

    // Buscar o pagamento no banco de dados
    const paymentRecord = await findPaymentRecord(paymentData);

    if (!paymentRecord) {
      console.error('Pagamento não encontrado no banco de dados para payment_id:', paymentId);
      throw new Error(`Pagamento não encontrado - payment_id: ${paymentId}`);
    }

    console.log('Registro de pagamento encontrado:', paymentRecord);

    // Atualizar status do pagamento
    await updatePaymentStatus(paymentRecord, paymentData);

    // Se o pagamento foi aprovado, ativar assinatura
    if (paymentData.status === 'approved') {
      await activateUserSubscription(paymentRecord);
    }
  } else {
    console.log('Evento não é de pagamento, ignorando:', webhookData.type || webhookData.action);
  }
}
