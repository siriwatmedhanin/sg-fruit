/**
 * SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Storefront API Adapter (Step 6 & 7 Secure Edition)
 * จัดการการเชื่อมต่อระหว่างเว็บไซต์หน้าร้านและ Backend Public API
 *
 * สถาปัตยกรรมความปลอดภัยและการทำงาน (Production Hardened):
 * 1. STRICT ENVIRONMENT LOCK:
 *    - บน Production Domain (เช่น https://sg-fruit.siriwatmedhanin.com):
 *      บังคับใช้ STATIC MODE เป็นค่าเริ่มต้นเสมอ
 *      ห้ามเรียก localhost หรือพอร์ตภายในเครื่องเด็ดขาด
 *      เพิกเฉยต่อ ?preview=api, ?api=local หรือ localStorage ทุกกรณี
 *      ไม่แสดง Development Mode Toolbar หรือ Dev Toggle Badge
 * 2. LOCAL DEV PREVIEW:
 *    - อนุญาตเฉพาะเมื่อ hostname เป็น localhost, 127.0.0.1 หรือ __SG_DEV_BUILD__ === true เท่านั้น
 * 3. NO SILENT OUTDATED PRICING (ANTI-STALE ORDERING):
 *    - เมื่อเข้าสู่โหมด Production API แล้วเกิดเหตุ API ขัดข้อง:
 *      ระบบจะเข้าสู่สถานะ Degraded และไม่อนุญาตให้นำราคา Static เก่ามารับคำสั่งซื้อแบบเงียบ ๆ
 *      จะแจ้งเตือนและระงับการกดสั่งซื้อชั่วคราวเพื่อป้องกันราคาคลาดเคลื่อน
 * 4. SECURITY & PRIVACY:
 *    - ตรวจสอบไม่เปิดเผยต้นทุน (cost_price), ซัพพลายเออร์, หรือประวัติสต็อกดิบ
 */
