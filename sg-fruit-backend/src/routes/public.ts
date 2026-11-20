import { Hono } from 'hono';
import type { Env, PublicProduct } from '../types/env';
import { defaultSiteProfileData, mapToPublicSiteProfile } from './siteProfile';

export const publicRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/site-profile
 * Public Read-Only endpoint to fetch site profile and branding configuration
 * Non-blocking fallback to default values if D1 unavailable
 */
publicRouter.get('/site-profile', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: true, data: defaultSiteProfileData });
  }

  try {
    const row = await c.env.DB.prepare('SELECT * FROM site_profile WHERE id = ?').bind('default').first();
    if (!row) {
      return c.json({ ok: true, data: defaultSiteProfileData });
    }
    return c.json({
      ok: true,
      data: mapToPublicSiteProfile(row),
    });
  } catch (err: any) {
    return c.json({ ok: true, data: defaultSiteProfileData, warning: 'FALLBACK_TO_DEFAULT' });
  }
});

/**
 * GET /api/categories
 * Public endpoint to list fruit & vegetable categories
 * Connects directly to Cloudflare D1 categories table with fallback
 */
publicRouter.get('/categories', async (c) => {
  const defaultCategories = [
    { id: 'all', name: 'สินค้าทั้งหมด', slug: 'all', sort_order: 0 },
    { id: 'ผลไม้ไทย', name: 'ผลไม้ไทย', slug: 'thai-fruits', sort_order: 1 },
    { id: 'ผลไม้นำเข้า', name: 'ผลไม้นำเข้า', slug: 'imported-fruits', sort_order: 2 },
    { id: 'ผลไม้ตามฤดูกาล', name: 'ผลไม้ตามฤดูกาล', slug: 'seasonal-fruits', sort_order: 3 },
    { id: 'ผักสด', name: 'ผักสด', slug: 'vegetables', sort_order: 4 },
  ];

  if (!c.env.DB) {
    return c.json({ ok: true, data: defaultCategories });
  }

  try {
    const res = await c.env.DB.prepare(
      'SELECT id, name, slug, sort_order FROM categories ORDER BY sort_order ASC, created_at ASC;'
    ).all<{ id: string; name: string; slug: string; sort_order: number }>();

    const categories = res.results && res.results.length > 0 ? res.results : defaultCategories;
    return c.json({
      ok: true,
      data: categories,
    });
  } catch (err: any) {
    return c.json({ ok: true, data: defaultCategories, warning: 'FALLBACK_TO_DEFAULT' });
  }
});

/**
 * GET /api/products/featured
 * Public endpoint to fetch only featured products for Storefront highlight
 */
publicRouter.get('/products/featured', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const productsResult = await c.env.DB.prepare(`
      SELECT p.id, p.name, p.name_en, p.category_id, c.name as category_name,
             p.description, p.image_key, p.thumbnail_key, p.is_featured
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.status = 'active' AND p.is_featured = 1
      ORDER BY p.updated_at DESC, p.created_at DESC;
    `).all();

    const products = productsResult.results || [];
    if (products.length === 0) {
      return c.json({ ok: true, data: [] });
    }

    const productIds = products.map((p: any) => p.id);
    const placeholders = productIds.map(() => '?').join(',');

    // Fetch Gallery Images
    const imagesResult = await c.env.DB.prepare(`
      SELECT product_id, image_key, thumbnail_key, sort_order, is_primary
      FROM product_images
      WHERE product_id IN (${placeholders})
      ORDER BY sort_order ASC, created_at ASC;
    `).bind(...productIds).all<{
      product_id: string;
      image_key: string;
      thumbnail_key: string;
      sort_order: number;
      is_primary: number;
    }>();

    const imageMap = new Map<string, Array<{ url: string; thumbnail_url: string; sort_order: number; is_primary: boolean }>>();
    (imagesResult.results || []).forEach((img) => {
      const list = imageMap.get(img.product_id) || [];
      list.push({
        url: `/api/images/${img.image_key}`,
        thumbnail_url: `/api/images/${img.thumbnail_key}`,
        sort_order: img.sort_order,
        is_primary: Boolean(img.is_primary),
      });
      imageMap.set(img.product_id, list);
    });

    // Fetch Public Variants (Sanitized: NO SKU, NO cost_price)
    const variantsResult = await c.env.DB.prepare(`
      SELECT id, product_id, unit, price, stock_quantity
      FROM product_variants
      WHERE product_id IN (${placeholders}) AND is_active = 1
      ORDER BY price ASC;
    `).bind(...productIds).all<{ id: string; product_id: string; unit: string; price: number; stock_quantity: number }>();

    const variantMap = new Map<string, Array<{ id: string; unit: string; price: number; in_stock: boolean }>>();
    (variantsResult.results || []).forEach((v) => {
      const list = variantMap.get(v.product_id) || [];
      list.push({
        id: v.id,
        unit: v.unit,
        price: v.price,
        in_stock: v.stock_quantity > 0,
      });
      variantMap.set(v.product_id, list);
    });

    const data = products.map((p: any) => {
      const imgs = imageMap.get(p.id) || [];
      if (imgs.length === 0 && p.image_key) {
        imgs.push({
          url: `/api/images/${p.image_key}`,
          thumbnail_url: `/api/images/${p.thumbnail_key || p.image_key}`,
          sort_order: 0,
          is_primary: true,
        });
      }
      const primaryImg = imgs.find(img => img.is_primary) || imgs[0] || null;
      const variants = variantMap.get(p.id) || [];

      return {
        id: p.id,
        name: p.name,
        name_en: p.name_en,
        category_id: p.category_id,
        category_name: p.category_name,
        description: p.description,
        is_featured: true,
        price: variants.length > 0 ? variants[0].price : 0,
        primary_image: primaryImg,
        images: imgs,
        variants,
      };
    });

    return c.json({ ok: true, data });
  } catch (err: any) {
    return c.json({ ok: false, error: 'FEATURED_FETCH_FAILED', message: err.message }, 500);
  }
});

