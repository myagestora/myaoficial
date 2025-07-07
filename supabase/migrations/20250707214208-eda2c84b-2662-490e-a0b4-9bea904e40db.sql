
-- Adicionar campo status na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN subscription_status TEXT DEFAULT 'inactive';

-- Criar função para sincronizar o status da assinatura com o perfil
CREATE OR REPLACE FUNCTION public.sync_profile_subscription_status()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Atualizar o status no perfil quando uma assinatura for inserida/atualizada
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles 
    SET subscription_status = NEW.status::TEXT
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  
  -- Quando uma assinatura for deletada, definir como inactive
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET subscription_status = 'inactive'
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger para sincronizar automaticamente
CREATE TRIGGER sync_subscription_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_subscription_status();

-- Atualizar registros existentes para sincronizar o status atual
UPDATE public.profiles 
SET subscription_status = COALESCE(
  (SELECT us.status::TEXT 
   FROM public.user_subscriptions us 
   WHERE us.user_id = profiles.id 
   ORDER BY us.created_at DESC 
   LIMIT 1), 
  'inactive'
);
