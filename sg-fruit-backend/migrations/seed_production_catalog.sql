-- =========================================================================
-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Clean Production Catalog Seed Plan
-- Script: migrations/seed_production_catalog.sql
-- คำอธิบาย: สคริปต์เตรียมข้อมูลแคตตาล็อกสินค้าจริง 15 รายการ (sg-001 ถึง sg-015)
-- สำหรับรันบน Cloudflare D1 Production โดยไม่นำข้อมูลทดสอบหรือออเดอร์จำลองขึ้นไประบบจริง
-- ใช้ ON CONFLICT DO UPDATE เพื่อป้องกันการลบและละเมิด Foreign Key constraints
-- =========================================================================

-- 1. Standard Production Categories
INSERT OR IGNORE INTO categories (id, name, slug, sort_order) VALUES
  ('cat-thai', 'ผลไม้ไทย', 'thai-fruits', 1),
  ('cat-imported', 'ผลไม้นำเข้า', 'imported-fruits', 2),
  ('cat-seasonal', 'ผลไม้ตามฤดูกาล', 'seasonal-fruits', 3),
  ('cat-veg', 'ผักสด', 'vegetables', 4);

-- 2. Core 15 SG FRUIT Products (Clean Production Mapping)
INSERT INTO products (id, name, category_id, description, is_featured, is_active) VALUES
  ('sg-001', 'อะโวคาโดฮาส', 'cat-imported', 'อะโวคาโดสายพันธุ์ฮาส เนื้อเนียนละเอียด รสสัมผัสมันกลมกล่อม', 1, 1),
  ('sg-002', 'มะม่วงน้ำดอกไม้', 'cat-thai', 'มะม่วงน้ำดอกไม้ผิวสวย กลิ่นหอมละมุน เนื้อเนียนละเอียด รสหวานฉ่ำ', 1, 1),
  ('sg-003', 'มังคุด', 'cat-thai', 'มังคุดไทยคัดขนาด เนื้อขาวสะอาด รสหวานอมเปรี้ยวสดชื่น', 0, 1),
  ('sg-004', 'ลำไย', 'cat-thai', 'ลำไยผลกลมสวย เปลือกบาง เนื้อหนาใส รสหวานหอมสดชื่น', 0, 1),
  ('sg-005', 'แอปเปิลฟูจิ', 'cat-imported', 'แอปเปิลฟูจิผิวสีแดงอมชมพู เนื้อกรอบแน่นฉ่ำน้ำ รสหวานหอม', 1, 1),
  ('sg-006', 'องุ่นเขียวไร้เมล็ด', 'cat-imported', 'องุ่นเขียวไร้เมล็ดผลกลมตึง เนื้อแน่นกรอบ รสหวานชื่นใจ', 1, 1),
  ('sg-007', 'เชอร์รีนำเข้า', 'cat-imported', 'เชอร์รีผลสีแดงเข้มสดใส เนื้อแน่นฉ่ำ รสหวานอมเปรี้ยว', 1, 1),
  ('sg-008', 'ส้มแมนดาริน', 'cat-imported', 'ส้มแมนดารินผิวบางปอกง่าย เกล็ดส้มฉ่ำน้ำ รสหวานสดชื่น', 0, 1),
  ('sg-009', 'บรอกโคลี', 'cat-veg', 'บรอกโคลีช่อเขียวสด ดอกแน่นกรอบ คุณค่าทางอาหารสูง', 0, 1),
  ('sg-010', 'กะหล่ำดอก', 'cat-veg', 'กะหล่ำดอกช่อขาวแน่นสดสะอาด รสสัมผัสกรอบหวาน', 0, 1),
  ('sg-011', 'แครอต', 'cat-veg', 'แครอตเนื้อแน่นสีส้มสดใส รสหวานกรอบเป็นธรรมชาติ', 0, 1),
  ('sg-012', 'ผักสลัดรวม', 'cat-veg', 'ผักสลัดรวมคัดพิเศษ สะอาด กรอบสด เหมาะสำหรับมื้อสุขภาพ', 0, 1),
  ('sg-013', 'สตรอว์เบอร์รีนำเข้า', 'cat-imported', 'สตรอว์เบอร์รีสดกลิ่นหอม รสชาติหวานฉ่ำลงตัว', 1, 1),
  ('sg-014', 'ส้มโอทับทิมสยาม', 'cat-thai', 'ส้มโอทับทิมสยามเนื้อสีชมพูแดงเข้มสวย กุ้งเนื้อแน่น รสหวานฉ่ำ', 1, 1),
  ('sg-015', 'มะเขือเทศเชอร์รีหวาน', 'cat-veg', 'มะเขือเทศเชอร์รีสดผิวตึงเงางาม เนื้อกรอบฉ่ำ รสหวานอมเปรี้ยว', 0, 1)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  category_id = excluded.category_id,
  description = excluded.description,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active;

