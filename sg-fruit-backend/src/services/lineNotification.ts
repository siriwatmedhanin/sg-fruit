/**
 * SG FRUIT — LINE Messaging API Notification Service
 * Sends push notifications to the store administrator when new orders arrive
 * or when payment slips are uploaded.
 */

import { Env } from '../types/env';

export interface OrderItemNotification {
  name: string;
  variation?: string | null;
  unit?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderNotificationData {
  orderNo: string;
  createdAt: string | Date;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note?: string | null;
  items: OrderItemNotification[];
  subtotal: number;
  shippingFee: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod: string;
  slipUrl?: string | null;
}

export interface SlipNotificationData {
  orderNo: string;
  amount?: number;
  slipUrl?: string | null;
  customerName?: string | null;
  uploadedAt?: string | Date;
}

/**
 * Format a Date or ISO string into deterministic Thai Buddhist Era DateTime (UTC+7)
 * e.g. "23 พ.ย. 2569 เวลา 17:30 น."
 */
export function formatThaiDateTime(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    // Compute UTC+7 explicitly
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const thaiDate = new Date(utcTime + (7 * 3600000));

    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const day = thaiDate.getDate();
    const month = months[thaiDate.getMonth()];
    const year = thaiDate.getFullYear() + 543;
    const hours = String(thaiDate.getHours()).padStart(2, '0');
    const minutes = String(thaiDate.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Low-level function to push a text message to LINE Messaging API
 */
export async function pushLineMessage(env: Env, text: string): Promise<boolean> {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const to = env.LINE_ADMIN_USER_ID?.trim();

  if (!token || !to) {
    // Missing credentials - gracefully skip without throwing
    return false;
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        messages: [
          {
            type: 'text',
            text,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[LINE_PUSH_FAILED] HTTP ${res.status}: ${errBody}`);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[LINE_PUSH_ERROR]', err?.message || err);
    return false;
  }
}

/**
 * Format and send a new order notification to LINE
 */
export async function sendLineOrderNotification(
  env: Env,
  order: OrderNotificationData
): Promise<boolean> {
  try {
    const formattedDate = formatThaiDateTime(order.createdAt);

    // Build items text
    const itemsText = (order.items || []).map((itm) => {
      const varInfo = itm.variation ? ` (${itm.variation})` : (itm.unit ? ` (${itm.unit})` : '');
      const priceFormatted = Number(itm.subtotal || (itm.quantity * itm.price)).toLocaleString('th-TH');
      return `• ${itm.name}${varInfo} x ${itm.quantity} = ฿${priceFormatted}`;
    }).join('\n');

    // Build pricing summary
    const subtotalText = Number(order.subtotal || 0).toLocaleString('th-TH');
    const shippingText = order.shippingFee > 0 ? `฿${Number(order.shippingFee).toLocaleString('th-TH')}` : 'ฟรี';
    const totalText = Number(order.totalAmount || 0).toLocaleString('th-TH');

    let discountLine = '';
    if (order.discountAmount && order.discountAmount > 0) {
      discountLine = `\n• ส่วนลด: -฿${Number(order.discountAmount).toLocaleString('th-TH')}`;
    }

    let noteLine = '';
    if (order.note && order.note.trim()) {
      noteLine = `\n• หมายเหตุ: ${order.note.trim()}`;
    }

    let slipLine = '';
    if (order.slipUrl) {
      slipLine = `\n• สลิปโอนเงิน: แนบแล้ว`;
    }

    const message = [
      '🍊 มีออเดอร์ใหม่เข้า SG FRUIT!',
      '--------------------------------',
      `📦 เลขที่คำสั่งซื้อ: ${order.orderNo}`,
      `📅 วันที่สั่งซื้อ: ${formattedDate}`,
      '',
      '👤 ข้อมูลจัดส่ง:',
      `• ชื่อ: ${order.customerName}`,
      `• เบอร์โทร: ${order.customerPhone}`,
      `• ที่อยู่: ${order.customerAddress}${noteLine}`,
      '',
      '🛒 รายการสินค้า:',
      itemsText || '• ไม่มีรายการสินค้า',
      '',
      '💰 ยอดรวม:',
      `• ค่าสินค้า: ฿${subtotalText}`,
      `• ค่าจัดส่ง: ${shippingText}${discountLine}`,
      `• ยอดสุทธิ: ฿${totalText}`,
      `• ชำระเงิน: ${order.paymentMethod}${slipLine}`,
    ].join('\n');

    return await pushLineMessage(env, message);
  } catch (err: any) {
    console.error('[LINE_ORDER_NOTIFY_ERROR]', err?.message || err);
    return false;
  }
}

/**
 * Format and send a slip upload notification to LINE (for subsequent uploads)
 */
export async function sendLineSlipNotification(
  env: Env,
  slipData: SlipNotificationData
): Promise<boolean> {
  try {
    const formattedDate = slipData.uploadedAt ? formatThaiDateTime(slipData.uploadedAt) : formatThaiDateTime(new Date());

    let amountLine = '';
    if (typeof slipData.amount === 'number' && !isNaN(slipData.amount)) {
      amountLine = `\n💰 ยอดชำระ: ฿${slipData.amount.toLocaleString('th-TH')}`;
    }

    let customerLine = '';
    if (slipData.customerName) {
      customerLine = `\n👤 ลูกค้า: ${slipData.customerName}`;
    }

    let slipLinkLine = '';
    if (slipData.slipUrl) {
      slipLinkLine = `\n📎 แนบสลิปเรียบร้อยแล้ว`;
    }

    const message = [
      '🧾 มีการส่งสลิปโอนเงินใหม่!',
      '--------------------------------',
      `📦 เลขที่คำสั่งซื้อ: ${slipData.orderNo}`,
      `📅 เวลา: ${formattedDate}${customerLine}${amountLine}${slipLinkLine}`,
    ].join('\n');

    return await pushLineMessage(env, message);
  } catch (err: any) {
    console.error('[LINE_SLIP_NOTIFY_ERROR]', err?.message || err);
    return false;
  }
}
