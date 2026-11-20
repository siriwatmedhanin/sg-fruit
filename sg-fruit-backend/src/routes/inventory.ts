import { Hono } from 'hono';
import type { Env, AuthContext } from '../types/env';
import { requireAuth } from '../middleware/auth';

export const inventoryRouter = new Hono<{ Bindings: Env; Variables: { user: AuthContext } }>();

// Helper to generate unique ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// =========================================================================
// 1. INVENTORY LISTING & SEARCH
// =========================================================================
inventoryRouter.get('/', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const q = c.req.query('q')?.trim() || '';
  const categoryId = c.req.query('category_id')?.trim() || '';
  const status = c.req.query('status')?.trim() || 'all'; // all, in_stock, low_stock, out_of_stock, inactive
  const sortBy = c.req.query('sort_by')?.trim() || 'updated_desc';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '25', 10)));
  const offset = (page - 1) * limit;

  try {
    let whereConditions: string[] = [];
    let params: any[] = [];

    if (q) {
      whereConditions.push('(instr(lower(p.name), lower(?)) > 0 OR instr(lower(COALESCE(p.name_en, \'\')), lower(?)) > 0 OR instr(lower(pv.sku), lower(?)) > 0)');
      params.push(q, q, q);
    }

    if (categoryId) {
      whereConditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (status === 'in_stock') {
      whereConditions.push('pv.is_active = 1 AND p.is_active = 1 AND pv.stock_quantity > pv.low_stock_threshold');
    } else if (status === 'low_stock') {
      whereConditions.push('pv.is_active = 1 AND p.is_active = 1 AND pv.stock_quantity > 0 AND pv.stock_quantity <= pv.low_stock_threshold');
    } else if (status === 'out_of_stock') {
      whereConditions.push('pv.is_active = 1 AND p.is_active = 1 AND pv.stock_quantity <= 0');
    } else if (status === 'inactive') {
      whereConditions.push('(pv.is_active = 0 OR p.is_active = 0 OR p.status = \'archived\')');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderClause = 'ORDER BY pv.updated_at DESC';
    if (sortBy === 'stock_asc') {
      orderClause = 'ORDER BY pv.stock_quantity ASC';
    } else if (sortBy === 'stock_desc') {
      orderClause = 'ORDER BY pv.stock_quantity DESC';
    } else if (sortBy === 'name_asc') {
      orderClause = 'ORDER BY p.name ASC, pv.sku ASC';
    } else if (sortBy === 'name_desc') {
      orderClause = 'ORDER BY p.name DESC, pv.sku DESC';
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN categories c ON c.id = p.category_id
      ${whereClause};
    `;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;

    // Data query with last movement timestamp
    const dataQuery = `
      SELECT 
        pv.id as variant_id,
        pv.product_id,
        p.name as product_name,
        p.name_en,
        p.category_id,
        c.name as category_name,
        pv.sku,
        pv.unit,
        pv.price,
        pv.cost_price,
        pv.stock_quantity,
        COALESCE(pv.inventory_quantity, pv.stock_quantity) as inventory_quantity,
        COALESCE(pv.low_stock_threshold, 10) as low_stock_threshold,
        pv.is_active as variant_is_active,
        p.is_active as product_is_active,
        p.status as product_status,
        p.image_key,
        p.thumbnail_key,
        pv.updated_at,
        (SELECT MAX(created_at) FROM inventory_movements WHERE variant_id = pv.id) as last_movement_at
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN categories c ON c.id = p.category_id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?;
    `;

    const selectStmt = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all();
    const baseUrl = new URL(c.req.url).origin;

    const items = (selectStmt.results || []).map((row: any) => {
      let stock_status = 'in_stock';
      if (!row.variant_is_active || !row.product_is_active || row.product_status === 'archived') {
        stock_status = 'inactive';
      } else if (row.stock_quantity <= 0) {
        stock_status = 'out_of_stock';
      } else if (row.stock_quantity <= row.low_stock_threshold) {
        stock_status = 'low_stock';
      }

      return {
        ...row,
        stock_status,
        thumbnail_url: row.thumbnail_key
          ? `${baseUrl}/api/images/${row.thumbnail_key}`
          : row.image_key
          ? `${baseUrl}/api/images/${row.image_key}`
          : null,
      };
    });

    return c.json({
      ok: true,
      data: items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'INVENTORY_QUERY_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 2. INVENTORY METRICS & SUMMARY
// =========================================================================
inventoryRouter.get('/summary', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  try {
    const statsStmt = await c.env.DB.prepare(`
      SELECT 
        COUNT(pv.id) as total_variants,
        SUM(CASE WHEN pv.is_active = 1 AND p.is_active = 1 AND pv.stock_quantity > COALESCE(pv.low_stock_threshold, 10) THEN 1 ELSE 0 END) as in_stock_count,
        SUM(CASE WHEN pv.is_active = 1 AND p.is_active = 1 AND pv.stock_quantity > 0 AND pv.stock_quantity <= COALESCE(pv.low_stock_threshold, 10) THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN pv.is_active = 1 AND p.is_active = 1 AND pv.stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN pv.is_active = 0 OR p.is_active = 0 OR p.status = 'archived' THEN 1 ELSE 0 END) as inactive_count,
        SUM(CASE WHEN pv.is_active = 1 THEN pv.stock_quantity ELSE 0 END) as total_units
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id;
    `).first<{
      total_variants: number;
      in_stock_count: number;
      low_stock_count: number;
      out_of_stock_count: number;
      inactive_count: number;
      total_units: number;
    }>();

    // Fetch 10 most recent stock movements
    const recentMovements = await c.env.DB.prepare(`
      SELECT 
        im.id,
        im.variant_id,
        im.product_id,
        p.name as product_name,
        pv.sku,
        im.movement_type,
        im.quantity_change,
        im.quantity_before,
        im.quantity_after,
        im.reference_type,
        im.reference_id,
        im.reason,
        im.note,
        im.created_by,
        im.created_at
      FROM inventory_movements im
      JOIN product_variants pv ON pv.id = im.variant_id
      JOIN products p ON p.id = im.product_id
      ORDER BY im.created_at DESC
      LIMIT 10;
    `).all();

    return c.json({
      ok: true,
      data: {
        total_variants: statsStmt?.total_variants || 0,
        in_stock_count: statsStmt?.in_stock_count || 0,
        low_stock_count: statsStmt?.low_stock_count || 0,
        out_of_stock_count: statsStmt?.out_of_stock_count || 0,
        inactive_count: statsStmt?.inactive_count || 0,
        total_units: statsStmt?.total_units || 0,
        needs_attention_count: (statsStmt?.low_stock_count || 0) + (statsStmt?.out_of_stock_count || 0),
        recent_movements: recentMovements.results || [],
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'INVENTORY_SUMMARY_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 3. STOCK IN (รับสินค้าเข้า)
// =========================================================================
inventoryRouter.post('/stock-in', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const variantId = String(body.variant_id || '').trim();
  const quantity = Number(body.quantity);
  const reason = String(body.reason || 'รับสินค้าเข้าคลัง').trim();
  const note = String(body.note || '').trim();
  const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).trim() : null;

  if (!variantId) {
    return c.json({ ok: false, error: 'MISSING_VARIANT_ID', message: 'กรุณาระบุ variant_id' }, 400);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return c.json({ ok: false, error: 'INVALID_QUANTITY', message: 'จำนวนรับเข้าต้องเป็นจำนวนเต็มบวกที่มากกว่า 0' }, 400);
  }

  try {
    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await c.env.DB.prepare(
        'SELECT id, quantity_before, quantity_after FROM inventory_movements WHERE idempotency_key = ?'
      ).bind(idempotencyKey).first();
      if (existing) {
        return c.json({ ok: true, data: existing, message: 'รายการนี้เคยบันทึกแล้ว (Idempotent)' });
      }
    }

    // Fetch current variant
    const variant = await c.env.DB.prepare(`
      SELECT pv.id, pv.product_id, pv.stock_quantity, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ?;
    `).bind(variantId).first<{ id: string; product_id: string; stock_quantity: number; sku: string; product_name: string }>();

    if (!variant) {
      return c.json({ ok: false, error: 'VARIANT_NOT_FOUND', message: 'ไม่พบข้อมูลสินค้ารายการนี้' }, 404);
    }

    const qtyBefore = variant.stock_quantity;
    const qtyAfter = qtyBefore + quantity;
    const movementId = generateId('mov-in');
    const nowIso = new Date().toISOString();

    // Atomic D1 execution
    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE product_variants 
        SET stock_quantity = stock_quantity + ?, inventory_quantity = inventory_quantity + ?, updated_at = ?
        WHERE id = ?;
      `).bind(quantity, quantity, nowIso, variantId),
      c.env.DB.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, variant_id, movement_type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id,
          reason, note, created_by, created_at, idempotency_key
        ) VALUES (?, ?, ?, 'STOCK_IN', ?, ?, ?, 'manual', null, ?, ?, ?, ?, ?);
      `).bind(
        movementId,
        variant.product_id,
        variantId,
        quantity,
        qtyBefore,
        qtyAfter,
        reason,
        note || null,
        user.email,
        nowIso,
        idempotencyKey || `stock-in-${movementId}`
      ),
    ]);

    return c.json({
      ok: true,
      message: `รับเข้าสินค้า ${variant.product_name} (${variant.sku}) จำนวน ${quantity} หน่วยสำเร็จ`,
      data: {
        movement_id: movementId,
        variant_id: variantId,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        quantity_change: quantity,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'STOCK_IN_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 4. STOCK OUT (เบิกหรือนำสินค้าออก - ป้องกันยอดติดลบ)
// =========================================================================
inventoryRouter.post('/stock-out', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const variantId = String(body.variant_id || '').trim();
  const quantity = Number(body.quantity);
  const reason = String(body.reason || 'เบิกสินค้าออก').trim();
  const note = String(body.note || '').trim();
  const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).trim() : null;

  if (!variantId) {
    return c.json({ ok: false, error: 'MISSING_VARIANT_ID', message: 'กรุณาระบุ variant_id' }, 400);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return c.json({ ok: false, error: 'INVALID_QUANTITY', message: 'จำนวนเบิกออกต้องเป็นจำนวนเต็มบวกที่มากกว่า 0' }, 400);
  }

  try {
    if (idempotencyKey) {
      const existing = await c.env.DB.prepare(
        'SELECT id, quantity_before, quantity_after FROM inventory_movements WHERE idempotency_key = ?'
      ).bind(idempotencyKey).first();
      if (existing) {
        return c.json({ ok: true, data: existing, message: 'รายการนี้เคยบันทึกแล้ว (Idempotent)' });
      }
    }

    const variant = await c.env.DB.prepare(`
      SELECT pv.id, pv.product_id, pv.stock_quantity, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ?;
    `).bind(variantId).first<{ id: string; product_id: string; stock_quantity: number; sku: string; product_name: string }>();

    if (!variant) {
      return c.json({ ok: false, error: 'VARIANT_NOT_FOUND', message: 'ไม่พบข้อมูลสินค้ารายการนี้' }, 404);
    }

    if (variant.stock_quantity < quantity) {
      return c.json({
        ok: false,
        error: 'INSUFFICIENT_STOCK',
        message: `ยอดสต็อกคงเหลือไม่เพียงพอ (มีอยู่ ${variant.stock_quantity} หน่วย, ต้องการเบิก ${quantity} หน่วย)`,
        current_stock: variant.stock_quantity,
        requested_quantity: quantity,
      }, 400);
    }

    const qtyBefore = variant.stock_quantity;
    const qtyAfter = qtyBefore - quantity;
    const movementId = generateId('mov-out');
    const nowIso = new Date().toISOString();

    // Conditional atomic update prevents race-condition negative stock
    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE product_variants 
        SET stock_quantity = stock_quantity - ?, inventory_quantity = inventory_quantity - ?, updated_at = ?
        WHERE id = ? AND stock_quantity >= ?;
      `).bind(quantity, quantity, nowIso, variantId, quantity),
      c.env.DB.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, variant_id, movement_type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id,
          reason, note, created_by, created_at, idempotency_key
        ) VALUES (?, ?, ?, 'STOCK_OUT', ?, ?, ?, 'manual', null, ?, ?, ?, ?, ?);
      `).bind(
        movementId,
        variant.product_id,
        variantId,
        -quantity,
        qtyBefore,
        qtyAfter,
        reason,
        note || null,
        user.email,
        nowIso,
        idempotencyKey || `stock-out-${movementId}`
      ),
    ]);

    return c.json({
      ok: true,
      message: `เบิกสินค้า ${variant.product_name} (${variant.sku}) จำนวน ${quantity} หน่วยสำเร็จ`,
      data: {
        movement_id: movementId,
        variant_id: variantId,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        quantity_change: -quantity,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'STOCK_OUT_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 5. ADJUSTMENT (ปรับยอดสต็อกตามการนับจริง)
// =========================================================================
inventoryRouter.post('/adjustment', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const variantId = String(body.variant_id || '').trim();
  const actualQuantity = Number(body.actual_quantity);
  const reason = String(body.reason || 'ตรวจนับสต็อกจริง').trim();
  const note = String(body.note || '').trim();
  const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).trim() : null;

  if (!variantId) {
    return c.json({ ok: false, error: 'MISSING_VARIANT_ID', message: 'กรุณาระบุ variant_id' }, 400);
  }
  if (!Number.isInteger(actualQuantity) || actualQuantity < 0) {
    return c.json({ ok: false, error: 'INVALID_QUANTITY', message: 'ยอดตรวจนับจริงต้องเป็นจำนวนเต็มที่มากกว่าหรือเท่ากับ 0' }, 400);
  }

  try {
    if (idempotencyKey) {
      const existing = await c.env.DB.prepare(
        'SELECT id, quantity_before, quantity_after FROM inventory_movements WHERE idempotency_key = ?'
      ).bind(idempotencyKey).first();
      if (existing) {
        return c.json({ ok: true, data: existing, message: 'รายการนี้เคยบันทึกแล้ว (Idempotent)' });
      }
    }

    const variant = await c.env.DB.prepare(`
      SELECT pv.id, pv.product_id, pv.stock_quantity, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ?;
    `).bind(variantId).first<{ id: string; product_id: string; stock_quantity: number; sku: string; product_name: string }>();

    if (!variant) {
      return c.json({ ok: false, error: 'VARIANT_NOT_FOUND', message: 'ไม่พบข้อมูลสินค้ารายการนี้' }, 404);
    }

    const qtyBefore = variant.stock_quantity;
    const diff = actualQuantity - qtyBefore;
    const movementId = generateId('mov-adj');
    const nowIso = new Date().toISOString();

    if (diff === 0) {
      return c.json({
        ok: true,
        message: 'ยอดสต็อกตรงกับการนับจริง ไม่มีการเปลี่ยนแปลงยอด',
        data: { variant_id: variantId, quantity: actualQuantity, diff: 0 },
      });
    }

    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE product_variants 
        SET stock_quantity = ?, inventory_quantity = ?, updated_at = ?
        WHERE id = ?;
      `).bind(actualQuantity, actualQuantity, nowIso, variantId),
      c.env.DB.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, variant_id, movement_type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id,
          reason, note, created_by, created_at, idempotency_key
        ) VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?, ?, 'stock_count', null, ?, ?, ?, ?, ?);
      `).bind(
        movementId,
        variant.product_id,
        variantId,
        diff,
        qtyBefore,
        actualQuantity,
        reason,
        note || null,
        user.email,
        nowIso,
        idempotencyKey || `adj-${movementId}`
      ),
    ]);

    return c.json({
      ok: true,
      message: `ปรับยอดสต็อก ${variant.product_name} (${variant.sku}) จาก ${qtyBefore} เป็น ${actualQuantity} (ส่วนต่าง ${diff > 0 ? '+' : ''}${diff}) สำเร็จ`,
      data: {
        movement_id: movementId,
        variant_id: variantId,
        quantity_before: qtyBefore,
        quantity_after: actualQuantity,
        quantity_change: diff,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'ADJUSTMENT_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 6. DAMAGE (สินค้าเสียหาย)
// =========================================================================
inventoryRouter.post('/damage', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const variantId = String(body.variant_id || '').trim();
  const quantity = Number(body.quantity);
  const reason = String(body.reason || 'ผลไม้เน่าเสีย / ช้ำเสียหาย').trim();
  const note = String(body.note || '').trim();
  const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).trim() : null;

  if (!variantId) {
    return c.json({ ok: false, error: 'MISSING_VARIANT_ID', message: 'กรุณาระบุ variant_id' }, 400);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return c.json({ ok: false, error: 'INVALID_QUANTITY', message: 'จำนวนเสียหายต้องเป็นจำนวนเต็มบวกที่มากกว่า 0' }, 400);
  }

  try {
    const variant = await c.env.DB.prepare(`
      SELECT pv.id, pv.product_id, pv.stock_quantity, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ?;
    `).bind(variantId).first<{ id: string; product_id: string; stock_quantity: number; sku: string; product_name: string }>();

    if (!variant) {
      return c.json({ ok: false, error: 'VARIANT_NOT_FOUND', message: 'ไม่พบข้อมูลสินค้ารายการนี้' }, 404);
    }

    if (variant.stock_quantity < quantity) {
      return c.json({
        ok: false,
        error: 'INSUFFICIENT_STOCK',
        message: `ยอดสต็อกคงเหลือไม่เพียงพอ (มีอยู่ ${variant.stock_quantity} หน่วย, ระบุเสียหาย ${quantity} หน่วย)`,
      }, 400);
    }

    const qtyBefore = variant.stock_quantity;
    const qtyAfter = qtyBefore - quantity;
    const movementId = generateId('mov-dmg');
    const nowIso = new Date().toISOString();

    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE product_variants 
        SET stock_quantity = stock_quantity - ?, inventory_quantity = inventory_quantity - ?, updated_at = ?
        WHERE id = ? AND stock_quantity >= ?;
      `).bind(quantity, quantity, nowIso, variantId, quantity),
      c.env.DB.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, variant_id, movement_type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id,
          reason, note, created_by, created_at, idempotency_key
        ) VALUES (?, ?, ?, 'DAMAGE', ?, ?, ?, 'damage_report', null, ?, ?, ?, ?, ?);
      `).bind(
        movementId,
        variant.product_id,
        variantId,
        -quantity,
        qtyBefore,
        qtyAfter,
        reason,
        note || null,
        user.email,
        nowIso,
        idempotencyKey || `dmg-${movementId}`
      ),
    ]);

    return c.json({
      ok: true,
      message: `บันทึกสินค้าเสียหาย ${variant.product_name} (${variant.sku}) จำนวน ${quantity} หน่วยสำเร็จ`,
      data: {
        movement_id: movementId,
        variant_id: variantId,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        quantity_change: -quantity,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'DAMAGE_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 7. RETURN (รับสินค้าคืนเข้าสต็อก - ผ่านการตรวจสอบแล้ว)
// =========================================================================
inventoryRouter.post('/return', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const variantId = String(body.variant_id || '').trim();
  const quantity = Number(body.quantity);
  const reason = String(body.reason || 'สินค้าคืน ตรวจรับแล้วสภาพสมบูรณ์').trim();
  const note = String(body.note || '').trim();
  const orderRef = body.reference_id ? String(body.reference_id).trim() : null;
  const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).trim() : null;

  if (!variantId) {
    return c.json({ ok: false, error: 'MISSING_VARIANT_ID', message: 'กรุณาระบุ variant_id' }, 400);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return c.json({ ok: false, error: 'INVALID_QUANTITY', message: 'จำนวนคืนเข้าสต็อกต้องเป็นจำนวนเต็มบวกที่มากกว่า 0' }, 400);
  }

  try {
    const variant = await c.env.DB.prepare(`
      SELECT pv.id, pv.product_id, pv.stock_quantity, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ?;
    `).bind(variantId).first<{ id: string; product_id: string; stock_quantity: number; sku: string; product_name: string }>();

    if (!variant) {
      return c.json({ ok: false, error: 'VARIANT_NOT_FOUND', message: 'ไม่พบข้อมูลสินค้ารายการนี้' }, 404);
    }

    const qtyBefore = variant.stock_quantity;
    const qtyAfter = qtyBefore + quantity;
    const movementId = generateId('mov-ret');
    const nowIso = new Date().toISOString();

    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE product_variants 
        SET stock_quantity = stock_quantity + ?, inventory_quantity = inventory_quantity + ?, updated_at = ?
        WHERE id = ?;
      `).bind(quantity, quantity, nowIso, variantId),
      c.env.DB.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, variant_id, movement_type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id,
          reason, note, created_by, created_at, idempotency_key
        ) VALUES (?, ?, ?, 'RETURN', ?, ?, ?, 'order_return', ?, ?, ?, ?, ?, ?);
      `).bind(
        movementId,
        variant.product_id,
        variantId,
        quantity,
        qtyBefore,
        qtyAfter,
        orderRef,
        reason,
        note || null,
        user.email,
        nowIso,
        idempotencyKey || `ret-${movementId}`
      ),
    ]);

    return c.json({
      ok: true,
      message: `รับสินค้าคืนเข้าสต็อก ${variant.product_name} (${variant.sku}) จำนวน ${quantity} หน่วยสำเร็จ`,
      data: {
        movement_id: movementId,
        variant_id: variantId,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        quantity_change: quantity,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'RETURN_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 8. LOW STOCK THRESHOLD UPDATE
// =========================================================================
inventoryRouter.patch('/variants/:variantId/threshold', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const variantId = c.req.param('variantId');
  const body = await c.req.json().catch(() => ({}));
  const threshold = Number(body.low_stock_threshold);

  if (!Number.isInteger(threshold) || threshold < 0) {
    return c.json({ ok: false, error: 'INVALID_THRESHOLD', message: 'เกณฑ์แจ้งเตือนต้องเป็นจำนวนเต็มที่มากกว่าหรือเท่ากับ 0' }, 400);
  }

  try {
    const res = await c.env.DB.prepare(`
      UPDATE product_variants 
      SET low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `).bind(threshold, variantId).run();

    if (!res.meta.changes) {
      return c.json({ ok: false, error: 'VARIANT_NOT_FOUND' }, 404);
    }

    return c.json({
      ok: true,
      message: `อัปเดตเกณฑ์แจ้งเตือนสต็อกขั้นต่ำเป็น ${threshold} หน่วยสำเร็จ`,
      data: { variant_id: variantId, low_stock_threshold: threshold },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'THRESHOLD_UPDATE_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 9. STOCK MOVEMENT HISTORY AUDIT LOG
// =========================================================================
inventoryRouter.get('/movements', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const variantId = c.req.query('variant_id')?.trim() || '';
  const productId = c.req.query('product_id')?.trim() || '';
  const movementType = c.req.query('movement_type')?.trim() || '';
  const referenceType = c.req.query('reference_type')?.trim() || '';
  const startDate = c.req.query('start_date')?.trim() || '';
  const endDate = c.req.query('end_date')?.trim() || '';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  try {
    let whereConditions: string[] = [];
    let params: any[] = [];

    if (variantId) {
      whereConditions.push('im.variant_id = ?');
      params.push(variantId);
    }
    if (productId) {
      whereConditions.push('im.product_id = ?');
      params.push(productId);
    }
    if (movementType) {
      whereConditions.push('im.movement_type = ?');
      params.push(movementType);
    }
    if (referenceType) {
      whereConditions.push('im.reference_type = ?');
      params.push(referenceType);
    }
    if (startDate) {
      whereConditions.push('im.created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push('im.created_at <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM inventory_movements im
      ${whereClause};
    `;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;

    const dataQuery = `
      SELECT 
        im.id,
        im.variant_id,
        im.product_id,
        p.name as product_name,
        pv.sku,
        pv.unit,
        im.movement_type,
        im.quantity_change,
        im.quantity_before,
        im.quantity_after,
        im.reference_type,
        im.reference_id,
        im.reason,
        im.note,
        im.created_by,
        im.created_at
      FROM inventory_movements im
      JOIN product_variants pv ON pv.id = im.variant_id
      JOIN products p ON p.id = im.product_id
      ${whereClause}
      ORDER BY im.created_at DESC
      LIMIT ? OFFSET ?;
    `;

    const result = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all();

    return c.json({
      ok: true,
      data: result.results || [],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'MOVEMENTS_QUERY_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 10. ORDER DEDUCTION INTEGRATION (ยืนยันตัดสต็อกตามออเดอร์)
// =========================================================================
inventoryRouter.post('/orders/:orderId/deduct', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const orderId = c.req.param('orderId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const itemMappings = Array.isArray(body.item_mappings) ? body.item_mappings : [];

  try {
    // 1. Fetch order
    const order = await c.env.DB.prepare(`
      SELECT id, order_no, platform_order_id, stock_deducted_status
      FROM orders
      WHERE id = ? OR platform_order_id = ? OR order_no = ?
      LIMIT 1;
    `).bind(orderId, orderId, orderId).first<{
      id: string;
      order_no: string;
      platform_order_id: string;
      stock_deducted_status: string;
    }>();

    if (!order) {
      return c.json({ ok: false, error: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อนี้' }, 404);
    }

    if (order.stock_deducted_status === 'deducted') {
      return c.json({
        ok: false,
        error: 'ALREADY_DEDUCTED',
        message: `คำสั่งซื้อ ${order.order_no} ได้รับการตัดสต็อกไปแล้ว (ป้องกันการตัดสต็อกซ้ำ)`,
      }, 400);
    }

    // 2. Fetch order items
    const items = await c.env.DB.prepare(`
      SELECT id, product_id, variant_id, product_name, variation, seller_sku, quantity, stock_deducted
      FROM order_items
      WHERE order_id = ?;
    `).bind(order.id).all<{
      id: string;
      product_id: string | null;
      variant_id: string | null;
      product_name: string;
      variation: string;
      seller_sku: string;
      quantity: number;
      stock_deducted: number;
    }>();

    const orderItems = items.results || [];
    if (orderItems.length === 0) {
      return c.json({ ok: false, error: 'NO_ITEMS_FOUND', message: 'ไม่พบรายการสินค้าในคำสั่งซื้อนี้' }, 400);
    }

    // 3. Apply manual item mappings if passed in request
    const mappingMap = new Map<string, { product_id: string; variant_id: string }>();
    for (const m of itemMappings) {
      if (m.order_item_id && m.variant_id && m.product_id) {
        mappingMap.set(m.order_item_id, { product_id: m.product_id, variant_id: m.variant_id });
      }
    }

    // 4. Verify all items have variant_id
    const unmappedItems: any[] = [];
    const resolvedItems: Array<{
      item_id: string;
      product_id: string;
      variant_id: string;
      quantity: number;
      product_name: string;
    }> = [];

    for (const itm of orderItems) {
      let variantId = itm.variant_id;
      let productId = itm.product_id;

      if (mappingMap.has(itm.id)) {
        const m = mappingMap.get(itm.id)!;
        variantId = m.variant_id;
        productId = m.product_id;
      }

      if (!variantId || !productId) {
        unmappedItems.push({
          item_id: itm.id,
          product_name: itm.product_name,
          variation: itm.variation,
          seller_sku: itm.seller_sku,
        });
      } else {
        resolvedItems.push({
          item_id: itm.id,
          product_id: productId,
          variant_id: variantId,
          quantity: itm.quantity,
          product_name: itm.product_name,
        });
      }
    }

    if (unmappedItems.length > 0) {
      return c.json({
        ok: false,
        error: 'UNMAPPED_ITEMS',
        message: `มีสินค้า ${unmappedItems.length} รายการที่ยังไม่ได้จับคู่กับสินค้าในระบบ กรุณาจับคู่สินค้าก่อนยืนยันตัดสต็อก`,
        unmapped_items: unmappedItems,
      }, 400);
    }

    // 5. Check stock availability for all variants
    const variantIds = Array.from(new Set(resolvedItems.map((r) => r.variant_id)));
    const variantsInDb = await c.env.DB.prepare(`
      SELECT pv.id, pv.product_id, pv.stock_quantity, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id IN (${variantIds.map(() => '?').join(',')});
    `).bind(...variantIds).all<{
      id: string;
      product_id: string;
      stock_quantity: number;
      sku: string;
      product_name: string;
    }>();

    const variantStockMap = new Map<string, any>();
    for (const v of variantsInDb.results || []) {
      variantStockMap.set(v.id, v);
    }

    // Calculate aggregated demand per variant in this single order
    const requiredStockMap = new Map<string, number>();
    for (const itm of resolvedItems) {
      requiredStockMap.set(itm.variant_id, (requiredStockMap.get(itm.variant_id) || 0) + itm.quantity);
    }

    // Check sufficiency
    for (const [vId, reqQty] of requiredStockMap.entries()) {
      const v = variantStockMap.get(vId);
      if (!v) {
        return c.json({ ok: false, error: 'VARIANT_NOT_FOUND', message: `ไม่พบ variant_id: ${vId} ในระบบ` }, 404);
      }
      if (v.stock_quantity < reqQty) {
        return c.json({
          ok: false,
          error: 'INSUFFICIENT_STOCK',
          message: `ยอดสต็อกของ "${v.product_name}" (${v.sku}) มีไม่เพียงพอ (มีอยู่ ${v.stock_quantity} หน่วย, คำสั่งซื้อต้องการ ${reqQty} หน่วย)`,
          variant_id: vId,
          available: v.stock_quantity,
          required: reqQty,
        }, 400);
      }
    }

    // 6. Build atomic batch execution
    const batchStatements: any[] = [];
    const nowIso = new Date().toISOString();

    for (const itm of resolvedItems) {
      const v = variantStockMap.get(itm.variant_id)!;
      const qtyBefore = v.stock_quantity;
      const qtyAfter = qtyBefore - itm.quantity;
      const movementId = generateId('mov-deduct');

      // Update variant stock in memory for next items if multiple rows refer to same variant
      v.stock_quantity = qtyAfter;

      // 6a. Conditional update on variant
      batchStatements.push(
        c.env.DB.prepare(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity - ?, inventory_quantity = inventory_quantity - ?, updated_at = ?
          WHERE id = ? AND stock_quantity >= ?;
        `).bind(itm.quantity, itm.quantity, nowIso, itm.variant_id, itm.quantity)
      );

      // 6b. Insert stock movement record
      batchStatements.push(
        c.env.DB.prepare(`
          INSERT INTO inventory_movements (
            id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            reason, note, created_by, created_at, idempotency_key
          ) VALUES (?, ?, ?, 'ORDER_DEDUCTION', ?, ?, ?, 'order_item', ?, ?, ?, ?, ?, ?);
        `).bind(
          movementId,
          itm.product_id,
          itm.variant_id,
          -itm.quantity,
          qtyBefore,
          qtyAfter,
          itm.item_id,
          `ตัดสต็อกตามคำสั่งซื้อ ${order.order_no}`,
          `Order ID: ${order.platform_order_id || order.id}`,
          user.email,
          nowIso,
          `deduct-${order.id}-${itm.item_id}`
        )
      );

      // 6c. Mark order item as deducted
      batchStatements.push(
        c.env.DB.prepare(`
          UPDATE order_items
          SET product_id = ?, variant_id = ?, stock_deducted = 1, stock_deducted_at = ?, stock_deducted_by = ?
          WHERE id = ?;
        `).bind(itm.product_id, itm.variant_id, nowIso, user.email, itm.item_id)
      );
    }

    // 6d. Mark order as deducted
    batchStatements.push(
      c.env.DB.prepare(`
        UPDATE orders
        SET stock_deducted_status = 'deducted', stock_deducted_at = ?, stock_deducted_by = ?
        WHERE id = ?;
      `).bind(nowIso, user.email, order.id)
    );

    await c.env.DB.batch(batchStatements);

    return c.json({
      ok: true,
      message: `ยืนยันการตัดสต็อกสำหรับคำสั่งซื้อ ${order.order_no} (${resolvedItems.length} รายการสินค้า) เรียบร้อยแล้ว`,
      data: {
        order_id: order.id,
        order_no: order.order_no,
        deducted_items_count: resolvedItems.length,
        stock_deducted_at: nowIso,
        stock_deducted_by: user.email,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'ORDER_DEDUCT_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 11. REVERSE ORDER DEDUCTION (ยกเลิกการตัดสต็อก - คืนสต็อกเข้าคลัง)
// =========================================================================
inventoryRouter.post('/orders/:orderId/reverse', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const orderId = c.req.param('orderId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const reason = String(body.reason || 'ยกเลิกการตัดสต็อกคำสั่งซื้อ').trim();

  try {
    const order = await c.env.DB.prepare(`
      SELECT id, order_no, platform_order_id, stock_deducted_status
      FROM orders
      WHERE id = ? OR platform_order_id = ? OR order_no = ?
      LIMIT 1;
    `).bind(orderId, orderId, orderId).first<{
      id: string;
      order_no: string;
      platform_order_id: string;
      stock_deducted_status: string;
    }>();

    if (!order) {
      return c.json({ ok: false, error: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อนี้' }, 404);
    }

    if (order.stock_deducted_status !== 'deducted') {
      return c.json({
        ok: false,
        error: 'ORDER_NOT_DEDUCTED',
        message: `คำสั่งซื้อ ${order.order_no} ยังไม่เคยถูกตัดสต็อก`,
      }, 400);
    }

    const items = await c.env.DB.prepare(`
      SELECT id, product_id, variant_id, quantity, stock_deducted
      FROM order_items
      WHERE order_id = ? AND stock_deducted = 1;
    `).bind(order.id).all<{
      id: string;
      product_id: string;
      variant_id: string;
      quantity: number;
      stock_deducted: number;
    }>();

    const deductedItems = items.results || [];
    const batchStatements: any[] = [];
    const nowIso = new Date().toISOString();

    for (const itm of deductedItems) {
      const v = await c.env.DB.prepare(`
        SELECT stock_quantity FROM product_variants WHERE id = ?
      `).bind(itm.variant_id).first<{ stock_quantity: number }>();

      const qtyBefore = v ? v.stock_quantity : 0;
      const qtyAfter = qtyBefore + itm.quantity;
      const movementId = generateId('mov-rev');

      batchStatements.push(
        c.env.DB.prepare(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity + ?, inventory_quantity = inventory_quantity + ?, updated_at = ?
          WHERE id = ?;
        `).bind(itm.quantity, itm.quantity, nowIso, itm.variant_id)
      );

      batchStatements.push(
        c.env.DB.prepare(`
          INSERT INTO inventory_movements (
            id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            reason, note, created_by, created_at, idempotency_key
          ) VALUES (?, ?, ?, 'RETURN', ?, ?, ?, 'order_reverse', ?, ?, ?, ?, ?, ?);
        `).bind(
          movementId,
          itm.product_id,
          itm.variant_id,
          itm.quantity,
          qtyBefore,
          qtyAfter,
          itm.id,
          `ยกเลิกตัดสต็อกตามคำสั่งซื้อ ${order.order_no}: ${reason}`,
          `Order ID: ${order.platform_order_id || order.id}`,
          user.email,
          nowIso,
          `reverse-${order.id}-${itm.id}`
        )
      );

      batchStatements.push(
        c.env.DB.prepare(`
          UPDATE order_items
          SET stock_deducted = 0, stock_deducted_at = null, stock_deducted_by = null
          WHERE id = ?;
        `).bind(itm.id)
      );
    }

    batchStatements.push(
      c.env.DB.prepare(`
        UPDATE orders
        SET stock_deducted_status = 'undeducted', stock_deducted_at = null, stock_deducted_by = null
        WHERE id = ?;
      `).bind(order.id)
    );

    await c.env.DB.batch(batchStatements);

    return c.json({
      ok: true,
      message: `ยกเลิกการตัดสต็อกและคืนสินค้า ${deductedItems.length} รายการเข้าสต็อกเรียบร้อยแล้ว`,
      data: {
        order_id: order.id,
        reversed_items_count: deductedItems.length,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'ORDER_REVERSE_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 12. MAP UNLINKED ORDER ITEM TO CATALOG VARIANT
// =========================================================================
inventoryRouter.patch('/order-items/:itemId/map', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, 500);
  }

  const itemId = c.req.param('itemId');
  const body = await c.req.json().catch(() => ({}));
  const variantId = String(body.variant_id || '').trim();
  const productId = String(body.product_id || '').trim();

  if (!variantId || !productId) {
    return c.json({ ok: false, error: 'MISSING_PARAMS', message: 'กรุณาระบุ variant_id และ product_id' }, 400);
  }

  try {
    const variant = await c.env.DB.prepare(`
      SELECT pv.id, pv.sku, p.name as product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ? AND pv.product_id = ?;
    `).bind(variantId, productId).first();

    if (!variant) {
      return c.json({ ok: false, error: 'VARIANT_NOT_FOUND', message: 'ไม่พบ Variant ที่ระบุในระบบ' }, 404);
    }

    const res = await c.env.DB.prepare(`
      UPDATE order_items
      SET product_id = ?, variant_id = ?
      WHERE id = ?;
    `).bind(productId, variantId, itemId).run();

    if (!res.meta.changes) {
      return c.json({ ok: false, error: 'ITEM_NOT_FOUND' }, 404);
    }

    return c.json({
      ok: true,
      message: 'จับคู่สินค้ากับแคตตาล็อกสำเร็จ',
      data: { item_id: itemId, product_id: productId, variant_id: variantId },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'MAP_FAILED', message: err.message }, 500);
  }
});
