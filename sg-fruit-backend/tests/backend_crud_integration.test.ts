/**
 * SG FRUIT — STEP 7.8: COMPREHENSIVE BACKEND CRUD & DATABASE INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. Category CRUD (Public GET, Admin GET, POST, PUT, DELETE with Relational Integrity Protection)
 * 2. Product CRUD & Lifecycle (POST, PUT, Status PATCH, Featured PATCH)
 * 3. SKU Business Rule 2 (Sales unit, non-unique across products, NOT Primary Key)
 * 4. Product Gallery Business Rule 3 (Max 5 images limit, WebP magic bytes, Cover photo, Reorder, Delete)
 * 5. Order History Accounting Preservation (Soft-delete vs Hard-delete)
 * 6. Storefront Featured Products Sanitization (Sanitized variants, no cost/SKU leaks)
 * 7. Default Deny Security Gate (Business Rule 1: Single Admin Only, 401 unauth, 403 deprecated staff)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import app from '../src/index';

// -------------------------------------------------------------
// 1. SETUP ENVIRONMENT BINDINGS (D1 & R2 WRAPPERS)
// -------------------------------------------------------------
const d1Path = 'F:/Khet/งานส่วนตัว/sg-fruit-backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite';
const sqliteDb = new DatabaseSync(d1Path);

function createD1Wrapper(sqlite: DatabaseSync) {
  return {
    prepare(sql: string) {
      let boundParams: any[] = [];
      return {
        bind(...params: any[]) {
          boundParams = params;
          return this;
        },
        async all<T = any>() {
          const stmt = sqlite.prepare(sql);
          const results = stmt.all(...boundParams) as T[];
          return { results, success: true };
        },
        async first<T = any>(col?: string) {
          const stmt = sqlite.prepare(sql);
          const row = stmt.get(...boundParams) as any;
          if (!row) return null;
          if (col) return row[col] as T;
          return row as T;
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const info = stmt.run(...boundParams);
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        }
      };
    },
    async batch(statements: any[]) {
      const results: any[] = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    }
  };
}

const mockR2Storage = new Map<string, Uint8Array>();
const r2Wrapper = {
  async get(key: string) {
    const data = mockR2Storage.get(key);
    if (!data) return null;
    return {
      body: data,
      arrayBuffer: async () => data.buffer,
      writeHttpMetadata(headers: Headers) {
        headers.set('content-type', 'image/webp');
      }
    };
  },
  async put(key: string, value: any) {
    if (value instanceof Uint8Array) {
      mockR2Storage.set(key, value);
    } else {
      mockR2Storage.set(key, new Uint8Array(32));
    }
    return { key };
  },
  async delete(key: string) {
    mockR2Storage.delete(key);
    return true;
  }
};

// -------------------------------------------------------------
// 2. CRYPTOGRAPHIC RSA KEYS & JWKS SETUP
// -------------------------------------------------------------
const teamName = 'sgfruit-staging-team';
const expectedAud = 'aud-staging-sgfruit-access-778899';

const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = pubKey.export({ format: 'jwk' }) as any;
jwk.kid = 'kid-staging-key-crud';
jwk.alg = 'RS256';
jwk.use = 'sig';

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`) {
    return new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return originalFetch(input, init);
};

function base64UrlEncode(data: string | Buffer): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createSignedJwt(header: any, payload: any, privateKey: crypto.KeyObject): string {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = base64UrlEncode(sign.sign(privateKey));
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

const env: any = {
  ENVIRONMENT: 'staging',
  APP_NAME: 'SG FRUIT API (Staging Test)',
  CF_ACCESS_TEAM_NAME: teamName,
  CF_ACCESS_AUD: expectedAud,
  CORS_ADMIN_ORIGINS: 'https://staging-admin.siriwatmedhanin.com',
  CORS_ALLOW_ORIGIN: 'https://staging-admin.siriwatmedhanin.com',
  CORS_PUBLIC_ORIGINS: '',
  DB: createD1Wrapper(sqliteDb),
  PRODUCT_IMAGES: r2Wrapper
};

// Admin authentication token generator
function getAdminHeaders(): Record<string, string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = createSignedJwt(
    { alg: 'RS256', typ: 'JWT', kid: jwk.kid },
    {
      iss: `https://${teamName}.cloudflareaccess.com`,
      aud: expectedAud,
      email: 'admin-auditor@siriwatmedhanin.com',
      'custom:roles': ['admin'],
      exp: now + 3600,
      nbf: now - 60
    },
    privKey
  );
  return {
    'Cf-Access-Jwt-Assertion': jwt,
    'Origin': 'https://staging-admin.siriwatmedhanin.com',
  };
}

// Deprecated Packing Staff token generator
function getStaffHeaders(): Record<string, string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = createSignedJwt(
    { alg: 'RS256', typ: 'JWT', kid: jwk.kid },
    {
      iss: `https://${teamName}.cloudflareaccess.com`,
      aud: expectedAud,
      email: 'packing-staff@siriwatmedhanin.com',
      exp: now + 3600,
      nbf: now - 60
    },
    privKey
  );
  return {
    'Cf-Access-Jwt-Assertion': jwt,
    'Origin': 'https://staging-admin.siriwatmedhanin.com',
  };
}

// Helper to create mock WebP files with valid RIFF WEBP magic bytes
function createMockWebpFile(name: string): File {
  const buf = Buffer.alloc(32);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(24, 4);
  buf.write('WEBP', 8, 'ascii');
  buf.write('VP8 ', 12, 'ascii');
  return new File([buf], name, { type: 'image/webp' });
}

// Helper to create mock non-WebP invalid files
function createMockPngFile(name: string): File {
  const buf = Buffer.alloc(32);
  buf[0] = 0x89;
  buf.write('PNG', 1, 'ascii');
  return new File([buf], name, { type: 'image/png' });
}

// Helper to send test requests
async function testRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; body: any }> {
  const isFormData = body instanceof FormData;
  const reqHeaders = new Headers(headers);
  if (body && !isFormData && !reqHeaders.has('content-type')) {
    reqHeaders.set('content-type', 'application/json');
  }

  const defaultHost = path.startsWith('/api/admin')
    ? 'https://staging-admin-api.siriwatmedhanin.com'
    : 'https://staging-api.siriwatmedhanin.com';

  const req = new Request(`${defaultHost}${path}`, {
    method,
    headers: reqHeaders,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
  });

  const res = await app.fetch(req, env);
  const resBody = await res.json().catch(() => ({}));
  return { status: res.status, body: resBody };
}

// -------------------------------------------------------------
// 3. INTEGRATION TEST SUITE
// -------------------------------------------------------------
test('SG FRUIT - Backend & Database Completion Integration Suite', async (t) => {

  // Seed authorized admin user for server-side role resolution
  sqliteDb.prepare(`
    INSERT OR REPLACE INTO admin_users (id, email, name, role, is_active) VALUES
      ('usr-staging-admin-01', 'admin-auditor@siriwatmedhanin.com', 'Staging Admin Auditor', 'admin', 1);
  `).run();

  let testCatId = '';
  let testProductId = '';
  let testVariantId = '';
  const testCatSlug = 'test-exotic-fruits-' + Date.now();

  // =========================================================================
  // SECTION 1: CATEGORY MANAGEMENT & RELATIONAL INTEGRITY
  // =========================================================================

  await t.test('1.1 GET /api/categories (Public) returns categories with proper schema', async () => {
    const { status, body } = await testRequest('GET', '/api/categories');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    const cat = body.data[0];
    assert.ok(cat.id);
    assert.ok(cat.name);
    assert.ok(cat.slug);
    assert.ok(typeof cat.sort_order === 'number');
  });

  await t.test('1.2 GET /api/admin/categories (Admin) returns all categories', async () => {
    const { status, body } = await testRequest('GET', '/api/admin/categories', getAdminHeaders());
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.data));
  });

  await t.test('1.3 POST /api/admin/categories creates new category successfully', async () => {
    const payload = {
      name: 'ผลไม้แปลกใหม่',
      slug: testCatSlug,
      sort_order: 10
    };
    const { status, body } = await testRequest('POST', '/api/admin/categories', getAdminHeaders(), payload);
    assert.strictEqual(status, 201);
    assert.strictEqual(body.ok, true);
    assert.ok(body.data.id);
    assert.strictEqual(body.data.slug, testCatSlug);
    testCatId = body.data.id;
  });

  await t.test('1.4 POST /api/admin/categories rejects invalid slug format', async () => {
    const payload = {
      name: 'หมวดหมู่ผิดพลาด',
      slug: 'INVALID SLUG WITH SPACES & CAPS!',
      sort_order: 0
    };
    const { status, body } = await testRequest('POST', '/api/admin/categories', getAdminHeaders(), payload);
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'VALIDATION_FAILED');
  });

  await t.test('1.5 POST /api/admin/categories rejects duplicate slug (Uniqueness check)', async () => {
    const payload = {
      name: 'หมวดหมู่ซ้ำ',
      slug: testCatSlug,
      sort_order: 99
    };
    const { status, body } = await testRequest('POST', '/api/admin/categories', getAdminHeaders(), payload);
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'SLUG_EXISTS');
  });

  await t.test('1.6 PUT /api/admin/categories/:id updates category details', async () => {
    const updatedSlug = testCatSlug + '-v2';
    const payload = {
      name: 'ผลไม้แปลกใหม่นำเข้า',
      slug: updatedSlug,
      sort_order: 15
    };
    const { status, body } = await testRequest('PUT', `/api/admin/categories/${testCatId}`, getAdminHeaders(), payload);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.name, 'ผลไม้แปลกใหม่นำเข้า');
    assert.strictEqual(body.data.slug, updatedSlug);
    assert.strictEqual(body.data.sort_order, 15);
  });

  await t.test('1.7 PUT /api/admin/categories/:id returns 404 for unknown category', async () => {
    const { status, body } = await testRequest('PUT', '/api/admin/categories/cat-non-existent-999', getAdminHeaders(), {
      name: 'Unknown'
    });
    assert.strictEqual(status, 404);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'NOT_FOUND');
  });

  // =========================================================================
  // SECTION 2: PRODUCT CRUD & SKU SALES UNIT BUSINESS RULES
  // =========================================================================

  await t.test('2.1 POST /api/admin/products creates product and variant', async () => {
    const payload = {
      name: 'ส้มสายน้ำผึ้งฝางพรีเมียม',
      name_en: 'Fang Honey Orange Premium',
      category_id: testCatId,
      description: 'ส้มคัดเกรดพิเศษ สดจากสวน',
      sku: '1 โล', // SG FRUIT SKU is a sales unit!
      unit: 'กล่อง 1 กก.',
      price: 199,
      cost_price: 120,
      stock_quantity: 50,
      status: 'active'
    };
    const { status, body } = await testRequest('POST', '/api/admin/products', getAdminHeaders(), payload);
    assert.strictEqual(status, 201);
    assert.strictEqual(body.ok, true);
    assert.ok(body.data.product_id);
    assert.ok(body.data.variant_id);
    assert.strictEqual(body.data.sku, '1 โล');
    testProductId = body.data.product_id;
    testVariantId = body.data.variant_id;
  });

  await t.test('2.2 POST /api/admin/products allows DUPLICATE sales SKU across products (Business Rule 2)', async () => {
    // Proves SG FRUIT SKU can duplicate across products without database constraint errors
    const payload = {
      name: 'อโวคาโดแฮสส์เชียงใหม่',
      name_en: 'Chiang Mai Hass Avocado',
      category_id: testCatId,
      description: 'อโวคาโดคัดพิเศษ เนื้อเนียนมัน',
      sku: '1 โล', // DUPLICATE SKU '1 โล' intentionally used
      unit: 'กล่อง 1 กก.',
      price: 250,
      cost_price: 150,
      stock_quantity: 30,
      status: 'active'
    };
    const { status, body } = await testRequest('POST', '/api/admin/products', getAdminHeaders(), payload);
    assert.strictEqual(status, 201);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.sku, '1 โล');

    // Clean up temporary duplicate product
    sqliteDb.prepare('DELETE FROM product_variants WHERE product_id = ?').run(body.data.product_id);
    sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(body.data.product_id);
  });

  await t.test('2.3 POST /api/admin/products rejects negative price and stock', async () => {
    const badPrice = {
      name: 'ราคาติดลบ',
      category_id: testCatId,
      sku: 'BAD-01',
      unit: 'กล่อง',
      price: -50,
      stock_quantity: 10
    };
    const res1 = await testRequest('POST', '/api/admin/products', getAdminHeaders(), badPrice);
    assert.strictEqual(res1.status, 400);
    assert.strictEqual(res1.body.error, 'VALIDATION_FAILED');

    const badStock = {
      name: 'สต็อกติดลบ',
      category_id: testCatId,
      sku: 'BAD-02',
      unit: 'กล่อง',
      price: 100,
      stock_quantity: -5
    };
    const res2 = await testRequest('POST', '/api/admin/products', getAdminHeaders(), badStock);
    assert.strictEqual(res2.status, 400);
    assert.strictEqual(res2.body.error, 'VALIDATION_FAILED');
  });

  await t.test('2.4 PUT /api/admin/products/:id updates product and variant fields', async () => {
    const payload = {
      name: 'ส้มสายน้ำผึ้งฝางพรีเมียม (คัดพิเศษ)',
      category_id: testCatId,
      sku: '1 กก. พิเศษ',
      unit: 'กล่อง 1 กก.',
      price: 220,
      cost_price: 130,
      stock_quantity: 60,
      status: 'active',
      variant_id: testVariantId
    };
    const { status, body } = await testRequest('PUT', `/api/admin/products/${testProductId}`, getAdminHeaders(), payload);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.price, 220);
    assert.strictEqual(body.data.stock_quantity, 60);
    assert.strictEqual(body.data.sku, '1 กก. พิเศษ');
  });

  await t.test('2.5 PATCH /api/admin/products/:id/status updates status and syncs is_active', async () => {
    const { status, body } = await testRequest('PATCH', `/api/admin/products/${testProductId}/status`, getAdminHeaders(), {
      status: 'inactive'
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.status, 'inactive');
    assert.strictEqual(body.data.is_active, 0);

    // Revert back to active
    await testRequest('PATCH', `/api/admin/products/${testProductId}/status`, getAdminHeaders(), {
      status: 'active'
    });
  });

  await t.test('2.6 Category Relational Integrity: DELETE /api/admin/categories/:id rejects deletion when products linked', async () => {
    const { status, body } = await testRequest('DELETE', `/api/admin/categories/${testCatId}`, getAdminHeaders());
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'CATEGORY_IN_USE');
  });

  // =========================================================================
  // SECTION 3: FEATURED PRODUCTS STOREFRONT HIGHLIGHT
  // =========================================================================

  await t.test('3.1 PATCH /api/admin/products/:id/featured toggles is_featured boolean', async () => {
    const { status, body } = await testRequest('PATCH', `/api/admin/products/${testProductId}/featured`, getAdminHeaders(), {
      is_featured: true
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.is_featured, true);
  });

  await t.test('3.2 GET /api/products/featured returns featured products and strictly sanitizes variants', async () => {
    const { status, body } = await testRequest('GET', '/api/products/featured');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.data));

    const featured = body.data.find((p: any) => p.id === testProductId);
    assert.ok(featured, 'Expected newly featured product to appear in public featured endpoint');
    assert.strictEqual(featured.is_featured, true);

    // SECURITY & DATA PRIVACY VERIFICATION:
    // Public variants must NOT leak SKU or cost_price!
    assert.ok(featured.variants.length > 0);
    const variant = featured.variants[0];
    assert.strictEqual(variant.sku, undefined, 'Public variant must NEVER expose sku');
    assert.strictEqual(variant.cost_price, undefined, 'Public variant must NEVER expose cost_price');
    assert.strictEqual(typeof variant.in_stock, 'boolean', 'Public variant must convert stock quantity to in_stock boolean');
  });

  // =========================================================================
  // SECTION 4: PRODUCT GALLERY & 5-IMAGE LIMIT (Business Rule 3)
  // =========================================================================

  let uploadedImageIds: string[] = [];

  await t.test('4.1 Upload up to 5 WebP gallery images succeeds', async () => {
    for (let i = 1; i <= 5; i++) {
      const form = new FormData();
      form.append('main_image', createMockWebpFile(`img_${i}.webp`));
      form.append('thumbnail_image', createMockWebpFile(`thumb_${i}.webp`));
      form.append('sort_order', String(i - 1));
      if (i === 1) form.append('is_primary', 'true');

      const { status, body } = await testRequest('POST', `/api/admin/products/${testProductId}/images`, getAdminHeaders(), form);
      assert.strictEqual(status, 201, `Failed to upload image #${i}`);
      assert.strictEqual(body.ok, true);
      assert.ok(body.data.id);
      uploadedImageIds.push(body.data.id);
    }
    assert.strictEqual(uploadedImageIds.length, 5);
  });

  await t.test('4.2 Upload 6th image is STRICTLY rejected with PRODUCT_IMAGE_LIMIT_EXCEEDED (Max 5 images rule)', async () => {
    const form = new FormData();
    form.append('main_image', createMockWebpFile('img_overflow.webp'));
    form.append('thumbnail_image', createMockWebpFile('thumb_overflow.webp'));

    const { status, body } = await testRequest('POST', `/api/admin/products/${testProductId}/images`, getAdminHeaders(), form);
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'PRODUCT_IMAGE_LIMIT_EXCEEDED');
  });

  await t.test('4.3 Non-WebP magic bytes are rejected with INVALID_FILE_TYPE', async () => {
    // Delete one image first so limit isn't hit
    await testRequest('DELETE', `/api/admin/products/${testProductId}/images/${uploadedImageIds[4]}`, getAdminHeaders());
    uploadedImageIds.pop();

    const form = new FormData();
    form.append('main_image', createMockPngFile('img.png'));
    form.append('thumbnail_image', createMockPngFile('thumb.png'));

    const { status, body } = await testRequest('POST', `/api/admin/products/${testProductId}/images`, getAdminHeaders(), form);
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'INVALID_FILE_TYPE');
  });

  await t.test('4.4 Reorder gallery images and designate primary cover photo', async () => {
    const reorderedIds = [...uploadedImageIds].reverse();
    const newPrimaryId = reorderedIds[0];

    const payload = {
      image_ids: reorderedIds,
      primary_image_id: newPrimaryId
    };

    const { status, body } = await testRequest('PATCH', `/api/admin/products/${testProductId}/images/reorder`, getAdminHeaders(), payload);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.primary_image_id, newPrimaryId);

    // Verify products table image_key was synchronized with new primary image
    const prodRow = sqliteDb.prepare('SELECT image_key FROM products WHERE id = ?').get(testProductId) as any;
    assert.ok(prodRow.image_key.includes(newPrimaryId));
  });

  await t.test('4.5 Deleting primary cover image automatically promotes next image to primary', async () => {
    const primaryToDelete = uploadedImageIds[uploadedImageIds.length - 1]; // Currently primary after reverse

    const { status, body } = await testRequest('DELETE', `/api/admin/products/${testProductId}/images/${primaryToDelete}`, getAdminHeaders());
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.was_primary, true);

    // Verify next image in gallery was promoted to is_primary = 1
    const nextPrimary = sqliteDb.prepare('SELECT id, is_primary FROM product_images WHERE product_id = ? AND is_primary = 1').get(testProductId) as any;
    assert.ok(nextPrimary, 'Next image should have been automatically elected primary');
    assert.strictEqual(nextPrimary.is_primary, 1);
  });

  // =========================================================================
  // SECTION 5: PRODUCT DELETION & FINANCIAL ACCOUNTING PRESERVATION
  // =========================================================================

  await t.test('5.1 DELETE /api/admin/products/:id performs SAFE SOFT DELETE when order history exists', async () => {
    // Simulate an order and order item referencing this product
    const orderId = 'ord-test-' + Date.now();
    const orderNo = 'ORD-NO-' + Date.now();
    const orderItemId = 'item-test-' + Date.now();
    sqliteDb.prepare(`
      INSERT INTO orders (id, order_no, customer_name, total_amount, status, packing_status)
      VALUES (?, ?, 'Test Customer', 440, 'confirmed', 'unpacked');
    `).run(orderId, orderNo);

    sqliteDb.prepare(`
      INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, sku, unit, quantity, price, subtotal, unit_price)
      VALUES (?, ?, ?, ?, 'ส้มสายน้ำผึ้งฝางพรีเมียม', '1 โล', 'กล่อง 1 กก.', 2, 220, 440, 220);
    `).run(orderItemId, orderId, testProductId, testVariantId);

    const { status, body } = await testRequest('DELETE', `/api/admin/products/${testProductId}`, getAdminHeaders());
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.soft_deleted, true);
    assert.strictEqual(body.data.status, 'archived');

    // Verify product still exists in D1 as archived (preserving financial audit trail)
    const productAfter = sqliteDb.prepare('SELECT id, status, is_active FROM products WHERE id = ?').get(testProductId) as any;
    assert.ok(productAfter, 'Product record must NOT be destroyed when order history exists');
    assert.strictEqual(productAfter.status, 'archived');
    assert.strictEqual(productAfter.is_active, 0);

    // Clean up simulated order items and orders
    sqliteDb.prepare('DELETE FROM order_items WHERE id = ?').run(orderItemId);
    sqliteDb.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
  });

  await t.test('5.2 DELETE /api/admin/products/:id performs HARD DELETE when no order history exists', async () => {
    // Now that simulated order item is cleaned up, product has no order history
    const { status, body } = await testRequest('DELETE', `/api/admin/products/${testProductId}`, getAdminHeaders());
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.hard_deleted, true);

    // Verify product and variants are completely deleted from D1
    const productCheck = sqliteDb.prepare('SELECT id FROM products WHERE id = ?').get(testProductId);
    assert.strictEqual(productCheck, undefined);
    const variantCheck = sqliteDb.prepare('SELECT id FROM product_variants WHERE product_id = ?').get(testProductId);
    assert.strictEqual(variantCheck, undefined);
  });

  await t.test('5.3 DELETE /api/admin/categories/:id successfully deletes unused category', async () => {
    // Now that product is deleted, category has no products and can be deleted
    const { status, body } = await testRequest('DELETE', `/api/admin/categories/${testCatId}`, getAdminHeaders());
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.id, testCatId);

    const catCheck = sqliteDb.prepare('SELECT id FROM categories WHERE id = ?').get(testCatId);
    assert.strictEqual(catCheck, undefined);
  });

  // =========================================================================
  // SECTION 6: DEFAULT DENY SECURITY GATE (Business Rule 1: Single Admin Only)
  // =========================================================================

  await t.test('6.1 All new /api/admin/* endpoints strictly reject unauthenticated requests (401)', async () => {
    const unauthCategory = await testRequest('POST', '/api/admin/categories', {}, { name: 'Unauth' });
    assert.strictEqual(unauthCategory.status, 401);

    const unauthProduct = await testRequest('DELETE', '/api/admin/products/prod-123', {});
    assert.strictEqual(unauthProduct.status, 401);

    const unauthFeatured = await testRequest('PATCH', '/api/admin/products/prod-123/featured', {}, { is_featured: true });
    assert.strictEqual(unauthFeatured.status, 401);
  });

  await t.test('6.2 All new /api/admin/* endpoints strictly reject deprecated packing staff role (403)', async () => {
    const staffCategory = await testRequest('POST', '/api/admin/categories', getStaffHeaders(), { name: 'Staff' });
    assert.strictEqual(staffCategory.status, 403);
    assert.strictEqual(staffCategory.body.error?.code || staffCategory.body.error, 'AUTH_USER_NOT_REGISTERED');

    const staffProduct = await testRequest('DELETE', '/api/admin/products/prod-123', getStaffHeaders());
    assert.strictEqual(staffProduct.status, 403);
    assert.strictEqual(staffProduct.body.error?.code || staffProduct.body.error, 'AUTH_USER_NOT_REGISTERED');

    const staffFeatured = await testRequest('PATCH', '/api/admin/products/prod-123/featured', getStaffHeaders(), { is_featured: true });
    assert.strictEqual(staffFeatured.status, 403);
    assert.strictEqual(staffFeatured.body.error?.code || staffFeatured.body.error, 'AUTH_USER_NOT_REGISTERED');
  });

});
