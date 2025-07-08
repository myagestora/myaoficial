
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getConfig } from "./config.ts";
import { processWebhook } from "./webhook-processor.ts";
import type { WebhookData } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook recebido do Mercado Pago');

    // Obter dados do webhook
    const body = await req.text();
    const signature = req.headers.get("x-signature");
    const requestId = req.headers.get("x-request-id");

    console.log('Dados do webhook:', { body, signature, requestId });

    // Buscar configurações do Mercado Pago
    const config = await getConfig();

    // Processar o webhook
    const webhookData: WebhookData = JSON.parse(body);
    await processWebhook(webhookData, config.mercado_pago_access_token);

    return new Response(JSON.stringify({ 
      received: true,
      processed: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      received: true,
      processed: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
