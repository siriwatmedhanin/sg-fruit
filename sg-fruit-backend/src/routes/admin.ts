import { Hono } from 'hono';
import type { Env, AuthContext } from '../types/env';
import { requireAuth } from '../middleware/auth';
import {
  queueStorageCleanup,
  processStorageCleanupQueue,
  getPendingCleanupCount,
} from '../services/storageCleanup';
import { ordersRouter } from './orders';
import { inventoryRouter } from './inventory';
import { siteProfileAdminRouter } from './siteProfile';

export const adminRouter = new Hono<{ Bindings: Env; Variables: { user: AuthContext } }>();

// Mount Orders, Excel Import, Packing & Export Handlers (Step 4 Complete)
adminRouter.route('/orders', ordersRouter);

// Mount Inventory & Stock Management Handlers (Step 5 Complete)
adminRouter.route('/inventory', inventoryRouter);

// Mount Site Profile & Store Settings Handlers (Step 7.10.5 Complete)
adminRouter.route('/site-profile', siteProfileAdminRouter);

// 0. CATEGORIES MANAGEMENT FOR ADMIN
adminRouter.get('/categories', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: true, data: [] });
  }

  try {
    const stmt = await c.env.DB.prepare('SELECT id, name, slug, sort_order FROM categories ORDER BY sort_order ASC, created_at ASC').all();
    return c.json({
      ok: true,
      data: stmt.results || [],
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'DATABASE_QUERY_ERROR', message: err.message }, 500);
  }
});

// 0.2 CREATE CATEGORY (Admin only)
adminRouter.post('/categories', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const body = await c.req.json();
    const name = String(body.name || '').trim();
    const rawSlug = String(body.slug || '').trim().toLowerCase();
    const sortOrder = body.sort_order !== undefined && !isNaN(Number(body.sort_order)) ? Number(body.sort_order) : 0;

    if (!name) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุชื่อหมวดหมู่' }, 400);
    }
    if (!rawSlug || !/^[a-z0-9-]+$/.test(rawSlug)) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบ slug ไม่ถูกต้อง (ต้องเป็นตัวอักษรภาษาอังกฤษตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น)' }, 400);
    }

    // Uniqueness check
    const existing = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(rawSlug).first();
    if (existing) {
      return c.json({ ok: false, error: 'SLUG_EXISTS', message: `หมวดหมู่ slug '${rawSlug}' มีอยู่ในระบบแล้ว` }, 400);
    }

    const categoryId = 'cat-' + crypto.randomUUID().slice(0, 8);
    await c.env.DB.prepare(`
      INSERT INTO categories (id, name, slug, sort_order, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);
    `).bind(categoryId, name, rawSlug, sortOrder).run();

    return c.json({
      ok: true,
      message: 'สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว',
      data: {
        id: categoryId,
        name,
        slug: rawSlug,
        sort_order: sortOrder,
      },
    }, 201);
  } catch (err: any) {
    return c.json({ ok: false, error: 'CATEGORY_CREATE_FAILED', message: err.message }, 500);
  }
});

// 0.3 UPDATE CATEGORY (Admin only)
adminRouter.put('/categories/:id', requireAuth(['admin']), async (c) => {
  const categoryId = String(c.req.param('id') || '').trim();
  if (!categoryId) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุรหัสหมวดหมู่' }, 400);
  }
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const existing = await c.env.DB.prepare('SELECT id, name, slug, sort_order FROM categories WHERE id = ?')
      .bind(categoryId)
      .first<{ id: string; name: string; slug: string; sort_order: number }>();
    if (!existing) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบหมวดหมู่ที่ระบุ' }, 404);
    }

    const body = await c.req.json();
    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    const rawSlug = body.slug !== undefined ? String(body.slug).trim().toLowerCase() : existing.slug;
    const sortOrder = body.sort_order !== undefined && !isNaN(Number(body.sort_order)) ? Number(body.sort_order) : existing.sort_order;

    if (!name) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุชื่อหมวดหมู่' }, 400);
    }
    if (!rawSlug || !/^[a-z0-9-]+$/.test(rawSlug)) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบ slug ไม่ถูกต้อง (ต้องเป็นตัวอักษรภาษาอังกฤษตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น)' }, 400);
    }

    // Slug uniqueness check against other categories
    const slugCheck = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?')
      .bind(rawSlug, categoryId)
      .first();
    if (slugCheck) {
      return c.json({ ok: false, error: 'SLUG_EXISTS', message: `หมวดหมู่ slug '${rawSlug}' มีอยู่ในระบบแล้ว` }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE categories SET name = ?, slug = ?, sort_order = ? WHERE id = ?;
    `).bind(name, rawSlug, sortOrder, categoryId).run();

    return c.json({
      ok: true,
      message: 'อัปเดตข้อมูลหมวดหมู่เรียบร้อยแล้ว',
      data: {
        id: categoryId,
        name,
        slug: rawSlug,
        sort_order: sortOrder,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'CATEGORY_UPDATE_FAILED', message: err.message }, 500);
  }
});

// 0.4 DELETE CATEGORY (Admin only - Relational Integrity Protection)
adminRouter.delete('/categories/:id', requireAuth(['admin']), async (c) => {
  const categoryId = String(c.req.param('id') || '').trim();
  if (!categoryId) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุรหัสหมวดหมู่' }, 400);
  }
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const existing = await c.env.DB.prepare('SELECT id, name FROM categories WHERE id = ?').bind(categoryId).first();
    if (!existing) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบหมวดหมู่ที่ระบุ' }, 404);
    }

    // Relational Integrity Safety Check: Check if any products reference this category
    const productCheck = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM products WHERE category_id = ?')
      .bind(categoryId)
      .first<{ cnt: number }>();
    const productCount = productCheck?.cnt || 0;

    if (productCount > 0) {
      return c.json({
        ok: false,
        error: 'CATEGORY_IN_USE',
        message: `ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากมีสินค้าผูกอยู่จำนวน ${productCount} รายการ กรุณาย้ายหรือลบสินค้าก่อน`,
      }, 400);
    }

    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();

    return c.json({
      ok: true,
      message: 'ลบหมวดหมู่เรียบร้อยแล้ว',
      data: { id: categoryId },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'CATEGORY_DELETE_FAILED', message: err.message }, 500);
  }
});

// 0.1 PACKING QUEUE LIST FOR ADMIN
adminRouter.get('/packing', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: true, data: [] });
  }

  try {
    const stmt = await c.env.DB.prepare(`
      SELECT * FROM orders WHERE packing_status IN ('unpacked', 'packing') ORDER BY created_at DESC;
    `).all();
    return c.json({
      ok: true,
      data: stmt.results || [],
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'DATABASE_QUERY_ERROR', message: err.message }, 500);
  }
});

// 1. PRODUCTS MANAGEMENT (Admin only)
// 1.1 List All Products with Variants
adminRouter.get('/products', requireAuth(['admin']), async (c) => {
  const user = c.get('user');

  if (!c.env.DB) {
    return c.json({
      ok: true,
      message: 'Admin Products Management (Includes SKU, Cost, and Stock)',
      user: { email: user.email, role: user.role },
      data: [],
    });
  }

  try {
    const query = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.name_en,
        p.category_id,
        c.name AS category_name,
        p.description,
        p.image_key,
        p.thumbnail_key,
        p.image_meta,
        p.status,
        p.is_active AS product_is_active,
        p.is_featured,
        v.id AS variant_id,
        v.sku,
        v.unit,
        v.price,
        v.cost_price,
        v.stock_quantity,
        v.is_active AS variant_is_active
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id
      ORDER BY p.created_at DESC, v.sku ASC;
    `;
    const stmt = await c.env.DB.prepare(query).all();
    return c.json({
      ok: true,
      message: 'Admin Products Management (Includes SKU, Cost, and Stock)',
      user: { email: user.email, role: user.role },
      data: stmt.results || [],
    });
  } catch (err: any) {
    return c.json({
      ok: false,
      error: 'DATABASE_QUERY_ERROR',
      message: err.message,
    }, 500);
  }
});

