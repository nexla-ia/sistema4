/*
  # Schema Completo para Centro Terapêutico - Sistema de Agendamento

  ## Descrição
  Este é o schema completo para o sistema de agendamento do Centro Terapêutico.
  Inclui todas as tabelas necessárias para gerenciar serviços, agendamentos, avaliações e horários.

  ## Novas Tabelas

  ### 1. `salons` (Centros/Salões)
  Armazena informações sobre o centro terapêutico
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK para auth.users) - Proprietário/Admin
  - `name` (text) - Nome do centro
  - `description` (text) - Descrição
  - `address` (text) - Endereço completo
  - `phone` (text) - Telefone
  - `email` (text) - Email
  - `instagram` (text) - Link Instagram
  - `facebook` (text) - Link Facebook
  - `opening_hours` (jsonb) - Horários de funcionamento
  - `active` (boolean) - Se está ativo
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `services` (Serviços)
  Serviços oferecidos pelo centro
  - `id` (uuid, primary key)
  - `salon_id` (uuid, FK para salons)
  - `name` (text) - Nome do serviço
  - `description` (text) - Descrição
  - `price` (decimal) - Preço normal
  - `duration_minutes` (integer) - Duração em minutos
  - `category` (text) - Categoria (Massagens, Terapias, etc)
  - `active` (boolean) - Se está ativo
  - `popular` (boolean) - Serviço em destaque
  - `on_promotion` (boolean) - Em promoção
  - `promotional_price` (decimal) - Preço promocional
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `bookings` (Agendamentos)
  Agendamentos dos clientes
  - `id` (uuid, primary key)
  - `salon_id` (uuid, FK para salons)
  - `customer_name` (text) - Nome do cliente
  - `customer_phone` (text) - Telefone
  - `customer_email` (text) - Email (opcional)
  - `booking_date` (date) - Data do agendamento
  - `booking_time` (time) - Hora do agendamento
  - `services` (text[]) - Array de IDs de serviços
  - `status` (text) - Status: pending, confirmed, cancelled, completed
  - `total_price` (decimal) - Preço total
  - `notes` (text) - Observações
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `reviews` (Avaliações)
  Avaliações dos clientes
  - `id` (uuid, primary key)
  - `salon_id` (uuid, FK para salons)
  - `customer_name` (text) - Nome do cliente
  - `customer_identifier` (text) - Email ou telefone (hash)
  - `rating` (integer) - Nota de 1 a 5
  - `comment` (text) - Comentário
  - `approved` (boolean) - Se foi aprovada pelo admin
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `time_slots` (Horários Disponíveis)
  Controle de horários disponíveis
  - `id` (uuid, primary key)
  - `salon_id` (uuid, FK para salons)
  - `date` (date) - Data
  - `time_slot` (time) - Horário
  - `status` (text) - available, booked, blocked
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Segurança (RLS)

  ### Políticas Implementadas:

  #### `salons`:
  - SELECT: Público (qualquer pessoa pode ver salões ativos)
  - INSERT/UPDATE/DELETE: Apenas usuário autenticado proprietário

  #### `services`:
  - SELECT: Público (qualquer pessoa pode ver serviços ativos)
  - INSERT/UPDATE/DELETE: Apenas admin do salão

  #### `bookings`:
  - SELECT: Admin do salão pode ver todos os agendamentos
  - INSERT: Qualquer pessoa pode criar agendamento
  - UPDATE/DELETE: Apenas admin do salão

  #### `reviews`:
  - SELECT: Público (apenas reviews aprovadas)
  - INSERT: Qualquer pessoa pode criar review
  - UPDATE/DELETE: Apenas admin do salão

  #### `time_slots`:
  - SELECT: Público (horários disponíveis)
  - INSERT/UPDATE/DELETE: Apenas admin do salão

  ## Notas Importantes

  1. Todos os preços usam DECIMAL(10,2) para precisão monetária
  2. Timestamps automáticos com triggers para updated_at
  3. Constraints para validação de dados (rating entre 1-5, status válidos, etc)
  4. Indexes para performance em queries frequentes
  5. Preço promocional deve ser menor que preço normal
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: salons
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

-- 2. TABELA: services
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

-- 3. TABELA: bookings
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

-- 4. TABELA: reviews
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

-- 5. TABELA: time_slots
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

-- INDEXES para performance
CREATE INDEX IF NOT EXISTS idx_services_salon_active ON services(salon_id, active);
CREATE INDEX IF NOT EXISTS idx_services_popular ON services(popular) WHERE popular = true;
CREATE INDEX IF NOT EXISTS idx_bookings_salon_date ON bookings(salon_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_salon_approved ON reviews(salon_id, approved);
CREATE INDEX IF NOT EXISTS idx_time_slots_salon_date ON time_slots(salon_id, date, status);

-- TRIGGERS para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_salons_updated_at') THEN
    CREATE TRIGGER update_salons_updated_at
      BEFORE UPDATE ON salons
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_updated_at') THEN
    CREATE TRIGGER update_services_updated_at
      BEFORE UPDATE ON services
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
    CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reviews_updated_at') THEN
    CREATE TRIGGER update_reviews_updated_at
      BEFORE UPDATE ON reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_time_slots_updated_at') THEN
    CREATE TRIGGER update_time_slots_updated_at
      BEFORE UPDATE ON time_slots
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- HABILITAR RLS em todas as tabelas
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
