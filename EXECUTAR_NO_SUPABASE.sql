-- ===================================================================
-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE DASHBOARD
-- ===================================================================
--
-- INSTRUÇÕES:
-- 1. Acesse o Supabase Dashboard do seu projeto
-- 2. Vá em "SQL Editor" no menu lateral
-- 3. Clique em "New Query"
-- 4. Cole TODO este arquivo
-- 5. Clique em "Run" (ou pressione Ctrl+Enter)
--
-- Este script cria:
-- ✅ 5 Tabelas (salons, services, bookings, reviews, time_slots)
-- ✅ Políticas RLS de segurança
-- ✅ Dados iniciais de exemplo
-- ===================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- CRIAR TABELAS
-- ===================================================================

-- 1. TABELA: salons (Centros Terapêuticos)
CREATE TABLE IF NOT EXISTS salons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  address text,
  phone text,
  email text,
  instagram text,
  facebook text,
  opening_hours jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. TABELA: services (Serviços)
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  category text NOT NULL DEFAULT 'Geral',
  active boolean DEFAULT true NOT NULL,
  popular boolean DEFAULT false NOT NULL,
  on_promotion boolean DEFAULT false NOT NULL,
  promotional_price decimal(10,2) CHECK (promotional_price IS NULL OR promotional_price >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT check_promotional_price_lower CHECK (
    promotional_price IS NULL OR promotional_price < price
  )
);

-- 3. TABELA: bookings (Agendamentos)
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. TABELA: reviews (Avaliações)
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  customer_identifier text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  approved boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 5. TABELA: time_slots (Horários Disponíveis)
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time_slot time NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(salon_id, date, time_slot)
);

-- ===================================================================
-- CRIAR INDEXES
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_services_salon_active ON services(salon_id, active);
CREATE INDEX IF NOT EXISTS idx_services_popular ON services(popular) WHERE popular = true;
CREATE INDEX IF NOT EXISTS idx_bookings_salon_date ON bookings(salon_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_salon_approved ON reviews(salon_id, approved);
CREATE INDEX IF NOT EXISTS idx_time_slots_salon_date ON time_slots(salon_id, date, status);

-- ===================================================================
-- CRIAR TRIGGERS
-- ===================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_salons_updated_at ON salons;
CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON salons FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_time_slots_updated_at ON time_slots;
CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON time_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================================================================
-- HABILITAR RLS (ROW LEVEL SECURITY)
-- ===================================================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- POLÍTICAS RLS: salons
-- ===================================================================

DROP POLICY IF EXISTS "Public can view active salons" ON salons;
CREATE POLICY "Public can view active salons" ON salons FOR SELECT TO public USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can create salons" ON salons;
CREATE POLICY "Authenticated users can create salons" ON salons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Salon owners can update their salons" ON salons;
CREATE POLICY "Salon owners can update their salons" ON salons FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Salon owners can delete their salons" ON salons;
CREATE POLICY "Salon owners can delete their salons" ON salons FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================================================================
-- POLÍTICAS RLS: services
-- ===================================================================

DROP POLICY IF EXISTS "Public can view active services" ON services;
CREATE POLICY "Public can view active services" ON services FOR SELECT TO public USING (active = true);

DROP POLICY IF EXISTS "Salon admins can insert services" ON services;
CREATE POLICY "Salon admins can insert services" ON services FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.user_id = auth.uid()));

DROP POLICY IF EXISTS "Salon admins can update services" ON services;
CREATE POLICY "Salon admins can update services" ON services FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.user_id = auth.uid()));

DROP POLICY IF EXISTS "Salon admins can delete services" ON services;
CREATE POLICY "Salon admins can delete services" ON services FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.user_id = auth.uid()));

-- ===================================================================
-- POLÍTICAS RLS: bookings
-- ===================================================================

DROP POLICY IF EXISTS "Salon admins can view all bookings" ON bookings;
CREATE POLICY "Salon admins can view all bookings" ON bookings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = bookings.salon_id AND salons.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
CREATE POLICY "Anyone can create bookings" ON bookings FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Salon admins can update bookings" ON bookings;
CREATE POLICY "Salon admins can update bookings" ON bookings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = bookings.salon_id AND salons.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM salons WHERE salons.id = bookings.salon_id AND salons.user_id = auth.uid()));

DROP POLICY IF EXISTS "Salon admins can delete bookings" ON bookings;
CREATE POLICY "Salon admins can delete bookings" ON bookings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = bookings.salon_id AND salons.user_id = auth.uid()));

-- ===================================================================
-- POLÍTICAS RLS: reviews
-- ===================================================================