/**
 * GET /api/products
 * Public storefront product catalog
 *
 * CRITICAL BUSINESS RULE:
 * - SKU is internal sales unit notation (e.g. "1 โล", "2 โล")
 * - SKU MUST NOT be included in public responses
 * - Cost price MUST NOT be included
 * - Stock quantity is sanitized to boolean `in_stock`
 */
publicRouter.get('/products', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('q');

  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    let query = `
      SELECT p.id, p.name, p.name_en, p.category_id, c.name as category_name,
             p.description, p.image_key, p.thumbnail_key, p.is_featured
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.status = 'active'
    `;
    const params: string[] = [];

    if (category && category !== 'all') {
      query += ` AND (p.category_id = ? OR c.slug = ?)`;
      params.push(category, category);
    }
    if (search) {
      query += ` AND (p.name LIKE ? OR p.name_en LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.is_featured DESC, p.created_at DESC;`;

    const productsResult = await c.env.DB.prepare(query).bind(...params).all();
    const products = productsResult.results || [];

    if (products.length === 0) {
      return c.json({
        ok: true,
        filter: { category: category || 'all', search: search || null },
        data: [],
      });
    }

    const productIds = products.map((p: any) => p.id);
    const placeholders = productIds.map(() => '?').join(',');

    // Fetch Gallery Images
    const imagesResult = await c.env.DB.prepare(`
      SELECT product_id, image_key, thumbnail_key, sort_order, is_primary
      FROM product_images
      WHERE product_id IN (${placeholders})
      ORDER BY sort_order ASC, created_at ASC;
    `).bind(...productIds).all<{
      product_id: string;
      image_key: string;
      thumbnail_key: string;
      sort_order: number;
      is_primary: number;
    }>();

    const imageMap = new Map<string, Array<{ url: string; thumbnail_url: string; sort_order: number; is_primary: boolean }>>();
    (imagesResult.results || []).forEach((img) => {
      const list = imageMap.get(img.product_id) || [];
      list.push({
        url: `/api/images/${img.image_key}`,
        thumbnail_url: `/api/images/${img.thumbnail_key}`,
        sort_order: img.sort_order,
        is_primary: Boolean(img.is_primary),
      });
      imageMap.set(img.product_id, list);
    });

    // Fetch Public Variants (STRICTLY NO SKU, NO cost_price)
    const variantsResult = await c.env.DB.prepare(`
      SELECT id, product_id, unit, price, stock_quantity
      FROM product_variants
      WHERE product_id IN (${placeholders}) AND is_active = 1
      ORDER BY price ASC;
    `).bind(...productIds).all<{ id: string; product_id: string; unit: string; price: number; stock_quantity: number }>();

    const variantMap = new Map<string, Array<{ id: string; unit: string; price: number; in_stock: boolean }>>();
    (variantsResult.results || []).forEach((v) => {
      const list = variantMap.get(v.product_id) || [];
      list.push({
        id: v.id,
        unit: v.unit,
        price: v.price,
        in_stock: v.stock_quantity > 0,
      });
      variantMap.set(v.product_id, list);
    });

    const data = products.map((p: any) => {
      const imgs = imageMap.get(p.id) || [];
      if (imgs.length === 0 && p.image_key) {
        imgs.push({
          url: `/api/images/${p.image_key}`,
          thumbnail_url: `/api/images/${p.thumbnail_key || p.image_key}`,
          sort_order: 0,
          is_primary: true,
        });
      }

      const primaryImg = imgs.find(img => img.is_primary) || imgs[0] || null;
      const variants = variantMap.get(p.id) || [];
      const minPrice = variants.length > 0 ? variants[0].price : 0;

      return {
        id: p.id,
        name: p.name,
        name_en: p.name_en,
        category_id: p.category_id,
        category_name: p.category_name,
        description: p.description,
        price: minPrice,
        primary_image: primaryImg,
        images: imgs,
        variants,
      };
    });

    return c.json({
      ok: true,
      filter: { category: category || 'all', search: search || null },
      data,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'CATALOG_FETCH_FAILED', message: err.message }, 500);
  }
});