(function (global) {
  'use strict';

  const STORAGE_MODE_KEY = 'sg_storefront_mode';
  const DEFAULT_DEV_API_BASE = 'http://127.0.0.1:8787/api';

  // Fallback SVG placeholder เมื่อสินค้ารายการนั้นยังไม่มีรูปภาพ
  const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCI+IDxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjRmNWVkIi8+IDxlbGxpcHNlIGN4PSIzMDAiIGN5PSI1MTAiIHJ4PSIyMDAiIHJ5PSI1MCIgZmlsbD0iIzJiM2EyOCIgb3BhY2l0eT0iMC4xNSIvPiA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMDAsIDI3MCkiPiA8Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMTQwIiBmaWxsPSIjZTFmMGQ0IiBzdHJva2U9IiM1MzdhMzgiIHN0cm9rZS13aWR0aD0iOCIvPiA8cGF0aCBkPSJNIDAsLTEwMCBDIDQwLC0xMDAgNTAsLTQwIDUwLDAgQyA1MCw2MCAtNTAsNjAgLTUwLDAgQyAtNTAsLTQwIC00MCwtMTAwIDAsLTEwMCBaIiBmaWxsPSIjODFiODU0Ii8+IDxjaXJjbGUgY3g9IjAiIGN5PSIxMCIgcj0iMzAiIGZpbGw9IiM3YzQ3MjIiLz4gPHBhdGggZD0iTSAwLC0xMDUgQyAwLC0xMzAgMjAsLTE0MCAzMCwtMTQ1IiBzdHJva2U9IiM1YzQzMjgiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+IDwvZz4gPHRleHQgeD0iMzAwIiB5PSI0NjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2Yjc4NWMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iNjAwIj5TRyBGUlVJVCA8L3RleHQ+IDwvc3ZnPg==';

  /**
   * ตรวจสอบว่ากำลังทำงานอยู่บน Local Development Environment หรือไม่
   * เพื่อป้องกันไม่ให้ Production เรียก Localhost หรือเปิดช่องทาง Preview โดยพลการ
   */
  function isDevEnvironment() {
    try {
      if (!global.location) return false;
      const hostname = (global.location.hostname || '').toLowerCase();
      // อนุญาตเฉพาะ Loopback / Localhost หรือ Dev Build Flag เท่านั้น
      const isLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.test');

      if (isLocal) return true;
      if (global.__SG_ALLOW_DEV_PREVIEW__ === true) return true;
    } catch (e) {}
    return false;
  }

  function getApiBaseUrl() {
    // บน Production หรือ Staging Domain:
    if (!isDevEnvironment()) {
      const hostname = (global.location ? global.location.hostname : '').toLowerCase();
      if (hostname.includes('staging.siriwatmedhanin.com') || hostname.includes('sg-fruit-storefront-staging.pages.dev')) {
        return 'https://staging-api.siriwatmedhanin.com/api';
      }
      if (global.SG_PRODUCTION_API_BASE && typeof global.SG_PRODUCTION_API_BASE === 'string') {
        const prodUrl = global.SG_PRODUCTION_API_BASE.toLowerCase();
        if (!prodUrl.includes('localhost') && !prodUrl.includes('127.0.0.1')) {
          return global.SG_PRODUCTION_API_BASE;
        }
      }
      return null; // ไม่มี API ภายนอกที่ปลอดภัย ให้ใช้ Static Catalog
    }

    if (global.SG_API_BASE_URL) return global.SG_API_BASE_URL;
    return DEFAULT_DEV_API_BASE;
  }

  function getBackendOrigin() {
    const base = getApiBaseUrl();
    if (!base) return global.location ? global.location.origin : 'http://127.0.0.1:8787';
    try {
      const url = new URL(base, global.location ? global.location.origin : 'http://127.0.0.1:8787');
      return url.origin;
    } catch (e) {
      return 'http://127.0.0.1:8787';
    }
  }

  function determineInitialMode() {
    // บน Production หรือ Staging:
    if (!isDevEnvironment()) {
      const hostname = (global.location ? global.location.hostname : '').toLowerCase();
      if (hostname.includes('staging.siriwatmedhanin.com') || hostname.includes('sg-fruit-storefront-staging.pages.dev')) {
        return 'production_api';
      }
      if (global.SG_PRODUCTION_API_ACTIVE === true && global.SG_PRODUCTION_API_BASE) {
        return 'production_api';
      }
      return 'static'; // ค่าเริ่มต้นสำหรับ Production
    }

    // บน Local Development: อนุญาตให้สลับด้วย Query Param หรือ LocalStorage เพื่อทดสอบระบบ
    try {
      if (global.location && global.location.search) {
        const params = new URLSearchParams(global.location.search);
        if (params.get('preview') === 'api' || params.get('api') === 'local') {
          return 'api';
        }
        if (params.get('mode') === 'static') {
          return 'static';
        }
      }
      const stored = global.localStorage.getItem(STORAGE_MODE_KEY);
      if (stored === 'api' || stored === 'static') {
        return stored;
      }
    } catch (e) {}

    return 'static'; // ค่าเริ่มต้นปลอดภัย
  }

  const adapterState = {
    mode: determineInitialMode(),
    lastFetchError: null,
    cachedCatalog: null,
    backendOnline: null,
    isDegraded: false
  };

  /**
   * ตรวจสอบว่าโหมดปัจจุบันเป็น API หรือไม่
   */
  function isApiMode() {
    return adapterState.mode === 'api' || adapterState.mode === 'production_api';
  }

  /**
   * ปรับเปลี่ยนโหมดการทำงาน (อนุญาตเฉพาะบน Local Dev)
   */
  function setMode(newMode) {
    if (!isDevEnvironment()) {
      console.warn('[SG FRUIT Security] ไม่อนุญาตให้สลับโหมดบน Production');
      return;
    }
    if (newMode !== 'api' && newMode !== 'static') return;
    adapterState.mode = newMode;
    try {
      global.localStorage.setItem(STORAGE_MODE_KEY, newMode);
    } catch (e) {}

    if (typeof global.dispatchEvent === 'function') {
      global.dispatchEvent(new CustomEvent('sg:mode-changed', { detail: { mode: newMode } }));
    }
  }

  function toggleMode() {
    if (!isDevEnvironment()) return;
    setMode(adapterState.mode === 'api' ? 'static' : 'api');
  }

  /**
   * แปลงข้อมูลสินค้าจาก Backend Public API ให้เข้ากับ Storefront Catalog Schema
   */
  function transformProduct(raw, backendOrigin) {
    if (!raw) return null;

    let variants = [];
    if (Array.isArray(raw.variants) && raw.variants.length > 0) {
      variants = raw.variants.map((v, idx) => ({
        id: v.id || `v-${idx + 1}`,
        unit: String(v.unit || 'กิโลกรัม'),
        price: Number(v.price) || 0,
        in_stock: v.in_stock !== false
      }));
    } else {
      variants = [
        {
          id: 'v-1',
          unit: 'กิโลกรัม',
          price: Number(raw.price) || 0,
          in_stock: true
        }
      ];
    }

    const available = variants.some((v) => v.in_stock);
    const primaryVariant = variants[0];
    const displayPrice = primaryVariant ? primaryVariant.price : (Number(raw.price) || 0);
    const displayUnit = primaryVariant ? primaryVariant.unit : 'กิโลกรัม';

    let images = [];
    if (Array.isArray(raw.images) && raw.images.length > 0) {
      images = raw.images.slice(0, 5).map((img, idx) => {
        const fullUrl = img.url ? (img.url.startsWith('http') || img.url.startsWith('data:') ? img.url : `${backendOrigin}${img.url}`) : PLACEHOLDER_SVG;
        const thumbUrl = img.thumbnail_url ? (img.thumbnail_url.startsWith('http') || img.thumbnail_url.startsWith('data:') ? img.thumbnail_url : `${backendOrigin}${img.thumbnail_url}`) : fullUrl;
        return {
          id: img.id || `img-${idx + 1}`,
          url: fullUrl,
          thumbnail_url: thumbUrl,
          sort_order: typeof img.sort_order === 'number' ? img.sort_order : idx,
          is_primary: Boolean(img.is_primary)
        };
      });
    }

    if (images.length === 0 && raw.primary_image && raw.primary_image.url) {
      const fullUrl = raw.primary_image.url.startsWith('http') || raw.primary_image.url.startsWith('data:') ? raw.primary_image.url : `${backendOrigin}${raw.primary_image.url}`;
      const thumbUrl = raw.primary_image.thumbnail_url ? (raw.primary_image.thumbnail_url.startsWith('http') || raw.primary_image.thumbnail_url.startsWith('data:') ? raw.primary_image.thumbnail_url : `${backendOrigin}${raw.primary_image.thumbnail_url}`) : fullUrl;
      images.push({
        id: 'img-pri',
        url: fullUrl,
        thumbnail_url: thumbUrl,
        sort_order: 0,
        is_primary: true
      });
    }

    const mainImageUrl = images.length > 0 ? (images.find((i) => i.is_primary)?.url || images[0].url) : PLACEHOLDER_SVG;

    const categoryName = raw.category_name || (raw.category_id === 'cat-thai' ? 'ผลไม้ไทย' : raw.category_id === 'cat-imported' ? 'ผลไม้นำเข้า' : raw.category_id === 'cat-veg' ? 'ผักสด' : 'ผลไม้ตามฤดูกาล');
    const tags = [categoryName];
    if (raw.tags && Array.isArray(raw.tags)) {
      raw.tags.forEach((t) => { if (!tags.includes(t)) tags.push(t); });
    }

    return {
      id: String(raw.id),
      sku: String(raw.sku || raw.id).toUpperCase(),
      name: String(raw.name),
      name_en: raw.name_en ? String(raw.name_en) : null,
      category: categoryName,
      tags: tags,
      image: mainImageUrl,
      images: images,
      price: displayPrice,
      unit: displayUnit,
      description: raw.description ? String(raw.description) : '',
      stock: available ? 99 : 0, // Security: ซ่อนจำนวนสต็อกดิบ
      available: available,
      statusLabel: available ? 'พร้อมจำหน่าย' : 'หมดชั่วคราว',
      isFeatured: Boolean(raw.is_featured || raw.isFeatured),
      isSample: false,
      variants: variants
    };
  }

  /**
   * โหลดแคตตาล็อกสินค้า
   */
  async function fetchCatalog() {
    const staticCatalog = global.SG_FRUIT_CATALOG || { categories: [], products: [] };

    // 1. หากอยู่ใน Static Mode: ใช้ static catalog ทันที (ไม่ยิงคำขอเครือข่าย)
    if (!isApiMode()) {
      adapterState.cachedCatalog = staticCatalog;
      adapterState.backendOnline = null;
      adapterState.isDegraded = false;
      return {
        ...staticCatalog,
        mode: 'static',
        isOfflineFallback: false,
        canOrder: true
      };
    }

    // 2. หากอยู่ใน API Mode (หรือ Production API Mode):
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      // ไม่มี Endpoint ที่ปลอดภัย บังคับใช้ Static Mode
      return {
        ...staticCatalog,
        mode: 'static',
        isOfflineFallback: false,
        canOrder: true
      };
    }

    const backendOrigin = getBackendOrigin();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const [resCategories, resProducts] = await Promise.all([
        fetch(`${apiBase}/categories`, { signal: controller.signal }),
        fetch(`${apiBase}/products`, { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      if (!resCategories.ok || !resProducts.ok) {
        throw new Error(`API HTTP Error: categories=${resCategories.status}, products=${resProducts.status}`);
      }

      const catJson = await resCategories.json();
      const prodJson = await resProducts.json();

      if (!catJson.ok || !prodJson.ok) {
        throw new Error('API Response ok flag is false');
      }

      const rawProducts = Array.isArray(prodJson.data) ? prodJson.data : [];
      const rawCategories = Array.isArray(catJson.data) ? catJson.data : [];

      const categories = [{ id: 'all', label: 'สินค้าทั้งหมด' }];
      rawCategories.forEach((c) => {
        categories.push({
          id: c.name || c.id,
          label: c.name || c.id
        });
      });

      const products = rawProducts
        .map((p) => transformProduct(p, backendOrigin))
        .filter(Boolean);

      adapterState.backendOnline = true;
      adapterState.lastFetchError = null;
      adapterState.isDegraded = false;

      const resultCatalog = {
        isSampleCatalog: false,
        disclaimer: 'ข้อมูลสินค้าและราคาเชื่อมต่อจากระบบบริหารจัดการ SG FRUIT ADMIN (Cloudflare D1/R2)',
        categories: categories.length > 1 ? categories : staticCatalog.categories,
        products: products,
        mode: adapterState.mode,
        isOfflineFallback: false,
        canOrder: true,
        timestamp: new Date().toISOString()
      };

      adapterState.cachedCatalog = resultCatalog;
      return resultCatalog;
    } catch (err) {
      console.warn('[SG FRUIT API Adapter] เกิดข้อผิดพลาดในการเชื่อมต่อ Public API:', err.message);
      adapterState.backendOnline = false;
      adapterState.lastFetchError = err.message;

      // ANTI-STALE ORDERING AUDIT:
      // หากเกิดเหตุใน Production API Mode: ห้ามใช้ราคาเก่าใน Static Catalog มารับออเดอร์เงียบ ๆ เด็ดขาด
      if (adapterState.mode === 'production_api') {
        adapterState.isDegraded = true;
        const degradedCatalog = {
          ...staticCatalog,
          mode: 'production_api',
          isOfflineFallback: true,
          isDegraded: true,
          canOrder: false, // ปิดการสั่งซื้อป้องกันราคาคลาดเคลื่อน
          disclaimer: '⚠️ ระบบราคากลางขัดข้องชั่วคราว เพื่อความปลอดภัยร้านค้าระงับการสั่งซื้ออัตโนมัติ กรุณาสั่งซื้อหรือสอบถามราคาล่าสุดกับทางร้านโดยตรง',
          errorMessage: err.message
        };
        adapterState.cachedCatalog = degradedCatalog;

        if (typeof global.dispatchEvent === 'function') {
          global.dispatchEvent(new CustomEvent('sg:api-degraded', { detail: { error: err.message } }));
        }
        return degradedCatalog;
      }

      // บน Local Dev Fallback: สลับกลับมา Static ได้เพื่อทดสอบความคงทน
      const fallbackResult = {
        ...staticCatalog,
        mode: 'static',
        isOfflineFallback: true,
        canOrder: true,
        errorMessage: err.message
      };

      adapterState.cachedCatalog = fallbackResult;

      if (typeof global.dispatchEvent === 'function') {
        global.dispatchEvent(
          new CustomEvent('sg:api-fallback', {
            detail: { error: err.message, fallbackCatalog: fallbackResult }
          })
        );
      }

      return fallbackResult;
    }
  }

  /**
   * ดึงรายละเอียดสินค้าเดี่ยว (พร้อม Gallery 5 รูป และ Variants ครบถ้วน)
   */
  async function fetchProductDetail(productId) {
    if (!productId) return null;

    if (!isApiMode() || (adapterState.cachedCatalog && adapterState.cachedCatalog.isOfflineFallback)) {
      const cat = adapterState.cachedCatalog || global.SG_FRUIT_CATALOG || { products: [] };
      return cat.products.find((p) => p.id === productId || p.sku === productId) || null;
    }

    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      const cat = adapterState.cachedCatalog || global.SG_FRUIT_CATALOG || { products: [] };
      return cat.products.find((p) => p.id === productId || p.sku === productId) || null;
    }

    const backendOrigin = getBackendOrigin();

    try {
      const res = await fetch(`${apiBase}/products/${encodeURIComponent(productId)}`);
      if (!res.ok) {
        throw new Error(`Product detail HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.ok || !json.data) {
        throw new Error('Product not found in API response');
      }

      return transformProduct(json.data, backendOrigin);
    } catch (err) {
      const cat = adapterState.cachedCatalog || global.SG_FRUIT_CATALOG || { products: [] };
      return cat.products.find((p) => p.id === productId || p.sku === productId) || null;
    }
  }

  // ส่งออก SG_API_ADAPTER ไปยัง Global Scope
  global.SG_API_ADAPTER = {
    isApiMode,
    isDevEnvironment,
    getMode: () => adapterState.mode,
    setMode,
    toggleMode,
    fetchCatalog,
    fetchProductDetail,
    getStatus: () => ({
      mode: adapterState.mode,
      backendOnline: adapterState.backendOnline,
      lastFetchError: adapterState.lastFetchError,
      isDegraded: adapterState.isDegraded,
      hasCache: Boolean(adapterState.cachedCatalog),
      isDev: isDevEnvironment()
    }),
    PLACEHOLDER_SVG
  };
})(window);
