/*
  # Criar tabelas faltantes para o sistema de agendamento

  1. Nova Tabela: `slots`
    - `id` (uuid, primary key)
    - `salon_id` (uuid, foreign key to salons)
    - `date` (date) - Data do slot
    - `time_slot` (time) - Horário do slot
    - `status` (text) - Status: 'available', 'booked', 'blocked'
    - `booking_id` (uuid, foreign key to bookings, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para permitir acesso público a slots disponíveis
    - Políticas para salões gerenciarem seus próprios slots

  3. Índices
    - Índices para otimizar consultas de data e horário
    - Índices para consultas por salão
*/

-- Criar tabela de slots (horários)
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

-- Habilitar RLS
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_slots_salon_id ON slots(salon_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_salon_date ON slots(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_slots_booking_id ON slots(booking_id);

-- Políticas RLS para slots
CREATE POLICY "Public can read available slots"
  ON slots
  FOR SELECT
  TO anon, authenticated
  USING (status = 'available');

CREATE POLICY "Salons can manage own slots"
  ON slots
  FOR ALL
  TO authenticated
  USING (
    salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_slots_updated_at
  BEFORE UPDATE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
BEGIN
  -- Gerar slots de 30 em 30 minutos, das 8h às 18h
  FOR v_time IN
    SELECT generate_series(
      '08:00'::time,
      '17:30'::time,
      interval '30 minutes'
    )::time
  LOOP
    -- Inserir slot se não existir
    INSERT INTO slots (salon_id, date, time_slot, status)
    VALUES (p_salon_id, p_date, v_time, 'available')
    ON CONFLICT (salon_id, date, time_slot) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Inserir slots para os próximos 30 dias para o salão existente
DO $$
DECLARE
  v_salon_id uuid;
  v_date date;
  v_day_of_week integer;
BEGIN
  -- Pegar o ID do salão existente
  SELECT id INTO v_salon_id FROM salons WHERE active = true LIMIT 1;

  IF v_salon_id IS NOT NULL THEN
    -- Gerar slots para os próximos 30 dias (exceto domingos)
    FOR v_date IN
      SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + interval '30 days',
        interval '1 day'
      )::date
    LOOP
      -- Pegar o dia da semana (0=domingo, 6=sábado)
      v_day_of_week := EXTRACT(DOW FROM v_date);

      -- Não gerar slots para domingo (0)
      IF v_day_of_week != 0 THEN
        PERFORM generate_slots_for_date(v_salon_id, v_date);
      END IF;
    END LOOP;
  END IF;
END $$;
