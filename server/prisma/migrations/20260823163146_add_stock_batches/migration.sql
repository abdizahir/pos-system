/*
  Warnings:

  - You are about to drop the column `sale_id` on the `stock_movements` table. All the data in the column will be lost.
  - Added the required column `stock_batch_id` to the `sale_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_sale_id_fkey";

-- DropIndex
DROP INDEX "stock_movements_sale_id_idx";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "stock_quantity" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "sku" SET DEFAULT 'PT' || lpad(nextval('product_sku_seq')::text, 3, '0');

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "stock_batch_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "sale_id";

-- CreateIndex
CREATE INDEX "sale_items_stock_batch_id_idx" ON "sale_items"("stock_batch_id");

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_stock_batch_id_fkey" FOREIGN KEY ("stock_batch_id") REFERENCES "stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
