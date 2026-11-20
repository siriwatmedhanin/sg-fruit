-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Initial Catalog Seed
-- Migration: 0002_seed_catalog.sql

-- 1. Insert Standard Categories
INSERT OR IGNORE INTO categories (id, name, slug, sort_order) VALUES
  ('cat-thai', 'ผลไม้ไทย', 'thai-fruits', 1),
  ('cat-imported', 'ผลไม้นำเข้า', 'imported-fruits', 2),
  ('cat-seasonal', 'ผลไม้ตามฤดูกาล', 'seasonal-fruits', 3),
  ('cat-veg', 'ผักสด', 'vegetables', 4);

-- 2. Clean up test products if any
DELETE FROM product_variants WHERE product_id IN (
  'sg-001', 'sg-002', 'sg-003', 'sg-004', 'sg-005',
  'sg-006', 'sg-007', 'sg-008', 'sg-009', 'sg-010'
);
DELETE FROM products WHERE id IN (
  'sg-001', 'sg-002', 'sg-003', 'sg-004', 'sg-005',
  'sg-006', 'sg-007', 'sg-008', 'sg-009', 'sg-010'
);

-- 3. Insert 10 SG FRUIT Products
INSERT INTO products (id, name, category_id, description, is_featured, is_active) VALUES
  ('sg-001', 'อะโวคาโดฮาส', 'cat-imported', 'อะโวคาโดสายพันธุ์ฮาส เนื้อเนียน รสสัมผัสมันกลมกล่อม', 1, 1),
  ('sg-002', 'มะม่วงน้ำดอกไม้', 'cat-thai', 'มะม่วงน้ำดอกไม้ผิวสวย กลิ่นหอมละมุน รสหวานฉ่ำ', 1, 1),
  ('sg-003', 'มังคุด', 'cat-thai', 'มังคุดไทยคัดขนาด เนื้อขาวสะอาด รสหวานอมเปรี้ยว', 0, 1),
  ('sg-004', 'ลำไย', 'cat-thai', 'ลำไยผลกลมสวย เปลือกบาง เนื้อหนาใส รสหวานหอม', 0, 1),
  ('sg-005', 'แอปเปิลฟูจิ', 'cat-imported', 'แอปเปิลฟูจิผิวสีแดงอมชมพู เนื้อกรอบแน่นฉ่ำน้ำ', 1, 1),
  ('sg-006', 'ส้มสายน้ำผึ้ง', 'cat-thai', 'ส้มสายน้ำผึ้งรสหวานอมเปรี้ยว ชุ่มคอ สดชื่น', 0, 1),
  ('sg-007', 'สตรอว์เบอร์รี', 'cat-imported', 'สตรอว์เบอร์รีสด กลิ่นหอมเป็นเอกลักษณ์', 1, 1),
  ('sg-008', 'กล้วยหอมทอง', 'cat-thai', 'กล้วยหอมทองคัดพิเศษ ผลสวย รสหวานหอม', 0, 1),
  ('sg-009', 'กรีนโอ๊ค', 'cat-veg', 'ผักสลัดกรีนโอ๊ค ใบหยักสีเขียวสด กรอบนุ่ม', 0, 1),
  ('sg-010', 'เรดโอ๊ค', 'cat-veg', 'ผักสลัดเรดโอ๊ค ใบสีแดงอมม่วง สดสะอาด', 0, 0); -- Note: sg-010 set to is_active = 0 for testing Out of Stock/Inactive state!

-- 4. Insert Variants with custom sales unit SKUs (showing that SKU '1 โล' and '2 โล' can duplicate across different products!)
INSERT INTO product_variants (id, product_id, sku, unit, price, cost_price, stock_quantity, is_active) VALUES
  ('var-001a', 'sg-001', '1 โล', 'กิโลกรัม', 159, 100, 15, 1),
  ('var-001b', 'sg-001', '2 โล', '2 กิโลกรัม', 299, 190, 8, 1),
  ('var-002a', 'sg-002', '1 โล', 'กิโลกรัม', 129, 80, 20, 1),  -- Duplicate SKU '1 โล'
  ('var-002b', 'sg-002', '2 โล', '2 กิโลกรัม', 249, 150, 12, 1), -- Duplicate SKU '2 โล'
  ('var-003',  'sg-003', '1 โล', 'กิโลกรัม', 139, 90, 14, 1),   -- Duplicate SKU '1 โล'
  ('var-004',  'sg-004', '1 โล', 'กิโลกรัม', 89, 55, 18, 1),    -- Duplicate SKU '1 โล'
  ('var-005',  'sg-005', '4 ลูก', 'แพ็ก', 129, 80, 22, 1),
  ('var-006',  'sg-006', '1 โล', 'กิโลกรัม', 99, 60, 16, 1),    -- Duplicate SKU '1 โล'
  ('var-007',  'sg-007', '1 กล่อง', 'กล่อง', 189, 120, 10, 1),
  ('var-008',  'sg-008', '1 หวี', 'หวี', 69, 40, 25, 1),
  ('var-009',  'sg-009', '1 แพ็ก', 'แพ็ก', 45, 25, 30, 1),
  ('var-010',  'sg-010', '1 แพ็ก', 'แพ็ก', 45, 25, 0, 0);     -- Stock 0 and inactive!