/**
 * GET /api/products/:id
 * Public single product detail with gallery
 */
publicRouter.get('/products/:id', async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ ok: false, error: 'VALIDATION_FAILED' }, 400);
  }
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE' }, 500);
  }

  try {
    const product = await c.env.DB.prepare(`
      SELECT p.id, p.name, p.name_en, p.category_id, c.name as category_name,
             p.description, p.image_key, p.thumbnail_key, p.is_featured
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1 AND p.status = 'active';
    `).bind(id).first<any>();

    if (!product) {
      return c.json({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้าที่ระบุ' }, 404);
    }

    const imagesResult = await c.env.DB.prepare(`
      SELECT image_key, thumbnail_key, sort_order, is_primary
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, created_at ASC;
    `).bind(id).all<{ image_key: string; thumbnail_key: string; sort_order: number; is_primary: number }>();

    const images = (imagesResult.results || []).map((img) => ({
      url: `/api/images/${img.image_key}`,
      thumbnail_url: `/api/images/${img.thumbnail_key}`,
      sort_order: img.sort_order,
      is_primary: Boolean(img.is_primary),
    }));

    if (images.length === 0 && product.image_key) {
      images.push({
        url: `/api/images/${product.image_key}`,
        thumbnail_url: `/api/images/${product.thumbnail_key || product.image_key}`,
        sort_order: 0,
        is_primary: true,
      });
    }

    const primaryImg = images.find(img => img.is_primary) || images[0] || null;

    const variantsResult = await c.env.DB.prepare(`
      SELECT id, unit, price, stock_quantity
      FROM product_variants
      WHERE product_id = ? AND is_active = 1
      ORDER BY price ASC;
    `).bind(id).all<{ id: string; unit: string; price: number; stock_quantity: number }>();

    const variants = (variantsResult.results || []).map(v => ({
      id: v.id,
      unit: v.unit,
      price: v.price,
      in_stock: v.stock_quantity > 0,
    }));

    return c.json({
      ok: true,
      data: {
        id: product.id,
        name: product.name,
        name_en: product.name_en,
        category_id: product.category_id,
        category_name: product.category_name,
        description: product.description,
        price: variants.length > 0 ? variants[0].price : 0,
        primary_image: primaryImg,
        images,
        variants,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'PRODUCT_FETCH_FAILED', message: err.message }, 500);
  }
});

/**
 * POST /api/orders/upload-slip
 * Public endpoint for uploading payment slip images to Cloudflare R2
 */
publicRouter.post('/orders/upload-slip', async (c) => {
  if (!c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'R2_STORAGE_UNAVAILABLE', message: 'ระบบจัดเก็บไฟล์รูปภาพไม่พร้อมใช้งาน' }, 503);
  }

  try {
    const formData = await c.req.formData();
    const fileEntry = formData.get('slip') || formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ ok: false, error: 'FILE_REQUIRED', message: 'กรุณาแนบไฟล์สลิปการโอนเงิน' }, 400);
    }

    const file = fileEntry as unknown as File;
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ ok: false, error: 'FILE_TOO_LARGE', message: 'ขนาดไฟล์ต้องไม่เกิน 10MB' }, 400);
    }

    let ext = 'jpg';
    let contentType = file.type || 'image/jpeg';
    if (contentType.includes('png') || file.name.toLowerCase().endsWith('.png')) {
      ext = 'png';
      contentType = 'image/png';
    } else if (contentType.includes('webp') || file.name.toLowerCase().endsWith('.webp')) {
      ext = 'webp';
      contentType = 'image/webp';
    } else {
      ext = 'jpg';
      contentType = 'image/jpeg';
    }

    const randomStr = Math.random().toString(36).substring(2, 8);
    const slipKey = `slips/slip_${Date.now()}_${randomStr}.${ext}`;

    await c.env.PRODUCT_IMAGES.put(slipKey, file.stream(), {
      httpMetadata: { contentType },
      customMetadata: {
        type: 'slip',
        uploadedAt: new Date().toISOString(),
      },
    });

    const slipUrl = `/api/images/${slipKey}`;
    return c.json({
      ok: true,
      data: {
        slip_url: slipUrl,
        key: slipKey,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'UPLOAD_FAILED', message: err.message || 'ไม่สามารถอัปโหลดสลิปได้' }, 500);
  }
});

