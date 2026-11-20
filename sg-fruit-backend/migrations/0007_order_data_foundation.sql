-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Step 4A: Order Data Foundation
-- Migration: 0007_order_data_foundation.sql
-- Description:
--   Creates order_import_batches and extends orders & order_items to support
--   platform Excel orders (TikTok Shop 65-column format: Sheet OrderSKUList)
--   Strictly preserves 1 row in Excel = 1 Order Item (NO AGGREGATION).

-- =========================================================================
-- 1. ORDER IMPORT BATCHES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS order_import_batches (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_hash TEXT,
  file_size INTEGER DEFAULT 0,
  sheet_name TEXT NOT NULL DEFAULT 'OrderSKUList',
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_orders_count INTEGER NOT NULL DEFAULT 0,
  imported_items_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  imported_by TEXT,
  notes TEXT,
  error_log TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_created_at ON order_import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_file_hash ON order_import_batches(file_hash);

-- =========================================================================
-- 2. EXTEND ORDERS TABLE (FOR PLATFORM EXCEL & LOGISTICS DATA)
-- =========================================================================
ALTER TABLE orders ADD COLUMN batch_id TEXT REFERENCES order_import_batches(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN platform TEXT NOT NULL DEFAULT 'tiktok_shop';
ALTER TABLE orders ADD COLUMN platform_order_id TEXT;
ALTER TABLE orders ADD COLUMN platform_order_status TEXT;
ALTER TABLE orders ADD COLUMN platform_order_substatus TEXT;
ALTER TABLE orders ADD COLUMN cancel_return_type TEXT;
ALTER TABLE orders ADD COLUMN order_type TEXT;
ALTER TABLE orders ADD COLUMN fulfillment_type TEXT;
ALTER TABLE orders ADD COLUMN warehouse_name TEXT;
ALTER TABLE orders ADD COLUMN tracking_id TEXT;
ALTER TABLE orders ADD COLUMN delivery_option TEXT;
ALTER TABLE orders ADD COLUMN shipping_provider_name TEXT;
ALTER TABLE orders ADD COLUMN buyer_message TEXT;
ALTER TABLE orders ADD COLUMN buyer_username TEXT;
ALTER TABLE orders ADD COLUMN recipient_name TEXT;
ALTER TABLE orders ADD COLUMN recipient_phone TEXT;
ALTER TABLE orders ADD COLUMN zipcode TEXT;
ALTER TABLE orders ADD COLUMN country TEXT DEFAULT 'ไทย';
ALTER TABLE orders ADD COLUMN province TEXT;
ALTER TABLE orders ADD COLUMN district TEXT;
ALTER TABLE orders ADD COLUMN subdistrict TEXT;
ALTER TABLE orders ADD COLUMN detail_address TEXT;
ALTER TABLE orders ADD COLUMN additional_address_info TEXT;
ALTER TABLE orders ADD COLUMN payment_method TEXT;
ALTER TABLE orders ADD COLUMN package_id TEXT;
ALTER TABLE orders ADD COLUMN seller_note TEXT;
ALTER TABLE orders ADD COLUMN checked_status TEXT;
ALTER TABLE orders ADD COLUMN checked_marked_by TEXT;
ALTER TABLE orders ADD COLUMN order_channel TEXT;
ALTER TABLE orders ADD COLUMN creator_handle TEXT;
ALTER TABLE orders ADD COLUMN request_tax_invoice TEXT;
ALTER TABLE orders ADD COLUMN tax_buyer_id TEXT;
ALTER TABLE orders ADD COLUMN tax_type TEXT;
ALTER TABLE orders ADD COLUMN tax_buyer_name TEXT;
ALTER TABLE orders ADD COLUMN tax_email TEXT;
ALTER TABLE orders ADD COLUMN tax_phone TEXT;
ALTER TABLE orders ADD COLUMN tax_registered_address TEXT;
ALTER TABLE orders ADD COLUMN tax_address_type TEXT;
ALTER TABLE orders ADD COLUMN platform_created_at TEXT;
ALTER TABLE orders ADD COLUMN platform_paid_at TEXT;
ALTER TABLE orders ADD COLUMN platform_rts_at TEXT;
ALTER TABLE orders ADD COLUMN platform_shipped_at TEXT;
ALTER TABLE orders ADD COLUMN platform_delivered_at TEXT;
ALTER TABLE orders ADD COLUMN platform_cancelled_at TEXT;
ALTER TABLE orders ADD COLUMN cancel_by TEXT;
ALTER TABLE orders ADD COLUMN cancel_reason TEXT;
ALTER TABLE orders ADD COLUMN sku_total_amount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_fee_after_discount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN original_shipping_fee REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_fee_seller_discount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_fee_platform_discount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN payment_platform_discount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN taxes REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN order_refund_amount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN raw_data TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_orders_platform_order_id ON orders(platform_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_orders_platform_status ON orders(platform_order_status);

-- =========================================================================
-- 3. UPGRADE ORDER_ITEMS TABLE (NULLABLE FK + 65-COLUMN DATA PRESERVATION)
-- =========================================================================
-- Modify product_id and variant_id to be nullable so unmapped items can be safely imported
ALTER TABLE order_items DROP COLUMN product_id;
ALTER TABLE order_items DROP COLUMN variant_id;
ALTER TABLE order_items ADD COLUMN product_id TEXT REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL;

-- Add platform item fields
ALTER TABLE order_items ADD COLUMN batch_id TEXT REFERENCES order_import_batches(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN source_row_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN platform_order_id TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN platform_sku_id TEXT;
ALTER TABLE order_items ADD COLUMN seller_sku TEXT;
ALTER TABLE order_items ADD COLUMN sg_sku TEXT;
ALTER TABLE order_items ADD COLUMN variation TEXT;
ALTER TABLE order_items ADD COLUMN return_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN unit_price REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN subtotal_before_discount REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN platform_discount REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN seller_discount REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN subtotal_after_discount REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN weight_kg REAL;
ALTER TABLE order_items ADD COLUMN product_category TEXT;
ALTER TABLE order_items ADD COLUMN package_id TEXT;
ALTER TABLE order_items ADD COLUMN item_packing_status TEXT NOT NULL DEFAULT 'unpacked' CHECK (item_packing_status IN ('unpacked', 'packing', 'packed'));
ALTER TABLE order_items ADD COLUMN packed_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN raw_data TEXT;
ALTER TABLE order_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Indexes for performance & search
CREATE INDEX IF NOT EXISTS idx_order_items_batch_id ON order_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_order_items_platform_order_id ON order_items(platform_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_platform_sku_id ON order_items(platform_sku_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_sku ON order_items(seller_sku);
CREATE INDEX IF NOT EXISTS idx_order_items_sg_sku ON order_items(sg_sku);
CREATE INDEX IF NOT EXISTS idx_order_items_source_row ON order_items(batch_id, source_row_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_source_row ON order_items(batch_id, source_row_number);
