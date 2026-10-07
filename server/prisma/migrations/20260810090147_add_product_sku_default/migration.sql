-- Create sequence
CREATE SEQUENCE IF NOT EXISTS "product_sku_seq" START 1;

-- Sync sequence only if matching PT SKUs already exist
DO $$
DECLARE max_sku_num integer;
BEGIN
  SELECT MAX(
    CASE
      WHEN sku ~ '^PT[0-9]+$' THEN substring(sku from 3)::int
      ELSE NULL
    END
  )
  INTO max_sku_num
  FROM "products";

  IF max_sku_num IS NOT NULL THEN
    PERFORM setval('product_sku_seq', max_sku_num);
  END IF;
END $$;

-- AlterTable
ALTER TABLE "products"
ALTER COLUMN "sku"
SET DEFAULT 'PT' || lpad(nextval('product_sku_seq')::text, 3, '0');