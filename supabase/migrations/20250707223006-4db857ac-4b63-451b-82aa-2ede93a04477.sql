
-- Inserir o usuário admin na tabela profiles
-- Primeiro, vamos buscar o ID do usuário admin do auth.users
INSERT INTO public.profiles (id, full_name, email)
SELECT 
  id,
  'Fabiano Bim',
  'adm@myagestora.com.br'
FROM auth.users 
WHERE email = 'adm@myagestora.com.br'
ON CONFLICT (id) DO NOTHING;

-- Garantir que o usuário admin tenha a role de admin
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  'admin'::app_role
FROM auth.users 
WHERE email = 'adm@myagestora.com.br'
ON CONFLICT (user_id, role) DO NOTHING;
