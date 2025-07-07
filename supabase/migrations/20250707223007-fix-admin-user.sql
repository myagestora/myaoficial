
-- Primeiro, vamos limpar qualquer usuário admin existente que possa estar com problemas
DELETE FROM auth.users WHERE email = 'adm@myagestora.com.br';
DELETE FROM public.profiles WHERE email = 'adm@myagestora.com.br';
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'adm@myagestora.com.br'
);

-- Criar o usuário admin corretamente
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'adm@myagestora.com.br',
  crypt('mYa@adm2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Fabiano Bim"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
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