-- 3. Core 15 Product Variants & Pricing (Clean SKU as Sales Unit Text - Rule: SKU คือข้อความหน่วยขาย)
INSERT INTO product_variants (id, product_id, sku, unit, price, cost_price, stock_quantity, inventory_quantity, low_stock_threshold, is_active) VALUES
  ('var-001', 'sg-001', '2 ลูก', '2 ลูก', 159, 100, 20, 20, 5, 1),
  ('var-002', 'sg-002', '1 โล', 'กิโลกรัม', 129, 80, 25, 25, 5, 1),
  ('var-003', 'sg-003', '1 โล', 'กิโลกรัม', 139, 90, 20, 20, 5, 1),
  ('var-004', 'sg-004', '1 โล', 'กิโลกรัม', 89, 55, 30, 30, 5, 1),
  ('var-005', 'sg-005', '4 ลูก', '4 ลูก', 129, 80, 25, 25, 5, 1),
  ('var-006', 'sg-006', '1 แพ็ก', 'แพ็ก', 199, 130, 15, 15, 5, 1),
  ('var-007', 'sg-007', '250 กรัม', '250 กรัม', 299, 200, 15, 15, 5, 1),
  ('var-008', 'sg-008', '1 ถุง', 'ถุง', 159, 100, 20, 20, 5, 1),
  ('var-009', 'sg-009', '1 หัว', 'หัว', 79, 45, 18, 18, 5, 1),
  ('var-010', 'sg-010', '1 หัว', 'หัว', 69, 40, 20, 20, 5, 1),
  ('var-011', 'sg-011', '500 กรัม', '500 กรัม', 49, 30, 25, 25, 5, 1),
  ('var-012', 'sg-012', '1 แพ็ก', 'แพ็ก', 69, 40, 20, 20, 5, 1),
  ('var-013', 'sg-013', 'กล่อง 250 กรัม', 'กล่อง 250 กรัม', 259, 170, 15, 15, 5, 1),
  ('var-014', 'sg-014', '1 ลูก', 'ลูก', 149, 95, 18, 18, 5, 1),
  ('var-015', 'sg-015', 'แพ็ก 250 กรัม', 'แพ็ก 250 กรัม', 59, 35, 30, 30, 5, 1)
ON CONFLICT(id) DO UPDATE SET
  product_id = excluded.product_id,
  sku = excluded.sku,
  unit = excluded.unit,
  price = excluded.price,
  cost_price = excluded.cost_price,
  stock_quantity = excluded.stock_quantity,
  inventory_quantity = excluded.inventory_quantity,
  low_stock_threshold = excluded.low_stock_threshold,
  is_active = excluded.is_active;

-- 4. Initial Production Opening Stock Ledger Entries (Idempotent)
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
  'init-prod-' || pv.id,
  pv.product_id,
  pv.id,
  'OPENING_BALANCE',
  pv.inventory_quantity,
  0,
  pv.inventory_quantity,
  'system_migration',
  'seed_production_catalog',
  'Opening Balance',
  'Production catalog launch initial stock ledger',
  'system',
  CURRENT_TIMESTAMP,
  'opening-bal-prod-' || pv.id
FROM product_variants pv
WHERE pv.id LIKE 'var-%' AND pv.inventory_quantity > 0;
