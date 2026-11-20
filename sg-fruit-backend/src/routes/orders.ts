/**
 * SG FRUIT — Orders, Excel Import, Packing & Export Backend Route Handlers
 * Step 4 Complete: 4A–4D
 */

import { Hono } from 'hono';
import type { Env, AuthContext, OrderImportBatch, Order, OrderItem } from '../types/env';
import { requireAuth } from '../middleware/auth';

export const ordersRouter = new Hono<{ Bindings: Env; Variables: { user: AuthContext } }>();

// =========================================================================
// 1. IMPORT WORKFLOW (Admin only)
// =========================================================================

// 1.1 Check duplicate import file by SHA-256 hash
ordersRouter.post('/import/check-duplicate', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  try {
    const body = await c.req.json<{ file_hash?: string; file_name?: string }>();
    if (!body.file_hash) {
      return c.json({ ok: false, error: 'FILE_HASH_REQUIRED' }, 400);
    }

    const existing = await c.env.DB.prepare(`
      SELECT id, file_name, file_hash, file_size, total_rows, imported_orders_count, imported_items_count, status, created_at, imported_by
      FROM order_import_batches
      WHERE file_hash = ?
      ORDER BY created_at DESC
      LIMIT 1;
    `).bind(body.file_hash).first();

    return c.json({
      ok: true,
      is_duplicate: Boolean(existing),
      existing_batch: existing || null,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'CHECK_DUPLICATE_FAILED', message: err.message }, 500);
  }
});

