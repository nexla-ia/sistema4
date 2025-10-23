/*
  # Políticas de Segurança RLS - Centro Terapêutico

  ## Descrição
  Define todas as políticas de Row Level Security (RLS) para controlar
  o acesso aos dados do sistema de agendamento.

  ## Políticas por Tabela

  ### `salons` - Salões/Centros Terapêuticos
  1. SELECT: Público pode ver salões ativos
  2. INSERT: Usuários autenticados podem criar salões
  3. UPDATE: Apenas proprietário pode atualizar
  4. DELETE: Apenas proprietário pode deletar

  ### `services` - Serviços
  1. SELECT: Público pode ver serviços ativos
  2. INSERT: Apenas admin do salão pode adicionar
  3. UPDATE: Apenas admin do salão pode atualizar
  4. DELETE: Apenas admin do salão pode deletar

  ### `bookings` - Agendamentos
  1. SELECT: Apenas admin do salão pode ver
  2. INSERT: Qualquer pessoa pode criar agendamento
  3. UPDATE: Apenas admin do salão pode atualizar
  4. DELETE: Apenas admin do salão pode cancelar

  ### `reviews` - Avaliações
  1. SELECT: Público pode ver reviews aprovadas
  2. INSERT: Qualquer pessoa pode criar review
  3. UPDATE: Apenas admin do salão pode aprovar/editar
  4. DELETE: Apenas admin do salão pode deletar

  ### `time_slots` - Horários
  1. SELECT: Público pode ver horários disponíveis
  2. INSERT: Apenas admin do salão pode criar
  3. UPDATE: Apenas admin do salão pode atualizar
  4. DELETE: Apenas admin do salão pode deletar

  ## Segurança
  - Todas as políticas são RESTRITIVAS por padrão
  - Apenas acesso explicitamente autorizado é permitido
  - Proteção contra acesso não autorizado a dados sensíveis
*/

-- =============================================
-- POLÍTICAS: salons
-- =============================================

-- Público pode ver salões ativos
CREATE POLICY "Public can view active salons"
  ON salons FOR SELECT
  TO public
  USING (active = true);

-- Usuários autenticados podem criar salões
CREATE POLICY "Authenticated users can create salons"
  ON salons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Proprietários podem atualizar seus salões
CREATE POLICY "Salon owners can update their salons"
  ON salons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Proprietários podem deletar seus salões
CREATE POLICY "Salon owners can delete their salons"
  ON salons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS: services
-- =============================================

-- Público pode ver serviços ativos
CREATE POLICY "Public can view active services"
  ON services FOR SELECT
  TO public
  USING (active = true);

-- Admins do salão podem adicionar serviços
CREATE POLICY "Salon admins can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = services.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- Admins do salão podem atualizar serviços
CREATE POLICY "Salon admins can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = services.salon_id
      AND salons.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = services.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- Admins do salão podem deletar serviços
CREATE POLICY "Salon admins can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = services.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- =============================================
-- POLÍTICAS: bookings
-- =============================================

-- Admins do salão podem ver todos os agendamentos
CREATE POLICY "Salon admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = bookings.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- Qualquer pessoa pode criar agendamento
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO public
  WITH CHECK (true);

-- Admins do salão podem atualizar agendamentos
CREATE POLICY "Salon admins can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = bookings.salon_id
      AND salons.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = bookings.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- Admins do salão podem deletar agendamentos
CREATE POLICY "Salon admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = bookings.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- =============================================
-- POLÍTICAS: reviews
-- =============================================

-- Público pode ver reviews aprovadas
CREATE POLICY "Public can view approved reviews"
  ON reviews FOR SELECT
  TO public
  USING (approved = true);

-- Qualquer pessoa pode criar review (não aprovada por padrão)
CREATE POLICY "Anyone can create reviews"
  ON reviews FOR INSERT
  TO public
  WITH CHECK (approved = false);

-- Admins do salão podem atualizar reviews (aprovar/reprovar)
CREATE POLICY "Salon admins can update reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = reviews.salon_id
      AND salons.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = reviews.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- Admins do salão podem deletar reviews
CREATE POLICY "Salon admins can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = reviews.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- =============================================
-- POLÍTICAS: time_slots
-- =============================================

-- Público pode ver horários disponíveis
CREATE POLICY "Public can view available time slots"
  ON time_slots FOR SELECT
  TO public
  USING (status = 'available');

-- Admins do salão podem criar horários
CREATE POLICY "Salon admins can insert time slots"
  ON time_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = time_slots.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- Admins do salão podem atualizar horários
CREATE POLICY "Salon admins can update time slots"
  ON time_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = time_slots.salon_id
      AND salons.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = time_slots.salon_id
      AND salons.user_id = auth.uid()
    )
  );

-- Admins do salão podem deletar horários
CREATE POLICY "Salon admins can delete time slots"
  ON time_slots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = time_slots.salon_id
      AND salons.user_id = auth.uid()
    )
  );
