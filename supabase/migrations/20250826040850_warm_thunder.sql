/*
  # Fix slot consistency - Corrigir inconsistências nos slots

  1. Função para verificar e corrigir slots inconsistentes
    - Identifica slots que deveriam estar como 'booked' mas estão como 'available'
    - Corrige automaticamente baseado nos agendamentos existentes
  
  2. Função para debug de slots
    - Mostra o estado atual dos slots vs agendamentos
    - Facilita identificação de problemas
*/

-- Função para corrigir slots inconsistentes
CREATE OR REPLACE FUNCTION fix_inconsistent_slots()
RETURNS TABLE(
  fixed_count integer,
  details text
) AS $$
DECLARE
  fixed_slots integer := 0;
  slot_record record;
BEGIN
  -- Encontrar slots que deveriam estar como 'booked' mas estão como 'available'
  FOR slot_record IN
    SELECT DISTINCT
      s.id as slot_id,
      s.salon_id,
      s.date,
      s.time_slot,
      s.status as current_status,
      b.id as booking_id,
      b.status as booking_status
    FROM slots s
    INNER JOIN bookings b ON (
      s.salon_id = b.salon_id 
      AND s.date = b.booking_date 
      AND s.time_slot = b.booking_time
    )
    WHERE s.status = 'available'
      AND b.status IN ('confirmed', 'pending')
  LOOP
    -- Atualizar o slot para 'booked'
    UPDATE slots 
    SET 
      status = 'booked',
      booking_id = slot_record.booking_id
    WHERE id = slot_record.slot_id;
    
    fixed_slots := fixed_slots + 1;
    
    RAISE NOTICE 'Fixed slot: % at % % - was available, now booked for booking %', 
      slot_record.time_slot, slot_record.date, slot_record.salon_id, slot_record.booking_id;
  END LOOP;
  
  RETURN QUERY SELECT fixed_slots, 
    CASE 
      WHEN fixed_slots = 0 THEN 'No inconsistent slots found'
      ELSE fixed_slots || ' slots were fixed'
    END;
END;
$$ LANGUAGE plpgsql;

-- Função para debug - mostrar estado dos slots vs agendamentos
CREATE OR REPLACE FUNCTION debug_slots_vs_bookings(check_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  time_slot time,
  slot_status text,
  slot_booking_id uuid,
  actual_booking_id uuid,
  booking_status text,
  customer_name text,
  is_consistent boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.time_slot,
    s.status as slot_status,
    s.booking_id as slot_booking_id,
    b.id as actual_booking_id,
    b.status as booking_status,
    c.name as customer_name,
    CASE 
      WHEN s.status = 'booked' AND b.id IS NOT NULL AND b.status IN ('confirmed', 'pending') THEN true
      WHEN s.status = 'available' AND b.id IS NULL THEN true
      ELSE false
    END as is_consistent
  FROM slots s
  LEFT JOIN bookings b ON (
    s.salon_id = b.salon_id 
    AND s.date = b.booking_date 
    AND s.time_slot = b.booking_time
    AND b.status IN ('confirmed', 'pending')
  )
  LEFT JOIN customers c ON b.customer_id = c.id
  WHERE s.date = check_date
  ORDER BY s.time_slot;
END;
$$ LANGUAGE plpgsql;

-- Executar a correção imediatamente
SELECT * FROM fix_inconsistent_slots();