// 1.2 Import Orders & Order Items from parsed Excel payload (Admin only)
// CRITICAL RULE: 1 Excel row = 1 Order Item in database (NO AGGREGATION)
ordersRouter.post('/import', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const user = c.get('user');

  try {
    const body = await c.req.json<{
      batch: {
        id?: string;
        file_name: string;
        file_hash?: string;
        file_size?: number;
        sheet_name?: string;
        total_rows: number;
        imported_orders_count: number;
        imported_items_count: number;
        notes?: string;
      };
      orders: Array<Record<string, any>>;
      items: Array<Record<string, any>>;
    }>();

    if (!body.batch || !body.orders || !body.items) {
      return c.json({ ok: false, error: 'INVALID_IMPORT_PAYLOAD' }, 400);
    }

    const batchId = body.batch.id || `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    // 1. Insert order_import_batches
    await c.env.DB.prepare(`
      INSERT INTO order_import_batches (
        id, file_name, file_hash, file_size, sheet_name, total_rows,
        imported_orders_count, imported_items_count, status, imported_by, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?);
    `).bind(
      batchId,
      body.batch.file_name,
      body.batch.file_hash || null,
      body.batch.file_size || 0,
      body.batch.sheet_name || 'OrderSKUList',
      body.batch.total_rows || body.items.length,
      body.orders.length,
      body.items.length,
      user.email,
      body.batch.notes || null,
      nowIso,
      nowIso
    ).run();

    // 2. Fetch existing products and variants for optional catalog matching
    const catalogVariants = await c.env.DB.prepare(`
      SELECT pv.id as variant_id, pv.product_id, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id;
    `).all();

    const variantLookup = new Map<string, { product_id: string; variant_id: string }>();
    if (catalogVariants.results) {
      for (const row of catalogVariants.results as any[]) {
        if (row.sku) {
          variantLookup.set(String(row.sku).trim().toLowerCase(), {
            product_id: row.product_id,
            variant_id: row.variant_id,
          });
        }
      }
    }

    // Map to track internal order IDs by platform_order_id
    const orderIdMap = new Map<string, string>();

    // 3. Process and insert Orders
    for (const ord of body.orders) {
      const platformOrderId = String(ord.platform_order_id || '').trim();
      if (!platformOrderId) continue;

      // Check if order already exists in D1
      const existingOrder = await c.env.DB.prepare(`
        SELECT id FROM orders WHERE platform_order_id = ? LIMIT 1;
      `).bind(platformOrderId).first<{ id: string }>();

      let internalOrderId = existingOrder ? existingOrder.id : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      orderIdMap.set(platformOrderId, internalOrderId);

      if (!existingOrder) {
        const orderNo = ord.order_no || `SG-${platformOrderId}`;
        await c.env.DB.prepare(`
          INSERT INTO orders (
            id, order_no, batch_id, platform, platform_order_id, platform_order_status,
            platform_order_substatus, cancel_return_type, order_type, fulfillment_type,
            warehouse_name, tracking_id, delivery_option, shipping_provider_name,
            buyer_message, buyer_username, recipient_name, recipient_phone, zipcode,
            country, province, district, subdistrict, detail_address, additional_address_info,
            payment_method, package_id, seller_note, checked_status, checked_marked_by,
            order_channel, creator_handle, request_tax_invoice, tax_buyer_id, tax_type,
            tax_buyer_name, tax_email, tax_phone, tax_registered_address, tax_address_type,
            platform_created_at, platform_paid_at, platform_rts_at, platform_shipped_at,
            platform_delivered_at, platform_cancelled_at, cancel_by, cancel_reason,
            sku_total_amount, shipping_fee_after_discount, original_shipping_fee,
            shipping_fee_seller_discount, shipping_fee_platform_discount, payment_platform_discount,
            taxes, order_refund_amount, total_amount, status, packing_status, raw_data,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, 'pending', 'unpacked', ?,
            ?, ?
          );
        `).bind(
          internalOrderId,
          orderNo,
          batchId,
          ord.platform || 'tiktok_shop',
          platformOrderId,
          ord.platform_order_status || ord['Order Status'] || null,
          ord.platform_order_substatus || ord['Order Substatus'] || null,
          ord.cancel_return_type || ord['Cancelation/Return Type'] || null,
          ord.order_type || ord['Normal or Pre-order'] || null,
          ord.fulfillment_type || ord['Fulfillment Type'] || null,
          ord.warehouse_name || ord['Warehouse Name'] || null,
          ord.tracking_id || ord['Tracking ID'] || null,
          ord.delivery_option || ord['Delivery Option'] || null,
          ord.shipping_provider_name || ord['Shipping Provider Name'] || null,
          ord.buyer_message || ord['Buyer Message'] || null,
          ord.buyer_username || ord['Buyer Username'] || null,
          ord.recipient_name || ord['Recipient'] || null,
          ord.recipient_phone || ord['Phone #'] || null,
          ord.zipcode || ord['Zipcode'] || null,
          ord.country || ord['Country'] || 'ไทย',
          ord.province || ord['Province'] || null,
          ord.district || ord['District'] || null,
          ord.subdistrict || ord['Districts'] || null,
          ord.detail_address || ord['Detail Address'] || null,
          ord.additional_address_info || ord['Additional address information'] || null,
          ord.payment_method || ord['Payment Method'] || null,
          ord.package_id || ord['Package ID'] || null,
          ord.seller_note || ord['Seller Note'] || null,
          ord.checked_status || ord['Checked Status'] || null,
          ord.checked_marked_by || ord['Checked Marked by'] || null,
          ord.order_channel || ord['Order Channel'] || null,
          ord.creator_handle || ord['Creator Handle'] || null,
          ord.request_tax_invoice || ord['Request Tax Invoice'] || null,
          ord.tax_buyer_id || ord['Tax Info - Buyer Tax ID'] || null,
          ord.tax_type || ord['Tax Info - Type'] || null,
          ord.tax_buyer_name || ord['Tax Info - Full Name of Buyer'] || null,
          ord.tax_email || ord['Tax Info - Email'] || null,
          ord.tax_phone || ord['Tax Info - Phone Number'] || null,
          ord.tax_registered_address || ord['Tax Info - Registered Address'] || null,
          ord.tax_address_type || ord['Tax Info - Address Type'] || null,
          ord.platform_created_at || ord['Created Time'] || null,
          ord.platform_paid_at || ord['Paid Time'] || null,
          ord.platform_rts_at || ord['RTS Time'] || null,
          ord.platform_shipped_at || ord['Shipped Time'] || null,
          ord.platform_delivered_at || ord['Delivered Time'] || null,
          ord.platform_cancelled_at || ord['Cancelled Time'] || null,
          ord.cancel_by || ord['Cancel By'] || null,
          ord.cancel_reason || ord['Cancel Reason'] || null,
          Number(ord.sku_total_amount || 0),
          Number(ord.shipping_fee_after_discount || 0),
          Number(ord.original_shipping_fee || 0),
          Number(ord.shipping_fee_seller_discount || 0),
          Number(ord.shipping_fee_platform_discount || 0),
          Number(ord.payment_platform_discount || 0),
          Number(ord.taxes || 0),
          Number(ord.order_refund_amount || 0),
          Number(ord.total_amount || ord['Order Amount'] || 0),
          typeof ord.raw_data === 'string' ? ord.raw_data : JSON.stringify(ord),
          nowIso,
          nowIso
        ).run();
      }
    }

    // 4. Insert each Order Item (CRITICAL: Every single Excel line is preserved 1-to-1)
    let itemsInserted = 0;
    for (const itm of body.items) {
      const platformOrderId = String(itm.platform_order_id || itm['Order ID'] || '').trim();
      const internalOrderId = orderIdMap.get(platformOrderId);
      if (!internalOrderId) continue;

      const itemId = itm.id || `itm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const sourceRow = Number(itm.source_row_number || 0);

      // Check optional matching against internal catalog
      const sellerSku = itm.seller_sku || itm['Seller SKU'] || null;
      const variation = itm.variation || itm['Variation'] || null;
      let matchedProdId: string | null = itm.product_id || null;
      let matchedVarId: string | null = itm.variant_id || null;

      if (!matchedVarId && sellerSku && variantLookup.has(String(sellerSku).trim().toLowerCase())) {
        const match = variantLookup.get(String(sellerSku).trim().toLowerCase())!;
        matchedProdId = match.product_id;
        matchedVarId = match.variant_id;
      } else if (!matchedVarId && variation && variantLookup.has(String(variation).trim().toLowerCase())) {
        const match = variantLookup.get(String(variation).trim().toLowerCase())!;
        matchedProdId = match.product_id;
        matchedVarId = match.variant_id;
      }

      const rawJson = typeof itm.raw_data === 'string' ? itm.raw_data : JSON.stringify(itm);

      await c.env.DB.prepare(`
        INSERT INTO order_items (
          id, order_id, batch_id, source_row_number, platform_order_id,
          platform_sku_id, seller_sku, sg_sku, product_name, variation,
          quantity, return_quantity, unit_price, price, subtotal,
          subtotal_before_discount, platform_discount, seller_discount,
          subtotal_after_discount, weight_kg, product_category, package_id,
          product_id, variant_id, item_packing_status, packed_quantity,
          raw_data, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, 'unpacked', 0,
          ?, ?, ?
        );
      `).bind(
        itemId,
        internalOrderId,
        batchId,
        sourceRow,
        platformOrderId,
        itm.platform_sku_id || itm['SKU ID'] || null,
        sellerSku,
        itm.sg_sku || null, // SG FRUIT internal SKU is independent
        itm.product_name || itm['Product Name'] || 'สินค้า',
        variation,
        Number(itm.quantity || itm['Quantity'] || 1),
        Number(itm.return_quantity || itm['Sku Quantity of return'] || 0),
        Number(itm.unit_price || itm['SKU Unit Original Price'] || 0),
        Number(itm.price || itm.unit_price || itm['SKU Unit Original Price'] || 0),
        Number(itm.subtotal || itm['SKU Subtotal After Discount'] || 0),
        Number(itm.subtotal_before_discount || itm['SKU Subtotal Before Discount'] || 0),
        Number(itm.platform_discount || itm['SKU Platform Discount'] || 0),
        Number(itm.seller_discount || itm['SKU Seller Discount'] || 0),
        Number(itm.subtotal_after_discount || itm['SKU Subtotal After Discount'] || 0),
        itm.weight_kg || itm['Weight(kg)'] ? Number(itm.weight_kg || itm['Weight(kg)']) : null,
        itm.product_category || itm['Product Category'] || null,
        itm.package_id || itm['Package ID'] || null,
        matchedProdId,
        matchedVarId,
        rawJson,
        nowIso,
        nowIso
      ).run();

      itemsInserted++;
    }

    return c.json({
      ok: true,
      message: 'นำเข้าคำสั่งซื้อสำเร็จ',
      data: {
        batch_id: batchId,
        orders_imported: orderIdMap.size,
        items_imported: itemsInserted,
        total_rows: body.items.length,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'IMPORT_FAILED', message: err.message }, 500);
  }
});

