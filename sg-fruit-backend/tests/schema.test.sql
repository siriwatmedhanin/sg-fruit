-- SG FRUIT Schema Verification Test
-- Test Case: Confirm that multiple products and variants can share the SAME SKU without collision!

-- Cleanup previous test run data
DELETE FROM product_variants WHERE id IN ('var-1', 'var-2', 'var-3', 'var-4');
DELETE FROM products WHERE id IN ('prod-1', 'prod-2');
DELETE FROM categories WHERE id IN ('cat-1', 'cat-2');

-- 1. Insert Categories
INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('cat-1', 'ผลไม้นำเข้า', 'imported-fruits-test', 1),
  ('cat-2', 'ผลไม้ไทย', 'thai-fruits-test', 2);

-- 2. Insert Products
INSERT INTO products (id, name, category_id, description) VALUES
  ('prod-1', 'อะโวคาโดฮาส', 'cat-1', 'อะโวคาโดฮาสสดจากสวน'),
  ('prod-2', 'มะม่วงน้ำดอกไม้', 'cat-2', 'มะม่วงน้ำดอกไม้หวานหอม');

-- 3. Insert Variants with DUPLICATE SKUs (e.g. '1 โล', '2 โล')
-- Expected: MUST SUCCEED (No UNIQUE constraint on SKU)
INSERT INTO product_variants (id, product_id, sku, unit, price, cost_price, stock_quantity) VALUES
  ('var-1', 'prod-1', '1 โล', 'กิโลกรัม', 159, 100, 20),
  ('var-2', 'prod-1', '2 โล', '2 กิโลกรัม', 299, 190, 10),
  ('var-3', 'prod-2', '1 โล', 'กิโลกรัม', 129, 80, 25), -- SAME SKU '1 โล' as prod-1!
  ('var-4', 'prod-2', '2 โล', '2 กิโลกรัม', 249, 150, 15); -- SAME SKU '2 โล' as prod-1!

-- 4. Verify query
SELECT 
  p.name AS product_name,
  v.sku AS sales_unit_sku,
  v.unit,
  v.price
FROM product_variants v
JOIN products p ON v.product_id = p.id
ORDER BY v.sku, p.name;
