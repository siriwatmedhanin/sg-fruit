/**
 * SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Storefront API Adapter (Step 6)
 * จัดการการเชื่อมต่อระหว่างเว็บไซต์หน้าร้านและ Backend Public API
 *
 * สถาปัตยกรรมความปลอดภัยและการทำงาน:
 * 1. STATIC MODE (Default): ค่าเริ่มต้นสำหรับ Production บน Cloudflare Pages
 *    ใช้ข้อมูลจาก window.SG_FRUIT_CATALOG โดยไม่ส่ง Request ไปยัง Backend
 * 2. API PREVIEW MODE: เปิดใช้งานเมื่อมี ?preview=api หรือ localStorage.getItem('sg_storefront_mode') === 'api'
 *    เชื่อมต่อไปยัง Backend Public API (http://127.0.0.1:8787/api)
 * 3. GRACEFUL FALLBACK: หาก API ออฟไลน์ หรือเกิดข้อผิดพลาด จะสลับกลับไปใช้ Static Mode ทันที
 *    โดยไม่ทำให้หน้าร้านพัง และแสดงการแจ้งเตือนอย่างสุภาพ
 * 4. SECURITY AUDIT: ไม่เปิดเผย cost_price, raw stock count, ข้อมูลซัพพลายเออร์ หรือข้อมูลภายในร้าน
 */
