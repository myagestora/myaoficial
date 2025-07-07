
-- Criar tabela para armazenar frases motivacionais
CREATE TABLE public.motivational_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.motivational_phrases ENABLE ROW LEVEL SECURITY;

-- Política para administradores poderem fazer tudo
CREATE POLICY "Admins can manage motivational phrases" 
  ON public.motivational_phrases 
  FOR ALL 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Política para usuários autenticados poderem apenas visualizar frases ativas
CREATE POLICY "Users can view active phrases" 
  ON public.motivational_phrases 
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Inserir algumas frases iniciais
INSERT INTO public.motivational_phrases (phrase, is_active) VALUES
('MYA registra. MYA lembra. MYA cuida! 💰'),
('Cada centavo importa! Vamos organizar suas finanças? 📊'),
('Seu futuro financeiro começa hoje! 🚀'),
('Controlar gastos nunca foi tão fácil! ✨'),
('MYA está aqui para transformar sua vida financeira! 💪'),
('Organize hoje, colha os frutos amanhã! 🌱'),
('Suas metas financeiras estão mais próximas do que você imagina! 🎯'),
('Pequenos passos, grandes conquistas financeiras! 👣'),
('MYA: Seu assistente financeiro favorito! ❤️'),
('Economizar nunca foi tão inteligente! 🧠');
