/*
  # Adicionar campos de promoção à tabela services

  ## Alterações

  1. Novos campos na tabela `services`:
    - `on_promotion` (boolean) - Indica se o serviço está em promoção
    - `promotional_price` (decimal) - Preço promocional do serviço

  2. Comportamento:
    - Quando `on_promotion` = true, o preço original é exibido riscado
    - O preço promocional é exibido em destaque
    - Exemplo: De: ~~90~~ Por: 70

  ## Notas

  - Os campos são opcionais (nullable) para manter compatibilidade
  - O preço promocional só é usado quando `on_promotion` = true
  - Valores padrão: `on_promotion` = false, `promotional_price` = null
*/

-- Adicionar campo para indicar se está em promoção
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'on_promotion'
  ) THEN
    ALTER TABLE services ADD COLUMN on_promotion boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Adicionar campo para o preço promocional
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'promotional_price'
  ) THEN
    ALTER TABLE services ADD COLUMN promotional_price decimal(10,2);
  END IF;
END $$;

-- Adicionar constraint para garantir que o preço promocional seja menor que o preço normal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'check_promotional_price_lower'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT check_promotional_price_lower
      CHECK (promotional_price IS NULL OR promotional_price < price);
  END IF;
END $$;
