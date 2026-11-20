import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('SG FRUIT - Guest Order Tracking & Recent Orders Suite', async (t) => {
  await t.test('1. index.html contains tracking elements and links', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    assert.ok(html.includes('id="nav-track-link"'), 'Desktop nav track link present');
    assert.ok(html.includes('id="mobile-track-link"'), 'Mobile drawer track link present');
    assert.ok(html.includes('id="recent-order-pill"'), 'Floating recent order pill present');
    assert.ok(html.includes('id="order-tracking-modal"'), 'Order tracking modal container present');
    assert.ok(html.includes('id="order-tracking-body"'), 'Order tracking body container present');
    assert.ok(html.includes('tracking-timeline'), 'Tracking timeline CSS present');
  });

  await t.test('2. shop-cart.js contains order tracking logic and functions', () => {
    const js = fs.readFileSync(path.join(rootDir, 'js', 'shop-cart.js'), 'utf8');
    assert.ok(js.includes('sg_fruit_recent_orders'), 'Storage key defined');
    assert.ok(js.includes('openOrderTrackingModal'), 'openOrderTrackingModal implemented');
    assert.ok(js.includes('closeOrderTrackingModal'), 'closeOrderTrackingModal implemented');
    assert.ok(js.includes('getRecentOrders'), 'getRecentOrders implemented');
    assert.ok(js.includes('saveRecentOrder'), 'saveRecentOrder implemented');
    assert.ok(js.includes('updateRecentOrderPill'), 'updateRecentOrderPill implemented');
    assert.ok(js.includes('executeTrackOrder'), 'executeTrackOrder implemented');
    assert.ok(js.includes('renderTrackingResult'), 'renderTrackingResult implemented');
    assert.ok(js.includes('/orders/track'), 'Calls backend /orders/track endpoint');
    assert.ok(js.includes('แจ้งแก้ไขที่อยู่จัดส่ง'), 'Address change button present');
    assert.ok(js.includes('สามารถแจ้งแก้ไขที่อยู่ได้ก่อนสถานะเปลี่ยนเป็น'), 'Caveat text present');
  });

  await t.test('3. Verification: NO Cancel button in tracking results', () => {
    const js = fs.readFileSync(path.join(rootDir, 'js', 'shop-cart.js'), 'utf8');
    assert.ok(!js.includes('id="track-cancel-btn"'), 'No cancel button id in tracking code');
    assert.ok(!js.includes('button class="cancel-order"'), 'No cancel button class in tracking code');
  });
});
