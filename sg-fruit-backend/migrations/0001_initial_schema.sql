-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Cloudflare D1 Initial Database Schema
-- Migration: 0001_initial_schema.sql

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description TEXT,
  image_key TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCT VARIANTS TABLE
-- =========================================================================
-- CRITICAL BUSINESS RULE FOR SG FRUIT:
-- - `sku` is a custom sales unit label (e.g. "1 โล", "2 โล", "1 ชุด", "1 แท่ง", "500 กรัม")
-- - `sku` can be freely entered and CAN BE DUPLICATED across products and variants
-- - DO NOT add a UNIQUE constraint to `sku`
-- - Internal unique identification is `id` (UUID/ULID)
-- - `sku` is kept for admin/inventory/packing/export, NEVER exposed in Public API
-- =========================================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL, -- Custom sales unit label (e.g. '1 โล', '2 โล'), NOT UNIQUE!
  unit TEXT NOT NULL, -- Display unit text (e.g. 'กิโลกรัม', 'แพ็ก', 'กล่อง')
  price REAL NOT NULL, -- Selling price (THB)
  cost_price REAL NOT NULL DEFAULT 0, -- Cost price (THB) - Admin only
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching variants by product
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
-- Non-unique index on SKU for fast search/lookup
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE, -- Human-readable Order Reference e.g. SG-20261118-001
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'packed', 'shipped', 'cancelled')),
  packing_status TEXT NOT NULL DEFAULT 'unpacked' CHECK (packing_status IN ('unpacked', 'packing', 'packed')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for order listing & filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT NOT NULL REFERENCES product_variants(id),
  product_name TEXT NOT NULL,
  sku TEXT, -- Copied at time of order for packing reference
  unit TEXT,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  subtotal REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 6. PACKING LOGS TABLE
CREATE TABLE IF NOT EXISTS packing_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  packed_by TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. IMPORT LOGS TABLE
CREATE TABLE IF NOT EXISTS import_logs (
  id TEXT PRIMARY KEY,
  imported_by TEXT NOT NULL,
  filename TEXT NOT NULL,
  records_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. ADMIN USERS & ROLES TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'packing_staff')),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
