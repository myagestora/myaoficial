# API de Recuperação de Carrinho

Esta API permite gerenciar externamente o processo de recuperação de carrinhos abandonados.

## 🔑 Autenticação

Todas as requisições devem incluir um header de autorização:

```
Authorization: Bearer YOUR_API_KEY
```

**API Key:**
Use a **Service Role Key** padrão do Supabase:
1. Vá para: Supabase Dashboard → Settings → API
2. Copie a **Service Role Key** (anonymus key não funciona)
3. Use essa chave nas requisições

## 📋 Endpoints

### 1. Listar Carrinhos Abandonados

**GET** `/cart-recovery-api/abandoned`

Retorna carrinhos abandonados com filtros e paginação.

**Parâmetros de Query:**
- `status` (opcional): Filtrar por status (`abandoned`, `active`, `converted`, `completed`)
- `start_date` (opcional): Data inicial (formato: `YYYY-MM-DD`)
- `end_date` (opcional): Data final (formato: `YYYY-MM-DD`)
- `email` (opcional): Filtrar por email (busca parcial)
- `whatsapp` (opcional): Filtrar por WhatsApp (busca parcial)
- `minutes` (opcional): Filtrar sessões dos últimos X minutos
- `limit` (opcional): Limite de resultados (padrão: 50)
- `offset` (opcional): Offset para paginação (padrão: 0)

**Exemplos:**
```bash
# Buscar apenas abandonados (padrão)
GET /cart-recovery-api/abandoned

# Filtrar por data
GET /cart-recovery-api/abandoned?start_date=2025-07-01&end_date=2025-07-31

# Filtrar por email
GET /cart-recovery-api/abandoned?email=joao@email.com

# Filtrar sessões dos últimos 5 minutos
GET /cart-recovery-api/abandoned?minutes=5

# Paginação
GET /cart-recovery-api/abandoned?limit=10&offset=20

# Buscar todos os status
GET /cart-recovery-api/abandoned?status=converted
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "session_id": "session_123...",
      "user_name": "João Silva",
      "user_email": "joao@email.com",
      "user_whatsapp": "+5531984798496",
      "amount": 29.90,
      "frequency": "monthly",
      "created_at": "2025-07-29T23:51:28.000Z",
      "abandoned_at": "2025-07-29T23:56:28.000Z",
      "status": "abandoned",
      "subscription_plans": {
        "id": "uuid",
        "name": "Plano Básico",
        "description": "Plano básico mensal"
      },
      "attempts": [
        {
          "attempt_number": 1,
          "method": "whatsapp",
          "status": "sent",
          "sent_at": "2025-07-29T23:56:28.000Z",
          "error_message": null
        }
      ]
    }
  ],
  "count": 1
},
"total_count": 150,
"pagination": {
  "limit": 50,
  "offset": 0,
  "has_more": true
},
"filters": {
  "status": "abandoned",
  "start_date": "2025-07-01",
  "end_date": "2025-07-31",
  "email": null,
  "whatsapp": null,
  "minutes": null
}
}

### 2. Obter Configurações de Recuperação

**GET** `/cart-recovery-api/config`

Retorna as configurações de recuperação, templates e configurações do WhatsApp.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "config": {
      "enabled": true,
      "whatsapp_enabled": true,
      "email_enabled": false,
      "delay_minutes": 5,
      "max_attempts": 3
    },
    "templates": [
      {
        "id": "uuid",
        "name": "Tentativa 1",
        "type": "whatsapp",
        "content": "Olá {{user_name}}! 👋\n\nNotamos que você estava interessado no plano {{plan_name}} por {{amount}}/{{frequency}}, mas não finalizou sua assinatura.\n\nQue tal aproveitar um desconto especial de 10%?\n\n💰 Valor original: {{original_amount}}\n🎉 Com desconto: {{discount_amount}}\n\nClique aqui para finalizar: {{checkout_url}}\n\nAtenciosamente,\nEquipe MYA",
        "is_active": true
      }
    ],
    "whatsapp": {
      "evolution_api_url": "https://api.evolution.com",
      "evolution_api_key": "your-api-key",
      "evolution_instance_name": "mya-instance"
    }
  }
}
```

### 3. Atualizar Status da Sessão

**PUT** `/cart-recovery-api/session`

Atualiza o status de uma sessão de carrinho.

**Body:**
```json
{
  "sessionId": "session_123...",
  "status": "completed|converted|abandoned",
  "metadata": {
    "conversion_source": "whatsapp",
    "payment_method": "pix"
  }
}
```

**Status disponíveis:**
- `completed`: Carrinho foi finalizado
- `converted`: Carrinho foi convertido em venda
- `abandoned`: Carrinho foi abandonado

**Resposta:**
```json
{
  "success": true,
  "message": "Session status updated successfully"
}
```

### 4. Registrar Tentativa de Envio

**POST** `/cart-recovery-api/attempt`

Registra uma tentativa de envio de mensagem de recuperação.

**Body:**
```json
{
  "sessionId": "session_123...",
  "attemptNumber": 1,
  "method": "whatsapp|email",
  "status": "sent|failed",
  "messageContent": "Conteúdo da mensagem enviada",
  "messageId": "whatsapp-message-id",
  "errorMessage": "Erro se status = failed"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Attempt recorded successfully"
}
```

### 5. Marcar Carrinhos como Convertidos

**POST** `/mark-cart-converted`

Marca sessões de carrinho como convertidas quando o usuário ativa um plano.

**Body:**
```json
{
  "userEmail": "joao@email.com",
  "userWhatsapp": "+5531984798496",
  "userId": "uuid-do-usuario"
}
```

