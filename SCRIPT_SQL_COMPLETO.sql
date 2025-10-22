-- ============================================
-- SCRIPT COMPLETO PARA CRIAR BANCO DE DADOS
-- Sistema de Agendamento - Centro Terapêutico
-- ============================================

-- PARTE 1: CRIAR TODAS AS TABELAS
-- ============================================

-- Tabela de salões (centro terapêutico)
CREATE TABLE IF NOT EXISTS salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  address text,
  phone text,
  email text,
  instagram text,
  facebook text,
  opening_hours jsonb DEFAULT '{
    "monday": {"open": "08:00", "close": "18:00"},
    "tuesday": {"open": "08:00", "close": "18:00"},
    "wednesday": {"open": "08:00", "close": "18:00"},
    "thursday": {"open": "08:00", "close": "18:00"},
    "friday": {"open": "08:00", "close": "18:00"},
    "saturday": {"open": "08:00", "close": "18:00"},
    "sunday": {"closed": true}
  }'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de serviços
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0 NOT NULL,
  duration_minutes integer DEFAULT 30 NOT NULL,
  category text DEFAULT 'Geral' NOT NULL,
  active boolean DEFAULT true,
  popular boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  total_price numeric(10,2) DEFAULT 0 NOT NULL,
  total_duration_minutes integer DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de relacionamento entre agendamentos e serviços
CREATE TABLE IF NOT EXISTS booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela de horários (slots)
CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time_slot time NOT NULL,
  status text DEFAULT 'available' NOT NULL CHECK (status IN ('available', 'booked', 'blocked')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(salon_id, date, time_slot)
);

-- Tabela de horários bloqueados
CREATE TABLE IF NOT EXISTS blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time_slot time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(salon_id, date, time_slot)
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  customer_identifier text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de configurações do salão
CREATE TABLE IF NOT EXISTS salon_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(salon_id, setting_key)
);