/**
 * Remote Area Postal Codes (69 postal codes / 70 items list)
 * +฿50 shipping fee, COD disabled (bank transfer only)
 */
const REMOTE_POSTAL_CODES = new Set([
  '20120', '23170', '50160', '50240', '50250', '50260', '50270', '50310', '50350',
  '57170', '57180', '57260', '58000', '58110', '58120', '58130', '58140', '58150',
  '63150', '63170', '67260', '71180', '71240', '81150', '81210', '82160', '83000',
  '83100', '83110', '83120', '83130', '83150', '84140', '84280', '84310', '84320',
  '84330', '84360', '94000', '94110', '94120', '94130', '94140', '94150', '94160',
  '94170', '94180', '94190', '94220', '94230', '95000', '95110', '95120', '95130',
  '95140', '95150', '95160', '95170', '96000', '96110', '96120', '96130', '96140',
  '96150', '96160', '96170', '96180', '96190', '96210', '96220'
]);

/**
 * POST /api/orders
 * Public endpoint to submit customer orders from Storefront directly into D1
 */
publicRouter.post('/orders', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE', message: 'ฐานข้อมูลไม่พร้อมใช้งาน' }, 500);
  }

  try {
    const body = await c.req.json<{
      customer: {
        name: string;
        phone: string;
        address: string;
        subdistrict: string;
        district: string;
        province: string;
        zipcode: string;
        note?: string;
      };
      payment_method: 'promptpay' | 'transfer' | 'cod';
      slip_url?: string;
      items: Array<{
        product_id?: string;
        product_name: string;
        variant_id?: string;
        variation?: string;
        unit?: string;
        price: number;
        quantity: number;
        subtotal: number;
        sku?: string;
      }>;
      subtotal: number;
      discount_amount?: number;
      shipping_fee?: number;
      total_amount: number;
    }>();

    const { customer, payment_method, slip_url, items, subtotal, discount_amount = 0, shipping_fee = 0, total_amount } = body;

    // 1. Validation
    if (!customer || !customer.name?.trim() || !customer.phone?.trim() || !customer.address?.trim() ||
        !customer.subdistrict?.trim() || !customer.district?.trim() || !customer.province?.trim() || !customer.zipcode?.trim()) {
      return c.json({ ok: false, error: 'MISSING_CUSTOMER_INFO', message: 'กรุณากรอกข้อมูลชื่อ เบอร์โทร และที่อยู่จัดส่งให้ครบถ้วน' }, 400);
    }

    const cleanPhone = customer.phone.replace(/[\s-]/g, '');
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      return c.json({ ok: false, error: 'INVALID_PHONE', message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก' }, 400);
    }

    const cleanZip = customer.zipcode.trim().replace(/\s/g, '');
    const isRemoteArea = REMOTE_POSTAL_CODES.has(cleanZip);
    const expectedShippingFee = isRemoteArea ? 50 : 0;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ ok: false, error: 'EMPTY_CART', message: 'ไม่มีรายการสินค้าในคำสั่งซื้อ' }, 400);
    }

    // 1.1 Pre-validate cart items against D1 products and variants
    const rawProductIds = items.map((i: any) => i.product_id).filter(Boolean);
    if (rawProductIds.length !== items.length) {
      return c.json({
        ok: false,
        error: 'INVALID_CART_ITEMS',
        message: 'มีสินค้าบางรายการในตะกร้าถูกอัปเดตหรือหมดแล้ว กรุณารีเฟรชและเลือกสินค้าใหม่อีกครั้ง'
      }, 400);
    }

    const uniqueProductIds = [...new Set(rawProductIds)];
    const prodPlaceholders = uniqueProductIds.map(() => '?').join(',');
    const dbProducts = await c.env.DB.prepare(`
      SELECT id, name, is_active
      FROM products
      WHERE id IN (${prodPlaceholders});
    `).bind(...uniqueProductIds).all<{ id: string; name: string; is_active: number }>();

    const productMap = new Map((dbProducts.results || []).map(p => [p.id, p]));

    for (const itm of items) {
      const p = itm.product_id ? productMap.get(itm.product_id) : undefined;
      if (!p) {
        return c.json({
          ok: false,
          error: 'INVALID_CART_ITEMS',
          message: 'มีสินค้าบางรายการในตะกร้าถูกอัปเดตหรือหมดแล้ว กรุณารีเฟรชและเลือกสินค้าใหม่อีกครั้ง'
        }, 400);
      }
      if (p.is_active === 0) {
        return c.json({
          ok: false,
          error: 'PRODUCT_INACTIVE',
          message: `สินค้า "${p.name || itm.product_name}" ถูกปิดการจำหน่ายแล้ว กรุณาเลือกสินค้าอื่น`
        }, 400);
      }
    }

    // Fetch active variants for resolution and foreign key integrity
    const dbVariants = await c.env.DB.prepare(`
      SELECT id, product_id, unit, price, is_active
      FROM product_variants
      WHERE product_id IN (${prodPlaceholders}) AND is_active = 1
      ORDER BY price ASC;
    `).bind(...uniqueProductIds).all<{ id: string; product_id: string; unit: string; price: number; is_active: number }>();

    const variantById = new Map((dbVariants.results || []).map(v => [v.id, v]));
    const variantsByProd = new Map<string, Array<{ id: string; product_id: string; unit: string; price: number }>>();
    (dbVariants.results || []).forEach(v => {
      const list = variantsByProd.get(v.product_id) || [];
      list.push(v);
      variantsByProd.set(v.product_id, list);
    });

    const isCod = payment_method === 'cod';

    // Remote area restriction: COD is strictly prohibited
    if (isRemoteArea && isCod) {
      return c.json({
        ok: false,
        error: 'REMOTE_AREA_COD_NOT_ALLOWED',
        message: 'พื้นที่ห่างไกล/ข้ามเกาะ มีค่าจัดส่งเพิ่ม 50 บาท และสงวนสิทธิ์เฉพาะแบบโอนจ่ายเท่านั้น'
      }, 400);
    }

    if (isCod && subtotal > 800) {
      return c.json({ ok: false, error: 'COD_LIMIT_EXCEEDED', message: 'ยอดสั่งซื้อเกิน 800 บาท สงวนสิทธิ์เฉพาะแบบโอนจ่ายเท่านั้น' }, 400);
    }

    if (!isCod && !slip_url) {
      return c.json({ ok: false, error: 'SLIP_REQUIRED', message: 'กรุณาแนบสลิปหลักฐานการโอนเงิน' }, 400);
    }

    const finalShippingFee = expectedShippingFee;
    const finalTotalAmount = Math.max(0, subtotal + finalShippingFee - discount_amount);

    // 2. Generate IDs
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `SG-${dateStr}-${randomSuffix}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = now.toISOString();

    const paymentLabel = isCod ? 'เก็บเงินปลายทาง (COD)' : 'โอนเงินผ่านบัญชีธนาคาร';
    const fullAddress = `${customer.address.trim()} ต.${customer.subdistrict.trim()} อ.${customer.district.trim()} จ.${customer.province.trim()} ${cleanZip}`;

    // 3. Batch insert order and order_items (Strict parent-then-child sequence)
    const statements: any[] = [];

    statements.push(
      c.env.DB.prepare(`
        INSERT INTO orders (
          id, order_no, platform, platform_order_id, platform_order_status,
          customer_name, customer_phone, customer_address,
          recipient_name, recipient_phone,
          detail_address, subdistrict, district, province, zipcode,
          buyer_message, payment_method, slip_url,
          shipping_provider_name, delivery_option,
          sku_total_amount, shipping_fee_after_discount, discount_amount, total_amount,
          status, packing_status, stock_deducted_status,
          created_at, updated_at
        ) VALUES (
          ?, ?, 'storefront', ?, 'UNPAID_OR_SUBMITTED',
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          'pending', 'unpacked', 'undeducted',
          ?, ?
        );
      `).bind(
        orderId, orderNo, orderNo,
        customer.name.trim(), cleanPhone, fullAddress,
        customer.name.trim(), cleanPhone,
        customer.address.trim(), customer.subdistrict.trim(), customer.district.trim(), customer.province.trim(), cleanZip,
        customer.note?.trim() || null, paymentLabel, slip_url || null,
        isRemoteArea ? 'จัดส่งพื้นที่ห่างไกล / ข้ามเกาะ' : 'จัดส่งแบบปกติ',
        isRemoteArea ? 'จัดส่งด่วนพื้นที่ห่างไกล (+50 บาท)' : 'จัดส่งด่วนแบบปกติ (แพ็กกันกระแทก)',
        subtotal, finalShippingFee, discount_amount, finalTotalAmount,
        nowIso, nowIso
      )
    );

    // Items
    for (let i = 0; i < items.length; i++) {
      const itm = items[i];
      const itemId = `itm-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      const qty = Math.max(1, Number(itm.quantity) || 1);
      const price = Number(itm.price) || 0;
      const itmSubtotal = Number(itm.subtotal) || (qty * price);

      // Resolve valid variant_id strictly
      let resolvedVariantId: string | null = null;
      if (itm.variant_id && variantById.has(itm.variant_id) && variantById.get(itm.variant_id)!.product_id === itm.product_id) {
        resolvedVariantId = itm.variant_id;
      } else {
        const prodVars = itm.product_id ? (variantsByProd.get(itm.product_id) || []) : [];
        const matchingUnit = prodVars.find(v => v.unit === itm.unit || v.unit === itm.variation);
        if (matchingUnit) {
          resolvedVariantId = matchingUnit.id;
        } else if (prodVars.length > 0) {
          resolvedVariantId = prodVars[0].id;
        }
      }

      statements.push(
        c.env.DB.prepare(`
          INSERT INTO order_items (
            id, order_id, platform_order_id, source_row_number,
            product_id, variant_id, product_name, variation, unit, sku,
            quantity, price, unit_price, subtotal, subtotal_after_discount,
            item_packing_status, packed_quantity, stock_deducted,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            'unpacked', 0, 0,
            ?, ?
          );
        `).bind(
          itemId, orderId, orderNo, i + 1,
          itm.product_id, resolvedVariantId, itm.product_name, itm.variation || null, itm.unit || null, itm.sku || null,
          qty, price, price, itmSubtotal, itmSubtotal,
          nowIso, nowIso
        )
      );
    }

    await c.env.DB.batch(statements);

    return c.json({
      ok: true,
      data: {
        order_id: orderId,
        order_no: orderNo,
        total_amount: finalTotalAmount,
        payment_method: paymentLabel,
        created_at: nowIso,
      },
    });
  } catch (err: any) {
    const errMsg = String(err?.message || '');
    if (errMsg.includes('FOREIGN KEY') || errMsg.includes('SQLITE_CONSTRAINT') || errMsg.includes('D1_ERROR')) {
      return c.json({
        ok: false,
        error: 'INVALID_CART_ITEMS',
        message: 'มีสินค้าบางรายการในตะกร้าถูกอัปเดตหรือหมดแล้ว กรุณารีเฟรชและเลือกสินค้าใหม่อีกครั้ง'
      }, 400);
    }
    return c.json({ ok: false, error: 'ORDER_SUBMIT_FAILED', message: err.message || 'ไม่สามารถบันทึกคำสั่งซื้อได้' }, 500);
  }
});

