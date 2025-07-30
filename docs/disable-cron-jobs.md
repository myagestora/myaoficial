# Como Desativar Cron Jobs no Supabase

## 🚨 Erro de Permissão
Se você recebeu o erro `permission denied for table job`, significa que não tem acesso direto à tabela `cron.job`.

## ✅ Soluções

### **Opção 1: Via Supabase Dashboard (Recomendado)**

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Navegue para Database → Extensions**
   - Menu lateral → Database → Extensions

3. **Procure por "pg_cron"**
   - Se estiver ativo, você verá os cron jobs listados
   - Clique em "Manage" ou "Configure"

4. **Desative os cron jobs**
   - Procure por jobs relacionados a `cart_recovery`
   - Desative ou delete os jobs encontrados

### **Opção 2: Via SQL com permissões adequadas**

Se você tem acesso de superuser ou permissões especiais:

```sql
-- Verificar se você tem permissão
SELECT has_table_privilege('cron.job', 'SELECT');

-- Se tiver permissão, execute:
SELECT 
    jobid,
    schedule,
    command,
    active
FROM cron.job 
WHERE command LIKE '%cart_recovery%';

-- Desativar jobs específicos
UPDATE cron.job 
SET active = false 
WHERE command LIKE '%cart_recovery%';
```

### **Opção 3: Via Edge Function**

Criar uma Edge Function para gerenciar cron jobs:

```typescript
// supabase/functions/manage-cron/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Listar cron jobs
  const { data, error } = await supabase.rpc('list_cron_jobs')
  
  return new Response(JSON.stringify({ data, error }))
})
```

### **Opção 4: Contatar Suporte**

Se nenhuma das opções funcionar:

1. **Supabase Support**: https://supabase.com/support
2. **GitHub Issues**: https://github.com/supabase/supabase/issues
3. **Discord**: https://discord.supabase.com

## 🔍 Verificar se os cron jobs foram desativados

### **Via Dashboard:**
- Database → Extensions → pg_cron
- Verifique se os jobs estão inativos

### **Via Logs:**
- Edge Functions → Logs
- Verifique se não há mais execuções automáticas

### **Via Database:**
```sql
-- Verificar se há processos de cron rodando
SELECT * FROM pg_stat_activity 
WHERE query LIKE '%cron%' 
   OR query LIKE '%cart_recovery%';
```

## 📋 Cron Jobs que devem ser desativados

Procure por estes padrões nos cron jobs:
- `process-cart-recovery`
- `track-cart-session`
- `cart_recovery`
- `cart_recovery_schedules`

## ✅ Após desativar

1. **Teste a API manualmente**
2. **Verifique se não há mais execuções automáticas**
3. **Monitore os logs por alguns dias**

---

**Nota:** Se você não conseguir desativar via dashboard, pode simplesmente ignorar os cron jobs. Eles não afetarão o funcionamento da nova API REST. 