// 1.3 List Import Batch History
ordersRouter.get('/batches', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: true, data: [] });
  }

  try {
    const batches = await c.env.DB.prepare(`
      SELECT 
        id, file_name, file_hash, file_size, sheet_name, total_rows,
        imported_orders_count, imported_items_count, status, imported_by,
        notes, created_at, updated_at
      FROM order_import_batches
      ORDER BY created_at DESC
      LIMIT 50;
    `).all();

    return c.json({
      ok: true,
      data: batches.results || [],
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'BATCHES_FETCH_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 2. ORDERS MANAGEMENT (Admin only)
// =========================================================================

// 2.1 Get full filtered order items and raw data for Excel Export
// (Declared before /:id to prevent route shadowing)
ordersRouter.get('/export-data', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  try {
    const status = c.req.query('status')?.trim() || 'all';
    const packingStatus = c.req.query('packing_status')?.trim() || 'all';
    const dateFrom = c.req.query('date_from')?.trim() || '';
    const dateTo = c.req.query('date_to')?.trim() || '';
    const orderIdsParam = c.req.query('order_ids')?.trim() || '';

    let whereClause = '1=1';
    const params: any[] = [];

    if (orderIdsParam) {
      const ids = orderIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        whereClause += ` AND (o.id IN (${placeholders}) OR o.platform_order_id IN (${placeholders}))`;
        params.push(...ids, ...ids);
      }
    }

    if (status !== 'all') {
      whereClause += ' AND (o.status = ? OR o.platform_order_status = ?)';
      params.push(status, status);
    }

    if (packingStatus !== 'all') {
      whereClause += ' AND o.packing_status = ?';
      params.push(packingStatus);
    }

    if (dateFrom) {
      whereClause += ' AND o.created_at >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND o.created_at <= ?';
      params.push(dateTo);
    }

    const sql = `
      SELECT 
        oi.id as item_id,
        oi.order_id,
        oi.batch_id,
        oi.source_row_number,
        oi.platform_order_id,
        oi.platform_sku_id,
        oi.seller_sku,
        oi.sg_sku,
        oi.product_name,
        oi.variation,
        oi.quantity,
        oi.return_quantity,
        oi.unit_price,
        oi.price,
        oi.subtotal,
        oi.subtotal_before_discount,
        oi.platform_discount,
        oi.seller_discount,
        oi.subtotal_after_discount,
        oi.weight_kg,
        oi.product_category,
        oi.package_id,
        oi.item_packing_status,
        oi.raw_data,
        o.order_no,
        o.platform_order_status,
        o.tracking_id,
        o.shipping_provider_name,
        o.recipient_name,
        o.recipient_phone,
        o.detail_address,
        o.province,
        o.district,
        o.subdistrict,
        o.zipcode,
        o.packing_status as order_packing_status
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC, oi.source_row_number ASC;
    `;

    const items = await c.env.DB.prepare(sql).bind(...params).all();

    return c.json({
      ok: true,
      total_rows: (items.results || []).length,
      data: items.results || [],
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'EXPORT_DATA_FAILED', message: err.message }, 500);
  }
});

// 2.2 List Orders with search, filters, and pagination
ordersRouter.get('/', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: true, data: [], total: 0 });
  }

  const user = c.get('user');

  try {
    const q = c.req.query('q')?.trim() || '';
    const status = c.req.query('status')?.trim() || 'all';
    const packingStatus = c.req.query('packing_status')?.trim() || 'all';
    const dateFrom = c.req.query('date_from')?.trim() || '';
    const dateTo = c.req.query('date_to')?.trim() || '';
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Math.max(Number(c.req.query('offset') || 0), 0);

    let whereClause = '1=1';
    const params: any[] = [];

    if (q) {
      whereClause += ` AND (
        o.platform_order_id LIKE ? OR 
        o.order_no LIKE ? OR 
        o.recipient_name LIKE ? OR 
        o.recipient_phone LIKE ? OR 
        o.tracking_id LIKE ? OR
        EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_name LIKE ?)
      )`;
      const qWild = `%${q}%`;
      params.push(qWild, qWild, qWild, qWild, qWild, qWild);
    }

    if (status !== 'all') {
      whereClause += ' AND (o.status = ? OR o.platform_order_status = ?)';
      params.push(status, status);
    }

    if (packingStatus !== 'all') {
      whereClause += ' AND o.packing_status = ?';
      params.push(packingStatus);
    }

    if (dateFrom) {
      whereClause += ' AND o.created_at >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND o.created_at <= ?';
      params.push(dateTo);
    }

    // Count total matching
    const countSql = `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`;
    const countStmt = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
    const total = countStmt?.total || 0;

    // Fetch order rows with item counts
    const selectSql = `
      SELECT 
        o.id,
        o.order_no,
        o.platform,
        o.platform_order_id,
        o.platform_order_status,
        o.tracking_id,
        o.shipping_provider_name,
        o.recipient_name,
        o.recipient_phone,
        o.province,
        o.district,
        o.subdistrict,
        o.detail_address,
        o.zipcode,
        o.status,
        o.packing_status,
        o.stock_deducted_status,
        o.stock_deducted_at,
        o.stock_deducted_by,
        o.total_amount,
        o.payment_method,
        o.slip_url,
        o.discount_amount,
        o.buyer_message,
        o.platform_created_at,
        o.created_at,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.item_packing_status = 'packed') AS packed_items_count
      FROM orders o
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?;
    `;

    const selectStmt = await c.env.DB.prepare(selectSql).bind(...params, limit, offset).all();

    return c.json({
      ok: true,
      data: selectStmt.results || [],
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'ORDERS_LIST_FAILED', message: err.message }, 500);
  }
});