// Helper functions for Guest Order Tracking & PDPA Masking
function maskCustomerName(name: string): string {
  if (!name) return 'คุณลูกค้า';
  const parts = name.trim().split(/\s+/);
  return parts.map(p => {
    if (p.length <= 2) return p.slice(0, 1) + '*';
    return p.slice(0, 2) + '*'.repeat(Math.min(4, p.length - 2));
  }).join(' ');
}

function maskPhoneNumber(phone: string): string {
  if (!phone) return '-';
  const clean = phone.replace(/[\s-]/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 2)}X-XXX-${clean.slice(6)}`;
  }
  if (clean.length >= 7) {
    return `${clean.slice(0, 3)}***${clean.slice(-3)}`;
  }
  return clean;
}

function formatMaskedAddress(order: any): string {
  const parts: string[] = [];
  if (order.subdistrict) parts.push(`ต.${order.subdistrict.trim()}`);
  if (order.district) parts.push(`อ.${order.district.trim()}`);
  if (order.province) parts.push(`จ.${order.province.trim()}`);
  if (order.zipcode) parts.push(order.zipcode.trim());
  if (parts.length > 0) return parts.join(' ');
  return 'จัดส่งตามที่อยู่ที่ระบุไว้ในคำสั่งซื้อ';
}

function mapOrderStatus(status: string, packingStatus: string, paymentMethod: string) {
  const isCod = paymentMethod?.includes('COD') || paymentMethod?.includes('ปลายทาง');

  if (status === 'cancelled') {
    return {
      code: 'cancelled',
      label: 'ยกเลิกคำสั่งซื้อ',
      current_step: 0,
      can_edit_address: false,
      description: 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว'
    };
  }

  if (status === 'shipped') {
    return {
      code: 'shipped',
      label: 'จัดส่งสินค้าแล้ว',
      current_step: 4,
      can_edit_address: false,
      description: 'สินค้าถูกจัดส่งให้บริษัทขนส่งเรียบร้อยแล้ว ท่านสามารถตรวจสอบเลขพัสดุด้านล่าง'
    };
  }

  if (packingStatus === 'packing' || packingStatus === 'packed' || status === 'packed') {
    return {
      code: 'packing',
      label: 'กำลังแพ็กสินค้า',
      current_step: 3,
      can_edit_address: false,
      description: 'ทางร้านกำลังคัดเกรดผลไม้สดและแพ็กบรรจุกล่องพร้อมกันกระแทกอย่างดี'
    };
  }

  if (status === 'confirmed') {
    return {
      code: 'confirmed',
      label: 'ยืนยันคำสั่งซื้อแล้ว',
      current_step: 2,
      can_edit_address: true,
      description: 'ตรวจสอบความถูกต้องเรียบร้อยแล้ว เตรียมส่งคิวแพ็กสินค้าตามรอบจัดส่ง'
    };
  }

  return {
    code: isCod ? 'pending_cod' : 'pending_transfer',
    label: isCod ? 'รับคำสั่งซื้อแล้ว (เก็บเงินปลายทาง)' : 'รอตรวจสอบยอดเงิน/สลิป',
    current_step: 1,
    can_edit_address: true,
    description: isCod
      ? 'ได้รับคำสั่งซื้อแบบเก็บเงินปลายทางแล้ว เจ้าหน้าที่จะเตรียมรอบจัดส่งถึงบ้านท่าน'
      : 'ได้รับคำสั่งซื้อและสลิปแล้ว เจ้าหน้าที่กำลังดำเนินการตรวจสอบยอดเงินเข้าบัญชี'
  };
}

/**
 * POST /api/orders/track
 * Guest order tracking endpoint strictly protected by Order Number + Phone match
 * Compliant with PDPA (Masked customer data, no slips, no internal notes)
 */
publicRouter.post('/orders/track', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DATABASE_UNAVAILABLE', message: 'ฐานข้อมูลไม่พร้อมใช้งาน' }, 500);
  }

  try {
    const body = await c.req.json<{
      orderNumber?: string;
      phone?: string;
    }>();

    const orderNumber = body.orderNumber?.toString().trim();
    const rawPhone = body.phone?.toString().trim().replace(/[\s-]/g, '');

    // Strict validation: Both orderNumber and 10-digit phone must be provided
    if (!orderNumber || !rawPhone || !/^0[0-9]{9}$/.test(rawPhone)) {
      return c.json({
        ok: false,
        error: 'ORDER_NOT_FOUND',
        message: 'ไม่พบข้อมูลคำสั่งซื้อ กรุณาตรวจสอบเลขที่คำสั่งซื้อและเบอร์โทรศัพท์'
      }, 404);
    }

    // Query order with strict match on order_no/id AND phone
    const order = await c.env.DB.prepare(`
      SELECT 
        id, order_no, platform,
        customer_name, recipient_name,
        customer_phone, recipient_phone,
        subdistrict, district, province, zipcode, customer_address,
        payment_method, delivery_option, shipping_provider_name, tracking_id,
        status, packing_status,
        sku_total_amount, shipping_fee_after_discount, discount_amount, total_amount,
        created_at
      FROM orders
      WHERE (LOWER(order_no) = LOWER(?) OR LOWER(id) = LOWER(?) OR LOWER(platform_order_id) = LOWER(?))
        AND (REPLACE(REPLACE(customer_phone, ' ', ''), '-', '') = ? OR REPLACE(REPLACE(recipient_phone, ' ', ''), '-', '') = ?)
      LIMIT 1;
    `).bind(orderNumber, orderNumber, orderNumber, rawPhone, rawPhone).first<any>();

    if (!order) {
      // Return generic 404 without disclosing which parameter was incorrect
      return c.json({
        ok: false,
        error: 'ORDER_NOT_FOUND',
        message: 'ไม่พบข้อมูลคำสั่งซื้อ กรุณาตรวจสอบเลขที่คำสั่งซื้อและเบอร์โทรศัพท์'
      }, 404);
    }

    // Fetch order items
    const itemsResult = await c.env.DB.prepare(`
      SELECT product_name, variation, unit, quantity, price, subtotal
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC;
    `).bind(order.id).all<any>();

    const items = (itemsResult.results || []).map(itm => ({
      product_name: itm.product_name,
      variation: itm.variation || null,
      unit: itm.unit || 'ชิ้น',
      quantity: Number(itm.quantity) || 1,
      price: Number(itm.price) || 0,
      subtotal: Number(itm.subtotal) || 0
    }));

    const rawName = order.recipient_name || order.customer_name || 'คุณลูกค้า';
    const maskedName = maskCustomerName(rawName);
    const maskedPhone = maskPhoneNumber(rawPhone);
    const maskedAddress = formatMaskedAddress(order);
    const statusInfo = mapOrderStatus(order.status, order.packing_status, order.payment_method);

    return c.json({
      ok: true,
      data: {
        order_no: order.order_no,
        created_at: order.created_at,
        payment_method: order.payment_method || 'โอนเงินผ่านบัญชีธนาคาร',
        status: statusInfo,
        tracking: {
          tracking_no: order.tracking_id || null,
          shipping_provider: order.shipping_provider_name || order.delivery_option || 'จัดส่งแบบปกติ'
        },
        recipient: {
          name: maskedName,
          phone: maskedPhone,
          address: maskedAddress
        },
        pricing: {
          subtotal: Number(order.sku_total_amount || 0),
          shipping_fee: Number(order.shipping_fee_after_discount || 0),
          discount_amount: Number(order.discount_amount || 0),
          total_amount: Number(order.total_amount || 0)
        },
        items
      }
    });

  } catch (err: any) {
    return c.json({ ok: false, error: 'SERVER_ERROR', message: err.message || 'เกิดข้อผิดพลาดในการตรวจสอบคำสั่งซื้อ' }, 500);
  }
});

/**
 * GET /api/images/*
 * Serves optimized WebP product images directly from Cloudflare R2
 */
publicRouter.get('/images/:key{.*}', async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return c.text('Image key required', 400);
  }

  // Security Check 1: Prevent Path Traversal & Invalid Path Sequences
  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
    return c.text('Invalid image key path', 400);
  }

  // Security Check 2: Protect against accessing non-image files
  const isImageFile = /^(products|site|slips)\/[a-zA-Z0-9_\-\/]+\.(webp|png|jpe?g|ico)$/i.test(key);
  if (!isImageFile) {
    return c.text('Forbidden: Endpoint only serves verified image formats (.webp, .png, .jpg, .ico)', 403);
  }

  if (!c.env.PRODUCT_IMAGES) {
    return c.text('R2 bucket unavailable', 503);
  }

  const object = await c.env.PRODUCT_IMAGES.get(key);
  if (!object) {
    return c.text('Image not found in R2 storage', 404);
  }

  let contentType = object.httpMetadata?.contentType;
  if (!contentType) {
    if (key.endsWith('.png')) contentType = 'image/png';
    else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (key.endsWith('.ico')) contentType = 'image/x-icon';
    else contentType = 'image/webp';
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('content-type', contentType);

  return new Response(object.body, { headers });
});
