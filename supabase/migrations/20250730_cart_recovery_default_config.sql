-- Inserir configuração padrão de recuperação de carrinho
INSERT INTO cart_recovery_config (
  enabled,
  whatsapp_enabled,
  email_enabled,
  delay_minutes,
  max_attempts,
  created_at,
  updated_at
) VALUES (
  true,
  true,
  false,
  5, -- 5 minutos de delay
  3, -- 3 tentativas
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Inserir templates padrão de WhatsApp se não existirem
INSERT INTO cart_recovery_templates (
  name,
  type,
  content,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  'Tentativa 1',
  'whatsapp',
  'Olá {{user_name}}! 👋

Notamos que você estava interessado no plano {{plan_name}} por {{amount}}/{{frequency}}, mas não finalizou sua assinatura.

Que tal aproveitar um desconto especial de 10%? 

💰 Valor original: {{original_amount}}
🎉 Com desconto: {{discount_amount}}

Clique aqui para finalizar: {{checkout_url}}

Atenciosamente,
Equipe MYA',
  true,
  NOW(),
  NOW()
),
(
  'Tentativa 2',
  'whatsapp',
  '{{user_name}}, tudo bem? 😊

Você ainda não aproveitou o desconto de 15% no {{plan_name}}!

⏰ Oferta por tempo limitado:
💳 Valor original: {{original_amount}}
🔥 Com desconto: {{final_amount}}

Não perca essa oportunidade: {{checkout_url}}

Precisa de ajuda? Estamos aqui!',
  true,
  NOW(),
  NOW()
),
(
  'Tentativa 3',
  'whatsapp',
  '{{user_name}}, última chance! 🚨

O desconto de 20% no {{plan_name}} expira em breve!

⚡ ÚLTIMA OPORTUNIDADE:
💵 Valor original: {{original_amount}}
🎯 Com desconto: {{final_amount}}

Finalize agora: {{checkout_url}}

Esta é sua última chance de aproveitar este desconto especial!',
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING; 