-- ============================================
-- PARTE 2: CRIAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_services_salon_id ON services(salon_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON booking_services(service_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_slots_salon_id ON slots(salon_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_salon_date ON slots(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_slots_booking_id ON slots(booking_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_salon_date ON blocked_slots(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON reviews(salon_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_customer ON reviews(salon_id, customer_identifier);

-- ============================================
-- PARTE 3: HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 4: CRIAR POLÍTICAS RLS
-- ============================================

-- Políticas para salons
DROP POLICY IF EXISTS "Public can read active salons" ON salons;
CREATE POLICY "Public can read active salons"
  ON salons FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Políticas para services
DROP POLICY IF EXISTS "Public can read active services" ON services;
CREATE POLICY "Public can read active services"
  ON services FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Políticas para customers
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
CREATE POLICY "Anyone can create customers"
  ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read customers" ON customers;
CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para bookings
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read bookings" ON bookings;
CREATE POLICY "Authenticated users can read bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para booking_services
DROP POLICY IF EXISTS "Anyone can create booking services" ON booking_services;
CREATE POLICY "Anyone can create booking services"
  ON booking_services FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read booking services" ON booking_services;
CREATE POLICY "Authenticated users can read booking services"
  ON booking_services FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para slots
DROP POLICY IF EXISTS "Public can read available slots" ON slots;
CREATE POLICY "Public can read available slots"
  ON slots FOR SELECT
  TO anon, authenticated
  USING (status = 'available');

DROP POLICY IF EXISTS "Authenticated users can read all slots" ON slots;
CREATE POLICY "Authenticated users can read all slots"
  ON slots FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para reviews
DROP POLICY IF EXISTS "Public can read approved reviews" ON reviews;
CREATE POLICY "Public can read approved reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (approved = true);

DROP POLICY IF EXISTS "Anyone can create reviews" ON reviews;
CREATE POLICY "Anyone can create reviews"
  ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================
-- PARTE 5: CRIAR FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_salons_updated_at ON salons;
CREATE TRIGGER update_salons_updated_at
  BEFORE UPDATE ON salons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slots_updated_at ON slots;
CREATE TRIGGER update_slots_updated_at
  BEFORE UPDATE ON slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blocked_slots_updated_at ON blocked_slots;
CREATE TRIGGER update_blocked_slots_updated_at
  BEFORE UPDATE ON blocked_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_salon_settings_updated_at ON salon_settings;
CREATE TRIGGER update_salon_settings_updated_at
  BEFORE UPDATE ON salon_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar slots automaticamente
CREATE OR REPLACE FUNCTION generate_slots_for_date(
  p_salon_id uuid,
  p_date date
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer := 0;
  v_time time;
  v_inserted integer;
BEGIN
  FOR v_time IN
    SELECT generate_series(
      '08:00'::time,
      '17:30'::time,
      interval '30 minutes'
    )::time
  LOOP
    INSERT INTO slots (salon_id, date, time_slot, status)
    VALUES (p_salon_id, p_date, v_time, 'available')
    ON CONFLICT (salon_id, date, time_slot) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_count := v_count + v_inserted;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================
-- PARTE 6: INSERIR DADOS INICIAIS
-- ============================================

-- Inserir o salão principal
INSERT INTO salons (name, description, address, phone, email, instagram, facebook)
VALUES (
  'Centro Terapêutico Bem-Estar',
  'Cuidando da sua saúde mental e física com carinho e profissionalismo.',
  'Avenida Curitiba, nº 3886, Jardim das Oliveiras, Vilhena – Rondônia',
  '(69) 99283-9458',
  'centroobemestar@gmail.com',
  'https://instagram.com/centroterapeuticoo',
  'https://www.facebook.com/share/1Dr82JT5NV/'
)
ON CONFLICT DO NOTHING;

-- Inserir serviços
DO $$
DECLARE
  v_salon_id uuid;
BEGIN
  SELECT id INTO v_salon_id FROM salons WHERE active = true LIMIT 1;

  IF v_salon_id IS NOT NULL THEN
    INSERT INTO services (salon_id, name, description, price, duration_minutes, category, popular)
    VALUES
      (v_salon_id, 'Massagem Relaxante', 'Massagem terapêutica para alívio do estresse', 80.00, 60, 'Massoterapia', true),
      (v_salon_id, 'Acupuntura', 'Tratamento com agulhas para diversos problemas', 120.00, 45, 'Medicina Alternativa', true),
      (v_salon_id, 'Reflexologia', 'Massagem nos pés para estimular pontos reflexos', 60.00, 30, 'Massoterapia', false),
      (v_salon_id, 'Reiki', 'Terapia energética para equilíbrio e bem-estar', 70.00, 45, 'Terapias Energéticas', false),
      (v_salon_id, 'Aromaterapia', 'Tratamento com óleos essenciais', 90.00, 50, 'Terapias Holísticas', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Gerar slots para os próximos 30 dias
DO $$
DECLARE
  v_salon_id uuid;
  v_date date;
  v_day_of_week integer;
BEGIN
  SELECT id INTO v_salon_id FROM salons WHERE active = true LIMIT 1;

  IF v_salon_id IS NOT NULL THEN
    FOR v_date IN
      SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + interval '30 days',
        interval '1 day'
      )::date
    LOOP
      v_day_of_week := EXTRACT(DOW FROM v_date);

      IF v_day_of_week != 0 THEN
        PERFORM generate_slots_for_date(v_salon_id, v_date);
      END IF;
    END LOOP;
  END IF;
END $$;

-- Inserir algumas avaliações de exemplo
DO $$
DECLARE
  v_salon_id uuid;
BEGIN
  SELECT id INTO v_salon_id FROM salons WHERE active = true LIMIT 1;

  IF v_salon_id IS NOT NULL THEN
    INSERT INTO reviews (salon_id, customer_name, customer_identifier, rating, comment, approved)
    VALUES
      (v_salon_id, 'Maria Silva', 'device_001', 5, 'Excelente atendimento! Saí renovada após a massagem relaxante.', true),
      (v_salon_id, 'João Santos', 'device_002', 5, 'Profissionais muito competentes. A acupuntura me ajudou muito!', true),
      (v_salon_id, 'Ana Costa', 'device_003', 4, 'Ambiente tranquilo e acolhedor. Recomendo!', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

SELECT
  'Salons' as tabela, COUNT(*) as registros FROM salons
UNION ALL
SELECT 'Services', COUNT(*) FROM services
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Slots', COUNT(*) FROM slots
UNION ALL
SELECT 'Reviews', COUNT(*) FROM reviews;
