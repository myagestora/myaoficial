
-- Criar enums primeiro
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'canceled', 'past_due');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  whatsapp TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Tabela de configurações do sistema
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de planos
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de categorias
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  type transaction_type NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de transações
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  type transaction_type NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de metas
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de assinaturas
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status subscription_status DEFAULT 'inactive',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Funções de segurança
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Políticas para user_roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid()));

-- Políticas para system_config
CREATE POLICY "All users can read system config" ON public.system_config
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage system config" ON public.system_config
  FOR ALL USING (public.is_admin(auth.uid()));

-- Políticas para subscription_plans
CREATE POLICY "All users can read subscription plans" ON public.subscription_plans
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage subscription plans" ON public.subscription_plans
  FOR ALL USING (public.is_admin(auth.uid()));

-- Políticas para categories
CREATE POLICY "Users can view categories" ON public.categories
  FOR SELECT USING (
    auth.uid() = user_id OR is_default = TRUE
  );

CREATE POLICY "Users can create their own categories" ON public.categories
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND is_default = FALSE
  );

CREATE POLICY "Users can update their own categories" ON public.categories
  FOR UPDATE USING (
    auth.uid() = user_id AND is_default = FALSE
  );

CREATE POLICY "Users can delete their own categories" ON public.categories
  FOR DELETE USING (
    auth.uid() = user_id AND is_default = FALSE
  );

CREATE POLICY "Admins can manage all categories" ON public.categories
  FOR ALL USING (
    public.is_admin(auth.uid())
  );

-- Políticas para transactions
CREATE POLICY "Users can manage their own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para goals
CREATE POLICY "Users can manage their own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_subscriptions
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (public.is_admin(auth.uid()));

-- Função para sincronizar status de assinatura
CREATE OR REPLACE FUNCTION public.sync_profile_subscription_status()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles 
    SET subscription_status = NEW.status::TEXT
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET subscription_status = 'inactive'
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger para sincronizar status
CREATE TRIGGER sync_subscription_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_subscription_status();

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, whatsapp)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'whatsapp'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger para novos usuários
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Inserir dados do sistema
INSERT INTO public.system_config (key, value) VALUES
  ('app_name', '"MYA Gestora"'),
  ('app_logo', '"/logo.svg"'),
  ('primary_color', '"#3B82F6"'),
  ('secondary_color', '"#10B981"');

-- Inserir planos
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features) VALUES
  ('Básico', 'Plano básico com funcionalidades essenciais', 19.90, 199.00, '["Até 100 transações/mês", "Relatórios básicos", "2 metas financeiras"]'),
  ('Premium', 'Plano completo com todas as funcionalidades', 39.90, 399.00, '["Transações ilimitadas", "Relatórios avançados", "Metas ilimitadas", "Suporte prioritário"]');

-- Inserir categorias padrão
INSERT INTO public.categories (name, type, color, icon, is_default, user_id) VALUES
-- Categorias de receita
('Salário', 'income', '#4CAF50', 'banknote', TRUE, NULL),
('Investimentos', 'income', '#FF9800', 'trending-up', TRUE, NULL),
('Freelance', 'income', '#2196F3', 'briefcase', TRUE, NULL),
('Outros', 'income', '#9E9E9E', 'circle', TRUE, NULL),
-- Categorias de despesa
('Moradia', 'expense', '#81C784', 'home', TRUE, NULL),
('Saúde', 'expense', '#FF8A65', 'heart', TRUE, NULL),
('Lazer', 'expense', '#F06292', 'gamepad-2', TRUE, NULL),
('Educação', 'expense', '#9575CD', 'book', TRUE, NULL),
('Alimentação', 'expense', '#E57373', 'utensils', TRUE, NULL),
('Transporte', 'expense', '#64B5F6', 'car', TRUE, NULL),
('Outros', 'expense', '#9E9E9E', 'circle', TRUE, NULL);
