
-- Permitir múltiplos valores NULL para WhatsApp, mas manter unicidade para valores não-NULL
DROP INDEX IF EXISTS profiles_whatsapp_unique_idx;

-- Criar índice único parcial que ignora valores NULL e vazios
CREATE UNIQUE INDEX profiles_whatsapp_unique_idx 
ON public.profiles (whatsapp) 
WHERE whatsapp IS NOT NULL AND whatsapp != '';

-- Atualizar registros existentes com WhatsApp vazio para NULL
UPDATE public.profiles 
SET whatsapp = NULL 
WHERE whatsapp = '' OR whatsapp IS NULL;

-- Atualizar a função handle_new_user para tratar valores vazios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  whatsapp_value TEXT;
BEGIN
  -- Tratar WhatsApp vazio como NULL
  whatsapp_value := NEW.raw_user_meta_data ->> 'whatsapp';
  IF whatsapp_value = '' OR whatsapp_value IS NULL THEN
    whatsapp_value := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, whatsapp)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    whatsapp_value
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;
