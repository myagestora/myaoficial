
-- Adicionar campo is_default na tabela categories
ALTER TABLE public.categories 
ADD COLUMN is_default BOOLEAN DEFAULT FALSE;

-- Inserir as categorias padrão do sistema
INSERT INTO public.categories (name, type, color, icon, is_default, user_id) VALUES
-- Categorias de despesa
('Moradia', 'expense', '#81C784', 'home', TRUE, '00000000-0000-0000-0000-000000000000'),
('Salário', 'income', '#4CAF50', 'banknote', TRUE, '00000000-0000-0000-0000-000000000000'),
('Saúde', 'expense', '#FF8A65', 'heart', TRUE, '00000000-0000-0000-0000-000000000000'),
('Investimentos', 'income', '#FF9800', 'trending-up', TRUE, '00000000-0000-0000-0000-000000000000'),
('Lazer', 'expense', '#F06292', 'gamepad-2', TRUE, '00000000-0000-0000-0000-000000000000'),
('Outros', 'income', '#9E9E9E', 'circle', TRUE, '00000000-0000-0000-0000-000000000000'),
('Educação', 'expense', '#9575CD', 'book', TRUE, '00000000-0000-0000-0000-000000000000'),
('Freelance', 'income', '#2196F3', 'briefcase', TRUE, '00000000-0000-0000-0000-000000000000'),
('Alimentação', 'expense', '#E57373', 'utensils', TRUE, '00000000-0000-0000-0000-000000000000'),
('Transporte', 'expense', '#64B5F6', 'car', TRUE, '00000000-0000-0000-0000-000000000000'),
('Outros', 'expense', '#9E9E9E', 'circle', TRUE, '00000000-0000-0000-0000-000000000000');

-- Atualizar a política RLS para permitir que todos vejam categorias padrão
DROP POLICY IF EXISTS "Users can manage their own categories" ON public.categories;

-- Nova política: usuários podem ver suas próprias categorias e as padrão
CREATE POLICY "Users can view categories" ON public.categories
  FOR SELECT USING (
    auth.uid() = user_id OR is_default = TRUE
  );

-- Usuários podem inserir apenas suas próprias categorias (não padrão)
CREATE POLICY "Users can create their own categories" ON public.categories
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND is_default = FALSE
  );

-- Usuários podem atualizar apenas suas próprias categorias (não padrão)
CREATE POLICY "Users can update their own categories" ON public.categories
  FOR UPDATE USING (
    auth.uid() = user_id AND is_default = FALSE
  );

-- Usuários podem deletar apenas suas próprias categorias (não padrão)
CREATE POLICY "Users can delete their own categories" ON public.categories
  FOR DELETE USING (
    auth.uid() = user_id AND is_default = FALSE
  );

-- Admins podem gerenciar todas as categorias
CREATE POLICY "Admins can manage all categories" ON public.categories
  FOR ALL USING (
    is_admin(auth.uid())
  );
