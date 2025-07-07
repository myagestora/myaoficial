
-- Criar bucket para uploads de logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Política para permitir upload de logos (apenas admins)
CREATE POLICY "Admins can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND 
    public.is_admin(auth.uid())
  );

-- Política para permitir leitura pública das logos
CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Política para admins atualizarem/deletarem logos
CREATE POLICY "Admins can update/delete logos" ON storage.objects
  FOR ALL USING (
    bucket_id = 'logos' AND 
    public.is_admin(auth.uid())
  );
