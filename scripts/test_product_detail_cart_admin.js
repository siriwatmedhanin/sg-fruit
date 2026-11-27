import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('SG FRUIT - Product Detail Page Cart, Buy-Now Checkout & Admin Lock SVG Suite', async (t) => {
  const sampleProductHtmlPath = path.join(ROOT_DIR, 'products', 'prod-fc00fa89.html');
  assert.ok(fs.existsSync(sampleProductHtmlPath), 'products/prod-fc00fa89.html must exist');
  const sampleHtml = fs.readFileSync(sampleProductHtmlPath, 'utf8');

  await t.test('1.1 Navbar: Cart badge uses data-cart-count and Admin button has lock SVG & staging link', () => {
    assert.ok(sampleHtml.includes('data-cart-count'), 'Navbar must include data-cart-count attribute for cart badge synchronization');
    assert.ok(sampleHtml.includes('https://staging-admin.siriwatmedhanin.com'), 'Admin button must link to staging-admin.siriwatmedhanin.com');
    assert.ok(
      sampleHtml.includes('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>') &&
      sampleHtml.includes('<path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
      'Admin button must contain the exact lock SVG icon matching index.html'
    );
    assert.ok(!sampleHtml.includes('https://sg-fruit-admin.siriwatmedhanin.com'), 'Must not link to obsolete domain sg-fruit-admin');
  });

  await t.test('1.2 DOM: Contains Cart Drawer and Checkout / Tracking / Policy Modals', () => {
    assert.ok(sampleHtml.includes('id="cart-drawer"'), 'Must include #cart-drawer element');
    assert.ok(sampleHtml.includes('id="order-summary-modal"'), 'Must include #order-summary-modal element');
    assert.ok(sampleHtml.includes('id="order-summary-body"'), 'Must include #order-summary-body container');
    assert.ok(sampleHtml.includes('id="order-tracking-modal"'), 'Must include #order-tracking-modal element');
    assert.ok(sampleHtml.includes('id="policy-modal"'), 'Must include #policy-modal element');
    assert.ok(sampleHtml.includes('id="toast"'), 'Must include #toast element');
  });

  await t.test('1.3 CSS: Contains styles for Cart Drawer, Modals, Checkout Form, and Thai Address Dropdown', () => {
    assert.ok(sampleHtml.includes('.cart-drawer'), 'Must contain .cart-drawer CSS');
    assert.ok(sampleHtml.includes('.modal-overlay'), 'Must contain .modal-overlay CSS');
    assert.ok(sampleHtml.includes('.checkout-form-section'), 'Must contain .checkout-form-section CSS');
    assert.ok(sampleHtml.includes('.checkout-input'), 'Must contain .checkout-input CSS');
    assert.ok(sampleHtml.includes('.thai-address-dropdown'), 'Must contain .thai-address-dropdown CSS');
  });

  await t.test('1.4 Actions: Wire add-to-cart (open drawer) and buy-now (direct checkout)', () => {
    assert.ok(sampleHtml.includes('data-action="add-to-cart"'), 'Must contain add-to-cart button');
    assert.ok(sampleHtml.includes('data-action="buy-now"'), 'Must contain buy-now button');
    assert.ok(sampleHtml.includes('openCartDrawer'), 'Script must invoke openCartDrawer on add-to-cart');
    assert.ok(sampleHtml.includes('openOrderSummaryModal'), 'Script must invoke openOrderSummaryModal on buy-now');
    assert.ok(sampleHtml.includes('pdetail-qty-input'), 'Quantity input #pdetail-qty-input must be present and handled');
  });

  await t.test('1.5 Assets: Storefront scripts use absolute root-relative paths', () => {
    assert.ok(sampleHtml.includes('src="/js/products-data.js'), 'products-data.js must start with /');
    assert.ok(sampleHtml.includes('src="/js/api-adapter.js'), 'api-adapter.js must start with /');
    assert.ok(sampleHtml.includes('src="/js/site-profile.js'), 'site-profile.js must start with /');
    assert.ok(sampleHtml.includes('src="/js/thai-address.js'), 'thai-address.js must start with /');
    assert.ok(sampleHtml.includes('src="/js/shop-cart.js'), 'shop-cart.js must start with /');
  });

  await t.test('2.1 Cloudflare Pages Function (functions/products/[slug].js) matches builder template', () => {
    const fnPath = path.join(ROOT_DIR, 'functions', 'products', '[slug].js');
    assert.ok(fs.existsSync(fnPath), 'functions/products/[slug].js must exist');
    const fnCode = fs.readFileSync(fnPath, 'utf8');

    assert.ok(fnCode.includes('data-cart-count'), 'SSR function must use data-cart-count');
    assert.ok(fnCode.includes('https://staging-admin.siriwatmedhanin.com'), 'SSR function must link to staging-admin');
    assert.ok(fnCode.includes('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>'), 'SSR function must use lock SVG');
    assert.ok(fnCode.includes('id="cart-drawer"'), 'SSR function must include #cart-drawer');
    assert.ok(fnCode.includes('id="order-summary-modal"'), 'SSR function must include #order-summary-modal');
    assert.ok(fnCode.includes('openOrderSummaryModal'), 'SSR function must wire openOrderSummaryModal on buy-now');
    assert.ok(fnCode.includes('.checkout-form-section'), 'SSR function must include checkout CSS');
  });

  await t.test('3.1 Category SEO landing pages have functional Cart Drawer and lock SVG', () => {
    const categories = ['seasonal-fruits.html', 'imported-produce.html', 'fresh-vegetables.html'];
    for (const catFile of categories) {
      const catPath = path.join(ROOT_DIR, catFile);
      assert.ok(fs.existsSync(catPath), `${catFile} must exist`);
      const catHtml = fs.readFileSync(catPath, 'utf8');

      assert.ok(catHtml.includes('id="cart-drawer"'), `${catFile} must include #cart-drawer`);
      assert.ok(catHtml.includes('data-cart-count'), `${catFile} must include data-cart-count`);
      assert.ok(catHtml.includes('https://staging-admin.siriwatmedhanin.com'), `${catFile} must link to staging-admin`);
      assert.ok(catHtml.includes('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>'), `${catFile} must include lock SVG`);
      assert.ok(catHtml.includes('.checkout-form-section'), `${catFile} must include checkout CSS`);
    }
  });
});
