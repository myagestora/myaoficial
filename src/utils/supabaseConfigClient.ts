// Utilitário para cliente Supabase com configuração dinâmica
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://fimgalqlsezgxqbmktpz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbWdhbHFsc2V6Z3hxYm1rdHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MjkyMTEsImV4cCI6MjA2NzUwNTIxMX0.Wg_X2gExD4wlaBQ42QAQ4ERs4kJVHAk2ZNA6IOd4woU";

// Cache para a configuração do sistema
let cachedSystemConfig: Record<string, string> | null = null;
let configFetchTime = 0;
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca configurações do sistema
 */
const fetchSystemConfig = async (): Promise<Record<string, string>> => {
  const now = Date.now();
  
  // Usar cache se ainda válido
  if (cachedSystemConfig && (now - configFetchTime) < CONFIG_CACHE_DURATION) {
    return cachedSystemConfig;
  }

  try {
    // Cliente base para buscar configurações
    const baseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    
    const { data: configs } = await baseClient
      .from('system_config')
      .select('key, value')
      .in('key', ['api_enabled', 'api_domain']);

    const configMap: Record<string, string> = {};
    configs?.forEach(config => {
      if (config.value) {
        const stringValue = typeof config.value === 'string' 
          ? config.value 
          : JSON.stringify(config.value);
        configMap[config.key] = stringValue;
      }
    });

    cachedSystemConfig = configMap;
    configFetchTime = now;
    return configMap;
  } catch (error) {
    console.warn('Failed to fetch system config:', error);
    return {};
  }
};

/**
 * Obtém a URL base baseada na configuração da API
 */
export const getDynamicSupabaseUrl = async (): Promise<string> => {
  const config = await fetchSystemConfig();
  
  if (config.api_enabled === 'true' && config.api_domain?.trim()) {
    const domain = config.api_domain.trim();
    return domain.startsWith('http') ? domain : `https://${domain}`;
  }
  
  return SUPABASE_URL;
};

/**
 * Cliente Supabase padrão (sem configuração dinâmica)
 */
export const supabaseBase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * Função para invocar edge functions com URL dinâmica
 */
export const invokeEdgeFunction = async (
  functionName: string, 
  options?: { body?: any; headers?: Record<string, string> }
) => {
  const config = await fetchSystemConfig();
  
  if (config.api_enabled === 'true' && config.api_domain?.trim()) {
    // Usar domínio personalizado
    const domain = config.api_domain.trim();
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    const url = `${baseUrl}/functions/v1/${functionName}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          ...(options?.headers || {})
        },
        body: options?.body ? JSON.stringify(options.body) : undefined
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      return { data: null, error };
    }
  } else {
    // Usar cliente Supabase padrão
    return supabaseBase.functions.invoke(functionName, options);
  }
};

/**
 * Função para obter URLs de storage com domínio dinâmico
 */
export const getStorageUrl = async (bucket: string, path: string): Promise<string> => {
  const config = await fetchSystemConfig();
  
  if (config.api_enabled === 'true' && config.api_domain?.trim()) {
    const domain = config.api_domain.trim();
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }
  
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

/**
 * Função para obter URLs de webhook com domínio dinâmico
 */
export const getWebhookUrl = async (webhookName: string): Promise<string> => {
  const config = await fetchSystemConfig();
  
  if (config.api_enabled === 'true' && config.api_domain?.trim()) {
    const domain = config.api_domain.trim();
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    return `${baseUrl}/functions/v1/${webhookName}`;
  }
  
  return `${SUPABASE_URL}/functions/v1/${webhookName}`;
};

// Limpar cache quando necessário
export const clearSystemConfigCache = () => {
  cachedSystemConfig = null;
  configFetchTime = 0;
};