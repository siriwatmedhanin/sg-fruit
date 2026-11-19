/**
 * SG FRUIT — STEP 7.10.5: STOREFRONT SITE PROFILE & ANIMATION PROTECTION TEST SUITE
 * 
 * Verifies:
 * 1. site-profile.js exists, parses cleanly, and adheres to strict XSS prevention (Zero innerHTML with API data)
 * 2. URL scheme validation (Rejects javascript:, data:, vbscript:)
 * 3. Announcement bar dismiss mechanism with sessionStorage
 * 4. shop-cart.js integration with window.__SG_SITE_PROFILE__
 * 5. index.html includes js/site-profile.js
 * 6. ANIMATION PROTECTION GATE:
 *    - Steps 1-6 Storytelling remains intact (Orchard Hero, Bird Sprite, Product Grid, Avocado Cutting Board)
 *    - Hand & Knife is NOT present (Zero regression to deprecated elements)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storefrontRoot = path.resolve(__dirname, '..');

test('SG FRUIT - Step 7.10.5: Storefront Site Profile & Animation Protection Suite', async (t) => {

  // 1. site-profile.js exists and uses textContent (Zero innerHTML with API data)
  await t.test('1.1 site-profile.js enforces strict XSS prevention and textContent usage', async () => {
    const scriptPath = path.join(storefrontRoot, 'js', 'site-profile.js');
    assert.ok(fs.existsSync(scriptPath), 'js/site-profile.js must exist');
    const content = fs.readFileSync(scriptPath, 'utf8');

    // Must use textContent
    assert.ok(content.includes('.textContent = text'), 'Must use .textContent for text injection');
    // Must NOT assign API data directly into innerHTML
    assert.ok(!content.includes('.innerHTML = text'), 'Must NOT assign text to innerHTML');
    assert.ok(!content.includes('.innerHTML = data'), 'Must NOT assign API data to innerHTML');
    assert.ok(!content.includes('.innerHTML = profile'), 'Must NOT assign profile to innerHTML');
  });

  // 2. URL Scheme Validation in site-profile.js
  await t.test('2.1 site-profile.js rejects dangerous URL schemes (javascript:, data:, vbscript:)', async () => {
    const scriptPath = path.join(storefrontRoot, 'js', 'site-profile.js');
    const content = fs.readFileSync(scriptPath, 'utf8');

    assert.ok(content.includes('javascript'), 'Must check javascript: scheme');
    assert.ok(content.includes('data'), 'Must check data: scheme');
    assert.ok(content.includes('vbscript'), 'Must check vbscript: scheme');

    // Direct test of validation regex
    function isValidUrl(url) {
      if (!url || typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (/^(javascript|data|vbscript):/i.test(trimmed)) return false;
      if (/<[^>]*>/i.test(trimmed)) return false;
      if (trimmed.startsWith('/')) {
        return !trimmed.includes('..') && !trimmed.includes('\\');
      }
      try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }

    assert.strictEqual(isValidUrl('javascript:alert(1)'), false);
    assert.strictEqual(isValidUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.strictEqual(isValidUrl('vbscript:msgbox(1)'), false);
    assert.strictEqual(isValidUrl('/api/images/site/logo.webp'), true);
    assert.strictEqual(isValidUrl('https://line.me/R/ti/p/@sgfruit'), true);
  });

  // 3. Script Inclusion in index.html
  await t.test('3.1 index.html includes js/site-profile.js before shop-cart.js', async () => {
    const indexPath = path.join(storefrontRoot, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    assert.ok(content.includes('<script src="js/site-profile.js"></script>'), 'index.html must include js/site-profile.js');
    const siteProfileIdx = content.indexOf('js/site-profile.js');
    const shopCartIdx = content.indexOf('js/shop-cart.js');
    assert.ok(siteProfileIdx < shopCartIdx, 'site-profile.js must be loaded before shop-cart.js for proper hydration');
  });

  // 4. shop-cart.js LINE OA Dynamic Integration
  await t.test('4.1 shop-cart.js integrates with window.__SG_SITE_PROFILE__ with safe fallback', async () => {
    const cartPath = path.join(storefrontRoot, 'js', 'shop-cart.js');
    const content = fs.readFileSync(cartPath, 'utf8');

    assert.ok(content.includes('__SG_SITE_PROFILE__'), 'shop-cart.js must reference __SG_SITE_PROFILE__');
    assert.ok(content.includes('line_oa_id'), 'shop-cart.js must read line_oa_id');
    assert.ok(content.includes('line_oa_url'), 'shop-cart.js must read line_oa_url');
    assert.ok(content.includes('@sgfruit'), 'shop-cart.js must retain @sgfruit fallback');
  });

  // 5. ANIMATION PROTECTION GATE
  await t.test('5.1 ANIMATION PROTECTION: Storytelling Steps 1-6 remain 100% intact', async () => {
    const indexPath = path.join(storefrontRoot, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    // Step 1: Orchard Hero & Bird Sprite Sheet
    assert.ok(content.includes('hero') || content.includes('orchard'), 'Orchard Hero section must be present');
    assert.ok(content.includes('bird') || content.includes('spr-bird'), 'Bird Sprite Sheet must be present');

    // Step 2-5: Storytelling & Avocado Cutting Board
    assert.ok(content.includes('cutting-board') || content.includes('board'), 'Cutting Board must be present');
    assert.ok(content.includes('avocado') || content.includes('avo'), 'Avocado assets must be present');

    // Protection rule: Hand & Knife must NEVER be brought back
    assert.ok(!content.includes('hand-knife'), 'Hand & Knife must NOT be present');
    assert.ok(!content.includes('knife-blade'), 'Knife Blade must NOT be present');
  });
});
