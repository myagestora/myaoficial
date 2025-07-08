
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PWAManifest = () => {
  const { data: seoConfig } = useQuery({
    queryKey: ['seo-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', [
          'seo_title',
          'seo_description',
          'app_favicon',
          'og_url'
        ]);
      
      if (error) throw error;
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      return configObj;
    }
  });

  useEffect(() => {
    if (!seoConfig) return;

    const generateManifest = () => {
      const manifest = {
        name: seoConfig.seo_title || 'Mya Finance Manager',
        short_name: 'Mya Finance',
        description: seoConfig.seo_description || 'Sistema inteligente de controle financeiro pessoal',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        orientation: 'portrait-primary',
        scope: '/',
        lang: 'pt-BR',
        categories: ['finance', 'productivity', 'business'],
        icons: [
          {
            src: seoConfig.app_favicon || '/favicon.ico',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: seoConfig.app_favicon || '/favicon.ico',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      };

      // Remove existing manifest link
      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (existingManifest) {
        existingManifest.remove();
      }

      // Create new manifest
      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: 'application/json'
      });
      const manifestURL = URL.createObjectURL(manifestBlob);

      // Add manifest link to head
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestURL;
      document.head.appendChild(link);

      console.log('PWA Manifest gerado:', manifest);
    };

    generateManifest();

    // Add PWA meta tags
    const addMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // PWA specific meta tags
    addMetaTag('mobile-web-app-capable', 'yes');
    addMetaTag('apple-mobile-web-app-capable', 'yes');
    addMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    addMetaTag('apple-mobile-web-app-title', seoConfig.seo_title || 'Mya Finance Manager');
    addMetaTag('application-name', seoConfig.seo_title || 'Mya Finance Manager');
    addMetaTag('msapplication-TileColor', '#3b82f6');
    addMetaTag('theme-color', '#3b82f6');

    // Apple touch icon
    if (seoConfig.app_favicon) {
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.setAttribute('rel', 'apple-touch-icon');
        document.head.appendChild(appleIcon);
      }
      appleIcon.setAttribute('href', seoConfig.app_favicon);
    }

  }, [seoConfig]);

  return null;
};
