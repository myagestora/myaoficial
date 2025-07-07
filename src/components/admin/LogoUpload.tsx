
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LogoUploadProps {
  currentLogoUrl: string;
  onLogoChange: (newUrl: string) => void;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ 
  currentLogoUrl, 
  onLogoChange 
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Tipo de arquivo não suportado. Use JPG, PNG, GIF, WebP ou SVG.',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5242880) {
      toast({
        title: 'Erro',
        description: 'Arquivo muito grande. Máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Upload para o bucket
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

      // Atualizar a configuração
      onLogoChange(publicUrl);
      setPreviewUrl(publicUrl);

      toast({
        title: 'Sucesso',
        description: 'Logo enviado com sucesso!',
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar logo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePreview = () => {
    setPreviewUrl(null);
  };

  const displayUrl = previewUrl || currentLogoUrl;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="logo_upload">Upload do Logo</Label>
        <div className="mt-2 space-y-4">
          {/* Preview do logo atual */}
          {displayUrl && (
            <div className="relative inline-block">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <img 
                  src={displayUrl} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              {previewUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemovePreview}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          
          {/* Input de upload */}
          <div className="flex items-center gap-4">
            <Input
              id="logo_upload"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('logo_upload')?.click()}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Escolher Arquivo
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            Formatos suportados: JPG, PNG, GIF, WebP, SVG (máx. 5MB)
          </p>
        </div>
      </div>
    </div>
  );
};
