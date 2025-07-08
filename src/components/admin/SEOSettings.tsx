
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SEOSettingsProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
}

export const SEOSettings: React.FC<SEOSettingsProps> = ({ settings, onInputChange }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Básicas de SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seo_title">Título do Site</Label>
            <Input
              id="seo_title"
              value={settings.seo_title || ''}
              onChange={(e) => onInputChange('seo_title', e.target.value)}
              placeholder="Ex: MYA Gestora - Controle Financeiro"
              maxLength={60}
            />
            <p className="text-xs text-gray-500 mt-1">Recomendado: até 60 caracteres</p>
          </div>

          <div>
            <Label htmlFor="seo_description">Descrição do Site</Label>
            <Textarea
              id="seo_description"
              value={settings.seo_description || ''}
              onChange={(e) => onInputChange('seo_description', e.target.value)}
              placeholder="Descrição que aparece nos resultados de busca..."
              maxLength={160}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">Recomendado: até 160 caracteres</p>
          </div>

          <div>
            <Label htmlFor="seo_keywords">Palavras-chave</Label>
            <Input
              id="seo_keywords"
              value={settings.seo_keywords || ''}
              onChange={(e) => onInputChange('seo_keywords', e.target.value)}
              placeholder="controle financeiro, gestão, finanças, economia"
            />
            <p className="text-xs text-gray-500 mt-1">Separe as palavras-chave por vírgula</p>
          </div>

          <div>
            <Label htmlFor="seo_author">Autor</Label>
            <Input
              id="seo_author"
              value={settings.seo_author || ''}
              onChange={(e) => onInputChange('seo_author', e.target.value)}
              placeholder="Nome do autor ou empresa"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Graph (Redes Sociais)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="og_title">Título do Open Graph</Label>
            <Input
              id="og_title"
              value={settings.og_title || ''}
              onChange={(e) => onInputChange('og_title', e.target.value)}
              placeholder="Título que aparece ao compartilhar nas redes sociais"
            />
          </div>

          <div>
            <Label htmlFor="og_description">Descrição do Open Graph</Label>
            <Textarea
              id="og_description"
              value={settings.og_description || ''}
              onChange={(e) => onInputChange('og_description', e.target.value)}
              placeholder="Descrição que aparece ao compartilhar nas redes sociais"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="og_image">URL da Imagem do Open Graph</Label>
            <Input
              id="og_image"
              value={settings.og_image || ''}
              onChange={(e) => onInputChange('og_image', e.target.value)}
              placeholder="https://exemplo.com/imagem-compartilhamento.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Recomendado: 1200x630px</p>
          </div>

          <div>
            <Label htmlFor="og_url">URL do Site</Label>
            <Input
              id="og_url"
              value={settings.og_url || ''}
              onChange={(e) => onInputChange('og_url', e.target.value)}
              placeholder="https://meusite.com"
            />
          </div>

          <div>
            <Label htmlFor="og_type">Tipo de Conteúdo</Label>
            <select 
              id="og_type"
              className="w-full p-2 border rounded-md"
              value={settings.og_type || 'website'}
              onChange={(e) => onInputChange('og_type', e.target.value)}
            >
              <option value="website">Website</option>
              <option value="article">Artigo</option>
              <option value="product">Produto</option>
              <option value="profile">Perfil</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facebook Pixel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="facebook_pixel">ID do Facebook Pixel</Label>
            <Input
              id="facebook_pixel"
              value={settings.facebook_pixel || ''}
              onChange={(e) => onInputChange('facebook_pixel', e.target.value)}
              placeholder="123456789012345"
            />
            <p className="text-xs text-gray-500 mt-1">O ID numérico do seu Facebook Pixel</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="canonical_url">URL Canônica</Label>
            <Input
              id="canonical_url"
              value={settings.canonical_url || ''}
              onChange={(e) => onInputChange('canonical_url', e.target.value)}
              placeholder="https://meusite.com"
            />
            <p className="text-xs text-gray-500 mt-1">URL preferida para esta página</p>
          </div>

          <div>
            <Label htmlFor="robots">Robots</Label>
            <select 
              id="robots"
              className="w-full p-2 border rounded-md"
              value={settings.robots || 'index,follow'}
              onChange={(e) => onInputChange('robots', e.target.value)}
            >
              <option value="index,follow">Index, Follow</option>
              <option value="noindex,follow">No Index, Follow</option>
              <option value="index,nofollow">Index, No Follow</option>
              <option value="noindex,nofollow">No Index, No Follow</option>
            </select>
          </div>

          <div>
            <Label htmlFor="language">Idioma</Label>
            <select 
              id="language"
              className="w-full p-2 border rounded-md"
              value={settings.language || 'pt-BR'}
              onChange={(e) => onInputChange('language', e.target.value)}
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="pt-PT">Português (Portugal)</option>
              <option value="en-US">Inglês (EUA)</option>
              <option value="es-ES">Espanhol</option>
            </select>
          </div>

          <div>
            <Label htmlFor="google_site_verification">Google Site Verification</Label>
            <Input
              id="google_site_verification"
              value={settings.google_site_verification || ''}
              onChange={(e) => onInputChange('google_site_verification', e.target.value)}
              placeholder="Código de verificação do Google Search Console"
            />
          </div>

          <div>
            <Label htmlFor="google_analytics">Google Analytics ID</Label>
            <Input
              id="google_analytics"
              value={settings.google_analytics || ''}
              onChange={(e) => onInputChange('google_analytics', e.target.value)}
              placeholder="G-XXXXXXXXXX ou UA-XXXXXXXXX"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scripts Personalizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="custom_head_scripts">Scripts no HEAD</Label>
            <Textarea
              id="custom_head_scripts"
              value={settings.custom_head_scripts || ''}
              onChange={(e) => onInputChange('custom_head_scripts', e.target.value)}
              placeholder="<script>console.log('Hello World');</script>"
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-1">Códigos que serão inseridos no &lt;head&gt; da página</p>
          </div>

          <div>
            <Label htmlFor="custom_body_scripts">Scripts no BODY</Label>
            <Textarea
              id="custom_body_scripts"
              value={settings.custom_body_scripts || ''}
              onChange={(e) => onInputChange('custom_body_scripts', e.target.value)}
              placeholder="<script>console.log('Body loaded');</script>"
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-1">Códigos que serão inseridos no final do &lt;body&gt;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
