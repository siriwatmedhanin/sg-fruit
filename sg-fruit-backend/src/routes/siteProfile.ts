import { Hono } from 'hono';
import type { Env, AuthContext, SiteProfile, PublicSiteProfile } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { queueStorageCleanup } from '../services/storageCleanup';

export const siteProfileAdminRouter = new Hono<{ Bindings: Env; Variables: { user: AuthContext } }>();

// Default fallback data for public site profile (Soft Premium tone & verified LINE OA)
export const defaultSiteProfileData: PublicSiteProfile = {
  site_name: 'SG FRUIT',
  site_name_th: 'เอสจี ผลไม้ตามฤดูกาล',
  tagline: 'A Brand by Siriwatmedhanin Group',
  description: 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
  logo_url: '',
  favicon_url: '',
  line_oa_id: '@934wscfl',
  line_oa_url: 'https://line.me/R/ti/p/@934wscfl',
  phone: '08x-xxx-xxxx',
  email: 'contact@siriwatmedhanin.com',
  address: 'เชียงใหม่ ประเทศไทย',
  business_hours: 'เปิดบริการทุกวัน 08:00 - 18:00 น.',
  social: {
    facebook: 'https://facebook.com/sgfruit.th',
    tiktok: '',
    instagram: 'https://instagram.com/sgfruit.th',
    shopee: '',
    lazada: '',
  },
  announcement: {
    enabled: false,
    text: 'ต้อนรับฤดูกาลผลไม้สดใหม่ ส่งตรงถึงบ้านคุณ สอบถามผลไม้เข้าใหม่ทาง LINE: @sgfruit',
    link: 'https://line.me/R/ti/p/@sgfruit',
  },
  footer: {
    about: 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
    copyright: '© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by Siriwatmedhanin Group)',
  },
  seo: {
    title: 'SG FRUIT | เอสจี ผลไม้ตามฤดูกาล — Shop the Season',
    description: 'SG FRUIT – เอสจี ผลไม้ตามฤดูกาล | เลือกช้อปผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด คัดสรรความสดเพื่อทุกวันของคุณ (A Brand by Siriwatmedhanin Group)',
    og_image: '',
  },
  extra_info: {
    delivery_policy: 'จัดส่งผ่านรถควบคุมอุณหภูมิและขนส่งด่วนมาตรฐาน',
    freshness_guarantee: 'รับประกันความสดใหม่ หากเสียหายระหว่างจัดส่งเคลมได้ 100%',
  },
  updated_at: new Date().toISOString(),
};

/**
 * URL Validator:
 * Allows empty strings or valid HTTP/HTTPS URLs and internal /api/images/... paths.
 * Rejects javascript:, data:, vbscript:, and inline scripts to prevent XSS.
 */
export function isValidUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '') return true;
  const trimmed = urlStr.trim();
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

/**
 * Magic Bytes Validators
 */
export function isPng(buf: Uint8Array): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

export function isWebp(buf: Uint8Array): boolean {
  return (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  );
}

export function isJpeg(buf: Uint8Array): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

export function isIco(buf: Uint8Array): boolean {
  return buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00;
}

/**
 * Maps raw database row into clean PublicSiteProfile
 */
export function mapToPublicSiteProfile(row: any): PublicSiteProfile {
  let extra = {};
  try {
    if (row.extra_info_json) {
      extra = typeof row.extra_info_json === 'string' ? JSON.parse(row.extra_info_json) : row.extra_info_json;
    }
  } catch {
    extra = {};
  }

  return {
    site_name: row.site_name || 'SG FRUIT',
    site_name_th: row.site_name_th || 'เอสจี ผลไม้ตามฤดูกาล',
    tagline: row.tagline || '',
    description: row.description || '',
    logo_url: row.logo_url || '',
    favicon_url: row.favicon_url || '',
    line_oa_id: row.line_oa_id || '@sgfruit',
    line_oa_url: row.line_oa_url || 'https://line.me/R/ti/p/@sgfruit',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    business_hours: row.business_hours || '',
    social: {
      facebook: row.facebook_url || '',
      tiktok: row.tiktok_url || '',
      instagram: row.instagram_url || '',
      shopee: row.shopee_url || '',
      lazada: row.lazada_url || '',
    },
    announcement: {
      enabled: Boolean(row.announcement_enabled),
      text: row.announcement_text || '',
      link: row.announcement_link || '',
    },
    footer: {
      about: row.footer_about || '',
      copyright: row.footer_copyright || '',
    },
    seo: {
      title: row.seo_title || '',
      description: row.seo_description || '',
      og_image: row.og_image_url || '',
    },
    extra_info: extra,
    updated_at: row.updated_at || '',
  };
}

// =========================================================================
// ADMIN ROUTES (Single Admin & Default Deny)
// =========================================================================

