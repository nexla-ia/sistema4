/*
  # Corrigir políticas RLS da tabela slots

  1. Políticas Atualizadas
    - Permitir SELECT de slots para usuários anônimos (necessário para agendamentos)
    - Permitir UPDATE de slots para usuários anônimos (necessário para marcar como booked)
    - Manter políticas existentes para administradores

  2. Segurança
    - Usuários anônimos só podem ver slots disponíveis
    - Usuários anônimos só podem atualizar slots de available para booked
    - Administradores mantêm controle total
*/

-- Remover políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "Public can read available slots" ON slots;
DROP POLICY IF EXISTS "Salons can manage own slots" ON slots;
DROP POLICY IF EXISTS "Anonymous can read available slots" ON slots;
DROP POLICY IF EXISTS "Anonymous can update slots for booking" ON slots;

-- Política para permitir SELECT de slots disponíveis (necessário para buscar horários)
CREATE POLICY "Anonymous can read available slots"
  ON slots
  FOR SELECT
  TO anon, authenticated
  USING (status = 'available');

-- Política para permitir UPDATE de slots para agendamentos (necessário para marcar como booked)
CREATE POLICY "Anonymous can update slots for booking"
  ON slots
  FOR UPDATE
  TO anon, authenticated
  USING (status = 'available')
  WITH CHECK (status = 'booked' AND booking_id IS NOT NULL);

-- Política para administradores lerem todos os slots
CREATE POLICY "Authenticated can read all slots"
  ON slots
  FOR SELECT
  TO authenticated
  USING (
    salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  );

-- Política para administradores gerenciarem seus slots
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

-- Garantir que RLS está habilitado
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;