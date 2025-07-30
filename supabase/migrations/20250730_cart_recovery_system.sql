-- Migration: Sistema de Recuperação de Carrinho
-- Data: 2025-07-30

-- Tabela para rastrear sessões de carrinho
CREATE TABLE public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'abandoned' CHECK (status IN ('active', 'abandoned', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  abandoned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  user_email TEXT,
  user_whatsapp TEXT,
  user_name TEXT
);

-- Tabela para rastrear tentativas de recuperação
CREATE TABLE public.cart_recovery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_session_id UUID REFERENCES public.cart_sessions(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  method TEXT NOT NULL CHECK (method IN ('whatsapp', 'email', 'sms')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'converted')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  message_content TEXT,
  whatsapp_message_id TEXT,
  email_message_id TEXT,
  sms_message_id TEXT,
  error_message TEXT
);

-- Tabela para configurações de recuperação
CREATE TABLE public.cart_recovery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 3,
  delay_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para templates de mensagens
CREATE TABLE public.cart_recovery_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'sms')),
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_cart_sessions_user_id ON public.cart_sessions(user_id);
CREATE INDEX idx_cart_sessions_status ON public.cart_sessions(status);
CREATE INDEX idx_cart_sessions_abandoned_at ON public.cart_sessions(abandoned_at);
CREATE INDEX idx_cart_recovery_attempts_cart_session_id ON public.cart_recovery_attempts(cart_session_id);
CREATE INDEX idx_cart_recovery_attempts_status ON public.cart_recovery_attempts(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cart_sessions_updated_at 
    BEFORE UPDATE ON public.cart_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_recovery_config_updated_at 
    BEFORE UPDATE ON public.cart_recovery_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_recovery_templates_updated_at 
    BEFORE UPDATE ON public.cart_recovery_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão
INSERT INTO public.cart_recovery_config (enabled, whatsapp_enabled, email_enabled, sms_enabled, max_attempts, delay_minutes)
VALUES (true, true, false, false, 3, 60);

-- Inserir templates padrão
INSERT INTO public.cart_recovery_templates (name, type, subject, content, variables) VALUES
('Recuperação WhatsApp - 1ª Tentativa', 'whatsapp', NULL, 'Olá {{user_name}}! 👋

Notamos que você estava interessado no plano {{plan_name}} por R$ {{amount}}/{{frequency}}.

Sua sessão ainda está ativa! Que tal finalizar sua assinatura agora?

🔗 Acesse: {{checkout_url}}

⏰ Oferta válida por mais 24 horas!

Precisa de ajuda? Responda esta mensagem!', 
'{"user_name": "Nome do usuário", "plan_name": "Nome do plano", "amount": "Valor", "frequency": "Frequência", "checkout_url": "URL do checkout"}'),

('Recuperação WhatsApp - 2ª Tentativa', 'whatsapp', NULL, '{{user_name}}, tudo bem? 😊

Você ainda tem interesse no {{plan_name}}?

🎁 **Oferta especial**: 10% de desconto por 24h!
De R$ {{original_amount}} por R$ {{discount_amount}}/{{frequency}}

🔗 Acesse: {{checkout_url}}

💬 Dúvidas? Estamos aqui para ajudar!',
'{"user_name": "Nome do usuário", "plan_name": "Nome do plano", "original_amount": "Valor original", "discount_amount": "Valor com desconto", "frequency": "Frequência", "checkout_url": "URL do checkout"}'),

('Recuperação WhatsApp - 3ª Tentativa', 'whatsapp', NULL, '{{user_name}}, última chance! ⏰

O {{plan_name}} está com 15% de desconto por mais 2 horas!

💰 De R$ {{original_amount}} por R$ {{final_amount}}/{{frequency}}

🔗 Acesse agora: {{checkout_url}}

Após esse prazo, o desconto expira!',
'{"user_name": "Nome do usuário", "plan_name": "Nome do plano", "original_amount": "Valor original", "final_amount": "Valor final", "frequency": "Frequência", "checkout_url": "URL do checkout"}');

-- RLS (Row Level Security)
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin can manage cart recovery" ON public.cart_sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
CREATE POLICY "Admin can manage cart recovery attempts" ON public.cart_recovery_attempts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
CREATE POLICY "Admin can manage cart recovery config" ON public.cart_recovery_config FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
CREATE POLICY "Admin can manage cart recovery templates" ON public.cart_recovery_templates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Usuários podem ver apenas seus próprios carrinhos
CREATE POLICY "Users can view own cart sessions" ON public.cart_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own recovery attempts" ON public.cart_recovery_attempts FOR SELECT USING (
  cart_session_id IN (SELECT id FROM public.cart_sessions WHERE user_id = auth.uid())
); 