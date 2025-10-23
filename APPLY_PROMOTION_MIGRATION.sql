-- Execute este script no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Adicionar campo para indicar se está em promoção
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'on_promotion'
  ) THEN
    ALTER TABLE services ADD COLUMN on_promotion boolean DEFAULT false NOT NULL;
    RAISE NOTICE 'Campo on_promotion adicionado com sucesso!';
  ELSE
    RAISE NOTICE 'Campo on_promotion já existe.';
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
    RAISE NOTICE 'Campo promotional_price adicionado com sucesso!';
  ELSE
    RAISE NOTICE 'Campo promotional_price já existe.';
  END IF;
END $$;

-- Adicionar constraint para garantir que o preço promocional seja menor que o preço normal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_promotional_price_lower'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT check_promotional_price_lower
      CHECK (promotional_price IS NULL OR promotional_price < price);
    RAISE NOTICE 'Constraint check_promotional_price_lower adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Constraint check_promotional_price_lower já existe.';
  END IF;
END $$;

-- Verificar as colunas criadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'services'
AND column_name IN ('on_promotion', 'promotional_price')
ORDER BY column_name;
