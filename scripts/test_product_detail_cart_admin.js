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

  await t.test('1.3 CSS: Loads centralized /css/cart-checkout-ui.css with all Cart Drawer, Modals, Checkout Form, and Thai Address Dropdown rules', () => {
    assert.ok(sampleHtml.includes('/css/cart-checkout-ui.css'), 'Product page must link to /css/cart-checkout-ui.css');
    const cssPath = path.join(ROOT_DIR, 'css', 'cart-checkout-ui.css');
    assert.ok(fs.existsSync(cssPath), 'css/cart-checkout-ui.css must exist');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('.cart-drawer'), 'CSS must contain .cart-drawer');
    assert.ok(cssContent.includes('.cart-item'), 'CSS must contain .cart-item');
    assert.ok(cssContent.includes('.cart-item-remove'), 'CSS must contain .cart-item-remove');
    assert.ok(cssContent.includes('.cart-qty-btn'), 'CSS must contain .cart-qty-btn');
    assert.ok(cssContent.includes('.modal-overlay'), 'CSS must contain .modal-overlay');
    assert.ok(cssContent.includes('.checkout-form-section'), 'CSS must contain .checkout-form-section');
    assert.ok(cssContent.includes('.checkout-input'), 'CSS must contain .checkout-input');
    assert.ok(cssContent.includes('.thai-address-dropdown'), 'CSS must contain .thai-address-dropdown');
    assert.ok(cssContent.includes('.checkout-copy-btn'), 'CSS must contain .checkout-copy-btn');
    assert.ok(
      cssContent.includes('.checkout-slip-file-input') && cssContent.includes('opacity: 0'),
      'CSS must contain file input opacity: 0 rule to hide browser default file upload button'
    );
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
    assert.ok(fnCode.includes('/css/cart-checkout-ui.css'), 'SSR function must link to /css/cart-checkout-ui.css');
  });

  await t.test('3.1 Category SEO landing pages have functional Cart Drawer, lock SVG, and centralized CSS', () => {
    const categories = ['seasonal-fruits.html', 'imported-produce.html', 'fresh-vegetables.html'];
    for (const catFile of categories) {
      const catPath = path.join(ROOT_DIR, catFile);
      assert.ok(fs.existsSync(catPath), `${catFile} must exist`);
      const catHtml = fs.readFileSync(catPath, 'utf8');

      assert.ok(catHtml.includes('id="cart-drawer"'), `${catFile} must include #cart-drawer`);
      assert.ok(catHtml.includes('data-cart-count'), `${catFile} must include data-cart-count`);
      assert.ok(catHtml.includes('https://staging-admin.siriwatmedhanin.com'), `${catFile} must link to staging-admin`);
      assert.ok(catHtml.includes('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>'), `${catFile} must include lock SVG`);
      assert.ok(catHtml.includes('/css/cart-checkout-ui.css'), `${catFile} must link to /css/cart-checkout-ui.css`);
    }
  });

  await t.test('4.1 Specific product page (/products/prod-be303c53.html) loads centralized CSS and styles correctly', () => {
    const targetProductHtmlPath = path.join(ROOT_DIR, 'products', 'prod-be303c53.html');
    assert.ok(fs.existsSync(targetProductHtmlPath), 'products/prod-be303c53.html must exist');
    const targetHtml = fs.readFileSync(targetProductHtmlPath, 'utf8');

    assert.ok(targetHtml.includes('/css/cart-checkout-ui.css'), 'prod-be303c53.html must link to /css/cart-checkout-ui.css');

    const cssPath = path.join(ROOT_DIR, 'css', 'cart-checkout-ui.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.checkout-slip-file-input') && cssContent.includes('opacity: 0'), 'CSS hides raw input[type="file"]');
    assert.ok(cssContent.includes('.cart-item-remove'), 'CSS styles delete button');
    assert.ok(cssContent.includes('.cart-qty-btn'), 'CSS styles -/+ buttons');
    assert.ok(cssContent.includes('.checkout-copy-btn'), 'CSS styles copy bank button');
  });
});
