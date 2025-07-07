

-- Inserir o usuário admin diretamente na tabela auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'adm@myagestora.com.br',
  crypt('mYa@adm2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Fabiano Bim"}',
  false,
  'authenticated'
);

-- Inserir o perfil do admin
INSERT INTO public.profiles (id, full_name, email)
SELECT 
  id,
  'Fabiano Bim',
  'adm@myagestora.com.br'
FROM auth.users 
WHERE email = 'adm@myagestora.com.br';

-- Dar permissão de admin ao usuário
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  'admin'::app_role
FROM auth.users 
WHERE email = 'adm@myagestora.com.br';

-- Remover a coluna CPF da tabela profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpf;

-- Atualizar a função handle_new_user para não incluir CPF
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, whatsapp)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'whatsapp'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