/**
 * GET /api/admin/site-profile
 * Fetch full site profile configuration for Admin
 */
siteProfileAdminRouter.get('/', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE', message: 'D1 Database binding missing' }, 500);
  }

  try {
    let row = await c.env.DB.prepare('SELECT * FROM site_profile WHERE id = ?').bind('default').first<SiteProfile>();

    if (!row) {
      // Lazy insert default singleton if missing
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO site_profile (id, site_name, site_name_th, tagline, line_oa_id, line_oa_url)
        VALUES ('default', 'SG FRUIT', 'เอสจี ผลไม้ตามฤดูกาล', 'A Brand by Siriwatmedhanin Group', '@sgfruit', 'https://line.me/R/ti/p/@sgfruit')
      `).run();
      row = await c.env.DB.prepare('SELECT * FROM site_profile WHERE id = ?').bind('default').first<SiteProfile>();
    }

    return c.json({
      ok: true,
      data: row,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'QUERY_FAILED', message: err.message }, 500);
  }
});

/**
 * PUT /api/admin/site-profile
 * Update site profile settings
 */
siteProfileAdminRouter.put('/', requireAuth(['admin']), async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'DB_UNAVAILABLE', message: 'D1 Database binding missing' }, 500);
  }

  try {
    const body = await c.req.json();
    const adminUser = c.get('user');
    const updatedBy = adminUser?.email || 'admin';

    // 1. URL Scheme Validation (Reject javascript:, data:, vbscript:, etc.)
    const urlFields: Array<keyof typeof body> = [
      'logo_url',
      'favicon_url',
      'line_oa_url',
      'facebook_url',
      'tiktok_url',
      'instagram_url',
      'shopee_url',
      'lazada_url',
      'announcement_link',
      'og_image_url',
    ];

    for (const field of urlFields) {
      if (body[field] !== undefined && !isValidUrl(body[field])) {
        return c.json(
          {
            ok: false,
            error: 'INVALID_URL',
            message: `URL ในช่อง ${String(field)} ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https:// หรือ http:// หรือเป็น Relative URL ที่ปลอดภัย)`,
          },
          400
        );
      }
    }

    // 2. Email Validation (if provided)
    if (body.email && typeof body.email === 'string' && body.email.trim() !== '') {
      const emailTrimmed = body.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return c.json({ ok: false, error: 'INVALID_EMAIL', message: 'รูปแบบอีเมลไม่ถูกต้อง' }, 400);
      }
    }

    // 3. Brand Positioning Rule Enforcement
    const forbiddenPhrases = ['เราปลูกเองทั้งหมด', 'สวนผลไม้ของเราเอง 100%', 'ไร่ผลไม้ส่วนตัว'];
    const textsToCheck = [body.tagline || '', body.description || '', body.footer_about || ''];
    for (const text of textsToCheck) {
      for (const phrase of forbiddenPhrases) {
        if (text.includes(phrase)) {
          return c.json(
            {
              ok: false,
              error: 'BRAND_POSITIONING_VIOLATION',
              message: `ข้อความต้องรักษาโทน Soft Premium (คัดสรรผลไม้ตามฤดูกาล) ห้ามใช้ข้อความที่อ้างว่า '${phrase}'`,
            },
            400
          );
        }
      }
    }

    // 4. Validate extra_info_json format
    let extraInfoStr = '{"delivery_policy":"จัดส่งผ่านรถควบคุมอุณหภูมิและขนส่งด่วนมาตรฐาน","freshness_guarantee":"รับประกันความสดใหม่ หากเสียหายระหว่างจัดส่งเคลมได้ 100%"}';
    if (body.extra_info_json !== undefined) {
      if (typeof body.extra_info_json === 'object') {
        extraInfoStr = JSON.stringify(body.extra_info_json);
      } else if (typeof body.extra_info_json === 'string') {
        try {
          JSON.parse(body.extra_info_json);
          extraInfoStr = body.extra_info_json;
        } catch {
          return c.json({ ok: false, error: 'INVALID_JSON', message: 'extra_info_json ต้องเป็น JSON ที่ถูกต้อง' }, 400);
        }
      }
    }

    // 5. Update DB record
    const siteName = body.site_name !== undefined ? String(body.site_name).trim() : 'SG FRUIT';
    const siteNameTh = body.site_name_th !== undefined ? String(body.site_name_th).trim() : 'เอสจี ผลไม้ตามฤดูกาล';
    const tagline = body.tagline !== undefined ? String(body.tagline).trim() : 'A Brand by Siriwatmedhanin Group';
    const description = body.description !== undefined ? String(body.description).trim() : '';
    const logoUrl = body.logo_url !== undefined ? String(body.logo_url).trim() : '';
    const faviconUrl = body.favicon_url !== undefined ? String(body.favicon_url).trim() : '';
    const lineOaId = body.line_oa_id !== undefined ? String(body.line_oa_id).trim() : '@sgfruit';
    const lineOaUrl = body.line_oa_url !== undefined ? String(body.line_oa_url).trim() : 'https://line.me/R/ti/p/@sgfruit';
    const phone = body.phone !== undefined ? String(body.phone).trim() : '';
    const email = body.email !== undefined ? String(body.email).trim() : '';
    const address = body.address !== undefined ? String(body.address).trim() : '';
    const businessHours = body.business_hours !== undefined ? String(body.business_hours).trim() : '';
    const facebookUrl = body.facebook_url !== undefined ? String(body.facebook_url).trim() : '';
    const tiktokUrl = body.tiktok_url !== undefined ? String(body.tiktok_url).trim() : '';
    const instagramUrl = body.instagram_url !== undefined ? String(body.instagram_url).trim() : '';
    const shopeeUrl = body.shopee_url !== undefined ? String(body.shopee_url).trim() : '';
    const lazadaUrl = body.lazada_url !== undefined ? String(body.lazada_url).trim() : '';
    const announcementEnabled = body.announcement_enabled ? 1 : 0;
    const announcementText = body.announcement_text !== undefined ? String(body.announcement_text).trim() : '';
    const announcementLink = body.announcement_link !== undefined ? String(body.announcement_link).trim() : '';
    const footerAbout = body.footer_about !== undefined ? String(body.footer_about).trim() : '';
    const footerCopyright = body.footer_copyright !== undefined ? String(body.footer_copyright).trim() : '';
    const seoTitle = body.seo_title !== undefined ? String(body.seo_title).trim() : '';
    const seoDescription = body.seo_description !== undefined ? String(body.seo_description).trim() : '';
    const ogImageUrl = body.og_image_url !== undefined ? String(body.og_image_url).trim() : '';

    await c.env.DB.prepare(`
      UPDATE site_profile
      SET site_name = ?, site_name_th = ?, tagline = ?, description = ?, logo_url = ?, favicon_url = ?,
          line_oa_id = ?, line_oa_url = ?, phone = ?, email = ?, address = ?, business_hours = ?,
          facebook_url = ?, tiktok_url = ?, instagram_url = ?, shopee_url = ?, lazada_url = ?,
          announcement_enabled = ?, announcement_text = ?, announcement_link = ?,
          footer_about = ?, footer_copyright = ?, seo_title = ?, seo_description = ?, og_image_url = ?,
          extra_info_json = ?, updated_at = datetime('now'), updated_by = ?
      WHERE id = 'default'
    `).bind(
      siteName, siteNameTh, tagline, description, logoUrl, faviconUrl,
      lineOaId, lineOaUrl, phone, email, address, businessHours,
      facebookUrl, tiktokUrl, instagramUrl, shopeeUrl, lazadaUrl,
      announcementEnabled, announcementText, announcementLink,
      footerAbout, footerCopyright, seoTitle, seoDescription, ogImageUrl,
      extraInfoStr, updatedBy
    ).run();

    const updatedRow = await c.env.DB.prepare('SELECT * FROM site_profile WHERE id = ?').bind('default').first<SiteProfile>();

    return c.json({
      ok: true,
      message: 'บันทึกข้อมูลร้านค้าเรียบร้อยแล้ว',
      data: updatedRow,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'UPDATE_FAILED', message: err.message }, 500);
  }
});

