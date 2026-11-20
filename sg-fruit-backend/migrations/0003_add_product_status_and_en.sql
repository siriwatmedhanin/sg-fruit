-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Product Status & English Name Support
-- Migration: 0003_add_product_status_and_en.sql

ALTER TABLE products ADD COLUMN name_en TEXT;
ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Sync initial status with is_active
UPDATE products SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END;