// 2.2 Get Single Order Detail with All Items
ordersRouter.get('/:id', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const id = c.req.param('id');

  try {
    const order = await c.env.DB.prepare(`
      SELECT * FROM orders WHERE id = ? OR platform_order_id = ? OR order_no = ? LIMIT 1;
    `).bind(id, id, id).first<Record<string, any>>();

    if (!order) {
      return c.json({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
    }

    // Fetch items with optional product thumbnails
    const items = await c.env.DB.prepare(`
      SELECT 
        oi.id,
        oi.order_id,
        oi.source_row_number,
        oi.platform_order_id,
        oi.platform_sku_id,
        oi.seller_sku,
        oi.sg_sku,
        oi.product_name,
        oi.variation,
        oi.quantity,
        oi.unit_price,
        oi.price,
        oi.subtotal,
        oi.item_packing_status,
        oi.packed_quantity,
        oi.product_id,
        oi.variant_id,
        p.image_key,
        p.thumbnail_key
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.source_row_number ASC;
    `).bind(order.id).all();

    // Map thumbnail URLs
    const baseUrl = new URL(c.req.url).origin;
    const formattedItems = (items.results || []).map((itm: any) => ({
      ...itm,
      thumbnail_url: itm.thumbnail_key
        ? `${baseUrl}/api/images/${itm.thumbnail_key}`
        : itm.image_key
        ? `${baseUrl}/api/images/${itm.image_key}`
        : null,
    }));

    return c.json({
      ok: true,
      data: {
        order,
        items: formattedItems,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'ORDER_DETAIL_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 3. PACKING WORKFLOW & CHECKLIST
// =========================================================================

// 3.1 Update Entire Order Packing Status
ordersRouter.patch('/:id/packing', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const id = c.req.param('id');
  const user = c.get('user');

  try {
    const body = await c.req.json<{
      packing_status: 'unpacked' | 'packing' | 'packed';
      notes?: string;
    }>();

    if (!['unpacked', 'packing', 'packed'].includes(body.packing_status)) {
      return c.json({ ok: false, error: 'INVALID_PACKING_STATUS' }, 400);
    }

    const order = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ? OR platform_order_id = ?').bind(id, id).first<{ id: string }>();
    if (!order) {
      return c.json({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
    }

    const nowIso = new Date().toISOString();

    // Update order packing_status
    await c.env.DB.prepare(`
      UPDATE orders 
      SET packing_status = ?, notes = COALESCE(?, notes), updated_at = ?
      WHERE id = ?;
    `).bind(body.packing_status, body.notes || null, nowIso, order.id).run();

    // If order marked 'packed', sync all items
    if (body.packing_status === 'packed') {
      await c.env.DB.prepare(`
        UPDATE order_items 
        SET item_packing_status = 'packed', packed_quantity = quantity, updated_at = ?
        WHERE order_id = ?;
      `).bind(nowIso, order.id).run();
    } else if (body.packing_status === 'unpacked') {
      await c.env.DB.prepare(`
        UPDATE order_items 
        SET item_packing_status = 'unpacked', packed_quantity = 0, updated_at = ?
        WHERE order_id = ?;
      `).bind(nowIso, order.id).run();
    }

    // Insert packing log
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await c.env.DB.prepare(`
      INSERT INTO packing_logs (id, order_id, packed_by, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `).bind(logId, order.id, user.email, body.packing_status, body.notes || null, nowIso).run();

    return c.json({
      ok: true,
      message: 'อัปเดตสถานะการแพ็กสำเร็จ',
      data: { order_id: order.id, packing_status: body.packing_status },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'ORDER_PACKING_UPDATE_FAILED', message: err.message }, 500);
  }
});

// 3.2 Update Individual Item Packing Checklist Status
ordersRouter.patch('/items/:itemId/packing', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const itemId = c.req.param('itemId');

  try {
    const body = await c.req.json<{
      item_packing_status: 'unpacked' | 'packing' | 'packed';
      packed_quantity?: number;
    }>();

    if (!['unpacked', 'packing', 'packed'].includes(body.item_packing_status)) {
      return c.json({ ok: false, error: 'INVALID_ITEM_PACKING_STATUS' }, 400);
    }

    const item = await c.env.DB.prepare('SELECT id, order_id, quantity FROM order_items WHERE id = ?').bind(itemId).first<{ id: string; order_id: string; quantity: number }>();
    if (!item) {
      return c.json({ ok: false, error: 'ITEM_NOT_FOUND' }, 404);
    }

    const nowIso = new Date().toISOString();
    const packedQty = body.packed_quantity !== undefined ? body.packed_quantity : (body.item_packing_status === 'packed' ? item.quantity : 0);

    // Update item
    await c.env.DB.prepare(`
      UPDATE order_items 
      SET item_packing_status = ?, packed_quantity = ?, updated_at = ?
      WHERE id = ?;
    `).bind(body.item_packing_status, packedQty, nowIso, itemId).run();

    // Auto calculate parent order packing_status
    const counts = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN item_packing_status = 'packed' THEN 1 ELSE 0 END) as packed_items
      FROM order_items
      WHERE order_id = ?;
    `).bind(item.order_id).first<{ total_items: number; packed_items: number }>();

    let newOrderPackingStatus: 'unpacked' | 'packing' | 'packed' = 'unpacked';
    if (counts && counts.packed_items === counts.total_items && counts.total_items > 0) {
      newOrderPackingStatus = 'packed';
    } else if (counts && counts.packed_items > 0) {
      newOrderPackingStatus = 'packing';
    }

    await c.env.DB.prepare(`
      UPDATE orders SET packing_status = ?, updated_at = ? WHERE id = ?;
    `).bind(newOrderPackingStatus, nowIso, item.order_id).run();

    return c.json({
      ok: true,
      message: 'อัปเดตรายการสินค้าที่แพ็กสำเร็จ',
      data: {
        item_id: itemId,
        item_packing_status: body.item_packing_status,
        order_packing_status: newOrderPackingStatus,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'ITEM_PACKING_UPDATE_FAILED', message: err.message }, 500);
  }
});

// 3.3 Printable Packing Slip Data
ordersRouter.get('/:id/packing-slip', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const id = c.req.param('id');

  try {
    const order = await c.env.DB.prepare(`
      SELECT 
        id, order_no, platform, platform_order_id, platform_order_status,
        tracking_id, shipping_provider_name, delivery_option,
        recipient_name, recipient_phone, detail_address, subdistrict,
        district, province, zipcode, buyer_message, seller_note,
        platform_created_at, packing_status
      FROM orders
      WHERE id = ? OR platform_order_id = ?
      LIMIT 1;
    `).bind(id, id).first<Record<string, any>>();

    if (!order) {
      return c.json({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
    }

    const items = await c.env.DB.prepare(`
      SELECT 
        oi.id,
        oi.source_row_number,
        oi.product_name,
        oi.variation,
        oi.quantity,
        oi.seller_sku,
        oi.sg_sku,
        oi.item_packing_status,
        oi.packed_quantity
      FROM order_items oi
      WHERE oi.order_id = ?
      ORDER BY oi.source_row_number ASC;
    `).bind(order.id).all();

    return c.json({
      ok: true,
      data: {
        order,
        items: items.results || [],
        printed_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'PACKING_SLIP_FAILED', message: err.message }, 500);
  }
});


