-- AlterTable
ALTER TABLE "products" ALTER COLUMN "sku" SET DEFAULT 'PT' || lpad(nextval('product_sku_seq')::text, 3, '0');
