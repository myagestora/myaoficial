-- Script para testar manualmente o sistema de recuperação de carrinho

-- 1. Verificar se há configuração
SELECT '=== CONFIGURAÇÃO ===' as info;
SELECT * FROM cart_recovery_config;

-- 2. Verificar se há templates
SELECT '=== TEMPLATES ===' as info;
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

-- 4. Verificar agendamentos
SELECT '=== AGENDAMENTOS ===' as info;
SELECT 
  crs.id,
  crs.cart_session_id,
  crs.attempt_number,
  crs.scheduled_at,
  crs.status,
  crs.processed_at,
  crs.error_message,
  cs.session_id,
  cs.user_name,
  cs.user_whatsapp
FROM cart_recovery_schedules crs
LEFT JOIN cart_sessions cs ON crs.cart_session_id = cs.id
ORDER BY crs.scheduled_at DESC;

-- 5. Verificar tentativas
SELECT '=== TENTATIVAS ===' as info;
SELECT 
  cra.id,
  cra.cart_session_id,
  cra.attempt_number,
  cra.method,
  cra.status,
  cra.sent_at,
  cra.error_message,
  cs.session_id,
  cs.user_name,
  cs.user_whatsapp
FROM cart_recovery_attempts cra
LEFT JOIN cart_sessions cs ON cra.cart_session_id = cs.id
ORDER BY cra.created_at DESC;

-- 6. Marcar uma sessão como abandonada para teste (descomente e ajuste o session_id)
-- UPDATE cart_sessions 
-- SET status = 'abandoned', abandoned_at = NOW()
-- WHERE session_id = 'session_1753841467936_sjk4e8950' -- Substitua pelo session_id real
-- AND status = 'active';

-- 7. Criar agendamento manual para teste (descomente e ajuste)
-- INSERT INTO cart_recovery_schedules (
--   cart_session_id,
--   attempt_number,
--   scheduled_at,
--   status
-- ) VALUES (
--   (SELECT id FROM cart_sessions WHERE session_id = 'session_1753841467936_sjk4e8950'),
--   1,
--   NOW() - INTERVAL '1 minute', -- Agendado para 1 minuto atrás (deve ser processado imediatamente)
--   'pending'
-- );

-- 8. Verificar configuração do WhatsApp
SELECT '=== CONFIGURAÇÃO WHATSAPP ===' as info;
SELECT 
  key,
  value
FROM system_config 
WHERE key LIKE '%evolution%' OR key LIKE '%whatsapp%'; 