// 1.2 Get Single Product with its Variants
adminRouter.get('/products/:id', requireAuth(['admin']), async (c) => {
  const id = c.req.param('id');
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const query = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.name_en,
        p.category_id,
        c.name AS category_name,
        p.description,
        p.image_key,
        p.thumbnail_key,
        p.image_meta,
        p.status,
        p.is_active AS product_is_active,
        p.is_featured,
        v.id AS variant_id,
        v.sku,
        v.unit,
        v.price,
        v.cost_price,
        v.stock_quantity,
        v.is_active AS variant_is_active
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id
      WHERE p.id = ?
      ORDER BY v.sku ASC;
    `;
    const stmt = await c.env.DB.prepare(query).bind(id).all();
    if (!stmt.results || stmt.results.length === 0) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ระบุ' }, 404);
    }

    return c.json({
      ok: true,
      data: stmt.results,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'DATABASE_QUERY_ERROR', message: err.message }, 500);
  }
});

// 1.3 Create Product & Primary Variant
adminRouter.post('/products', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const body = await c.req.json();
    const name = String(body.name || '').trim();
    const name_en = body.name_en ? String(body.name_en).trim() : null;
    const category_id = String(body.category_id || '').trim();
    const description = body.description ? String(body.description).trim() : '';
    const sku = String(body.sku || '').trim();
    const unit = String(body.unit || '').trim();
    const price = Number(body.price);
    const cost_price = body.cost_price !== undefined ? Number(body.cost_price) : 0;
    const stock_quantity = Number(body.stock_quantity);
    const status = String(body.status || 'active').trim();

    // Validation
    if (!name) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุชื่อสินค้า' }, 400);
    }
    if (!category_id) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาเลือกหมวดหมู่สินค้า' }, 400);
    }
    if (!sku) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุรหัสหน่วยขาย (SKU)' }, 400);
    }
    if (!unit) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุหน่วยจำหน่าย' }, 400);
    }
    if (isNaN(price) || price < 0) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'ราคาขายต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0' }, 400);
    }
    if (isNaN(stock_quantity) || stock_quantity < 0) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'จำนวนสต็อกต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0' }, 400);
    }

    const validStatuses = ['active', 'inactive', 'draft', 'archived'];
    const finalStatus = validStatuses.includes(status) ? status : 'active';
    const is_active = finalStatus === 'active' ? 1 : 0;

    // Generate unique IDs (UUID)
    const productId = 'prod-' + crypto.randomUUID().slice(0, 8);
    const variantId = 'var-' + crypto.randomUUID().slice(0, 8);

    // Atomic D1 Batch Insert
    const insertProductStmt = c.env.DB.prepare(`
      INSERT INTO products (id, name, name_en, category_id, description, status, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `).bind(productId, name, name_en, category_id, description, finalStatus, is_active);

    const insertVariantStmt = c.env.DB.prepare(`
      INSERT INTO product_variants (id, product_id, sku, unit, price, cost_price, stock_quantity, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `).bind(variantId, productId, sku, unit, price, isNaN(cost_price) ? 0 : cost_price, stock_quantity, is_active);

    await c.env.DB.batch([insertProductStmt, insertVariantStmt]);

    return c.json({
      ok: true,
      message: 'เพิ่มสินค้าและตัวเลือก SKU เรียบร้อยแล้ว',
      data: {
        product_id: productId,
        variant_id: variantId,
        name,
        sku,
        price,
        stock_quantity,
        status: finalStatus,
      },
    }, 201);
  } catch (err: any) {
    return c.json({ ok: false, error: 'CREATE_FAILED', message: err.message }, 500);
  }
});

// 1.4 Update Product & Variant
adminRouter.put('/products/:id', requireAuth(['admin']), async (c) => {
  const productId = c.req.param('id');
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const body = await c.req.json();
    const name = String(body.name || '').trim();
    const name_en = body.name_en !== undefined ? (body.name_en ? String(body.name_en).trim() : null) : null;
    const category_id = String(body.category_id || '').trim();
    const description = body.description !== undefined ? String(body.description).trim() : '';
    const sku = String(body.sku || '').trim();
    const unit = String(body.unit || '').trim();
    const price = Number(body.price);
    const cost_price = body.cost_price !== undefined ? Number(body.cost_price) : 0;
    const stock_quantity = Number(body.stock_quantity);
    const status = body.status ? String(body.status).trim() : 'active';
    const variantId = body.variant_id ? String(body.variant_id).trim() : null;

    // Validation
    if (!name) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุชื่อสินค้า' }, 400);
    }
    if (!category_id) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาเลือกหมวดหมู่สินค้า' }, 400);
    }
    if (!sku) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุรหัสหน่วยขาย (SKU)' }, 400);
    }
    if (!unit) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุหน่วยจำหน่าย' }, 400);
    }
    if (isNaN(price) || price < 0) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'ราคาขายต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0' }, 400);
    }
    if (isNaN(stock_quantity) || stock_quantity < 0) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'จำนวนสต็อกต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0' }, 400);
    }

    const validStatuses = ['active', 'inactive', 'draft', 'archived'];
    const finalStatus = validStatuses.includes(status) ? status : 'active';
    const is_active = finalStatus === 'active' ? 1 : 0;

    // Verify product exists
    const checkProduct = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first<any>();
    if (!checkProduct) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ต้องการแก้ไข' }, 404);
    }

    // Check if multiple variants share this product_id
    const variantCountCheck = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM product_variants WHERE product_id = ?'
    ).bind(productId).first<{ cnt: number }>();
    const variantCount = variantCountCheck?.cnt || 0;

    // If multiple variants share this product_id and a specific variantId is edited, decouple it into its own independent product!
    if (variantCount > 1 && variantId) {
      const newProductId = 'prod-' + crypto.randomUUID().slice(0, 8);

      // 1. Insert decoupled product row
      await c.env.DB.prepare(`
        INSERT INTO products (id, name, name_en, category_id, description, image_key, thumbnail_key, is_featured, is_active, status, image_meta, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `).bind(
        newProductId,
        name,
        name_en,
        category_id,
        description,
        checkProduct.image_key || null,
        checkProduct.thumbnail_key || null,
        checkProduct.is_featured || 0,
        is_active,
        finalStatus,
        checkProduct.image_meta || null
      ).run();

      // 2. Clone gallery images from old product to new decoupled product
      const oldImages = await c.env.DB.prepare(
        'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC'
      ).bind(productId).all<any>();

      for (const img of (oldImages.results || [])) {
        const newImgId = 'img-' + crypto.randomUUID().slice(0, 8);
        await c.env.DB.prepare(`
          INSERT INTO product_images (id, product_id, image_key, thumbnail_key, sort_order, is_primary, image_meta, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `).bind(newImgId, newProductId, img.image_key, img.thumbnail_key, img.sort_order, img.is_primary, img.image_meta || null).run();
      }

      // 3. Reassign variant to newProductId and update its fields
      await c.env.DB.prepare(`
        UPDATE product_variants
        SET product_id = ?, sku = ?, unit = ?, price = ?, cost_price = ?, stock_quantity = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
      `).bind(newProductId, sku, unit, price, isNaN(cost_price) ? 0 : cost_price, stock_quantity, is_active, variantId).run();

      return c.json({
        ok: true,
        message: 'แยกและอัปเดตข้อมูลสินค้าเรียบร้อยแล้ว (Decoupled)',
        data: {
          product_id: newProductId,
          variant_id: variantId,
          decoupled: true,
          name,
          sku,
          price,
          stock_quantity,
          status: finalStatus,
        },
      });
    }

    // Standard 1:1 Update (when exactly 1 variant or no specific variantId)
    const updateProductStmt = c.env.DB.prepare(`
      UPDATE products
      SET name = ?, name_en = ?, category_id = ?, description = ?, status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `).bind(name, name_en, category_id, description, finalStatus, is_active, productId);

    // Update Variant Statement: strictly scope by `product_id = ?` to prevent modifying other variants unintentionally!
    let updateVariantStmt;
    if (variantId) {
      updateVariantStmt = c.env.DB.prepare(`
        UPDATE product_variants
        SET sku = ?, unit = ?, price = ?, cost_price = ?, stock_quantity = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND product_id = ?;
      `).bind(sku, unit, price, isNaN(cost_price) ? 0 : cost_price, stock_quantity, is_active, variantId, productId);
    } else {
      updateVariantStmt = c.env.DB.prepare(`
        UPDATE product_variants
        SET sku = ?, unit = ?, price = ?, cost_price = ?, stock_quantity = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ?;
      `).bind(sku, unit, price, isNaN(cost_price) ? 0 : cost_price, stock_quantity, is_active, productId);
    }

    await c.env.DB.batch([updateProductStmt, updateVariantStmt]);

    return c.json({
      ok: true,
      message: 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว',
      data: {
        product_id: productId,
        variant_id: variantId,
        name,
        sku,
        price,
        stock_quantity,
        status: finalStatus,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'UPDATE_FAILED', message: err.message }, 500);
  }
});

// 1.5 Change Product Status (Active / Inactive / Draft / Archived)
adminRouter.patch('/products/:id/status', requireAuth(['admin']), async (c) => {
  const productId = c.req.param('id');
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const body = await c.req.json();
    const status = String(body.status || '').trim();
    const validStatuses = ['active', 'inactive', 'draft', 'archived'];

    if (!validStatuses.includes(status)) {
      return c.json({
        ok: false,
        error: 'INVALID_STATUS',
        message: 'สถานะต้องเป็น active, inactive, draft หรือ archived เท่านั้น',
      }, 400);
    }

    const is_active = status === 'active' ? 1 : 0;

    const check = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(productId).first();
    if (!check) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ระบุ' }, 404);
    }

    const updateProduct = c.env.DB.prepare(`
      UPDATE products SET status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;
    `).bind(status, is_active, productId);

    const updateVariants = c.env.DB.prepare(`
      UPDATE product_variants SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?;
    `).bind(is_active, productId);

    await c.env.DB.batch([updateProduct, updateVariants]);

    return c.json({
      ok: true,
      message: `เปลี่ยนสถานะสินค้าเป็น '${status}' เรียบร้อยแล้ว`,
      data: { product_id: productId, status, is_active },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'STATUS_UPDATE_FAILED', message: err.message }, 500);
  }
});

// 1.6 DELETE PRODUCT (Admin only - Soft Delete for Order History / Hard Delete + Storage Cleanup if No Orders)
adminRouter.delete('/products/:id', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าไม่ถูกต้อง' }, 400);
  }
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const product = await c.env.DB.prepare('SELECT id, name, status, image_key, thumbnail_key FROM products WHERE id = ?')
      .bind(productId)
      .first<{ id: string; name: string; status: string; image_key: string | null; thumbnail_key: string | null }>();
    if (!product) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ต้องการลบ' }, 404);
    }

    const variantId = c.req.query('variant_id');
    if (variantId) {
      // Check if product has other variants
      const otherVariants = await c.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM product_variants WHERE product_id = ? AND id != ?'
      ).bind(productId, variantId).first<{ cnt: number }>();

      if ((otherVariants?.cnt || 0) > 0) {
        // Only delete this variant row, do not delete the parent product!
        await c.env.DB.prepare('DELETE FROM product_variants WHERE id = ? AND product_id = ?')
          .bind(variantId, productId).run();
        await c.env.DB.prepare('DELETE FROM inventory_movements WHERE product_id = ? AND variant_id = ?')
          .bind(productId, variantId).run();

        return c.json({
          ok: true,
          message: 'ลบหน่วยขายของสินค้าเรียบร้อยแล้ว',
          data: {
            id: productId,
            variant_id: variantId,
            deleted: true,
            hard_deleted: true,
          },
        });
      }
    }

    // Check if real customer order history exists for this product
    const orderItemCheck = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM order_items WHERE product_id = ?')
      .bind(productId)
      .first<{ cnt: number }>();
    const orderItemCount = orderItemCheck?.cnt || 0;

    const hasOrderHistory = orderItemCount > 0;

    if (hasOrderHistory) {
      // SAFE SOFT DELETE: Preserve financial & historical order records
      const archiveProduct = c.env.DB.prepare(`
        UPDATE products SET status = 'archived', is_active = 0, is_featured = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?;
      `).bind(productId);
      const archiveVariants = c.env.DB.prepare(`
        UPDATE product_variants SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?;
      `).bind(productId);

      await c.env.DB.batch([archiveProduct, archiveVariants]);

      return c.json({
        ok: true,
        message: 'สินค้านี้มีประวัติคำสั่งซื้อของลูกค้าในระบบ จึงถูกจัดเก็บเป็น Archived เพื่อรักษาความสมบูรณ์ของข้อมูลทางบัญชี',
        data: {
          id: productId,
          deleted: false,
          soft_deleted: true,
          status: 'archived',
          order_items_count: orderItemCount,
        },
      });
    }

    // HARD DELETE: No customer order records exist, safe to fully delete and clean up storage
    // 1. Fetch all gallery images for R2 deletion
    const galleryImages = await c.env.DB.prepare('SELECT image_key, thumbnail_key FROM product_images WHERE product_id = ?')
      .bind(productId)
      .all<{ image_key: string; thumbnail_key: string }>();

    // 2. Cascade delete in D1 (clean up inventory_movements, product_images, product_variants, products)
    const delMovements = c.env.DB.prepare('DELETE FROM inventory_movements WHERE product_id = ?').bind(productId);
    const delImages = c.env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId);
    const delVariants = c.env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(productId);
    const delProduct = c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(productId);

    await c.env.DB.batch([delMovements, delImages, delVariants, delProduct]);

    // 3. Clean up R2 images (direct delete with fallback queue)
    const keysToDelete = new Set<string>();
    if (product.image_key) keysToDelete.add(product.image_key);
    if (product.thumbnail_key) keysToDelete.add(product.thumbnail_key);
    for (const img of (galleryImages.results || [])) {
      if (img.image_key) keysToDelete.add(img.image_key);
      if (img.thumbnail_key) keysToDelete.add(img.thumbnail_key);
    }

    if (c.env.PRODUCT_IMAGES && keysToDelete.size > 0) {
      for (const key of keysToDelete) {
        try {
          await c.env.PRODUCT_IMAGES.delete(key);
        } catch (delErr: any) {
          console.warn(`Warning: Failed to delete R2 key ${key} during product hard delete, queued for retry:`, delErr);
          await queueStorageCleanup(c.env.DB, key, 'product_hard_delete', delErr.message);
        }
      }
    }

    return c.json({
      ok: true,
      message: 'ลบข้อมูลสินค้า ตัวเลือก และรูปภาพที่เกี่ยวข้องทั้งหมดเรียบร้อยแล้ว',
      data: {
        id: productId,
        deleted: true,
        hard_deleted: true,
        cleaned_images_count: keysToDelete.size,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'DELETE_PRODUCT_FAILED', message: err.message }, 500);
  }
});

// 1.7 TOGGLE FEATURED PRODUCT (Admin only)
adminRouter.patch('/products/:id/featured', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าไม่ถูกต้อง' }, 400);
  }
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const product = await c.env.DB.prepare('SELECT id, is_featured FROM products WHERE id = ?')
      .bind(productId)
      .first<{ id: string; is_featured: number }>();
    if (!product) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ระบุ' }, 404);
    }

    const body = await c.req.json();
    const isFeatured = Boolean(body.is_featured);

    await c.env.DB.prepare(`
      UPDATE products SET is_featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;
    `).bind(isFeatured ? 1 : 0, productId).run();

    return c.json({
      ok: true,
      message: `ตั้งค่าสินค้าแนะนำเป็น ${isFeatured ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} เรียบร้อยแล้ว`,
      data: {
        id: productId,
        is_featured: isFeatured,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'FEATURED_UPDATE_FAILED', message: err.message }, 500);
  }
});

// 7. R2 IMAGES UPLOAD (Admin only)
// 7.1 Upload Product WebP Images (Main & Thumbnail) & Link to Product in D1
adminRouter.post('/products/:id/image', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าไม่ถูกต้อง' }, 400);
  }

  if (!c.env.DB || !c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'SERVICES_UNAVAILABLE', message: 'D1 or R2 service not bound' }, 500);
  }

  try {
    // 1. Verify product exists in D1
    const product = await c.env.DB.prepare('SELECT id, image_key, thumbnail_key FROM products WHERE id = ?')
      .bind(productId)
      .first<{ id: string; image_key: string | null; thumbnail_key: string | null }>();

    if (!product) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ต้องการอัปโหลดรูปภาพ' }, 404);
    }

    // 2. Parse Multipart Form Data
    const formData = await c.req.formData();
    const mainEntry = formData.get('main_image');
    const thumbEntry = formData.get('thumbnail_image');
    const metaVal = formData.get('metadata');
    const metaStr = metaVal ? String(metaVal) : null;

    if (!mainEntry || typeof mainEntry === 'string') {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'ไม่พบไฟล์รูปภาพหลัก (main_image)' }, 400);
    }
    if (!thumbEntry || typeof thumbEntry === 'string') {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'ไม่พบไฟล์รูปภาพย่อ (thumbnail_image)' }, 400);
    }

    const mainFile = mainEntry as unknown as File;
    const thumbFile = thumbEntry as unknown as File;

    // 3. Strict Server-side Magic Bytes Validation (WebP: 'RIFF'....'WEBP')
    const mainBuf = new Uint8Array(await mainFile.slice(0, 12).arrayBuffer());
    const isMainWebp =
      mainBuf[0] === 0x52 &&
      mainBuf[1] === 0x49 &&
      mainBuf[2] === 0x46 &&
      mainBuf[3] === 0x46 &&
      mainBuf[8] === 0x57 &&
      mainBuf[9] === 0x45 &&
      mainBuf[10] === 0x42 &&
      mainBuf[11] === 0x50;

    const thumbBuf = new Uint8Array(await thumbFile.slice(0, 12).arrayBuffer());
    const isThumbWebp =
      thumbBuf[0] === 0x52 &&
      thumbBuf[1] === 0x49 &&
      thumbBuf[2] === 0x46 &&
      thumbBuf[3] === 0x46 &&
      thumbBuf[8] === 0x57 &&
      thumbBuf[9] === 0x45 &&
      thumbBuf[10] === 0x42 &&
      thumbBuf[11] === 0x50;

    if (!isMainWebp || !isThumbWebp) {
      return c.json({
        ok: false,
        error: 'INVALID_FILE_TYPE',
        message: 'ไฟล์ที่อัปโหลดต้องเป็นไฟล์ WebP ที่ผ่านการปรับแต่งขนาดอย่างถูกต้องเท่านั้น (Header ไม่ตรง)',
      }, 400);
    }

    // 4. Generate timestamped keys to ensure clean cache busting
    const timestamp = Date.now();
    const mainKey = `products/${productId}/main_${timestamp}.webp`;
    const thumbKey = `products/${productId}/thumb_${timestamp}.webp`;

    // 5. Store in Cloudflare R2 and update D1 with automatic rollback on partial failure
    let mainUploaded = false;
    let thumbUploaded = false;

    try {
      // 5.1 Store Main Image
      await c.env.PRODUCT_IMAGES.put(mainKey, mainFile.stream(), {
        httpMetadata: { contentType: 'image/webp' },
        customMetadata: {
          productId,
          type: 'main',
          uploadedAt: new Date().toISOString(),
        },
      });
      mainUploaded = true;

      // Simulation Hook for Step 3C Final Integrity Testing (Strictly restricted to local development)
      if (c.env.ENVIRONMENT === 'development') {
        const simFail = c.req.header('X-Simulate-Failure');
        if (simFail === 'thumbnail_put') {
          throw new Error('Simulated R2 Put Thumbnail Network Failure');
        }
      }

      // 5.2 Store Thumbnail Image
      await c.env.PRODUCT_IMAGES.put(thumbKey, thumbFile.stream(), {
        httpMetadata: { contentType: 'image/webp' },
        customMetadata: {
          productId,
          type: 'thumbnail',
          uploadedAt: new Date().toISOString(),
        },
      });
      thumbUploaded = true;

      // Simulation Hook for Step 3C Final Integrity Testing (Strictly restricted to local development)
      if (c.env.ENVIRONMENT === 'development') {
        const simFail = c.req.header('X-Simulate-Failure');
        if (simFail === 'd1_update') {
          throw new Error('Simulated D1 Transaction Database Failure');
        }
      }

      // 5.3 Update references in Cloudflare D1 (both products table and product_images gallery table)
      const updateProductStmt = c.env.DB.prepare(`
        UPDATE products
        SET image_key = ?, thumbnail_key = ?, image_meta = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
      `).bind(mainKey, thumbKey, metaStr, productId);

      // Check if product already has primary image in product_images
      const existingPrim = await c.env.DB.prepare(`
        SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1;
      `).bind(productId).first<{ id: string }>();

      const galleryStmts: D1PreparedStatement[] = [updateProductStmt];
      if (existingPrim) {
        galleryStmts.push(
          c.env.DB.prepare(`
            UPDATE product_images
            SET image_key = ?, thumbnail_key = ?, image_meta = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
          `).bind(mainKey, thumbKey, metaStr, existingPrim.id)
        );
      } else {
        const imgId = 'img-' + crypto.randomUUID().slice(0, 8);
        galleryStmts.push(
          c.env.DB.prepare(`
            INSERT INTO product_images (id, product_id, image_key, thumbnail_key, sort_order, is_primary, image_meta, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
          `).bind(imgId, productId, mainKey, thumbKey, metaStr)
        );
      }

      await c.env.DB.batch(galleryStmts);
    } catch (stepErr: any) {
      // ROLLBACK: If thumbnail upload or D1 update fails, delete newly uploaded R2 files immediately!
      if (mainUploaded) {
        try { await c.env.PRODUCT_IMAGES.delete(mainKey); } catch {}
      }
      if (thumbUploaded) {
        try { await c.env.PRODUCT_IMAGES.delete(thumbKey); } catch {}
      }
      throw stepErr;
    }

    // 6. Clean up previous R2 images only AFTER new images are safely saved in R2 & D1
    if (product.image_key && product.image_key !== mainKey) {
      try {
        if (c.env.ENVIRONMENT === 'development' && c.req.header('X-Simulate-Failure') === 'old_r2_delete') {
          throw new Error('Simulated R2 Old Image Delete Timeout');
        }
        await c.env.PRODUCT_IMAGES.delete(product.image_key);
      } catch (delOldErr: any) {
        console.warn('Warning: Old R2 image cleanup encountered an error, queued for background cleanup:', delOldErr);
        await queueStorageCleanup(c.env.DB, product.image_key, 'old_single_image_replacement', delOldErr.message);
      }
    }
    if (product.thumbnail_key && product.thumbnail_key !== thumbKey) {
      try {
        await c.env.PRODUCT_IMAGES.delete(product.thumbnail_key);
      } catch (delThumbErr: any) {
        await queueStorageCleanup(c.env.DB, product.thumbnail_key, 'old_single_thumbnail_replacement', delThumbErr.message);
      }
    }

    return c.json({
      ok: true,
      message: 'อัปโหลดและบันทึกรูปภาพสินค้าลง Cloudflare R2 สำเร็จ',
      data: {
        product_id: productId,
        image_key: mainKey,
        thumbnail_key: thumbKey,
        image_url: `/api/images/${mainKey}`,
        thumbnail_url: `/api/images/${thumbKey}`,
        image_meta: metaStr,
      },
    });
  } catch (err: any) {
    return c.json({
      ok: false,
      error: 'UPLOAD_FAILED',
      message: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพสินค้า',
    }, 500);
  }
});

// 7.2 Delete Product Image from R2 and D1 (Admin only)
adminRouter.delete('/products/:id/image', requireAuth(['admin']), async (c) => {
  const productId = c.req.param('id');
  if (!c.env.DB || !c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'SERVICES_UNAVAILABLE' }, 500);
  }

  try {
    const product = await c.env.DB.prepare('SELECT id, image_key, thumbnail_key FROM products WHERE id = ?')
      .bind(productId)
      .first<{ id: string; image_key: string | null; thumbnail_key: string | null }>();

    if (!product) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ระบุ' }, 404);
    }

    // Delete from product_images gallery table as well
    const galleryImages = await c.env.DB.prepare(`
      SELECT image_key, thumbnail_key FROM product_images WHERE product_id = ?;
    `).bind(productId).all<{ image_key: string; thumbnail_key: string }>();

    for (const gImg of (galleryImages.results || [])) {
      if (gImg.image_key) {
        try { await c.env.PRODUCT_IMAGES.delete(gImg.image_key); } catch {}
      }
      if (gImg.thumbnail_key) {
        try { await c.env.PRODUCT_IMAGES.delete(gImg.thumbnail_key); } catch {}
      }
    }

    if (product.image_key) {
      try { await c.env.PRODUCT_IMAGES.delete(product.image_key); } catch {}
    }
    if (product.thumbnail_key) {
      try { await c.env.PRODUCT_IMAGES.delete(product.thumbnail_key); } catch {}
    }

    const clearProduct = c.env.DB.prepare(`
      UPDATE products
      SET image_key = NULL, thumbnail_key = NULL, image_meta = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `).bind(productId);

    const clearGallery = c.env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId);

    await c.env.DB.batch([clearProduct, clearGallery]);

    return c.json({
      ok: true,
      message: 'ลบรูปภาพสินค้าเรียบร้อยแล้ว',
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'DELETE_IMAGE_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 8. PRODUCT GALLERY ENDPOINTS (MAXIMUM 5 IMAGES PER PRODUCT)
// =========================================================================

// 8.1 GET /products/:id/images — List all gallery images for a product
adminRouter.get('/products/:id/images', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าไม่ถูกต้อง' }, 400);
  }
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const images = await c.env.DB.prepare(`
      SELECT id, product_id, image_key, thumbnail_key, sort_order, is_primary, image_meta, created_at, updated_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, created_at ASC;
    `).bind(productId).all<{
      id: string;
      product_id: string;
      image_key: string;
      thumbnail_key: string;
      sort_order: number;
      is_primary: number;
      image_meta: string | null;
      created_at: string;
      updated_at: string;
    }>();

    const data = (images.results || []).map((img) => ({
      ...img,
      image_url: `/api/images/${img.image_key}`,
      thumbnail_url: `/api/images/${img.thumbnail_key}`,
      is_primary: Boolean(img.is_primary),
    }));

    return c.json({
      ok: true,
      data,
      count: data.length,
      max_limit: 5,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'FETCH_IMAGES_FAILED', message: err.message }, 500);
  }
});

// 8.2 POST /products/:id/images — Add new image to product gallery (Max 5)
adminRouter.post('/products/:id/images', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าไม่ถูกต้อง' }, 400);
  }
  if (!c.env.DB || !c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'SERVICES_UNAVAILABLE' }, 500);
  }

  try {
    // 1. Verify product exists
    const product = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(productId).first();
    if (!product) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ระบุ' }, 404);
    }

    // 2. Strict Check: Maximum 5 images enforced before processing
    const countRes = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM product_images WHERE product_id = ?')
      .bind(productId)
      .first<{ cnt: number }>();
    const currentCount = countRes?.cnt || 0;
    if (currentCount >= 5) {
      return c.json({
        ok: false,
        error: 'PRODUCT_IMAGE_LIMIT_EXCEEDED',
        message: 'สินค้าแต่ละรายการสามารถมีรูปภาพได้สูงสุด 5 รูปเท่านั้น (มีครบ 5 รูปแล้ว)',
      }, 400);
    }

    // 3. Parse Multipart Form
    const formData = await c.req.formData();
    const mainEntry = formData.get('main_image');
    const thumbEntry = formData.get('thumbnail_image');
    const metaVal = formData.get('metadata');
    const metaStr = metaVal ? String(metaVal) : null;
    const isPrimaryParam = formData.get('is_primary');
    // If first image or explicitly specified as primary
    const isPrimary = (currentCount === 0 || isPrimaryParam === 'true' || isPrimaryParam === '1') ? 1 : 0;
    const sortOrderParam = formData.get('sort_order');
    const sortOrder = sortOrderParam !== null && !isNaN(Number(sortOrderParam)) ? Number(sortOrderParam) : currentCount;

    if (!mainEntry || typeof mainEntry === 'string') {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'ไม่พบไฟล์รูปภาพหลัก (main_image)' }, 400);
    }
    if (!thumbEntry || typeof thumbEntry === 'string') {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'ไม่พบไฟล์รูปภาพย่อ (thumbnail_image)' }, 400);
    }

    const mainFile = mainEntry as unknown as File;
    const thumbFile = thumbEntry as unknown as File;

    // 4. Magic Bytes Validation
    const mainBuf = new Uint8Array(await mainFile.slice(0, 12).arrayBuffer());
    const isMainWebp =
      mainBuf[0] === 0x52 && mainBuf[1] === 0x49 && mainBuf[2] === 0x46 && mainBuf[3] === 0x46 &&
      mainBuf[8] === 0x57 && mainBuf[9] === 0x45 && mainBuf[10] === 0x42 && mainBuf[11] === 0x50;

    const thumbBuf = new Uint8Array(await thumbFile.slice(0, 12).arrayBuffer());
    const isThumbWebp =
      thumbBuf[0] === 0x52 && thumbBuf[1] === 0x49 && thumbBuf[2] === 0x46 && thumbBuf[3] === 0x46 &&
      thumbBuf[8] === 0x57 && thumbBuf[9] === 0x45 && thumbBuf[10] === 0x42 && thumbBuf[11] === 0x50;

    if (!isMainWebp || !isThumbWebp) {
      return c.json({
        ok: false,
        error: 'INVALID_FILE_TYPE',
        message: 'ไฟล์ที่อัปโหลดต้องเป็นไฟล์ WebP ที่ผ่านการปรับแต่งขนาดอย่างถูกต้องเท่านั้น',
      }, 400);
    }

    // 5. Generate Image ID & R2 Keys (products/{productId}/{imageId}/main.webp)
    const imageId = 'img-' + crypto.randomUUID().slice(0, 8);
    const mainKey = `products/${productId}/${imageId}/main.webp`;
    const thumbKey = `products/${productId}/${imageId}/thumb.webp`;

    // 6. R2 Upload with Atomic Rollback
    let mainUploaded = false;
    let thumbUploaded = false;

    try {
      await c.env.PRODUCT_IMAGES.put(mainKey, mainFile.stream(), {
        httpMetadata: { contentType: 'image/webp' },
        customMetadata: { productId, imageId, type: 'main', uploadedAt: new Date().toISOString() },
      });
      mainUploaded = true;

      // Local testing simulation hook (Strictly restricted to local development)
      if (c.env.ENVIRONMENT === 'development') {
        const simFail = c.req.header('X-Simulate-Failure');
        if (simFail === 'thumbnail_put') {
          throw new Error('Simulated R2 Put Thumbnail Network Failure');
        }
      }

      await c.env.PRODUCT_IMAGES.put(thumbKey, thumbFile.stream(), {
        httpMetadata: { contentType: 'image/webp' },
        customMetadata: { productId, imageId, type: 'thumbnail', uploadedAt: new Date().toISOString() },
      });
      thumbUploaded = true;

      // Local testing simulation hook (Strictly restricted to local development)
      if (c.env.ENVIRONMENT === 'development') {
        const simFail = c.req.header('X-Simulate-Failure');
        if (simFail === 'd1_update') {
          throw new Error('Simulated D1 Transaction Database Failure');
        }
      }

      // 7. Atomic D1 Batch: insert into product_images and sync primary if needed
      const statements: D1PreparedStatement[] = [];

      if (isPrimary === 1) {
        // Demote previous images to non-primary
        statements.push(
          c.env.DB.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').bind(productId)
        );
        // Sync products table primary image
        statements.push(
          c.env.DB.prepare(`
            UPDATE products
            SET image_key = ?, thumbnail_key = ?, image_meta = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
          `).bind(mainKey, thumbKey, metaStr, productId)
        );
      }

      // Insert new gallery image (Triggers SQLite BEFORE INSERT trigger to guarantee <= 5 images)
      statements.push(
        c.env.DB.prepare(`
          INSERT INTO product_images (id, product_id, image_key, thumbnail_key, sort_order, is_primary, image_meta, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `).bind(imageId, productId, mainKey, thumbKey, sortOrder, isPrimary, metaStr)
      );

      await c.env.DB.batch(statements);
    } catch (stepErr: any) {
      if (mainUploaded) {
        try { await c.env.PRODUCT_IMAGES.delete(mainKey); } catch {}
      }
      if (thumbUploaded) {
        try { await c.env.PRODUCT_IMAGES.delete(thumbKey); } catch {}
      }
      throw stepErr;
    }

    return c.json({
      ok: true,
      message: 'เพิ่มรูปภาพในแกลเลอรีสำเร็จ',
      data: {
        id: imageId,
        product_id: productId,
        image_key: mainKey,
        thumbnail_key: thumbKey,
        image_url: `/api/images/${mainKey}`,
        thumbnail_url: `/api/images/${thumbKey}`,
        sort_order: sortOrder,
        is_primary: Boolean(isPrimary),
        image_meta: metaStr,
      },
    }, 201);
  } catch (err: any) {
    const isLimit = err.message && err.message.includes('PRODUCT_IMAGE_LIMIT_EXCEEDED');
    return c.json({
      ok: false,
      error: isLimit ? 'PRODUCT_IMAGE_LIMIT_EXCEEDED' : 'UPLOAD_FAILED',
      message: isLimit ? 'สินค้าแต่ละรายการสามารถมีรูปภาพได้สูงสุด 5 รูปเท่านั้น' : (err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ'),
    }, isLimit ? 400 : 500);
  }
});

// 8.3 PUT /products/:id/images/:imageId — Replace a specific image in gallery
adminRouter.put('/products/:id/images/:imageId', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  const imageId = String(c.req.param('imageId') || '').trim();
  if (!productId || !imageId || !/^[a-zA-Z0-9_-]+$/.test(productId) || !/^[a-zA-Z0-9_-]+$/.test(imageId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าหรือรหัสรูปภาพไม่ถูกต้อง' }, 400);
  }
  if (!c.env.DB || !c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'SERVICES_UNAVAILABLE' }, 500);
  }

  try {
    const currentImg = await c.env.DB.prepare(`
      SELECT id, product_id, image_key, thumbnail_key, sort_order, is_primary
      FROM product_images
      WHERE id = ? AND product_id = ?;
    `).bind(imageId, productId).first<{
      id: string;
      product_id: string;
      image_key: string;
      thumbnail_key: string;
      sort_order: number;
      is_primary: number;
    }>();

    if (!currentImg) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบรูปภาพที่ต้องการเปลี่ยน' }, 404);
    }

    const formData = await c.req.formData();
    const mainEntry = formData.get('main_image');
    const thumbEntry = formData.get('thumbnail_image');
    const metaVal = formData.get('metadata');
    const metaStr = metaVal ? String(metaVal) : null;

    if (!mainEntry || typeof mainEntry === 'string' || !thumbEntry || typeof thumbEntry === 'string') {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุไฟล์ main_image และ thumbnail_image' }, 400);
    }

    const mainFile = mainEntry as unknown as File;
    const thumbFile = thumbEntry as unknown as File;

    // Magic Bytes Validation
    const mainBuf = new Uint8Array(await mainFile.slice(0, 12).arrayBuffer());
    const isMainWebp =
      mainBuf[0] === 0x52 && mainBuf[1] === 0x49 && mainBuf[2] === 0x46 && mainBuf[3] === 0x46 &&
      mainBuf[8] === 0x57 && mainBuf[9] === 0x45 && mainBuf[10] === 0x42 && mainBuf[11] === 0x50;

    const thumbBuf = new Uint8Array(await thumbFile.slice(0, 12).arrayBuffer());
    const isThumbWebp =
      thumbBuf[0] === 0x52 && thumbBuf[1] === 0x49 && thumbBuf[2] === 0x46 && thumbBuf[3] === 0x46 &&
      thumbBuf[8] === 0x57 && thumbBuf[9] === 0x45 && thumbBuf[10] === 0x42 && thumbBuf[11] === 0x50;

    if (!isMainWebp || !isThumbWebp) {
      return c.json({
        ok: false,
        error: 'INVALID_FILE_TYPE',
        message: 'ไฟล์ที่อัปโหลดต้องเป็นไฟล์ WebP ที่ผ่านการปรับแต่งขนาดอย่างถูกต้องเท่านั้น',
      }, 400);
    }

    const ts = Date.now();
    const newMainKey = `products/${productId}/${imageId}/main_${ts}.webp`;
    const newThumbKey = `products/${productId}/${imageId}/thumb_${ts}.webp`;

    let mainUploaded = false;
    let thumbUploaded = false;

    try {
      await c.env.PRODUCT_IMAGES.put(newMainKey, mainFile.stream(), {
        httpMetadata: { contentType: 'image/webp' },
        customMetadata: { productId, imageId, type: 'main', replacedAt: new Date().toISOString() },
      });
      mainUploaded = true;

      await c.env.PRODUCT_IMAGES.put(newThumbKey, thumbFile.stream(), {
        httpMetadata: { contentType: 'image/webp' },
        customMetadata: { productId, imageId, type: 'thumbnail', replacedAt: new Date().toISOString() },
      });
      thumbUploaded = true;

      const statements: D1PreparedStatement[] = [
        c.env.DB.prepare(`
          UPDATE product_images
          SET image_key = ?, thumbnail_key = ?, image_meta = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND product_id = ?;
        `).bind(newMainKey, newThumbKey, metaStr, imageId, productId)
      ];

      // If this image was primary, also sync products table
      if (currentImg.is_primary === 1) {
        statements.push(
          c.env.DB.prepare(`
            UPDATE products
            SET image_key = ?, thumbnail_key = ?, image_meta = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
          `).bind(newMainKey, newThumbKey, metaStr, productId)
        );
      }

      await c.env.DB.batch(statements);
    } catch (stepErr: any) {
      if (mainUploaded) {
        try { await c.env.PRODUCT_IMAGES.delete(newMainKey); } catch {}
      }
      if (thumbUploaded) {
        try { await c.env.PRODUCT_IMAGES.delete(newThumbKey); } catch {}
      }
      throw stepErr;
    }

    // Clean up old R2 files only AFTER new images are safely committed
    if (currentImg.image_key && currentImg.image_key !== newMainKey) {
      try {
        if (c.env.ENVIRONMENT === 'development' && c.req.header('X-Simulate-Failure') === 'old_r2_delete') {
          throw new Error('Simulated R2 Old Image Delete Timeout');
        }
        await c.env.PRODUCT_IMAGES.delete(currentImg.image_key);
      } catch (delOldErr: any) {
        console.warn('Warning: Old gallery image cleanup encountered an error, queued for background cleanup:', delOldErr);
        await queueStorageCleanup(c.env.DB, currentImg.image_key, 'gallery_image_replacement', delOldErr.message);
      }
    }
    if (currentImg.thumbnail_key && currentImg.thumbnail_key !== newThumbKey) {
      try {
        await c.env.PRODUCT_IMAGES.delete(currentImg.thumbnail_key);
      } catch (delThumbErr: any) {
        await queueStorageCleanup(c.env.DB, currentImg.thumbnail_key, 'gallery_thumbnail_replacement', delThumbErr.message);
      }
    }

    return c.json({
      ok: true,
      message: 'เปลี่ยนรูปภาพสำเร็จ',
      data: {
        id: imageId,
        product_id: productId,
        image_key: newMainKey,
        thumbnail_key: newThumbKey,
        image_url: `/api/images/${newMainKey}`,
        thumbnail_url: `/api/images/${newThumbKey}`,
        is_primary: Boolean(currentImg.is_primary),
        sort_order: currentImg.sort_order,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'REPLACE_FAILED', message: err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรูปภาพ' }, 500);
  }
});

// 8.4 DELETE /products/:id/images/:imageId — Delete specific image from gallery
adminRouter.delete('/products/:id/images/:imageId', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  const imageId = String(c.req.param('imageId') || '').trim();
  if (!productId || !imageId || !/^[a-zA-Z0-9_-]+$/.test(productId) || !/^[a-zA-Z0-9_-]+$/.test(imageId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าหรือรหัสรูปภาพไม่ถูกต้อง' }, 400);
  }
  if (!c.env.DB || !c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'SERVICES_UNAVAILABLE' }, 500);
  }

  try {
    const targetImg = await c.env.DB.prepare(`
      SELECT id, product_id, image_key, thumbnail_key, sort_order, is_primary
      FROM product_images
      WHERE id = ? AND product_id = ?;
    `).bind(imageId, productId).first<{
      id: string;
      product_id: string;
      image_key: string;
      thumbnail_key: string;
      sort_order: number;
      is_primary: number;
    }>();

    if (!targetImg) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบรูปภาพที่ต้องการลบ' }, 404);
    }

    const wasPrimary = targetImg.is_primary === 1;

    // Delete row from product_images
    await c.env.DB.prepare('DELETE FROM product_images WHERE id = ? AND product_id = ?')
      .bind(imageId, productId)
      .run();

    // If deleted image was primary, automatically elect next remaining image
    if (wasPrimary) {
      const nextImg = await c.env.DB.prepare(`
        SELECT id, image_key, thumbnail_key, image_meta
        FROM product_images
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 1;
      `).bind(productId).first<{
        id: string;
        image_key: string;
        thumbnail_key: string;
        image_meta: string | null;
      }>();

      if (nextImg) {
        await c.env.DB.batch([
          c.env.DB.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').bind(nextImg.id),
          c.env.DB.prepare(`
            UPDATE products
            SET image_key = ?, thumbnail_key = ?, image_meta = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
          `).bind(nextImg.image_key, nextImg.thumbnail_key, nextImg.image_meta, productId)
        ]);
      } else {
        // No remaining images: clear legacy columns in products table
        await c.env.DB.prepare(`
          UPDATE products
          SET image_key = NULL, thumbnail_key = NULL, image_meta = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?;
        `).bind(productId).run();
      }
    }

    // Clean up R2 storage (Queue failed deletions to storage_cleanup_queue for safety)
    if (targetImg.image_key) {
      try {
        await c.env.PRODUCT_IMAGES.delete(targetImg.image_key);
      } catch (delErr: any) {
        console.warn('Warning: R2 image deletion failed, queued for background retry:', delErr);
        await queueStorageCleanup(c.env.DB, targetImg.image_key, 'gallery_image_deletion', delErr.message);
      }
    }
    if (targetImg.thumbnail_key) {
      try {
        await c.env.PRODUCT_IMAGES.delete(targetImg.thumbnail_key);
      } catch (delErr: any) {
        await queueStorageCleanup(c.env.DB, targetImg.thumbnail_key, 'gallery_thumbnail_deletion', delErr.message);
      }
    }

    return c.json({
      ok: true,
      message: 'ลบรูปภาพออกจากแกลเลอรีเรียบร้อยแล้ว',
      data: {
        deleted_id: imageId,
        was_primary: wasPrimary,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'DELETE_IMAGE_FAILED', message: err.message }, 500);
  }
});

// 8.5 PATCH /products/:id/images/reorder — Reorder gallery images and set primary image
adminRouter.patch('/products/:id/images/reorder', requireAuth(['admin']), async (c) => {
  const productId = String(c.req.param('id') || '').trim();
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId)) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'รูปแบบรหัสสินค้าไม่ถูกต้อง' }, 400);
  }
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const body = await c.req.json();
    const imageIds: string[] = Array.isArray(body.image_ids) ? body.image_ids : [];
    const primaryId: string | undefined = body.primary_image_id || imageIds[0];

    if (imageIds.length === 0) {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาระบุ image_ids ที่ต้องการจัดเรียง' }, 400);
    }

    // Verify all imageIds belong to this product
    const existing = await c.env.DB.prepare(`
      SELECT id, image_key, thumbnail_key, image_meta
      FROM product_images
      WHERE product_id = ?;
    `).bind(productId).all<{ id: string; image_key: string; thumbnail_key: string; image_meta: string | null }>();

    const existingMap = new Map((existing.results || []).map(img => [img.id, img]));

    for (const id of imageIds) {
      if (!existingMap.has(id)) {
        return c.json({ ok: false, error: 'INVALID_IMAGE_ID', message: `ไม่พบรูปภาพ ${id} ในสินค้านี้` }, 400);
      }
    }

    const statements: D1PreparedStatement[] = [];

    // Reset all to is_primary = 0 first
    statements.push(
      c.env.DB.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').bind(productId)
    );

    // Apply sort_order and is_primary
    imageIds.forEach((id, index) => {
      const isPrim = (id === primaryId) ? 1 : 0;
      statements.push(
        c.env.DB.prepare(`
          UPDATE product_images
          SET sort_order = ?, is_primary = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND product_id = ?;
        `).bind(index, isPrim, id, productId)
      );
    });

    // Sync products table with primary image
    if (primaryId && existingMap.has(primaryId)) {
      const pImg = existingMap.get(primaryId)!;
      statements.push(
        c.env.DB.prepare(`
          UPDATE products
          SET image_key = ?, thumbnail_key = ?, image_meta = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?;
        `).bind(pImg.image_key, pImg.thumbnail_key, pImg.image_meta, productId)
      );
    }

    await c.env.DB.batch(statements);

    return c.json({
      ok: true,
      message: 'จัดเรียงลำดับรูปภาพและกำหนดรูปหลักเรียบร้อยแล้ว',
      data: {
        product_id: productId,
        reordered_ids: imageIds,
        primary_image_id: primaryId,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'REORDER_FAILED', message: err.message }, 500);
  }
});

// =========================================================================
// 9. STORAGE CLEANUP QUEUE MANAGEMENT (Admin only)
// =========================================================================

// 9.1 GET /storage/cleanup — Check orphan files awaiting cleanup
adminRouter.get('/storage/cleanup', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const pendingCount = await getPendingCleanupCount(c.env.DB);
    const queueItems = await c.env.DB.prepare(`
      SELECT id, storage_key, reason, attempts, last_error, status, created_at, updated_at
      FROM storage_cleanup_queue
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 50;
    `).all();

    return c.json({
      ok: true,
      pending_count: pendingCount,
      has_orphan_files: pendingCount > 0,
      queue: queueItems.results || [],
      message: pendingCount === 0
        ? 'ไม่มีไฟล์ขยะตกค้างในระบบ (Zero Orphan Files verified)'
        : `มีไฟล์รูปภาพที่รอลบตกค้างอยู่ ${pendingCount} ไฟล์`,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'CLEANUP_STATUS_FAILED', message: err.message }, 500);
  }
});

// 9.2 POST /storage/cleanup/retry — Trigger cleanup queue processing safely
adminRouter.post('/storage/cleanup/retry', requireAuth(['admin']), async (c) => {
  if (!c.env.DB || !c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'SERVICES_UNAVAILABLE' }, 500);
  }

  try {
    const result = await processStorageCleanupQueue(c.env);
    const remainingCount = await getPendingCleanupCount(c.env.DB);

    return c.json({
      ok: true,
      message: 'ดำเนินการประมวลผลคิวลบไฟล์ขยะเรียบร้อยแล้ว',
      data: {
        ...result,
        remaining_pending_count: remainingCount,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'CLEANUP_RETRY_FAILED', message: err.message }, 500);
  }
});
