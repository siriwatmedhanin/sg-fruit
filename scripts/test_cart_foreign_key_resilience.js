import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const shopCartPath = path.join(ROOT_DIR, 'js', 'shop-cart.js');
const shopCartContent = fs.readFileSync(shopCartPath, 'utf8');

const publicTsPath = path.join(ROOT_DIR, 'sg-fruit-backend', 'src', 'routes', 'public.ts');
const publicTsContent = fs.readFileSync(publicTsPath, 'utf8');

test('SG FRUIT - Cart & Order Foreign Key Resilience Suite', async (t) => {
  await t.test('1. Backend: /api/products returns variant id for foreign key integrity', () => {
    assert.match(publicTsContent, /SELECT id, product_id, unit, price, stock_quantity\s+FROM product_variants/);
    assert.match(publicTsContent, /list\.push\(\{\s*id:\s*v\.id/);
  });

  await t.test('2. Backend: POST /api/orders validates items and avoids foreign key failure', () => {
    // Verifies product existence check
    assert.match(publicTsContent, /SELECT id, name, is_active\s+FROM products\s+WHERE id IN/);
    assert.match(publicTsContent, /error:\s*'INVALID_CART_ITEMS'/);
    assert.match(publicTsContent, /มีสินค้าบางรายการในตะกร้าถูกอัปเดตหรือหมดแล้ว/);

    // Verifies variant resolution
    assert.match(publicTsContent, /SELECT id, product_id, unit, price, is_active\s+FROM product_variants/);
    assert.match(publicTsContent, /resolvedVariantId/);

    // Verifies error catching for constraint
    assert.match(publicTsContent, /errMsg\.includes\('FOREIGN KEY'\) \|\| errMsg\.includes\('SQLITE_CONSTRAINT'\)/);
  });

  await t.test('3. Storefront: shop-cart.js contains validateAndSyncCart and auto-pruning', () => {
    assert.match(shopCartContent, /function validateAndSyncCart/);
    assert.match(shopCartContent, /validateAndSyncCart\(true\)/);
    assert.match(shopCartContent, /validateAndSyncCart\(false\)/);
    assert.match(shopCartContent, /มีสินค้าบางรายการในตะกร้าถูกอัปเดตหรือหมดแล้ว/);
  });

  await t.test('4. Storefront: checkout payload strictly maps valid variant_id', () => {
    assert.match(shopCartContent, /matchingVar\.id && !matchingVar\.id\.startsWith\('v-'\)/);
    assert.match(shopCartContent, /realVariantId && !realVariantId\.startsWith\('v-'\) \? realVariantId : null/);
  });

  await t.test('5. Storefront: clears cart with renderCartUI and defines updateCartUI alias', () => {
    assert.match(shopCartContent, /const updateCartUI = renderCartUI/);
    assert.match(shopCartContent, /state\.cart = \[\];\s+saveCart\(\);\s+renderCartUI\(\);/);
    assert.doesNotMatch(shopCartContent, /saveCart\(\);\s+updateCartUI\(\);/);
  });

  await t.test('6. Storefront: locks confirm button during submit to prevent duplicate orders', () => {
    assert.match(shopCartContent, /confirmBtn\.disabled = true/);
    assert.match(shopCartContent, /confirmBtn\.style\.pointerEvents = 'none'/);
  });
});
