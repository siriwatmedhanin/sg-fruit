-- =========================================================================
-- SG FRUIT — Synthetic Staging Test Seed Data
-- Script: migrations/seed_staging_data.sql
-- คำอธิบาย: ข้อมูลจำลองสังเคราะห์ (Synthetic Fixture) สำหรับทดสอบระบบบน Cloudflare Staging
-- กฎความปลอดภัย:
-- 1. ห้ามใช้ข้อมูลลูกค้าจริง หรือคำสั่งซื้อจริง
-- 2. ห้ามใช้ข้อมูลสินค้าที่ยังไม่ได้รับการยืนยันจากธุรกิจ (ใช้ Mock Products สำหรับทดสอบฟังก์ชัน)
-- 3. รองรับ Idempotent Execution ด้วย INSERT OR IGNORE / ON CONFLICT
-- =========================================================================

-- 1. Synthetic Categories for Staging
INSERT OR IGNORE INTO categories (id, name, slug, sort_order) VALUES
  ('cat-staging-thai', 'ผลไม้ไทย (Staging Test)', 'thai-fruits-staging', 1),
  ('cat-staging-imported', 'ผลไม้นำเข้า (Staging Test)', 'imported-fruits-staging', 2),
  ('cat-staging-seasonal', 'ผลไม้ตามฤดูกาล (Staging Test)', 'seasonal-fruits-staging', 3);

-- 2. Synthetic Test Products
INSERT INTO products (id, name, name_en, category_id, description, status, is_active, is_featured, created_at, updated_at) VALUES
  ('prod-staging-001', 'สินค้าทดสอบ อะโวคาโด Staging', 'Avocado Staging Test', 'cat-staging-imported', 'สินค้าตัวอย่างสำหรับทดสอบการแสดงผลและคำสั่งซื้อในระบบ Staging', 'active', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod-staging-002', 'สินค้าทดสอบ มะม่วง Staging', 'Mango Staging Test', 'cat-staging-thai', 'สินค้าตัวอย่างสำหรับทดสอบฟังก์ชันสต็อกและแกลเลอรีในระบบ Staging', 'active', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  name_en = excluded.name_en,
  category_id = excluded.category_id,
  description = excluded.description,
  status = excluded.status,
  is_active = excluded.is_active;

-- 3. Synthetic Product Variants
INSERT INTO product_variants (id, product_id, sku, unit, price, cost_price, stock_quantity, inventory_quantity, low_stock_threshold, is_active, created_at, updated_at) VALUES
  ('var-staging-001a', 'prod-staging-001', 'กล่อง 1 กก.', '1 กิโลกรัม', 159, 100, 50, 50, 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('var-staging-001b', 'prod-staging-001', 'กล่อง 3 กก.', '3 กิโลกรัม', 429, 280, 30, 30, 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('var-staging-002a', 'prod-staging-002', 'กล่อง 2 กก.', '2 กิโลกรัม', 199, 120, 40, 40, 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  sku = excluded.sku,
  unit = excluded.unit,
  price = excluded.price,
  cost_price = excluded.cost_price,
  stock_quantity = excluded.stock_quantity,
  inventory_quantity = excluded.inventory_quantity;

-- 4. Single Admin Security: Purge legacy non-admin roles
-- หมายเหตุ: ระบบ SG FRUIT ใช้งาน Single Admin Model (ตัด Packing Staff ออกทั้งหมด)
-- คำสั่งล้างบัญชีพนักงานเดิมที่อาจตกค้างในฐานข้อมูลทดสอบ:
DELETE FROM admin_users WHERE role != 'admin';

-- 5. Dynamic Authorized Admin Provisioning (FAIL CLOSED REQUIREMENT)
-- หมายเหตุความปลอดภัยสูงสุด: ห้าม Hardcode อีเมลของ Admin ในไฟล์ SQL สำหรับ Staging/Production เด็ดขาด
-- การกำหนดสิทธิ์ Admin ต้องดำเนินการผ่านสคริปต์ `scripts/seed_staging.ts` โดยอ่านค่าจากตัวแปร STAGING_ADMIN_EMAIL
-- สคริปต์จะทำการตรวจสอบรูปแบบอีเมลอย่างเคร่งครัด หากไม่พบค่าหรือรูปแบบไม่ถูกต้อง
-- ระบบจะ Fail Closed (Throw Error และ Exit Code 1) ทันที ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
