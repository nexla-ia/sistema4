/*
  # Função RPC para atualizar slot para 'booked' de forma atômica

  1. Função
    - `update_slot_to_booked` - Atualiza slot específico
    - Verifica se slot ainda está disponível
    - Atualiza status para 'booked'
    - Adiciona booking_id
    - Retorna resultado da operação

  2. Segurança
    - Usa transação para garantir consistência
    - Verifica condições antes de atualizar
    - Retorna informações detalhadas
*/

CREATE OR REPLACE FUNCTION update_slot_to_booked(
  p_slot_id uuid,
  p_booking_id uuid
)
RETURNS TABLE(
  success boolean,
  message text,
  updated_slot_id uuid
) AS $$
DECLARE
  v_updated_count integer;
BEGIN
  -- Atualizar o slot se ainda estiver disponível
  UPDATE slots
  SET 
    status = 'booked',
    booking_id = p_booking_id,
    updated_at = now()
  WHERE 
    id = p_slot_id
    AND status = 'available'
    AND booking_id IS NULL;
  
  -- Verificar quantos registros foram atualizados
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 1 THEN
    RETURN QUERY SELECT true, 'Slot atualizado com sucesso', p_slot_id;
  ELSIF v_updated_count = 0 THEN
    -- Verificar se o slot existe mas não está disponível
    IF EXISTS (SELECT 1 FROM slots WHERE id = p_slot_id) THEN
      RETURN QUERY SELECT false, 'Slot não está mais disponível', p_slot_id;
    ELSE
      RETURN QUERY SELECT false, 'Slot não encontrado', p_slot_id;
    END IF;
  ELSE
    RETURN QUERY SELECT false, 'Erro: múltiplos slots atualizados', p_slot_id;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'Erro interno: ' || SQLERRM, p_slot_id;
END;
$$ LANGUAGE plpgsql;