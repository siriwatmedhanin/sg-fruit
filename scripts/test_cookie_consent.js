/**
 * SG FRUIT - PDPA Cookie Consent Banner Test Suite
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('SG FRUIT - PDPA Cookie Consent Banner Suite', async (t) => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const shopCartJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'shop-cart.js'), 'utf8');

  // 1. Structure & Markup
  await t.test('1.1 index.html: Cookie Consent Banner markup exists with required elements and Thai text', () => {
    assert.ok(
      indexHtml.includes('id="cookie-consent-banner"'),
      'index.html must include #cookie-consent-banner'
    );
    assert.ok(
      indexHtml.includes('id="cookie-privacy-link"'),
      'index.html must include #cookie-privacy-link'
    );
    assert.ok(
      indexHtml.includes('นโยบายความเป็นส่วนตัว'),
      'Banner must contain privacy link text "นโยบายความเป็นส่วนตัว"'
    );
    assert.ok(
      indexHtml.includes('id="cookie-accept-all-btn"') && indexHtml.includes('ยอมรับทั้งหมด'),
      'Banner must include #cookie-accept-all-btn with text "ยอมรับทั้งหมด"'
    );
    assert.ok(
      indexHtml.includes('id="cookie-accept-necessary-btn"') && indexHtml.includes('ยอมรับเฉพาะที่จำเป็น'),
      'Banner must include #cookie-accept-necessary-btn with text "ยอมรับเฉพาะที่จำเป็น"'
    );
    assert.ok(
      indexHtml.includes('เว็บไซต์ SG FRUIT ใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งานและจดจำรายการสั่งซื้อของท่าน'),
      'Banner must include required PDPA cookie disclosure message'
    );
  });

  // 2. Strict Scope Protections
  await t.test('1.2 Strict Scope: LINE Official remains intact in footer and NO Terms & Conditions added', () => {
    // Verify LINE Official in footer is intact
    assert.ok(
      indexHtml.includes('LINE Official:'),
      'Footer must preserve LINE Official'
    );
    assert.ok(
      indexHtml.includes('line.me/R/ti/p/@934wscfl') || indexHtml.includes('SG FRUIT'),
      'Footer must preserve LINE button'
    );

    // Verify NO Terms & Conditions added
    const lowerHtml = indexHtml.toLowerCase();
    assert.strictEqual(
      lowerHtml.includes('terms & conditions') || lowerHtml.includes('ข้อกำหนดและเงื่อนไข'),
      false,
      'Must NOT add Terms & Conditions page or link'
    );
  });

  // 3. CSS & Z-Index Layering
  await t.test('2.1 CSS: Proper z-index layering (above recent orders, below policy modal)', () => {
    assert.ok(
      indexHtml.includes('.cookie-consent-banner'),
      'index.html must define .cookie-consent-banner styles'
    );

    // Match z-index of .cookie-consent-banner
    const bannerMatch = indexHtml.match(/\.cookie-consent-banner\s*\{[^}]*z-index:\s*(\d+)/);
    assert.ok(bannerMatch, '.cookie-consent-banner must have explicit z-index');
    const bannerZIndex = parseInt(bannerMatch[1], 10);

    // Match z-index of .recent-order-pill
    const recentPillMatch = indexHtml.match(/\.recent-order-pill\s*\{[^}]*z-index:\s*(\d+)/);
    assert.ok(recentPillMatch, '.recent-order-pill must have explicit z-index');
    const recentPillZIndex = parseInt(recentPillMatch[1], 10);

    // Match z-index of .modal-overlay
    const modalMatch = indexHtml.match(/\.modal-overlay\s*\{[^}]*z-index:\s*(\d+)/);
    assert.ok(modalMatch, '.modal-overlay must have explicit z-index');
    const modalZIndex = parseInt(modalMatch[1], 10);

    assert.ok(
      bannerZIndex > recentPillZIndex,
      `Cookie banner z-index (${bannerZIndex}) must be higher than recent orders pill (${recentPillZIndex})`
    );
    assert.ok(
      bannerZIndex < modalZIndex,
      `Cookie banner z-index (${bannerZIndex}) must be lower than policy modal overlay (${modalZIndex})`
    );
  });

  // 4. Responsive CSS
  await t.test('2.2 CSS: Mobile media query defines responsive layout and touch targets', () => {
    assert.ok(
      indexHtml.includes('@media (max-width: 768px)') && indexHtml.includes('.cookie-consent-banner'),
      'Mobile media query must adapt .cookie-consent-banner'
    );
    assert.ok(
      indexHtml.includes('.cookie-consent-actions'),
      'Must define .cookie-consent-actions styling'
    );
    assert.ok(
      indexHtml.includes('.cookie-btn-primary') && indexHtml.includes('.cookie-btn-secondary'),
      'Must define primary and secondary button styles'
    );
  });

  // 5. Logic in shop-cart.js
  await t.test('3.1 shop-cart.js: Consent functions, localStorage persistence, and privacy modal integration', () => {
    assert.ok(
      shopCartJs.includes('sg_fruit_cookie_consent'),
      'shop-cart.js must use localStorage key sg_fruit_cookie_consent'
    );
    assert.ok(
      shopCartJs.includes('initCookieConsent'),
      'shop-cart.js must define initCookieConsent'
    );
    assert.ok(
      shopCartJs.includes('getCookieConsent'),
      'shop-cart.js must define getCookieConsent'
    );
    assert.ok(
      shopCartJs.includes('setCookieConsent'),
      'shop-cart.js must define setCookieConsent'
    );
    assert.ok(
      shopCartJs.includes("openPolicyModal('privacy')"),
      'Clicking privacy link must trigger openPolicyModal("privacy")'
    );
    assert.ok(
      shopCartJs.includes('status: consentType === \'all\' ? \'all\' : \'necessary\''),
      'setCookieConsent must support both "all" and "necessary" status'
    );
  });
});
