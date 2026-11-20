-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Storage Cleanup Queue & Primary Image Integrity
-- Migration: 0006_storage_cleanup_queue.sql

-- 1. STORAGE CLEANUP QUEUE TABLE
-- Safely tracks R2 object keys that failed to delete during replacements or deletions
CREATE TABLE IF NOT EXISTS storage_cleanup_queue (
  id TEXT PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_status ON storage_cleanup_queue(status);

-- 2. PARTIAL UNIQUE INDEX: Strictly guarantee at most ONE primary image per product in D1
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_primary_image 
ON product_images(product_id) 
WHERE is_primary = 1;
