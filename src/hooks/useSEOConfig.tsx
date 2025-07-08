
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSEOConfig = () => {
  const { data: seoConfig } = useQuery({
    queryKey: ['seo-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', [
          'seo_title', 'seo_description', 'seo_keywords', 'seo_author',
          'og_title', 'og_description', 'og_image', 'og_url', 'og_type',
          'twitter_card', 'twitter_site', 'twitter_creator', 'twitter_image',
          'canonical_url', 'robots', 'language', 'google_site_verification',
          'google_analytics', 'app_favicon'
        ]);
      
      if (error) throw error;
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' 
          ? item.value.replace(/^"|"$/g, '') 
          : JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      return configObj;
    }
  });

  useEffect(() => {
    if (!seoConfig) return;

    // Atualizar título
    if (seoConfig.seo_title) {
      document.title = seoConfig.seo_title;
    }

    // Função para criar ou atualizar meta tags
    const updateMetaTag = (name: string, content: string, attribute = 'name') => {
      if (!content) return;
      
      let metaTag = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attribute, name);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    };

    // Meta tags básicas
    updateMetaTag('description', seoConfig.seo_description || '');
    updateMetaTag('keywords', seoConfig.seo_keywords || '');
    updateMetaTag('author', seoConfig.seo_author || '');
    updateMetaTag('robots', seoConfig.robots || 'index,follow');

    // Open Graph
    updateMetaTag('og:title', seoConfig.og_title || seoConfig.seo_title || '', 'property');
    updateMetaTag('og:description', seoConfig.og_description || seoConfig.seo_description || '', 'property');
    updateMetaTag('og:image', seoConfig.og_image || '', 'property');
    updateMetaTag('og:url', seoConfig.og_url || '', 'property');
    updateMetaTag('og:type', seoConfig.og_type || 'website', 'property');

    // Twitter Card
    updateMetaTag('twitter:card', seoConfig.twitter_card || 'summary_large_image');
    updateMetaTag('twitter:site', seoConfig.twitter_site || '');
    updateMetaTag('twitter:creator', seoConfig.twitter_creator || '');
    updateMetaTag('twitter:image', seoConfig.twitter_image || seoConfig.og_image || '');

    // Google Site Verification
    updateMetaTag('google-site-verification', seoConfig.google_site_verification || '');

    // Idioma
    if (seoConfig.language) {
      document.documentElement.lang = seoConfig.language;
    }

    // URL Canônica
    if (seoConfig.canonical_url) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', seoConfig.canonical_url);
    }

    // Favicon
    if (seoConfig.app_favicon) {
      let faviconLink = document.querySelector('link[rel="icon"]');
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.setAttribute('rel', 'icon');
        faviconLink.setAttribute('type', 'image/png');
        document.head.appendChild(faviconLink);
      }
      faviconLink.setAttribute('href', seoConfig.app_favicon);
    }

    // Google Analytics
    if (seoConfig.google_analytics) {
      // Remover scripts existentes do GA
      const existingScripts = document.querySelectorAll('script[src*="googletagmanager"]');
      existingScripts.forEach(script => script.remove());

      // Adicionar novo script do GA4
      if (seoConfig.google_analytics.startsWith('G-')) {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${seoConfig.google_analytics}`;
        document.head.appendChild(gaScript);

        const gaConfigScript = document.createElement('script');
        gaConfigScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${seoConfig.google_analytics}');
        `;
        document.head.appendChild(gaConfigScript);
      }
    }

  }, [seoConfig]);

  return seoConfig;
};
