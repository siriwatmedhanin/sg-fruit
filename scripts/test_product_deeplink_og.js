/**
 * SG FRUIT - Product Deep Linking, Dynamic Open Graph & SKU Hidden Test Suite
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('SG FRUIT - Deep Linking, Dynamic OG & SKU Visibility Suite', async (t) => {
  const shopCartJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'shop-cart.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const middlewareJs = fs.readFileSync(path.join(ROOT_DIR, 'functions', '_middleware.js'), 'utf8');
  const adminProductsView = fs.readFileSync(
    path.join(ROOT_DIR, 'sg-fruit-admin', 'src', 'components', 'ProductsView.tsx'),
    'utf8'
  );
  const adminCss = fs.readFileSync(
    path.join(ROOT_DIR, 'sg-fruit-admin', 'src', 'styles', 'admin.css'),
    'utf8'
  );

  // 1. Hide Product SKU on Storefront Modal
  await t.test('1.1 Storefront: Product SKU is removed from modal template and hidden via CSS', () => {
    // Should NOT render SKU in modal body
    assert.strictEqual(
      shopCartJs.includes('<div class="pmodal-sku">รหัสสินค้า: ${product.sku}</div>'),
      false,
      'Product SKU line must NOT be rendered in customer modal'
    );
    // CSS protection ensures .pmodal-sku is display: none !important
    assert.ok(
      indexHtml.includes('.pmodal-sku') && indexHtml.includes('display: none !important;'),
      '.pmodal-sku must have display: none !important in index.html'
    );
  });

  // 2. Storefront Copy Link Button
  await t.test('2.1 Storefront: Copy link button exists in modal with copy feedback and canonical link', () => {
    assert.ok(
      shopCartJs.includes('id="pmodal-copy-link-btn"'),
      'Modal template must include #pmodal-copy-link-btn'
    );
    assert.ok(
      shopCartJs.includes('คัดลอกลิงก์'),
      'Button must contain initial text "คัดลอกลิงก์"'
    );
    assert.ok(
      shopCartJs.includes('คัดลอกแล้ว ✓'),
      'Button must show feedback "คัดลอกแล้ว ✓"'
    );
    assert.ok(
      shopCartJs.includes('?product='),
      'Must copy link with ?product= parameter'
    );
    assert.ok(
      indexHtml.includes('.pmodal-copy-btn'),
      'index.html must include CSS for .pmodal-copy-btn'
    );
  });

  // 3. Deep Linking & URL Synchronization
  await t.test('3.1 Storefront: Deep Linking updates URL on open, restores on close, and handles popstate', () => {
    assert.ok(
      shopCartJs.includes('curUrl.searchParams.set(\'product\', product.id)'),
      'Must update browser URL on product modal open'
    );
    assert.ok(
      shopCartJs.includes('curUrl.searchParams.delete(\'product\')'),
      'Must clear product param from URL on product modal close'
    );
    assert.ok(
      shopCartJs.includes('checkUrlProductDeepLink'),
      'Must check URL for product deep link on load'
    );
    assert.ok(
      shopCartJs.includes('popstate'),
      'Must listen to popstate for browser navigation'
    );
  });

  // 4. Admin Copy Link Button
  await t.test('4.1 Admin: Copy link button in ProductsView copies production URL with feedback', () => {
    assert.ok(
      adminProductsView.includes('handleCopyProductLink'),
      'ProductsView must define handleCopyProductLink'
    );
    assert.ok(
      adminProductsView.includes('https://sg-fruit.siriwatmedhanin.com/?product='),
      'Must copy official storefront production URL'
    );
    assert.ok(
      adminProductsView.includes('คัดลอกแล้ว ✓'),
      'Must display feedback "คัดลอกแล้ว ✓"'
    );
    assert.ok(
      adminProductsView.includes('btn-action-copy-link'),
      'Must render button with class btn-action-copy-link'
    );
    assert.ok(
      adminCss.includes('.btn-action-copy-link'),
      'admin.css must contain styling for .btn-action-copy-link'
    );
  });

  // 5. Cloudflare Pages Middleware (Dynamic Open Graph)
  await t.test('5.1 Middleware: Correctly processes product deep links and formats OG tags', () => {
    assert.ok(
      middlewareJs.includes('url.searchParams.get(\'product\')'),
      'Middleware must inspect ?product= param'
    );
    assert.ok(
      middlewareJs.includes('/api/products/'),
      'Middleware must fetch product from API'
    );
    assert.ok(
      middlewareJs.includes('${productName} — ฿${priceFormatted}/${unitStr} | SG FRUIT'),
      'Middleware must format og:title as [ชื่อสินค้า] — ฿[ราคา]/[หน่วย] | SG FRUIT'
    );
    assert.ok(
      middlewareJs.includes('HTMLRewriter'),
      'Middleware must use HTMLRewriter for streaming transformation'
    );
    assert.ok(
      middlewareJs.includes('controller.abort()'),
      'Middleware must protect against slow API responses with timeout'
    );
  });

  // 6. Build Artifacts
  await t.test('6.1 Build Pipeline: functions/ correctly packaged for Cloudflare Pages', () => {
    const distDir = path.join(ROOT_DIR, 'dist');
    if (fs.existsSync(distDir)) {
      assert.ok(
        fs.existsSync(path.join(distDir, 'functions', '_middleware.js')),
        'dist/functions/_middleware.js must be present'
      );
    }
  });
});
