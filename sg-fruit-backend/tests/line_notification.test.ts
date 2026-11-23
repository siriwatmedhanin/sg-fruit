/**
 * SG FRUIT — LINE Messaging API Notification Test Suite
 * Tests message formatting, Thai UTC+7 date conversion, push delivery,
 * and fail-safe fault-tolerance.
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  formatThaiDateTime,
  pushLineMessage,
  sendLineOrderNotification,
  sendLineSlipNotification,
  OrderNotificationData,
  SlipNotificationData,
} from '../src/services/lineNotification';
import { Env } from '../src/types/env';

describe('SG FRUIT - LINE Notification Service', () => {

  describe('1. formatThaiDateTime', () => {
    it('should format Date correctly into Buddhist Era with UTC+7', () => {
      // 2026-11-23T10:30:00Z -> In UTC+7 is 17:30
      const utcDate = new Date('2026-11-23T10:30:00.000Z');
      const formatted = formatThaiDateTime(utcDate);

      assert.ok(formatted.includes('23 พ.ย. 2569'), `Expected Thai date in string, got: ${formatted}`);
      assert.ok(formatted.includes('17:30 น.'), `Expected 17:30 Thai time, got: ${formatted}`);
    });

    it('should handle ISO string input', () => {
      const isoStr = '2026-01-05T01:15:00.000Z'; // UTC+7 -> 08:15 on 5 Jan 2569
      const formatted = formatThaiDateTime(isoStr);

      assert.ok(formatted.includes('5 ม.ค. 2569'), `Expected 5 ม.ค. 2569, got: ${formatted}`);
      assert.ok(formatted.includes('08:15 น.'), `Expected 08:15, got: ${formatted}`);
    });

    it('should safely handle invalid date input without throwing', () => {
      const result = formatThaiDateTime('invalid-date-string');
      assert.strictEqual(result, 'invalid-date-string');
    });
  });

  describe('2. pushLineMessage Safe Guarding', () => {
    it('should return false without throwing when tokens are missing', async () => {
      const envWithoutTokens: Partial<Env> = {};
      const result = await pushLineMessage(envWithoutTokens as Env, 'Hello test');
      assert.strictEqual(result, false);
    });

    it('should return false when LINE_CHANNEL_ACCESS_TOKEN is missing or blank', async () => {
      const envWithAdminOnly: Partial<Env> = {
        LINE_ADMIN_USER_ID: 'U1234567890abcdef',
        LINE_CHANNEL_ACCESS_TOKEN: '   ',
      };
      const result = await pushLineMessage(envWithAdminOnly as Env, 'Hello test');
      assert.strictEqual(result, false);
    });

    it('should return false when LINE_ADMIN_USER_ID is missing or blank', async () => {
      const envWithTokenOnly: Partial<Env> = {
        LINE_CHANNEL_ACCESS_TOKEN: 'test-token',
        LINE_ADMIN_USER_ID: '',
      };
      const result = await pushLineMessage(envWithTokenOnly as Env, 'Hello test');
      assert.strictEqual(result, false);
    });

    it('should call LINE API with correct headers and payload when credentials exist', async () => {
      const originalFetch = globalThis.fetch;
      let capturedUrl = '';
      let capturedOptions: any = null;

      globalThis.fetch = (async (url: any, options: any) => {
        capturedUrl = String(url);
        capturedOptions = options;
        return {
          ok: true,
          status: 200,
          text: async () => '{}',
        } as any;
      }) as typeof fetch;

      try {
        const mockEnv: Partial<Env> = {
          LINE_CHANNEL_ACCESS_TOKEN: 'mock-channel-access-token-xyz',
          LINE_ADMIN_USER_ID: 'Umockadmin1234567890',
        };

        const result = await pushLineMessage(mockEnv as Env, 'Test Alert Message');
        assert.strictEqual(result, true);
        assert.strictEqual(capturedUrl, 'https://api.line.me/v2/bot/message/push');
        assert.strictEqual(capturedOptions.method, 'POST');
        assert.strictEqual(capturedOptions.headers['Authorization'], 'Bearer mock-channel-access-token-xyz');
        assert.strictEqual(capturedOptions.headers['Content-Type'], 'application/json');

        const body = JSON.parse(capturedOptions.body);
        assert.strictEqual(body.to, 'Umockadmin1234567890');
        assert.strictEqual(body.messages[0].type, 'text');
        assert.strictEqual(body.messages[0].text, 'Test Alert Message');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should return false safely when LINE API returns 401 Unauthorized', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({
        ok: false,
        status: 401,
        text: async () => '{"message":"Invalid access token"}',
      })) as any;

      try {
        const mockEnv: Partial<Env> = {
          LINE_CHANNEL_ACCESS_TOKEN: 'invalid-token',
          LINE_ADMIN_USER_ID: 'Umockadmin',
        };
        const result = await pushLineMessage(mockEnv as Env, 'Test');
        assert.strictEqual(result, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should return false safely when network fetch throws exception', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        throw new Error('Network timeout');
      }) as any;

      try {
        const mockEnv: Partial<Env> = {
          LINE_CHANNEL_ACCESS_TOKEN: 'token',
          LINE_ADMIN_USER_ID: 'Umock',
        };
        const result = await pushLineMessage(mockEnv as Env, 'Test');
        assert.strictEqual(result, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('3. sendLineOrderNotification', () => {
    it('should format order message with all required Thai elements', async () => {
      const originalFetch = globalThis.fetch;
      let sentText = '';

      globalThis.fetch = (async (_url: any, options: any) => {
        const body = JSON.parse(options.body);
        sentText = body.messages[0].text;
        return { ok: true, status: 200, text: async () => '{}' } as any;
      }) as any;

      try {
        const mockEnv: Partial<Env> = {
          LINE_CHANNEL_ACCESS_TOKEN: 'mock-token',
          LINE_ADMIN_USER_ID: 'Umockadmin',
        };

        const sampleOrder: OrderNotificationData = {
          orderNo: 'SG-261123-5678',
          createdAt: new Date('2026-11-23T08:00:00.000Z'),
          customerName: 'คุณสมศักดิ์ มั่งคั่ง',
          customerPhone: '0891234567',
          customerAddress: '99/1 หมู่ 3 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200',
          note: 'วางของไว้ที่หน้าประตูรั้ว',
          items: [
            {
              name: 'ส้มสายน้ำผึ้ง',
              variation: 'กล่อง 5 กก.',
              quantity: 2,
              price: 350,
              subtotal: 700,
            },
            {
              name: 'อะโวคาโดพันธุ์แฮส',
              unit: '1 กก.',
              quantity: 1,
              price: 180,
              subtotal: 180,
            },
          ],
          subtotal: 880,
          shippingFee: 50,
          discountAmount: 30,
          totalAmount: 900,
          paymentMethod: 'โอนเงินผ่านบัญชีธนาคาร',
          slipUrl: '/api/images/slips/slip_123.jpg',
        };

        const success = await sendLineOrderNotification(mockEnv as Env, sampleOrder);
        assert.strictEqual(success, true);

        // Assertions on formatted text
        assert.ok(sentText.includes('🍊 มีออเดอร์ใหม่เข้า SG FRUIT!'), 'Should have emoji header');
        assert.ok(sentText.includes('SG-261123-5678'), 'Should have orderNo');
        assert.ok(sentText.includes('23 พ.ย. 2569'), 'Should have Thai date');
        assert.ok(sentText.includes('คุณสมศักดิ์ มั่งคั่ง'), 'Should have customer name');
        assert.ok(sentText.includes('0891234567'), 'Should have customer phone');
        assert.ok(sentText.includes('ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200'), 'Should have address');
        assert.ok(sentText.includes('หมายเหตุ: วางของไว้ที่หน้าประตูรั้ว'), 'Should have note');
        assert.ok(sentText.includes('ส้มสายน้ำผึ้ง (กล่อง 5 กก.) x 2 = ฿700'), 'Should have item 1');
        assert.ok(sentText.includes('อะโวคาโดพันธุ์แฮส (1 กก.) x 1 = ฿180'), 'Should have item 2');
        assert.ok(sentText.includes('ค่าสินค้า: ฿880'), 'Should have subtotal');
        assert.ok(sentText.includes('ค่าจัดส่ง: ฿50'), 'Should have shipping fee');
        assert.ok(sentText.includes('ส่วนลด: -฿30'), 'Should have discount');
        assert.ok(sentText.includes('ยอดสุทธิ: ฿900'), 'Should have grand total');
        assert.ok(sentText.includes('โอนเงินผ่านบัญชีธนาคาร'), 'Should have payment method');
        assert.ok(sentText.includes('สลิปโอนเงิน: แนบแล้ว'), 'Should indicate slip is attached');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should format free shipping and COD payment correctly', async () => {
      const originalFetch = globalThis.fetch;
      let sentText = '';

      globalThis.fetch = (async (_url: any, options: any) => {
        const body = JSON.parse(options.body);
        sentText = body.messages[0].text;
        return { ok: true, status: 200, text: async () => '{}' } as any;
      }) as any;

      try {
        const mockEnv: Partial<Env> = {
          LINE_CHANNEL_ACCESS_TOKEN: 'mock-token',
          LINE_ADMIN_USER_ID: 'Umockadmin',
        };

        const sampleCodOrder: OrderNotificationData = {
          orderNo: 'SG-261123-9999',
          createdAt: new Date('2026-11-23T08:00:00.000Z'),
          customerName: 'คุณสุดา งามดี',
          customerPhone: '0812345678',
          customerAddress: '12 ซอย 5 ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300',
          items: [
            {
              name: 'มะม่วงน้ำดอกไม้',
              quantity: 1,
              price: 250,
              subtotal: 250,
            },
          ],
          subtotal: 250,
          shippingFee: 0,
          totalAmount: 250,
          paymentMethod: 'เก็บเงินปลายทาง (COD)',
        };

        const success = await sendLineOrderNotification(mockEnv as Env, sampleCodOrder);
        assert.strictEqual(success, true);
        assert.ok(sentText.includes('ค่าจัดส่ง: ฟรี'), 'Should show free shipping');
        assert.ok(sentText.includes('ชำระเงิน: เก็บเงินปลายทาง (COD)'), 'Should show COD payment method');
        assert.ok(!sentText.includes('สลิปโอนเงิน'), 'Should not mention slip when none provided');
        assert.ok(!sentText.includes('หมายเหตุ'), 'Should not mention note when none provided');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('4. sendLineSlipNotification', () => {
    it('should format slip notification text cleanly', async () => {
      const originalFetch = globalThis.fetch;
      let sentText = '';

      globalThis.fetch = (async (_url: any, options: any) => {
        const body = JSON.parse(options.body);
        sentText = body.messages[0].text;
        return { ok: true, status: 200, text: async () => '{}' } as any;
      }) as any;

      try {
        const mockEnv: Partial<Env> = {
          LINE_CHANNEL_ACCESS_TOKEN: 'mock-token',
          LINE_ADMIN_USER_ID: 'Umockadmin',
        };

        const slipData: SlipNotificationData = {
          orderNo: 'SG-261123-5678',
          amount: 900,
          customerName: 'คุณสมศักดิ์',
          slipUrl: '/api/images/slips/slip_456.png',
          uploadedAt: new Date('2026-11-23T09:15:00.000Z'),
        };

        const success = await sendLineSlipNotification(mockEnv as Env, slipData);
        assert.strictEqual(success, true);

        assert.ok(sentText.includes('🧾 มีการส่งสลิปโอนเงินใหม่!'));
        assert.ok(sentText.includes('SG-261123-5678'));
        assert.ok(sentText.includes('คุณสมศักดิ์'));
        assert.ok(sentText.includes('฿900'));
        assert.ok(sentText.includes('แนบสลิปเรียบร้อยแล้ว'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
