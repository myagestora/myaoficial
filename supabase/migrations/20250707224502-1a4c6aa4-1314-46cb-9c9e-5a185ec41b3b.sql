
-- Limpar completamente o usuário admin existente
DELETE FROM auth.users WHERE email = 'adm@myagestora.com.br';
DELETE FROM public.profiles WHERE email = 'adm@myagestora.com.br';
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'adm@myagestora.com.br'
);

-- Criar o usuário admin diretamente no auth.users com senha criptografada
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  email_change_sent_at,
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
  'f8baa6c5-57a9-4534-94f7-0d46d6b1b252',
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

-- Criar o perfil do admin
INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
VALUES (
  'f8baa6c5-57a9-4534-94f7-0d46d6b1b252',
  'Fabiano Bim',
  'adm@myagestora.com.br',
  NOW(),
  NOW()
);

-- Dar permissão de admin
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES (
  'f8baa6c5-57a9-4534-94f7-0d46d6b1b252',
  'admin',
  NOW()
);
