-- Desativar cron job de recuperação de carrinho
-- Execute este SQL no Supabase SQL Editor

-- 1. Listar todos os cron jobs ativos
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job;

-- 2. Desativar cron job específico (substitua JOB_ID pelo ID real)
-- UPDATE cron.job SET active = false WHERE jobid = JOB_ID;

-- 3. OU desativar todos os cron jobs relacionados a cart recovery
UPDATE cron.job 
SET active = false 
WHERE command LIKE '%cart_recovery%' 
   OR command LIKE '%process-cart-recovery%'
   OR command LIKE '%track-cart-session%';

-- 4. Verificar se foram desativados
SELECT 
    jobid,
    schedule,
    command,
    active
FROM cron.job 
WHERE command LIKE '%cart_recovery%' 
   OR command LIKE '%process-cart-recovery%'
   OR command LIKE '%track-cart-session%';

-- 5. Para remover completamente (CUIDADO - isso remove permanentemente)
-- DELETE FROM cron.job WHERE command LIKE '%cart_recovery%';

-- 6. Verificar todos os cron jobs ativos
SELECT 
    jobid,
    schedule,
    command,
    active
FROM cron.job 
WHERE active = true; 