(function (global) {
  'use strict';

  const STORAGE_MODE_KEY = 'sg_storefront_mode';
  const DEFAULT_API_BASE = 'http://127.0.0.1:8787/api';

  // Fallback SVG placeholder เมื่อสินค้ารายการนั้นยังไม่มีรูปภาพ
  const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCI+IDxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjRmNWVkIi8+IDxlbGxpcHNlIGN4PSIzMDAiIGN5PSI1MTAiIHJ4PSIyMDAiIHJ5PSI1MCIgZmlsbD0iIzJiM2EyOCIgb3BhY2l0eT0iMC4xNSIvPiA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMDAsIDI3MCkiPiA8Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMTQwIiBmaWxsPSIjZTFmMGQ0IiBzdHJva2U9IiM1MzdhMzgiIHN0cm9rZS13aWR0aD0iOCIvPiA8cGF0aCBkPSJNIDAsLTEwMCBDIDQwLC0xMDAgNTAsLTQwIDUwLDAgQyA1MCw2MCAtNTAsNjAgLTUwLDAgQyAtNTAsLTQwIC00MCwtMTAwIDAsLTEwMCBaIiBmaWxsPSIjODFiODU0Ii8+IDxjaXJjbGUgY3g9IjAiIGN5PSIxMCIgcj0iMzAiIGZpbGw9IiM3YzQ3MjIiLz4gPHBhdGggZD0iTSAwLC0xMDUgQyAwLC0xMzAgMjAsLTE0MCAzMCwtMTQ1IiBzdHJva2U9IiM1YzQzMjgiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+IDwvZz4gPHRleHQgeD0iMzAwIiB5PSI0NjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2Yjc4NWMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iNjAwIj5TRyBGUlVJVCA8L3RleHQ+IDwvc3ZnPg==';

  function getApiBaseUrl() {
    if (global.SG_API_BASE_URL) return global.SG_API_BASE_URL;
    return DEFAULT_API_BASE;
  }

  function getBackendOrigin() {
    const url = new URL(getApiBaseUrl(), global.location ? global.location.origin : 'http://127.0.0.1:8787');
    return url.origin;
  }

  function determineInitialMode() {
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
    } catch (e) {
      // In private browsing or sandboxed environments
    }
    return 'static'; // Default to static mode
  }

  const adapterState = {
    mode: determineInitialMode(),
    lastFetchError: null,
    cachedCatalog: null,
    backendOnline: null
  };

  /**
   * ตรวจสอบว่าโหมดปัจจุบันเป็น API หรือไม่
   */
  function isApiMode() {
    return adapterState.mode === 'api';
  }

  /**
   * ปรับเปลี่ยนโหมดการทำงาน
   */
  function setMode(newMode) {
    if (newMode !== 'api' && newMode !== 'static') return;
    adapterState.mode = newMode;
    try {
      global.localStorage.setItem(STORAGE_MODE_KEY, newMode);
    } catch (e) {}

    // Dispatch event ให้ shop-cart.js ทำการ Refresh หน้าร้าน
    if (typeof global.dispatchEvent === 'function') {
      global.dispatchEvent(new CustomEvent('sg:mode-changed', { detail: { mode: newMode } }));
    }
  }

  function toggleMode() {
    setMode(adapterState.mode === 'api' ? 'static' : 'api');
  }

  /**
   * แปลงข้อมูลสินค้าจาก Backend Public API ให้เข้ากับ Storefront Catalog Schema
   */
  function transformProduct(raw, backendOrigin) {
    if (!raw) return null;

    // ตรวจสอบและสร้าง Variants
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

    // มีอย่างน้อย 1 variant ในสต็อกถือว่า available
    const available = variants.some((v) => v.in_stock);
    const primaryVariant = variants[0];
    const displayPrice = primaryVariant ? primaryVariant.price : (Number(raw.price) || 0);
    const displayUnit = primaryVariant ? primaryVariant.unit : 'กิโลกรัม';

    // แปลงรูปภาพ (รองรับทั้ง primary_image และ images สูงสุด 5 รูป)
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

    // หากไม่มี images array แต่มี primary_image
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

    // Primary image url
    const mainImageUrl = images.length > 0 ? (images.find((i) => i.is_primary)?.url || images[0].url) : PLACEHOLDER_SVG;

    // หมวดหมู่และแท็ก
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
      stock: available ? 99 : 0, // ป้องกันการรั่วไหลของ Raw Stock Ledger
      available: available,
      statusLabel: available ? 'พร้อมจำหน่าย' : 'หมดชั่วคราว',
      isFeatured: Boolean(raw.is_featured || raw.isFeatured),
      isSample: false,
      variants: variants
    };
  }

  /**
   * โหลดแคตตาล็อกสินค้า (Static หรือ Public API)
   */
  async function fetchCatalog() {
    const staticCatalog = global.SG_FRUIT_CATALOG || { categories: [], products: [] };

    // หากอยู่ใน Static Mode คืนค่า static catalog ทันทีโดยไม่ต้อง Request เครือข่าย
    if (!isApiMode()) {
      adapterState.cachedCatalog = staticCatalog;
      adapterState.backendOnline = null;
      return {
        ...staticCatalog,
        mode: 'static',
        isOfflineFallback: false
      };
    }

    // หากอยู่ใน API Mode: ดึงข้อมูลจาก Backend Public API
    const apiBase = getApiBaseUrl();
    const backendOrigin = getBackendOrigin();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 วินาที timeout

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

      // สร้าง Categories List ให้ตรงตาม UX ของหน้าร้าน
      const categories = [{ id: 'all', label: 'สินค้าทั้งหมด' }];
      rawCategories.forEach((c) => {
        categories.push({
          id: c.name || c.id,
          label: c.name || c.id
        });
      });

      // Map Products
      const products = rawProducts
        .map((p) => transformProduct(p, backendOrigin))
        .filter(Boolean);

      adapterState.backendOnline = true;
      adapterState.lastFetchError = null;

      const resultCatalog = {
        isSampleCatalog: false,
        disclaimer: 'ข้อมูลสินค้าและราคาเชื่อมต่อจากระบบบริหารจัดการ SG FRUIT ADMIN (Cloudflare D1/R2)',
        categories: categories.length > 1 ? categories : staticCatalog.categories,
        products: products,
        mode: 'api',
        isOfflineFallback: false,
        timestamp: new Date().toISOString()
      };

      adapterState.cachedCatalog = resultCatalog;
      return resultCatalog;
    } catch (err) {
      console.warn('[SG FRUIT API Adapter] ไม่สามารถเชื่อมต่อ Public API ได้:', err.message);
      adapterState.backendOnline = false;
      adapterState.lastFetchError = err.message;

      // Graceful Fallback ไปยัง Static Catalog ทันที
      const fallbackResult = {
        ...staticCatalog,
        mode: 'static',
        isOfflineFallback: true,
        errorMessage: err.message
      };

      adapterState.cachedCatalog = fallbackResult;

      // Dispatch event แจ้งหน้าร้านเรื่อง Fallback
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

    // หากอยู่ใน Static Mode คืนค่าจาก static catalog
    if (!isApiMode() || (adapterState.cachedCatalog && adapterState.cachedCatalog.isOfflineFallback)) {
      const cat = adapterState.cachedCatalog || global.SG_FRUIT_CATALOG || { products: [] };
      return cat.products.find((p) => p.id === productId || p.sku === productId) || null;
    }

    const apiBase = getApiBaseUrl();
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
      // Fallback ไปค้นหาใน Cached Catalog
      const cat = adapterState.cachedCatalog || global.SG_FRUIT_CATALOG || { products: [] };
      return cat.products.find((p) => p.id === productId || p.sku === productId) || null;
    }
  }

  // ส่งออก SG_API_ADAPTER ไปยัง Global Scope
  global.SG_API_ADAPTER = {
    isApiMode,
    getMode: () => adapterState.mode,
    setMode,
    toggleMode,
    fetchCatalog,
    fetchProductDetail,
    getStatus: () => ({
      mode: adapterState.mode,
      backendOnline: adapterState.backendOnline,
      lastFetchError: adapterState.lastFetchError,
      hasCache: Boolean(adapterState.cachedCatalog)
    }),
    PLACEHOLDER_SVG
  };
})(window);
