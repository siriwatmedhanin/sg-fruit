-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Product Gallery Support (Maximum 5 Images)
-- Migration: 0005_product_gallery.sql

-- 1. CREATE PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_key TEXT NOT NULL,
  thumbnail_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  image_meta TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON product_images(product_id, sort_order);

-- 3. TRIGGER TO STRICTLY ENFORCE MAXIMUM 5 IMAGES PER PRODUCT AT DATABASE LEVEL
CREATE TRIGGER IF NOT EXISTS trg_max_5_product_images
BEFORE INSERT ON product_images
FOR EACH ROW
WHEN (SELECT COUNT(*) FROM product_images WHERE product_id = NEW.product_id) >= 5
BEGIN
  SELECT RAISE(FAIL, 'PRODUCT_IMAGE_LIMIT_EXCEEDED: สินค้าแต่ละรายการสามารถมีรูปภาพได้สูงสุด 5 รูปเท่านั้น');
END;

-- 4. IDEMPOTENT BACKFILL: Migrate existing single-image products into product_images table
INSERT INTO product_images (id, product_id, image_key, thumbnail_key, sort_order, is_primary, image_meta, created_at, updated_at)
SELECT 
  'img-migrated-' || p.id AS id,
  p.id AS product_id,
  p.image_key AS image_key,
  COALESCE(p.thumbnail_key, p.image_key) AS thumbnail_key,
  0 AS sort_order,
  1 AS is_primary,
  p.image_meta AS image_meta,
  CURRENT_TIMESTAMP AS created_at,
  CURRENT_TIMESTAMP AS updated_at
FROM products p
WHERE p.image_key IS NOT NULL AND p.image_key != ''
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
  );
