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

    // Buscar configurações do sistema
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['app_name', 'app_favicon', 'seo_title', 'seo_description']);

    if (error) {
      console.error('Error fetching system config:', error);
    }

    // Processar configurações
    const configMap: Record<string, string> = {};
    configs?.forEach(config => {
      if (config.value && typeof config.value === 'string') {
        configMap[config.key] = config.value;
      }
    });

    // Valores padrão
    const appName = configMap.app_name || configMap.seo_title || 'Mya Gestora';
    const description = configMap.seo_description || 'Sistema inteligente de controle financeiro pessoal';
    const faviconUrl = configMap.app_favicon || 'https://fimgalqlsezgxqbmktpz.supabase.co/storage/v1/object/public/logos/logo-1751933896307.png';

    // Gerar manifest dinâmico
    const manifest = {
      name: `${appName} - Controle Financeiro`,
      short_name: appName,
      description: description,
      start_url: "/dashboard",
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
          purpose: "any maskable"
        },
        {
          src: faviconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      shortcuts: [
        {
          name: "Nova Transação",
          short_name: "Transação",
          description: "Adicionar uma nova transação",
          url: "/transactions",
          icons: [
            {
              src: faviconUrl,
              sizes: "96x96"
            }
          ]
        },
        {
          name: "Dashboard",
          short_name: "Início",
          description: "Ver visão geral das finanças",
          url: "/dashboard",
          icons: [
            {
              src: faviconUrl,
              sizes: "96x96"
            }
          ]
        }
      ]
    };

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
      start_url: "/dashboard",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      orientation: "portrait",
      scope: "/",
      categories: ["finance", "business", "productivity"],
      lang: "pt-BR",
      icons: [
        {
          src: "https://fimgalqlsezgxqbmktpz.supabase.co/storage/v1/object/public/logos/logo-1751933896307.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };

    return new Response(JSON.stringify(defaultManifest), {
      headers: corsHeaders,
    });
  }
});