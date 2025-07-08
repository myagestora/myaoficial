
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
          'canonical_url', 'robots', 'language', 'google_site_verification',
          'google_analytics', 'app_favicon', 'facebook_pixel',
          'custom_head_scripts', 'custom_body_scripts'
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

    // Facebook Pixel
    if (seoConfig.facebook_pixel) {
      // Remover scripts existentes do Facebook Pixel
      const existingPixelScripts = document.querySelectorAll('script[data-facebook-pixel="true"]');
      existingPixelScripts.forEach(script => script.remove());

      // Adicionar novo script do Facebook Pixel
      const pixelScript = document.createElement('script');
      pixelScript.setAttribute('data-facebook-pixel', 'true');
      pixelScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${seoConfig.facebook_pixel}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(pixelScript);

      // Adicionar noscript para Facebook Pixel
      let pixelNoscript = document.querySelector('noscript[data-facebook-pixel="true"]');
      if (!pixelNoscript) {
        pixelNoscript = document.createElement('noscript');
        pixelNoscript.setAttribute('data-facebook-pixel', 'true');
        document.head.appendChild(pixelNoscript);
      }
      pixelNoscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${seoConfig.facebook_pixel}&ev=PageView&noscript=1" />`;
    }

    // Scripts personalizados no HEAD
    if (seoConfig.custom_head_scripts) {
      // Remover scripts personalizados existentes do head
      const existingHeadScripts = document.querySelectorAll('script[data-custom-head="true"], style[data-custom-head="true"], *[data-custom-head="true"]');
      existingHeadScripts.forEach(script => script.remove());

      // Adicionar novos scripts no head
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = seoConfig.custom_head_scripts;
      
      Array.from(tempDiv.children).forEach(element => {
        const newElement = element.cloneNode(true) as Element;
        newElement.setAttribute('data-custom-head', 'true');
        document.head.appendChild(newElement);
      });
    }

    // Scripts personalizados no BODY
    if (seoConfig.custom_body_scripts) {
      // Remover scripts personalizados existentes do body
      const existingBodyScripts = document.querySelectorAll('script[data-custom-body="true"], style[data-custom-body="true"], *[data-custom-body="true"]');
      existingBodyScripts.forEach(script => script.remove());

      // Adicionar novos scripts no body
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = seoConfig.custom_body_scripts;
      
      Array.from(tempDiv.children).forEach(element => {
        const newElement = element.cloneNode(true) as Element;
        newElement.setAttribute('data-custom-body', 'true');
        document.body.appendChild(newElement);
      });
    }

  }, [seoConfig]);

  return seoConfig;
};
