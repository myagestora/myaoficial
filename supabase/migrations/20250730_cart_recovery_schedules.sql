-- Criar tabela para agendamentos de recuperação de carrinho
CREATE TABLE IF NOT EXISTS cart_recovery_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_session_id UUID NOT NULL REFERENCES cart_sessions(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cart_recovery_schedules_status ON cart_recovery_schedules(status);
CREATE INDEX IF NOT EXISTS idx_cart_recovery_schedules_scheduled_at ON cart_recovery_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cart_recovery_schedules_cart_session ON cart_recovery_schedules(cart_session_id);

-- RLS Policies
ALTER TABLE cart_recovery_schedules ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os agendamentos
CREATE POLICY "Admins can view all cart recovery schedules" ON cart_recovery_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem inserir/atualizar agendamentos
CREATE POLICY "Admins can insert cart recovery schedules" ON cart_recovery_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update cart recovery schedules" ON cart_recovery_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cart_recovery_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cart_recovery_schedules_updated_at
  BEFORE UPDATE ON cart_recovery_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_recovery_schedules_updated_at(); 