/*
  # Corrigir políticas RLS de serviços

  1. Alterações nas Políticas
    - Garantir que usuários anônimos possam ver serviços ativos
    - Garantir que usuários autenticados possam gerenciar seus próprios serviços
    - Remover políticas antigas e criar novas mais específicas

  2. Segurança
    - SELECT: Qualquer pessoa (anon, authenticated) pode ver serviços ativos
    - INSERT: Apenas usuários autenticados donos do salão
    - UPDATE: Apenas usuários autenticados donos do salão
    - DELETE: Apenas usuários autenticados donos do salão
*/

-- Remover políticas antigas
DROP POLICY IF EXISTS "Public can read active services" ON services;
DROP POLICY IF EXISTS "Salons can manage own services" ON services;

-- Criar política para leitura pública de serviços ativos
CREATE POLICY "Anyone can read active services"
  ON services
  FOR SELECT
  TO public
  USING (active = true);

-- Criar política para inserir serviços (apenas donos do salão)
CREATE POLICY "Salon owners can insert services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  );

-- Criar política para atualizar serviços (apenas donos do salão)
CREATE POLICY "Salon owners can update own services"
  ON services
  FOR UPDATE
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

-- Criar política para deletar serviços (apenas donos do salão)
CREATE POLICY "Salon owners can delete own services"
  ON services
  FOR DELETE
  TO authenticated
  USING (
    salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  );