/**
 * POST /api/admin/site-profile/assets/:assetType
 * Upload brand asset (logo | favicon | og-image) with magic byte validation & R2 storage
 */
siteProfileAdminRouter.post('/assets/:assetType', requireAuth(['admin']), async (c) => {
  const rawAssetType = c.req.param('assetType') || '';
  if (rawAssetType !== 'logo' && rawAssetType !== 'favicon' && rawAssetType !== 'og-image') {
    return c.json(
      {
        ok: false,
        error: 'INVALID_ASSET_TYPE',
        message: `ประเภทไฟล์ ${rawAssetType} ไม่ถูกต้อง (รองรับเฉพาะ logo, favicon, og-image)`,
      },
      400
    );
  }
  const assetType: 'logo' | 'favicon' | 'og-image' = rawAssetType;

  if (!c.env.DB || !c.env.PRODUCT_IMAGES) {
    return c.json({ ok: false, error: 'SERVICES_UNAVAILABLE', message: 'D1 or R2 service not bound' }, 500);
  }

  try {
    const formData = await c.req.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ ok: false, error: 'VALIDATION_FAILED', message: 'กรุณาแนบไฟล์รูปภาพ (field name: "file")' }, 400);
    }

    const file = fileEntry as unknown as File;
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Size limit check
    const maxSizes: Record<'logo' | 'favicon' | 'og-image', number> = {
      logo: 2 * 1024 * 1024,      // 2MB
      favicon: 1 * 1024 * 1024,   // 1MB
      'og-image': 5 * 1024 * 1024 // 5MB
    };
    if (file.size > maxSizes[assetType]) {
      return c.json(
        {
          ok: false,
          error: 'FILE_TOO_LARGE',
          message: `ขนาดไฟล์เกินขีดจำกัดสำหรับ ${assetType} (สูงสุด ${maxSizes[assetType] / (1024 * 1024)}MB)`,
        },
        400
      );
    }

    // Magic Bytes & Extension Determination
    let detectedExt = '';
    let detectedMime = '';

    if (assetType === 'logo') {
      if (isWebp(uint8)) {
        detectedExt = 'webp';
        detectedMime = 'image/webp';
      } else if (isPng(uint8)) {
        detectedExt = 'png';
        detectedMime = 'image/png';
      } else {
        return c.json(
          {
            ok: false,
            error: 'INVALID_FILE_TYPE',
            message: 'ไฟล์โลโก้ต้องเป็นไฟล์ WebP หรือ PNG ที่ถูกต้องเท่านั้น (Magic bytes verification failed)',
          },
          400
        );
      }
    } else if (assetType === 'favicon') {
      if (isIco(uint8)) {
        detectedExt = 'ico';
        detectedMime = 'image/x-icon';
      } else if (isPng(uint8)) {
        detectedExt = 'png';
        detectedMime = 'image/png';
      } else if (isWebp(uint8)) {
        detectedExt = 'webp';
        detectedMime = 'image/webp';
      } else {
        return c.json(
          {
            ok: false,
            error: 'INVALID_FILE_TYPE',
            message: 'ไฟล์ Favicon ต้องเป็นไฟล์ .ico, PNG หรือ WebP ที่ถูกต้องเท่านั้น',
          },
          400
        );
      }
    } else if (assetType === 'og-image') {
      if (isJpeg(uint8)) {
        detectedExt = 'jpg';
        detectedMime = 'image/jpeg';
      } else if (isPng(uint8)) {
        detectedExt = 'png';
        detectedMime = 'image/png';
      } else if (isWebp(uint8)) {
        detectedExt = 'webp';
        detectedMime = 'image/webp';
      } else {
        return c.json(
          {
            ok: false,
            error: 'INVALID_FILE_TYPE',
            message: 'ไฟล์ภาพ Social Share (OG Image) ต้องเป็น JPG, PNG หรือ WebP ที่ถูกต้องเท่านั้น',
          },
          400
        );
      }
    }

    // Generate unique R2 key
    const timestamp = Date.now();
    const r2Key = `site/${assetType}_${timestamp}.${detectedExt}`;

    // Upload to R2 Object Storage
    await c.env.PRODUCT_IMAGES.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: detectedMime },
      customMetadata: {
        assetType,
        uploadedAt: new Date().toISOString(),
      },
    });

    const publicUrl = `/api/images/${r2Key}`;

    // Check old asset for cleanup queue
    const currentProfile = await c.env.DB.prepare('SELECT logo_url, favicon_url, og_image_url FROM site_profile WHERE id = ?')
      .bind('default')
      .first<{ logo_url: string; favicon_url: string; og_image_url: string }>();

    let oldUrl = '';
    let columnToUpdate = '';
    if (assetType === 'logo') {
      oldUrl = currentProfile?.logo_url || '';
      columnToUpdate = 'logo_url';
    } else if (assetType === 'favicon') {
      oldUrl = currentProfile?.favicon_url || '';
      columnToUpdate = 'favicon_url';
    } else if (assetType === 'og-image') {
      oldUrl = currentProfile?.og_image_url || '';
      columnToUpdate = 'og_image_url';
    }

    if (oldUrl && oldUrl.startsWith('/api/images/site/')) {
      const oldStorageKey = oldUrl.replace('/api/images/', '');
      await queueStorageCleanup(c.env.DB, oldStorageKey, `Replaced site asset: ${assetType}`);
    }

    // Update site_profile column in D1
    const adminUser = c.get('user');
    const updatedBy = adminUser?.email || 'admin';
    await c.env.DB.prepare(`
      UPDATE site_profile
      SET ${columnToUpdate} = ?, updated_at = datetime('now'), updated_by = ?
      WHERE id = 'default'
    `).bind(publicUrl, updatedBy).run();

    return c.json({
      ok: true,
      message: `อัปโหลด ${assetType} สำเร็จ`,
      data: {
        asset_type: assetType,
        storage_key: r2Key,
        url: publicUrl,
        mime_type: detectedMime,
        size_bytes: file.size,
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'UPLOAD_FAILED', message: err.message }, 500);
  }
});
