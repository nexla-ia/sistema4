/*
  # Função RPC para criar agendamento e atualizar slot atomicamente

  1. Função
    - `create_booking_and_update_slot` - Operação atômica
    - Busca slot disponível
    - Cria agendamento
    - Atualiza slot para 'booked'
    - Tudo em uma única transação

  2. Segurança
    - Usa transação para garantir consistência
    - Rollback automático em caso de erro
    - Validações rigorosas
*/

CREATE OR REPLACE FUNCTION create_booking_and_update_slot(
  p_salon_id uuid,
  p_customer_id uuid,
  p_booking_date date,
  p_booking_time text,
  p_booking_time_alt text,
  p_status text,
  p_total_price numeric,
  p_total_duration_minutes integer,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  booking_id uuid,
  slot_id uuid,
  success boolean,
  message text
) AS $$
DECLARE
  v_slot_record record;
  v_booking_id uuid;
  v_time_formatted time;
  v_time_alt_formatted time;
BEGIN
  -- Converter strings de tempo para tipo time
  BEGIN
    v_time_formatted := p_booking_time::time;
    v_time_alt_formatted := p_booking_time_alt::time;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'Formato de horário inválido';
    RETURN;
  END;
  
  -- Buscar slot disponível (com lock para evitar concorrência)
  SELECT s.* INTO v_slot_record
  FROM slots s
  WHERE s.salon_id = p_salon_id
    AND s.date = p_booking_date
    AND (s.time_slot = v_time_formatted OR s.time_slot = v_time_alt_formatted)
    AND s.status = 'available'
    AND s.booking_id IS NULL
  FOR UPDATE; -- Lock pessimista
  
  -- Verificar se slot foi encontrado
  IF NOT FOUND THEN
    -- Verificar se slot existe mas não está disponível
    SELECT s.* INTO v_slot_record
    FROM slots s
    WHERE s.salon_id = p_salon_id
      AND s.date = p_booking_date
      AND (s.time_slot = v_time_formatted OR s.time_slot = v_time_alt_formatted);
    
    IF FOUND THEN
      RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'SLOT_UNAVAILABLE: Horário já está ocupado ou bloqueado';
    ELSE
      RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'SLOT_NOT_FOUND: Horário não encontrado';
    END IF;
    RETURN;
  END IF;
  
  -- Criar o agendamento
  INSERT INTO bookings (
    salon_id,
    customer_id,
    booking_date,
    booking_time,
    status,
    total_price,
    total_duration_minutes,
    notes
  ) VALUES (
    p_salon_id,
    p_customer_id,
    p_booking_date,
    p_booking_time,
    p_status,
    p_total_price,
    p_total_duration_minutes,
    p_notes
  ) RETURNING id INTO v_booking_id;
  
  -- Atualizar o slot para 'booked'
  UPDATE slots
  SET 
    status = 'booked',
    booking_id = v_booking_id,
    updated_at = now()
  WHERE id = v_slot_record.id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    -- Se chegou aqui, algo deu errado - fazer rollback
    RAISE EXCEPTION 'Falha ao atualizar slot';
  END IF;
  
  -- Retornar sucesso
  RETURN QUERY SELECT v_booking_id, v_slot_record.id, true, 'Agendamento criado com sucesso';
  
EXCEPTION WHEN OTHERS THEN
  -- Em caso de qualquer erro, o PostgreSQL fará rollback automático
  RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'Erro interno: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;