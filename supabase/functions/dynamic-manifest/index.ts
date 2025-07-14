import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching system config...');

    // Buscar configurações do sistema
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['app_name', 'app_favicon', 'seo_title', 'seo_description', 'api_enabled', 'api_domain']);

    if (error) {
      console.error('Error fetching system config:', error);
    }

    console.log('System configs fetched:', configs);

    // Processar configurações
    const configMap: Record<string, string> = {};
    configs?.forEach(config => {
      if (config.value) {
        // Verificar se o valor é string ou objeto
        let stringValue: string;
        if (typeof config.value === 'string') {
          stringValue = config.value;
        } else if (typeof config.value === 'object' && config.value !== null) {
          // Se for objeto, tentar extrair uma propriedade ou usar JSON.stringify
          stringValue = JSON.stringify(config.value);
        } else {
          stringValue = String(config.value);
        }
        configMap[config.key] = stringValue;
      }
    });

    console.log('Processed config map:', configMap);

    // Determinar URL base baseada na configuração da API
    let baseUrl = 'https://api.myagestora.com.br';
    if (configMap.api_enabled === 'true' && configMap.api_domain?.trim()) {
      const domain = configMap.api_domain.trim();
      baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    }

    // Valores padrão
    const appName = configMap.app_name || configMap.seo_title || 'Mya Gestora';
    const description = configMap.seo_description || 'Sistema inteligente de controle financeiro pessoal';
    const faviconUrl = configMap.app_favicon || `${baseUrl}/storage/v1/object/public/logos/logo-1751933896307.png`;

    console.log('Final values:', { appName, description, faviconUrl, baseUrl, apiEnabled: configMap.api_enabled });

    // Gerar manifest fixo para funcionar 100%
    const manifest = {
      name: `${appName} - Controle Financeiro`,
      short_name: appName,
      description: description,
      start_url: "https://app.myagestora.com.br/?utm_source=pwa",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      orientation: "portrait",
      scope: "/",
      categories: ["finance", "business", "productivity"],
      lang: "pt-BR",
      icons: [
        {
          src: faviconUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: faviconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: faviconUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: faviconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ]
    };

    console.log('Generated manifest:', manifest);

    return new Response(JSON.stringify(manifest), {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300', // Cache por 5 minutos
      },
    });

  } catch (error) {
    console.error('Error in dynamic-manifest function:', error);
    
    // Retornar manifest padrão em caso de erro  
    const defaultManifest = {
      name: "Mya Gestora - Controle Financeiro",
      short_name: "Mya Gestora",
      description: "Sistema inteligente de controle financeiro pessoal",
      start_url: "https://app.myagestora.com.br/?utm_source=pwa",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      orientation: "portrait",
      scope: "/",
      categories: ["finance", "business", "productivity"],
      lang: "pt-BR",
      icons: [
        {
          src: "https://api.myagestora.com.br/storage/v1/object/public/logos/logo-1751933896307.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "https://api.myagestora.com.br/storage/v1/object/public/logos/logo-1751933896307.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "https://api.myagestora.com.br/storage/v1/object/public/logos/logo-1751933896307.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "https://api.myagestora.com.br/storage/v1/object/public/logos/logo-1751933896307.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ]
    };

    return new Response(JSON.stringify(defaultManifest), {
      headers: corsHeaders,
    });
  }
});
