-- Script para testar recuperação de carrinho manualmente

-- 1. Verificar configuração atual
SELECT '=== CONFIGURAÇÃO ATUAL ===' as info;
SELECT * FROM cart_recovery_config;

-- 2. Verificar templates disponíveis
SELECT '=== TEMPLATES DISPONÍVEIS ===' as info;
SELECT name, type, is_active FROM cart_recovery_templates ORDER BY name;

-- 3. Verificar sessões de carrinho
SELECT '=== SESSÕES DE CARRINHO ===' as info;
SELECT 
  id,
  session_id,
  user_name,
  user_email,
  user_whatsapp,
  amount,
  status,
  created_at,
  abandoned_at,
  completed_at
FROM cart_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Verificar tentativas de recuperação
SELECT '=== TENTATIVAS DE RECUPERAÇÃO ===' as info;
SELECT 
  cra.id,
  cra.cart_session_id,
  cra.attempt_number,
  cra.method,
  cra.status,
  cra.sent_at,
  cra.error_message,
  cs.user_name,
  cs.user_whatsapp
FROM cart_recovery_attempts cra
LEFT JOIN cart_sessions cs ON cra.cart_session_id = cs.id
ORDER BY cra.created_at DESC;

-- 5. Marcar uma sessão como abandonada para teste (descomente se necessário)
-- UPDATE cart_sessions 
-- SET status = 'abandoned', abandoned_at = NOW()
-- WHERE session_id = 'session_1753841467936_sjk4e8950' -- Substitua pelo session_id real
-- AND status = 'active';

-- 6. Verificar se há configuração de WhatsApp
SELECT '=== CONFIGURAÇÃO WHATSAPP ===' as info;
SELECT 
  key,
  value
FROM system_config 
WHERE key LIKE '%evolution%' OR key LIKE '%whatsapp%'; 