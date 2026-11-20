-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Inventory & Stock Management Schema
-- Migration: 0008_inventory_management.sql

-- 1. ADD LOW STOCK THRESHOLD & INVENTORY QUANTITY TO PRODUCT_VARIANTS
ALTER TABLE product_variants ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10;
ALTER TABLE product_variants ADD COLUMN inventory_quantity INTEGER;

-- Sync initial inventory_quantity from existing stock_quantity
UPDATE product_variants 
SET inventory_quantity = stock_quantity 
WHERE inventory_quantity IS NULL;

-- 2. ADD STOCK DEDUCTION TRACKING TO ORDER_ITEMS & ORDERS
ALTER TABLE order_items ADD COLUMN stock_deducted BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN stock_deducted_at DATETIME;
ALTER TABLE order_items ADD COLUMN stock_deducted_by TEXT;

ALTER TABLE orders ADD COLUMN stock_deducted_status TEXT NOT NULL DEFAULT 'undeducted';
ALTER TABLE orders ADD COLUMN stock_deducted_at DATETIME;
ALTER TABLE orders ADD COLUMN stock_deducted_by TEXT;

-- 3. INVENTORY MOVEMENTS LEDGER TABLE
-- Strictly immutable audit trail of every stock modification
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT NOT NULL REFERENCES product_variants(id),
  movement_type TEXT NOT NULL CHECK (
    movement_type IN (
      'STOCK_IN',
      'STOCK_OUT',
      'ADJUSTMENT',
      'DAMAGE',
      'RETURN',
      'ORDER_DEDUCTION',
      'OPENING_BALANCE'
    )
  ),
  quantity_change INTEGER NOT NULL, -- Positive for increase, negative for decrease
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reference_type TEXT,              -- 'order', 'order_item', 'manual', 'damage_report', 'return', 'system_migration'
  reference_id TEXT,                -- e.g. order_id, order_item_id, or batch_id
  reason TEXT,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT UNIQUE
);

-- Fast lookup indexes for inventory movements
CREATE INDEX IF NOT EXISTS idx_movements_variant_id ON inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_ref ON inventory_movements(reference_type, reference_id);

-- 4. RECORD OPENING BALANCE AUDIT ENTRIES FOR EXISTING STOCK (IDEMPOTENT)
INSERT OR IGNORE INTO inventory_movements (
  id,
  product_id,
  variant_id,
  movement_type,
  quantity_change,
  quantity_before,
  quantity_after,
  reference_type,
  reference_id,
  reason,
  note,
  created_by,
  created_at,
  idempotency_key
)
SELECT 
  'init-' || pv.id,
  pv.product_id,
  pv.id,
  'OPENING_BALANCE',
  pv.stock_quantity,
  0,
  pv.stock_quantity,
  'system_migration',
  'migration_0008',
  'Opening Balance',
  'Initial stock audit trail established during Step 5 migration',
  'system',
  CURRENT_TIMESTAMP,
  'opening-bal-' || pv.id
FROM product_variants pv
WHERE pv.stock_quantity > 0;
