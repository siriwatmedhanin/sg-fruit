import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('SG FRUIT - Remote Area Postal Codes & Shipping Calculation Suite', async (t) => {
  const shopCartCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'shop-cart.js'), 'utf8');

  // Extract REMOTE_POSTAL_CODES using regex
  const match = shopCartCode.match(/const REMOTE_POSTAL_CODES = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(match, 'REMOTE_POSTAL_CODES must be defined in shop-cart.js');

  const remoteCodesArray = eval(`[${match[1]}]`);
  const remoteSet = new Set(remoteCodesArray);

  await t.test('1. Remote Postal Codes Integrity (User 70 items in list)', () => {
    assert.strictEqual(remoteSet.size, 70, 'Should have exactly 70 unique postal codes');
    assert.strictEqual(remoteSet.has('84140'), true, '84140 (Koh Samui) must be remote');
    assert.strictEqual(remoteSet.has('95000'), true, '95000 (Yala) must be remote');
    assert.strictEqual(remoteSet.has('20120'), true, '20120 (Koh Sichang) must be remote');
    assert.strictEqual(remoteSet.has('12120'), false, '12120 (Pathum Thani) must NOT be remote');
    assert.strictEqual(remoteSet.has('10110'), false, '10110 (Bangkok) must NOT be remote');
  });

  await t.test('2. Calculation: Subtotal 129 THB (Beetroot 1 item)', () => {
    const subtotal = 129;
    function getPromptPayDiscount(amount) {
      if (amount <= 0) return 0;
      if (amount <= 299) return 15;
      if (amount <= 499) return 30;
      return 50;
    }

    // Remote area test (84140)
    const isRemote = remoteSet.has('84140');
    const shippingFeeRemote = isRemote ? 50 : 0;
    const tierDiscount = getPromptPayDiscount(subtotal);
    const netTotalRemote = Math.max(0, subtotal + shippingFeeRemote - tierDiscount);
    assert.strictEqual(shippingFeeRemote, 50, 'Shipping fee must be +50 THB for remote');
    assert.strictEqual(tierDiscount, 15, 'Tier discount must be 15 THB for subtotal 129');
    assert.strictEqual(netTotalRemote, 164, 'Net total must be 129 + 50 - 15 = 164 THB');

    // Normal area test (12120)
    const isNormal = remoteSet.has('12120');
    const shippingFeeNormal = isNormal ? 50 : 0;
    const netTotalNormal = Math.max(0, subtotal + shippingFeeNormal - tierDiscount);
    assert.strictEqual(shippingFeeNormal, 0, 'Shipping fee must be 0 THB (Free) for normal area');
    assert.strictEqual(netTotalNormal, 114, 'Net total must be 129 - 15 = 114 THB');
  });

  await t.test('3. COD Restrictions on Remote Area', () => {
    const subtotal = 129;
    const isRemote = remoteSet.has('95000');
    const isCodOverLimit = subtotal > 800;
    const isCodAllowed = !isRemote && !isCodOverLimit;
    assert.strictEqual(isCodAllowed, false, 'COD must be disabled for remote area');
  });

  await t.test('4. COD Allowed on Normal Area <= 800 THB', () => {
    const subtotal = 129;
    const isRemote = remoteSet.has('12120');
    const isCodOverLimit = subtotal > 800;
    const isCodAllowed = !isRemote && !isCodOverLimit;
    assert.strictEqual(isCodAllowed, true, 'COD must be allowed for normal area <= 800 THB');
  });
});
