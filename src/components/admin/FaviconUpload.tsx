import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface FaviconUploadProps {
  currentFaviconUrl: string;
  onFaviconChange: (newUrl: string) => void;
}

export const FaviconUpload: React.FC<FaviconUploadProps> = ({ 
  currentFaviconUrl, 
  onFaviconChange
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentFaviconUrl || '');
  const queryClient = useQueryClient();

  const saveFaviconToDatabase = async (faviconUrl: string) => {
    console.log('Salvando favicon no banco:', faviconUrl);
    
    try {
      const { data: existing } = await supabase
        .from('system_config')
        .select('id')
        .eq('key', 'app_favicon')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('system_config')
          .update({
            value: JSON.stringify(faviconUrl),
            updated_at: new Date().toISOString()
          })
          .eq('key', 'app_favicon');
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_config')
          .insert({
            key: 'app_favicon',
            value: JSON.stringify(faviconUrl),
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }

      // Atualizar o favicon no HTML imediatamente
      updateFaviconInHTML(faviconUrl);

      // Invalidar cache do SEO config para recarregar
      queryClient.invalidateQueries({ queryKey: ['seo-config'] });
      
      console.log('Favicon salvo no banco com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar favicon no banco:', error);
      throw error;
    }
  };

  const updateFaviconInHTML = (faviconUrl: string) => {
    // Remover todos os favicons existentes
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach(favicon => favicon.remove());

    if (faviconUrl) {
      // Adicionar novo favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconUrl;
      link.type = 'image/png';
      document.head.appendChild(link);

      // Também adicionar shortcut icon para melhor compatibilidade
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.href = faviconUrl;
      shortcutLink.type = 'image/png';
      document.head.appendChild(shortcutLink);

      console.log('Favicon atualizado no HTML:', faviconUrl);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Tipo de arquivo não suportado. Use PNG, JPG, GIF ou WebP.',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (2MB)
    if (file.size > 2097152) {
      toast({
        title: 'Erro',
        description: 'Arquivo muito grande. Máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      const fileExt = file.name.split('.').pop();
      const fileName = `favicon-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(publicUrl);
      onFaviconChange(publicUrl);

      await saveFaviconToDatabase(publicUrl);

      toast({
        title: 'Sucesso',
        description: 'Favicon enviado e aplicado com sucesso!',
      });

    } catch (error) {
      console.error('Erro no upload/salvamento:', error);
      setPreviewUrl(currentFaviconUrl || '');
      toast({
        title: 'Erro',
        description: 'Erro ao enviar favicon. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveFavicon = async () => {
    try {
      setPreviewUrl('');
      onFaviconChange('');
      
      await saveFaviconToDatabase('');
      
      toast({
        title: 'Favicon removido',
        description: 'Favicon removido com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao remover favicon:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover favicon.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="favicon_upload">Favicon</Label>
        <div className="mt-2 space-y-4">
          <div className="relative inline-block">
            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Favicon preview" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 text-xs">
                  <Upload className="mx-auto h-4 w-4 mb-1" />
                  <p>16x16</p>
                </div>
              )}
            </div>
            {previewUrl && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                onClick={handleRemoveFavicon}
                disabled={uploading}
              >
                <X className="h-2 w-2" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Input
              id="favicon_upload"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('favicon_upload')?.click()}
              disabled={uploading}
              className="flex items-center gap-2"
              size="sm"
            >
              {uploading ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  Escolher Favicon
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            Recomendado: 16x16px ou 32x32px. Formatos: PNG, JPG, GIF, WebP (máx. 2MB)
          </p>
        </div>
      </div>
    </div>
  );
};
