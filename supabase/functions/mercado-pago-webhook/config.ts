
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { ConfigData } from "./types.ts";

export async function getConfig(): Promise<ConfigData> {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data: configData, error: configError } = await supabaseClient
    .from('system_config')
    .select('key, value')
    .in('key', ['mercado_pago_webhook_secret', 'mercado_pago_access_token']);

  if (configError) {
    console.error('Erro ao buscar configurações:', configError);
    throw configError;
  }

  const config: Record<string, string> = {};
  configData.forEach(item => {
    config[item.key] = typeof item.value === 'string' ? 
      item.value.replace(/^"|"$/g, '') : 
      JSON.stringify(item.value).replace(/^"|"$/g, '');
  });

  return config as ConfigData;
}
