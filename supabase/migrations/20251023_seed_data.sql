/*
  # Dados Iniciais - Centro Terapêutico

  ## Descrição
  Popula o banco com dados iniciais para demonstração e testes.

  ## Dados Incluídos
  1. Salão de exemplo (Centro Terapêutico)
  2. Serviços variados (4 serviços)
  3. Reviews aprovadas (3 avaliações)
  4. Horários disponíveis (próximos 7 dias)

  ## Notas
  - Os dados são apenas para demonstração
  - Pode ser executado múltiplas vezes (usa INSERT ... ON CONFLICT)
  - IDs fixos para facilitar referências
*/

-- Inserir salão de exemplo
INSERT INTO salons (
  id,
  name,
  description,
  address,
  phone,
  email,
  instagram,
  facebook,
  opening_hours,
  active
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Centro Terapêutico Bem-Estar',
  'Cuidando da sua saúde mental e física com carinho e profissionalismo. Oferecemos terapias holísticas e tratamentos personalizados para seu bem-estar integral.',
  'Rua das Flores, 123 - Centro',
  '(11) 98765-4321',
  'contato@centroterapeutico.com.br',
  'https://instagram.com/centroterapeutico',
  'https://www.facebook.com/centroterapeutico',
  '{
    "monday": {"open": "08:00", "close": "20:00"},
    "tuesday": {"open": "08:00", "close": "20:00"},
    "wednesday": {"open": "08:00", "close": "20:00"},
    "thursday": {"open": "08:00", "close": "20:00"},
    "friday": {"open": "08:00", "close": "20:00"},
    "saturday": {"open": "09:00", "close": "18:00"},
    "sunday": {"open": "09:00", "close": "14:00"}
  }'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  instagram = EXCLUDED.instagram,
  facebook = EXCLUDED.facebook,
  opening_hours = EXCLUDED.opening_hours,
  active = EXCLUDED.active,
  updated_at = now();

-- Inserir serviços de exemplo
INSERT INTO services (
  id,
  salon_id,
  name,
  description,
  price,
  duration_minutes,
  category,
  active,
  popular,
  on_promotion,
  promotional_price
) VALUES
(
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Massagem Relaxante',
  'Massagem corporal completa para relaxamento profundo e alívio de tensões musculares. Utilizamos técnicas suaves e óleos aromáticos para proporcionar uma experiência única de bem-estar.',
  120.00,
  60,
  'Massagens',
  true,
  true,
  false,
  NULL
),
(
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Acupuntura',
  'Tratamento milenar chinês que utiliza agulhas finas para estimular pontos específicos do corpo, promovendo equilíbrio energético e alívio de dores.',
  90.00,
  45,
  'Terapias Alternativas',
  true,
  true,
  true,
  70.00
),
(
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Reflexologia',
  'Massagem terapêutica nos pés que trabalha pontos reflexos correspondentes a órgãos e sistemas do corpo, promovendo relaxamento e bem-estar geral.',
  80.00,
  40,
  'Massagens',
  true,
  false,
  false,
  NULL
),
(
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Aromaterapia',
  'Terapia que utiliza óleos essenciais naturais para promover equilíbrio físico e emocional. Ideal para reduzir estresse e ansiedade.',
  100.00,
  50,
  'Terapias Alternativas',
  true,
  false,
  false,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  category = EXCLUDED.category,
  active = EXCLUDED.active,
  popular = EXCLUDED.popular,
  on_promotion = EXCLUDED.on_promotion,
  promotional_price = EXCLUDED.promotional_price,
  updated_at = now();

-- Inserir reviews aprovadas de exemplo
INSERT INTO reviews (
  id,
  salon_id,
  customer_name,
  customer_identifier,
  rating,
  comment,
  approved
) VALUES
(
  'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Maria Silva',
  'maria.silva@email.com',
  5,
  'Excelente atendimento! A massagem relaxante foi maravilhosa e me senti renovada. Ambiente tranquilo e profissionais muito atenciosos.',
  true
),
(
  'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'João Santos',
  'joao.santos@email.com',
  5,
  'Profissionais muito qualificados. A acupuntura realmente ajudou com minhas dores nas costas. Recomendo muito!',
  true
),
(
  'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Ana Costa',
  'ana.costa@email.com',
  5,
  'Ambiente acolhedor e muito limpo. Os terapeutas são experientes e cuidadosos. Sempre saio daqui me sentindo melhor!',
  true
)
ON CONFLICT (id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  rating = EXCLUDED.rating,
  comment = EXCLUDED.comment,
  approved = EXCLUDED.approved,
  updated_at = now();

-- Gerar horários disponíveis para os próximos 7 dias
-- Horários: 08:00 às 18:00, intervalos de 30 minutos
DO $$
DECLARE
  v_date date;
  v_time time;
  v_salon_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
BEGIN
  -- Loop pelos próximos 7 dias
  FOR i IN 0..6 LOOP
    v_date := CURRENT_DATE + i;

    -- Loop pelos horários do dia (8:00 às 18:00, intervalos de 30min)
    FOR hour IN 8..17 LOOP
      FOR minute IN 0..1 LOOP
        v_time := (hour || ':' || (minute * 30) || ':00')::time;

        -- Inserir horário se não existir
        INSERT INTO time_slots (salon_id, date, time_slot, status)
        VALUES (v_salon_id, v_date, v_time, 'available')
        ON CONFLICT (salon_id, date, time_slot) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