DROP POLICY IF EXISTS "Public can view approved reviews" ON reviews;
CREATE POLICY "Public can view approved reviews" ON reviews FOR SELECT TO public USING (approved = true);

DROP POLICY IF EXISTS "Anyone can create reviews" ON reviews;
CREATE POLICY "Anyone can create reviews" ON reviews FOR INSERT TO public WITH CHECK (approved = false);

DROP POLICY IF EXISTS "Salon admins can update reviews" ON reviews;
CREATE POLICY "Salon admins can update reviews" ON reviews FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.user_id = auth.uid()));

DROP POLICY IF EXISTS "Salon admins can delete reviews" ON reviews;
CREATE POLICY "Salon admins can delete reviews" ON reviews FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.user_id = auth.uid()));

-- ===================================================================
-- POLÍTICAS RLS: time_slots
-- ===================================================================

DROP POLICY IF EXISTS "Public can view available time slots" ON time_slots;
CREATE POLICY "Public can view available time slots" ON time_slots FOR SELECT TO public USING (status = 'available');

DROP POLICY IF EXISTS "Salon admins can insert time slots" ON time_slots;
CREATE POLICY "Salon admins can insert time slots" ON time_slots FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM salons WHERE salons.id = time_slots.salon_id AND salons.user_id = auth.uid()));

DROP POLICY IF EXISTS "Salon admins can update time slots" ON time_slots;
CREATE POLICY "Salon admins can update time slots" ON time_slots FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = time_slots.salon_id AND salons.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM salons WHERE salons.id = time_slots.salon_id AND salons.user_id = auth.uid()));

DROP POLICY IF EXISTS "Salon admins can delete time slots" ON time_slots;
CREATE POLICY "Salon admins can delete time slots" ON time_slots FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM salons WHERE salons.id = time_slots.salon_id AND salons.user_id = auth.uid()));

-- ===================================================================
-- INSERIR DADOS INICIAIS
-- ===================================================================

-- Inserir salão de exemplo
INSERT INTO salons (id, name, description, address, phone, email, instagram, facebook, opening_hours, active) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Centro Terapêutico Bem-Estar',
  'Cuidando da sua saúde mental e física com carinho e profissionalismo.',
  'Rua das Flores, 123 - Centro',
  '(11) 98765-4321',
  'contato@centroterapeutico.com.br',
  'https://instagram.com/centroterapeutico',
  'https://www.facebook.com/centroterapeutico',
  '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "18:00"}, "sunday": {"open": "09:00", "close": "14:00"}}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Inserir serviços
INSERT INTO services (id, salon_id, name, description, price, duration_minutes, category, active, popular, on_promotion, promotional_price) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Massagem Relaxante', 'Massagem corporal completa para relaxamento profundo e alívio de tensões musculares.', 120.00, 60, 'Massagens', true, true, false, NULL),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Acupuntura', 'Tratamento milenar chinês que utiliza agulhas finas para estimular pontos específicos.', 90.00, 45, 'Terapias Alternativas', true, true, true, 70.00),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Reflexologia', 'Massagem terapêutica nos pés que trabalha pontos reflexos do corpo.', 80.00, 40, 'Massagens', true, false, false, NULL),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Aromaterapia', 'Terapia que utiliza óleos essenciais naturais para promover equilíbrio físico e emocional.', 100.00, 50, 'Terapias Alternativas', true, false, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Inserir avaliações
INSERT INTO reviews (id, salon_id, customer_name, customer_identifier, rating, comment, approved) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Maria Silva', 'maria@email.com', 5, 'Excelente atendimento! A massagem relaxante foi maravilhosa e me senti renovada.', true),
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'João Santos', 'joao@email.com', 5, 'Profissionais muito qualificados. A acupuntura realmente ajudou com minhas dores nas costas.', true),
('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Ana Costa', 'ana@email.com', 5, 'Ambiente acolhedor e muito limpo. Sempre saio daqui me sentindo melhor!', true)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- VERIFICAÇÃO
-- ===================================================================

-- Confirmar criação das tabelas
SELECT 'Tabelas criadas:' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('salons', 'services', 'bookings', 'reviews', 'time_slots') ORDER BY table_name;

-- Confirmar dados inseridos
SELECT 'Dados inseridos:' AS status;
SELECT 'salons' AS tabela, COUNT(*) AS total FROM salons
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews;

-- ===================================================================
-- PRONTO! ✅
-- ===================================================================
--
-- Seu banco de dados foi criado com sucesso!
--
-- Próximos passos:
-- 1. Copie as credenciais do projeto (Settings > API)
-- 2. Cole no arquivo .env do projeto
-- 3. Execute: npm run dev
--
-- ===================================================================
