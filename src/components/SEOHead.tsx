
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDynamicSupabaseUrl, getStorageUrl } from '@/utils/supabaseConfigClient';

export const SEOHead = () => {
  const { data: seoConfig } = useQuery({
    queryKey: ['seo-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', [
          'seo_title',
          'seo_description', 
          'seo_keywords',
          'seo_author',
          'og_title',
          'og_description',
          'og_image',
          'og_url',
          'og_type',
          'canonical_url',
          'robots',
          'language',
          'google_site_verification',
          'google_analytics',
          'facebook_pixel',
          'custom_head_scripts',
          'custom_body_scripts',
          'app_favicon',
          'api_enabled',
          'api_domain'
        ]);
      
      if (error) throw error;
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      // Se favicon não estiver configurado, usar URL dinâmica para o logo padrão
      if (!configObj.app_favicon) {
        const dynamicFaviconUrl = await getStorageUrl('logos', 'logo-1751933896307.png');
        configObj.app_favicon = dynamicFaviconUrl;
      }
      
      // Usar URL dinâmica para og_image se não configurada
      if (!configObj.og_image) {
        const dynamicImageUrl = await getStorageUrl('logos', 'logo-1751933896307.png');
        configObj.og_image = dynamicImageUrl;
      }
      
      return configObj;
    }
  });

  useEffect(() => {
    if (!seoConfig) return;

    // Update document title
    if (seoConfig.seo_title) {
      document.title = seoConfig.seo_title;
    }

    // Update favicon
    const updateFavicon = (faviconUrl: string) => {
      // Remove all existing favicons
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(favicon => favicon.remove());

      if (faviconUrl) {
        // Add new favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = faviconUrl;
        link.type = 'image/png';
        document.head.appendChild(link);

        // Also add shortcut icon for better compatibility
        const shortcutLink = document.createElement('link');
        shortcutLink.rel = 'shortcut icon';
        shortcutLink.href = faviconUrl;
        shortcutLink.type = 'image/png';
        document.head.appendChild(shortcutLink);

        // Add apple-touch-icon for PWA
        const appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        appleLink.href = faviconUrl;
        document.head.appendChild(appleLink);

        console.log('Favicon atualizado para:', faviconUrl);
      }
    };


    // Apply favicon if configured
    if (seoConfig.app_favicon) {
      updateFavicon(seoConfig.app_favicon);
    }


    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, attribute = 'name') => {
      if (!content) return;
      
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic SEO tags
    updateMetaTag('description', seoConfig.seo_description);
    updateMetaTag('keywords', seoConfig.seo_keywords);
    updateMetaTag('author', seoConfig.seo_author);
    updateMetaTag('robots', seoConfig.robots || 'index,follow');
    
    // Language
    if (seoConfig.language) {
      document.documentElement.lang = seoConfig.language;
    }

    // Open Graph tags
    updateMetaTag('og:title', seoConfig.og_title || seoConfig.seo_title, 'property');
    updateMetaTag('og:description', seoConfig.og_description || seoConfig.seo_description, 'property');
    updateMetaTag('og:image', seoConfig.og_image, 'property');
    updateMetaTag('og:url', seoConfig.og_url, 'property');
    updateMetaTag('og:type', seoConfig.og_type || 'website', 'property');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seoConfig.og_title || seoConfig.seo_title);
    updateMetaTag('twitter:description', seoConfig.og_description || seoConfig.seo_description);
    updateMetaTag('twitter:image', seoConfig.og_image);

    // Canonical URL
    if (seoConfig.canonical_url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', seoConfig.canonical_url);
    }

    // Google Site Verification
    if (seoConfig.google_site_verification) {
      updateMetaTag('google-site-verification', seoConfig.google_site_verification);
    }

    // Google Analytics
    if (seoConfig.google_analytics) {
      // Remove existing GA scripts
      const existingGA = document.querySelectorAll('script[src*="googletagmanager"], script[src*="google-analytics"]');
      existingGA.forEach(script => script.remove());

      // Add new GA script
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${seoConfig.google_analytics}`;
      document.head.appendChild(gaScript);

      const gaConfig = document.createElement('script');
      gaConfig.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${seoConfig.google_analytics}');
      `;
      document.head.appendChild(gaConfig);
    }

    // Facebook Pixel
    if (seoConfig.facebook_pixel) {
      const fbPixel = document.createElement('script');
      fbPixel.innerHTML = `
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
      document.head.appendChild(fbPixel);
    }

    // Custom head scripts
    if (seoConfig.custom_head_scripts) {
      const customHead = document.createElement('div');
      customHead.innerHTML = seoConfig.custom_head_scripts;
      Array.from(customHead.children).forEach(child => {
        document.head.appendChild(child);
      });
    }

    // Custom body scripts
    if (seoConfig.custom_body_scripts) {
      const customBody = document.createElement('div');
      customBody.innerHTML = seoConfig.custom_body_scripts;
      Array.from(customBody.children).forEach(child => {
        document.body.appendChild(child);
      });
    }

  }, [seoConfig]);

  return null;
};
