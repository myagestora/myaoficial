// Utilitários para configuração dinâmica da API

/**
 * Detecta se estamos em um subdomínio de API
 */
export const isApiDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname.startsWith('api.');
};

/**
 * Obtém a URL base da API a partir das configurações do sistema
 */
export const getApiBaseUrl = (systemConfig?: Record<string, string>): string => {
  // Se as configurações incluem um domínio personalizado da API E está habilitado
  if (systemConfig?.api_enabled === 'true' && systemConfig?.api_domain?.trim()) {
    const domain = systemConfig.api_domain.trim();
    // Garante que tem protocolo
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    return `${baseUrl}/functions/v1`;
  }
  
  // Fallback para URL do Supabase (sempre funciona)
  return 'https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1';
};

/**
 * Obtém a URL completa para um endpoint específico
 */
export const getApiEndpointUrl = (endpoint: string, systemConfig?: Record<string, string>): string => {
  const baseUrl = getApiBaseUrl(systemConfig);
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

/**
 * Gera exemplo de cURL com a URL personalizada
 */
export const generateApiCurl = (endpoint: any, systemConfig?: Record<string, string>): string => {
  const baseUrl = getApiBaseUrl(systemConfig);
  const url = `${baseUrl}${endpoint.path}`;
  
  let curl = `curl -X ${endpoint.method} "${url}"`;
  
  // Headers
  curl += ` \\\n  -H "Content-Type: application/json"`;
  curl += ` \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;
  
  // Body para POST/PUT/PATCH - usar exampleRequest se disponível, senão exampleData
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    const bodyData = endpoint.exampleRequest || endpoint.exampleData;
    if (bodyData) {
      curl += ` \\\n  -d '${JSON.stringify(bodyData, null, 2)}'`;
    }
  }
  
  return curl;
};

/**
 * Obtém configurações da API personalizadas
 */
export const getApiInfo = (systemConfig?: Record<string, string>) => {
  if (!systemConfig?.api_enabled || systemConfig.api_enabled !== 'true') {
    return {
      title: 'WhatsApp Bot API',
      description: 'API para integração com WhatsApp Bot',
      version: '1.0.0',
      baseUrl: 'https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1'
    };
  }
  
  return {
    title: 'WhatsApp Bot API',
    description: 'API para integração com WhatsApp Bot',
    version: '1.0.0',
    baseUrl: getApiBaseUrl(systemConfig)
  };
};