**Nota:** Pelo menos um dos campos deve ser fornecido.

**Resposta:**
```json
{
  "success": true,
  "message": "Cart sessions marked as converted",
  "converted_count": 2,
  "sessions": [
    {
      "session_id": "session_123...",
      "user_email": "joao@email.com",
      "user_whatsapp": "+5531984798496",
      "previous_status": "abandoned"
    }
  ]
}
```

**Uso Automático:**
Este endpoint é chamado automaticamente pelo webhook de pagamento quando um usuário ativa um plano, marcando todos os carrinhos abandonados como convertidos.

### 6. Gerenciar Templates

**POST** `/manage-cart-templates`

Sincroniza templates com a configuração de tentativas. Cria ou remove templates automaticamente baseado no `max_attempts`.

**Body:**
```json
{
  "action": "sync"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Templates sincronizados com sucesso",
  "max_attempts": 3,
  "results": {
    "created": 4,
    "deleted": 2,
    "errors": []
  }
}
```

**GET** `/manage-cart-templates`

Lista todos os templates de recuperação.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tentativa 1",
      "type": "whatsapp",
      "attempt_number": 1,
      "content": "Olá {{user_name}}! 👋...",
      "is_active": true
    }
  ],
  "count": 6
}
```

Marca sessões de carrinho como convertidas quando o usuário ativa um plano.

**Body:**
```json
{
  "userEmail": "joao@email.com",
  "userWhatsapp": "+5531984798496",
  "userId": "uuid-do-usuario"
}
```

**Nota:** Pelo menos um dos campos deve ser fornecido.

**Resposta:**
```json
{
  "success": true,
  "message": "Cart sessions marked as converted",
  "converted_count": 2,
  "sessions": [
    {
      "session_id": "session_123...",
      "user_email": "joao@email.com",
      "user_whatsapp": "+5531984798496",
      "previous_status": "abandoned"
    }
  ]
}
```

**Uso Automático:**
Este endpoint é chamado automaticamente pelo webhook de pagamento quando um usuário ativa um plano, marcando todos os carrinhos abandonados como convertidos.

## 🔄 Fluxo de Trabalho

### 1. Detectar Abandono
```sql
-- Marcar sessões ativas como abandonadas após X minutos
UPDATE cart_sessions 
SET status = 'abandoned', abandoned_at = NOW()
WHERE status = 'active' 
AND created_at < NOW() - INTERVAL '5 minutes';
```

### 2. Buscar Carrinhos Abandonados
```bash
curl -X GET "https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1/cart-recovery-api/abandoned" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 3. Obter Configurações
```bash
curl -X GET "https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1/cart-recovery-api/config" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 4. Enviar Mensagem
```javascript
// Exemplo de envio via Evolution API
const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': evolutionKey
  },
  body: JSON.stringify({
    number: cleanWhatsAppNumber, // Remover o + do número
    text: messageContent
  })
});
```

### 5. Registrar Tentativa
```bash
curl -X POST "https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1/cart-recovery-api/attempt" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123...",
    "attemptNumber": 1,
    "method": "whatsapp",
    "status": "sent",
    "messageContent": "Mensagem enviada...",
    "messageId": "whatsapp-message-id"
  }'
```

### 6. Atualizar Status (se convertido)
```bash
curl -X PUT "https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1/cart-recovery-api/session" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123...",
    "status": "converted",
    "metadata": {
      "conversion_source": "whatsapp",
      "attempt_number": 1
    }
  }'
```

## 📊 Variáveis dos Templates

Os templates suportam as seguintes variáveis:

- `{{user_name}}`: Nome do usuário
- `{{plan_name}}`: Nome do plano
- `{{amount}}`: Valor do plano (ex: R$ 29,90)
- `{{frequency}}`: Frequência (mês/ano)
- `{{original_amount}}`: Valor original
- `{{discount_amount}}`: Valor com desconto
- `{{final_amount}}`: Valor final
- `{{checkout_url}}`: URL de checkout personalizada

## 🚨 Códigos de Erro

- `401`: API Key inválida ou ausente
- `400`: Dados obrigatórios ausentes
- `404`: Sessão não encontrada
- `500`: Erro interno do servidor

## 📝 Exemplo de Implementação

```javascript
// Exemplo de script para processar carrinhos abandonados
async function processAbandonedCarts() {
  // 1. Buscar carrinhos abandonados
  const abandonedResponse = await fetch('/cart-recovery-api/abandoned', {
    headers: { 'Authorization': 'Bearer YOUR_SERVICE_ROLE_KEY' }
  });
  const { data: abandonedCarts } = await abandonedResponse.json();

  // 2. Buscar configurações
  const configResponse = await fetch('/cart-recovery-api/config', {
    headers: { 'Authorization': 'Bearer YOUR_SERVICE_ROLE_KEY' }
  });
  const { data: config } = await configResponse.json();

  // 3. Processar cada carrinho
  for (const cart of abandonedCarts) {
    const attempts = cart.attempts || [];
    const nextAttempt = attempts.length + 1;

    if (nextAttempt <= config.config.max_attempts) {
      // Enviar mensagem
      const template = config.templates.find(t => 
        t.name.includes(`Tentativa ${nextAttempt}`) && t.type === 'whatsapp'
      );

      if (template) {
        // Processar template e enviar
        const messageContent = processTemplate(template.content, cart);
        
        // Enviar via Evolution API
        const result = await sendWhatsApp(cart.user_whatsapp, messageContent);
        
        // Registrar tentativa
        await recordAttempt(cart.session_id, nextAttempt, 'whatsapp', 'sent', messageContent);
      }
    }
  }
}
``` 