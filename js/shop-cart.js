/**
 * SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Shop UI, Filtering, Search, Modal & Cart System (Step 6 V2)
 * ทำงานแบบ Standalone Frontend รองรับทั้ง Static Mode (ค่าเริ่มต้นหน้าร้านจริง) และ Local API Mode
 * รองรับ Multi-variant, Customer Gallery สูงสุด 5 รูป, ตะกร้าสินค้า และไม่รบกวน GSAP ScrollTrigger
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sg_fruit_cart_v2';

  // แคตตาล็อกเริ่มต้น (จะถูกอัปเดตแบบ Dynamic โดย SG_API_ADAPTER)
  let catalog = global.SG_FRUIT_CATALOG || { categories: [], products: [] };
  let products = catalog.products || [];
  let categories = catalog.categories || [];

  // Shared Lucide SVG Outline Icons (consistent 1.85-2.2 stroke width)
  const ICONS = {
    plus: `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
    minus: `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>`,
    trash: `<svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
    check: `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
    basket: `<svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/><path d="M4.5 15.5h15"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/></svg>`,
    arrowRight: `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>`
  };

  // Shop UI State
  const state = {
    category: 'all',
    searchQuery: '',
    sortBy: 'default', // 'default' | 'price-asc' | 'price-desc'
    availableOnly: false,
    pageSize: 10,      // Default 10 (5 columns × 2 rows = 10 product cards in 5×2 grid)
    currentPage: 1,
    cart: [],
    activeModalProductId: null,
    activeModalProduct: null,
    activeGalleryIndex: 0,
    selectedVariantIndex: 0,
    modalQty: 1,
    savedScrollY: 0,
    isDrawerOpen: false,
    isProductModalOpen: false,
    isOrderModalOpen: false,
    isPolicyModalOpen: false,
    isTrackingModalOpen: false
  };

  // Load persisted cart safely (supports both key and legacy id)
  function loadCart() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          state.cart = parsed
            .filter((item) => item && typeof item.id === 'string' && typeof item.qty === 'number' && item.qty > 0)
            .map((item) => {
              if (!item.key) {
                item.key = `${item.id}__${item.variantId || item.unit || 'default'}`;
              }
              return item;
            });
        }
      }
    } catch (e) {
      state.cart = [];
    }
  }

  function saveCart() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
    } catch (e) {
      // Ignore storage quota/privacy errors
    }
  }

  function getProductById(id) {
    if (!id) return null;
    return products.find((p) => p.id === id || p.sku === id) || null;
  }

  function formatPrice(num) {
    return Number(num || 0).toLocaleString('th-TH');
  }

  // Toast helper with Lucide check icon
  function showToast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = `
      <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: #bbf77b;"><path d="M20 6 9 17l-5-5"/></svg>
      <span>${message}</span>
    `;
    el.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.classList.remove('show');
    }, 3200);
  }
  global.showSgToast = showToast;

  // Body scroll lock that preserves exact scroll position without resetting ScrollTrigger
  function updateBodyScrollLock() {
    const shouldLock = state.isDrawerOpen || state.isProductModalOpen || state.isOrderModalOpen || state.isPolicyModalOpen || state.isTrackingModalOpen;
    const body = document.body;
    const html = document.documentElement;
    if (shouldLock) {
      if (!body.classList.contains('is-modal-open')) {
        state.savedScrollY = global.scrollY || global.pageYOffset || 0;
        const scrollbarWidth = Math.max(0, global.innerWidth - html.clientWidth);
        body.style.paddingRight = scrollbarWidth ? `${scrollbarWidth}px` : '';
        body.classList.add('is-modal-open');
      }
    } else {
      if (body.classList.contains('is-modal-open')) {
        body.classList.remove('is-modal-open');
        body.style.paddingRight = '';
        if (Math.abs((global.scrollY || 0) - state.savedScrollY) > 2) {
          global.scrollTo(0, state.savedScrollY);
        }
      }
    }
  }

  // Filter & Sort logic (รองรับทั้งภาษาไทยและอังกฤษ)
  function getFilteredProducts() {
    const q = state.searchQuery.trim().toLowerCase();
    let list = products.filter((item) => {
      // Category or Tag match
      if (state.category !== 'all') {
        const inCategory = item.category === state.category;
        const inTags = Array.isArray(item.tags) && item.tags.includes(state.category);
        if (!inCategory && !inTags) return false;
      }
      // Available only filter
      const isItemAvailable = item.available && (Array.isArray(item.variants) && item.variants.length > 0 ? item.variants.some((v) => v.in_stock) : true);
      if (state.availableOnly && !isItemAvailable) {
        return false;
      }
      // Search query match (name, name_en, sku, category, tags, description)
      if (q) {
        const hay = `${item.name} ${item.name_en || ''} ${item.sku} ${item.category} ${(item.tags || []).join(' ')} ${item.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (state.sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (state.sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }

  // Render Category Tabs
  function renderCategories() {
    const container = document.getElementById('shop-category-tabs');
    if (!container) return;

    container.innerHTML = categories
      .map((cat) => {
        const isActive = state.category === cat.id;
        return `<button type="button" role="tab" aria-selected="${isActive ? 'true' : 'false'}" class="shop-cat-btn${isActive ? ' is-active' : ''}" data-category="${cat.id}">${cat.label}</button>`;
      })
      .join('');

    container.querySelectorAll('.shop-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetCat = btn.getAttribute('data-category') || 'all';
        if (state.category === targetCat) return;
        state.category = targetCat;
        state.currentPage = 1;
        renderCategories();
        renderProducts();
      });
    });
  }

  // Render Storefront Mode Indicator & Switcher (Only in Local Dev Environment)
  function renderModeBadge() {
    const container = document.getElementById('shop-mode-container');
    if (!container) return;

    // Strict Production Hardening: ซ่อน Dev Toolbar / Mode Badge บน Production ทันที
    if (!global.SG_API_ADAPTER || !global.SG_API_ADAPTER.isDevEnvironment()) {
      container.innerHTML = '';
      return;
    }

    const isApi = global.SG_API_ADAPTER.isApiMode();
    const status = global.SG_API_ADAPTER.getStatus();

    if (isApi) {
      container.innerHTML = `
        <div class="shop-mode-badge is-api" title="กำลังเชื่อมต่อ Backend Public API (พอร์ต 8787)">
          <span class="shop-mode-dot">●</span>
          <span>โหมด API Local (8787)</span>
          <button type="button" class="shop-mode-toggle-btn" id="shop-switch-mode-btn" title="คลิกเพื่อสลับกลับไปยัง Static Mode (ค่าเริ่มต้นหน้าร้านจริง)">สลับเป็น Static</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="shop-mode-badge is-static" title="กำลังใช้ข้อมูล Static Catalog (ปลอดภัยสำหรับ Production)">
          <span class="shop-mode-dot">●</span>
          <span>โหมด Static (Production)</span>
          <button type="button" class="shop-mode-toggle-btn" id="shop-switch-mode-btn" title="คลิกเพื่อทดสอบเชื่อมต่อ Backend API Local (พอร์ต 8787)">ทดสอบ API Local</button>
        </div>
      `;
    }

    const switchBtn = document.getElementById('shop-switch-mode-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        global.SG_API_ADAPTER.toggleMode();
        showToast(isApi ? 'สลับไปยัง Static Mode แล้ว' : 'สลับไปยัง Local API Mode แล้ว');
        reloadCatalog();
      });
    }
  }

  // Render Product Grid (5×2 = 10 items on Desktop), Count, Empty State, and Pagination
  function renderProducts() {
    const gridEl = document.getElementById('shop-product-grid');
    const countEl = document.getElementById('shop-product-count');
    const emptyEl = document.getElementById('shop-empty-state');
    const paginationEl = document.getElementById('shop-pagination');
    if (!gridEl) return;

    const filtered = getFilteredProducts();
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / state.pageSize));
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const startIdx = (state.currentPage - 1) * state.pageSize;
    const pagedItems = filtered.slice(startIdx, startIdx + state.pageSize);

    if (countEl) {
      countEl.innerHTML = `แสดง <strong>${pagedItems.length}</strong> จาก <strong>${totalFiltered}</strong> รายการ`;
    }

    if (totalFiltered === 0) {
      gridEl.innerHTML = '';
      gridEl.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      if (paginationEl) paginationEl.innerHTML = '';
      notifyLayoutChanged();
      return;
    }

    gridEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;

    gridEl.innerHTML = pagedItems
      .map((item) => {
        const hasSeasonalTag = Array.isArray(item.tags) && item.tags.includes('ผลไม้ตามฤดูกาล');
        const isOrderingDisabled = catalog && (catalog.canOrder === false || catalog.isDegraded === true);
        const isAvailable = !isOrderingDisabled && item.available && (Array.isArray(item.variants) && item.variants.length > 0 ? item.variants.some((v) => v.in_stock) : true);
        const statusClass = isOrderingDisabled ? 'is-out-of-stock' : (isAvailable ? (hasSeasonalTag ? 'is-seasonal-wait' : 'is-available') : 'is-out-of-stock');
        const statusText = isOrderingDisabled ? 'ระงับสั่งซื้อชั่วคราว' : (isAvailable ? item.statusLabel : 'หมดชั่วคราว');

        // นับจำนวนสินค้านี้ในตะกร้า (รวมทุก variants)
        const inCartItems = state.cart.filter((c) => c.id === item.id);
        const inCartTotalQty = inCartItems.reduce((acc, c) => acc + c.qty, 0);
        const inCartBadge = inCartTotalQty > 0 ? `<span class="shop-card-incart-pill" aria-label="อยู่ในตะกร้า ${inCartTotalQty} รายการ">ในตะกร้า ${inCartTotalQty}</span>` : '';

        // รูปภาพหลัก (พร้อม Fallback)
        const imgSrc = item.image || (global.SG_API_ADAPTER ? global.SG_API_ADAPTER.PLACEHOLDER_SVG : '');

        return `
          <article class="shop-card${!isAvailable ? ' is-out-of-stock' : ''}" data-sku="${item.sku}" data-product-id="${item.id}" data-category="${item.category}">
            <div class="shop-card-media" data-action="detail" data-id="${item.id}" role="button" tabindex="0" aria-label="ดูรายละเอียด ${item.name}">
              ${hasSeasonalTag ? `
                <div class="shop-card-badges-top">
                  <span class="shop-badge shop-badge-seasonal">ตามฤดูกาล</span>
                </div>
              ` : ''}

              <img
                class="shop-card-img"
                src="${imgSrc}"
                alt="${item.name} - ${item.category}"
                width="400"
                height="400"
                onerror="this.src='${global.SG_API_ADAPTER ? global.SG_API_ADAPTER.PLACEHOLDER_SVG : ''}'"
              />
            </div>
            <div class="shop-card-body">
              <div class="shop-card-meta-row">
                <span class="shop-card-status ${statusClass}">
                  <i aria-hidden="true"></i> ${statusText}
                </span>
              </div>
              <h3 class="shop-card-title">
                <button type="button" class="shop-card-title-btn" data-action="detail" data-id="${item.id}">${item.name}</button>
              </h3>
              <div class="shop-card-unit">หน่วยจำหน่าย: <strong>${item.unit}</strong></div>
              <div class="shop-card-price-row">
                <div class="shop-card-price">
                  <span class="currency">฿</span><span class="amount">${formatPrice(item.price)}</span>
                  <small class="unit-slash">/ ${item.unit}</small>
                </div>
                ${inCartBadge}
              </div>
              <div class="shop-card-actions">
                <button type="button" class="shop-btn-detail" data-action="detail" data-id="${item.id}" aria-label="ดูรายละเอียด ${item.name}">
                  ดูรายละเอียด
                </button>
                <button type="button" class="shop-btn-add${!isAvailable ? ' is-disabled' : ''}" data-action="add-to-cart" data-id="${item.id}" ${!isAvailable ? 'disabled' : ''} aria-label="${isAvailable ? `เพิ่ม ${item.name} ลงตะกร้า` : `${item.name} หมดชั่วคราว`}">
                  ${isAvailable ? ICONS.plus : ''}
                  <span>${isAvailable ? 'ใส่ตะกร้า' : 'หมดชั่วคราว'}</span>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    // Render Pagination / View Mode Controls (5x2 Grid = 10 items)
    if (paginationEl) {
      const pageButtonsHtml = [];
      if (totalPages > 1) {
        for (let p = 1; p <= totalPages; p++) {
          pageButtonsHtml.push(
            `<button type="button" class="shop-page-btn${p === state.currentPage ? ' is-active' : ''}" data-page="${p}" aria-label="หน้า ${p}">${p}</button>`
          );
        }
      }
      const toggleModeLabel = state.pageSize <= 10 ? `แสดงทั้งหมด (${totalFiltered} รายการ)` : 'แสดงแบบ 5×2 (10 รายการ)';
      paginationEl.innerHTML = `
        <div class="shop-pagination-inner">
          <div class="shop-pagination-info">
            แสดงรายการที่ ${startIdx + 1}–${startIdx + pagedItems.length} จาก ${totalFiltered} รายการ
          </div>
          <div class="shop-pagination-controls">
            ${pageButtonsHtml.join('')}
            ${
              totalFiltered > 10
                ? `<button type="button" class="shop-page-mode-btn" id="shop-toggle-pagesize-btn">${toggleModeLabel}</button>`
                : ''
            }
          </div>
        </div>
      `;

      paginationEl.querySelectorAll('.shop-page-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const p = Number(btn.getAttribute('data-page')) || 1;
          if (p === state.currentPage) return;
          state.currentPage = p;
          renderProducts();
        });
      });

      const toggleBtn = document.getElementById('shop-toggle-pagesize-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          state.pageSize = state.pageSize <= 10 ? 999 : 10;
          state.currentPage = 1;
          renderProducts();
        });
      }
    }

    notifyLayoutChanged();
  }

  // Notify ScrollTrigger / Coordinate Controller gently after DOM update without jumping scroll
  function notifyLayoutChanged() {
    if (typeof global.onSgShopLayoutChanged === 'function') {
      global.onSgShopLayoutChanged();
    }
  }

  // Cart Operations (รองรับ Multi-variant Key: productId__variantId)
  function addToCart(productId, qtyToAdd = 1, variantIdOrUnit = null) {
    const product = getProductById(productId);
    if (!product) return;

    // Anti-stale pricing: หากระบบอยู่ในสถานะ Degraded ให้ระงับการสั่งซื้อทันที
    if (catalog && (catalog.canOrder === false || catalog.isDegraded === true)) {
      showToast('⚠️ ระบบระงับการสั่งซื้อชั่วคราวเนื่องจากระบบราคากลางขัดข้อง กรุณาติดต่อทางร้านโดยตรง');
      return;
    }

    const qty = Math.max(1, Number(qtyToAdd) || 1);

    // ค้นหา Variant ที่เลือก
    let chosenVariant = null;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      if (variantIdOrUnit) {
        chosenVariant = product.variants.find((v) => v.id === variantIdOrUnit || v.unit === variantIdOrUnit);
      }
      if (!chosenVariant) {
        chosenVariant = product.variants.find((v) => v.in_stock) || product.variants[0];
      }
    }

    // ตรวจสอบสต็อก
    if (chosenVariant && chosenVariant.in_stock === false) {
      showToast(`ขออภัย · ${product.name} (${chosenVariant.unit}) สินค้าหมดชั่วคราว`);
      return;
    }
    if (!product.available) {
      showToast(`ขออภัย · ${product.name} สินค้าหมดชั่วคราว`);
      return;
    }

    const vUnit = chosenVariant ? chosenVariant.unit : product.unit;
    const vPrice = chosenVariant ? chosenVariant.price : product.price;
    const vId = chosenVariant ? chosenVariant.id : 'v-1';

    // Unique Cart Item Key
    const cartItemKey = `${product.id}__${vId}`;

    const existingIdx = state.cart.findIndex(
      (item) => item.key === cartItemKey || (item.id === product.id && item.unit === vUnit)
    );

    if (existingIdx !== -1) {
      state.cart[existingIdx].qty = Math.min(99, state.cart[existingIdx].qty + qty);
      state.cart[existingIdx].price = vPrice; // อัปเดตราคาล่าสุด
    } else {
      state.cart.push({
        key: cartItemKey,
        id: product.id,
        sku: product.sku,
        name: product.name,
        variantId: vId,
        unit: vUnit,
        price: vPrice,
        image: product.image,
        category: product.category,
        qty: qty
      });
    }

    saveCart();
    renderCartUI();
    renderProducts();
    showToast(`เพิ่มสินค้าลงตะกร้าแล้ว · ${product.name} (${qty} ${vUnit})`);
  }

  function updateCartItemQty(cartKeyOrId, newQty) {
    const idx = state.cart.findIndex(
      (item) => (item.key && item.key === cartKeyOrId) || item.id === cartKeyOrId
    );
    if (idx === -1) return;
    if (newQty <= 0) {
      const removedName = state.cart[idx].name;
      const removedUnit = state.cart[idx].unit;
      state.cart.splice(idx, 1);
      showToast(`ลบ ${removedName} (${removedUnit}) ออกจากตะกร้าแล้ว`);
    } else {
      state.cart[idx].qty = Math.min(99, newQty);
    }
    saveCart();
    renderCartUI();
    renderProducts();
  }

  function removeFromCart(cartKeyOrId) {
    updateCartItemQty(cartKeyOrId, 0);
  }

  function clearCart() {
    state.cart = [];
    saveCart();
    renderCartUI();
    renderProducts();
    showToast('ล้างรายการในตะกร้าสินค้าเรียบร้อยแล้ว');
  }

  function getCartTotals() {
    let totalItems = 0;
    let subtotal = 0;
    state.cart.forEach((item) => {
      totalItems += item.qty;
      subtotal += item.price * item.qty;
    });
    return { totalItems, subtotal };
  }

  // Render Cart Badge, Drawer List, and Subtotal
  function renderCartUI() {
    const { totalItems, subtotal } = getCartTotals();

    // Update all cart count badges in navbar & floating button
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(totalItems);
      el.classList.toggle('has-items', totalItems > 0);
    });

    const itemsContainer = document.getElementById('cart-drawer-items');
    const emptyState = document.getElementById('cart-drawer-empty');
    const footerEl = document.getElementById('cart-drawer-footer');
    const subtotalEl = document.getElementById('cart-subtotal-value');
    const totalCountEl = document.getElementById('cart-total-items-label');

    if (subtotalEl) subtotalEl.textContent = `฿${formatPrice(subtotal)}`;
    if (totalCountEl) totalCountEl.textContent = `${totalItems} รายการ`;

    if (!itemsContainer) return;

    if (state.cart.length === 0) {
      itemsContainer.innerHTML = '';
      itemsContainer.hidden = true;
      if (emptyState) emptyState.hidden = false;
      if (footerEl) footerEl.hidden = true;
      return;
    }

    itemsContainer.hidden = false;
    if (emptyState) emptyState.hidden = true;
    if (footerEl) footerEl.hidden = false;

    itemsContainer.innerHTML = state.cart
      .map((item) => {
        const itemKey = item.key || `${item.id}__${item.unit}`;
        const lineTotal = item.price * item.qty;
        const unitSuffix = item.unit ? ` / ${item.unit}` : '';
        const imgSrc = item.image || (global.SG_API_ADAPTER ? global.SG_API_ADAPTER.PLACEHOLDER_SVG : '');

        return `
          <div class="cart-item" data-cart-item-key="${itemKey}">
            <img class="cart-item-img" src="${imgSrc}" alt="${item.name}" width="72" height="72" loading="lazy" onerror="this.src='${global.SG_API_ADAPTER ? global.SG_API_ADAPTER.PLACEHOLDER_SVG : ''}'" />
            <div class="cart-item-info">
              <div class="cart-item-top">
                <div>
                  <span class="cart-item-sku">${item.sku}</span>
                  <h4 class="cart-item-name">${item.name}</h4>
                </div>
                <button type="button" class="cart-item-remove" data-cart-action="remove" data-key="${itemKey}" aria-label="ลบ ${item.name} ออกจากตะกร้า">
                  ${ICONS.trash}
                  <span>ลบ</span>
                </button>
              </div>
              <div class="cart-item-unit">฿${formatPrice(item.price)}${unitSuffix}</div>
              <div class="cart-item-bottom">
                <div class="cart-qty-control" aria-label="ปรับจำนวน ${item.name}">
                  <button type="button" class="cart-qty-btn" data-cart-action="decrease" data-key="${itemKey}" aria-label="ลดจำนวน ${item.name}">${ICONS.minus}</button>
                  <span class="cart-qty-value" aria-live="polite">${item.qty}</span>
                  <button type="button" class="cart-qty-btn" data-cart-action="increase" data-key="${itemKey}" aria-label="เพิ่มจำนวน ${item.name}">${ICONS.plus}</button>
                </div>
                <div class="cart-item-subtotal">฿${formatPrice(lineTotal)}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Open / Close Cart Drawer
  function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    state.isDrawerOpen = true;
    renderCartUI();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    updateBodyScrollLock();
    const closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    state.isDrawerOpen = false;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    updateBodyScrollLock();
  }

  // Product Detail Modal (Customer Gallery สูงสุด 5 รูป + Multi-variants)
  async function openProductModal(productId) {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-body');
    if (!modal || !content) return;

    // ล็อกหน้าจอและแสดง Loading เล็กน้อยหากเชื่อมต่อ API
    content.innerHTML = `<div style="padding: 60px 20px; text-align: center; color: var(--muted);"><p>กำลังโหลดรายละเอียดสินค้า...</p></div>`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateBodyScrollLock();

    let product = null;
    if (global.SG_API_ADAPTER) {
      product = await global.SG_API_ADAPTER.fetchProductDetail(productId);
    }
    if (!product) {
      product = getProductById(productId);
    }

    if (!product) {
      content.innerHTML = `<div style="padding: 60px 20px; text-align: center; color: var(--muted);"><p>ไม่พบข้อมูลสินค้ารายการนี้</p></div>`;
      return;
    }

    state.activeModalProductId = product.id;
    state.activeModalProduct = product;
    state.modalQty = 1;
    state.isProductModalOpen = true;

    // เตรียมรูปภาพ Gallery (สูงสุด 5 รูป)
    let galleryImages = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      galleryImages = product.images.slice(0, 5);
    } else if (product.image) {
      galleryImages = [{ id: 'pri', url: product.image, thumbnail_url: product.image, is_primary: true }];
    } else {
      const ph = global.SG_API_ADAPTER ? global.SG_API_ADAPTER.PLACEHOLDER_SVG : '';
      galleryImages = [{ id: 'ph', url: ph, thumbnail_url: ph, is_primary: true }];
    }

    let activeImageIndex = 0;
    const priIdx = galleryImages.findIndex((img) => img.is_primary);
    if (priIdx !== -1) activeImageIndex = priIdx;
    state.activeGalleryIndex = activeImageIndex;

    // เตรียม Variants
    let variants = Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants
      : [{ id: 'v-1', unit: product.unit || 'กิโลกรัม', price: product.price, in_stock: product.available !== false }];

    let selectedVariantIndex = 0;
    const firstInStock = variants.findIndex((v) => v.in_stock);
    if (firstInStock !== -1) selectedVariantIndex = firstInStock;
    state.selectedVariantIndex = selectedVariantIndex;

    const currentVariant = variants[selectedVariantIndex];
    const isCurrentInStock = Boolean(currentVariant.in_stock);

    const tagsHtml = (product.tags || [])
      .map((t) => `<span class="shop-badge ${t === 'ผลไม้ตามฤดูกาล' ? 'shop-badge-seasonal' : 'shop-badge-cat'}">${t}</span>`)
      .join('');

    // HTML ของ Gallery (Main View + Counter + Navigation Arrows + Thumbnails)
    const hasMultipleImages = galleryImages.length > 1;
    const mainImgSrc = galleryImages[activeImageIndex].url;

    const galleryHtml = `
      <div class="pmodal-gallery-wrap">
        <div class="pmodal-gallery-main">
          <img
            id="pmodal-main-img"
            src="${mainImgSrc}"
            alt="${product.name}"
            width="480"
            height="480"
            onerror="this.src='${global.SG_API_ADAPTER ? global.SG_API_ADAPTER.PLACEHOLDER_SVG : ''}'"
          />
          ${
            hasMultipleImages
              ? `
                <span class="pmodal-gallery-counter" id="pmodal-gallery-counter">${activeImageIndex + 1} / ${galleryImages.length}</span>
                <button type="button" class="pmodal-gallery-nav pmodal-gallery-prev" id="pmodal-gallery-prev" aria-label="รูปก่อนหน้า">‹</button>
                <button type="button" class="pmodal-gallery-nav pmodal-gallery-next" id="pmodal-gallery-next" aria-label="รูปถัดไป">›</button>
              `
              : ''
          }
        </div>
        ${
          hasMultipleImages
            ? `
              <div class="pmodal-gallery-thumbs" id="pmodal-gallery-thumbs" role="tablist" aria-label="ภาพย่อยสินค้า">
                ${galleryImages
                  .map(
                    (img, idx) => `
                    <button
                      type="button"
                      role="tab"
                      class="pmodal-thumb-btn${idx === activeImageIndex ? ' is-active' : ''}"
                      data-thumb-idx="${idx}"
                      aria-label="ดูรูปที่ ${idx + 1}"
                      aria-selected="${idx === activeImageIndex ? 'true' : 'false'}"
                    >
                      <img src="${img.thumbnail_url || img.url}" alt="${product.name} รูปที่ ${idx + 1}" />
                    </button>
                  `
                  )
                  .join('')}
              </div>
            `
            : ''
        }
      </div>
    `;

    // HTML ของ Variant Selector
    const hasMultipleVariants = variants.length > 1;
    const variantsHtml = hasMultipleVariants
      ? `
        <div class="pmodal-variants-wrap">
          <label class="pmodal-variants-label">เลือกขนาด / รูปแบบบรรจุภัณฑ์:</label>
          <div class="pmodal-variant-options" id="pmodal-variant-options">
            ${variants
              .map(
                (v, idx) => `
                <button
                  type="button"
                  class="pmodal-variant-btn${idx === selectedVariantIndex ? ' is-active' : ''}${!v.in_stock ? ' is-out-of-stock' : ''}"
                  data-vidx="${idx}"
                  aria-label="${v.unit} ราคา ${v.price} บาท ${!v.in_stock ? '(หมด)' : ''}"
                >
                  <span class="variant-unit">${v.unit}</span>
                  <span class="variant-price">฿${formatPrice(v.price)}</span>
                  ${!v.in_stock ? '<span class="variant-badge-oos">หมด</span>' : ''}
                </button>
              `
              )
              .join('')}
          </div>
        </div>
      `
      : '';

    content.innerHTML = `
      <div class="pmodal-grid">
        <div class="pmodal-media-col">
          ${galleryHtml}
        </div>
        <div class="pmodal-details">
          <div class="pmodal-badges">
            ${tagsHtml}
            <span class="pmodal-status-pill ${isCurrentInStock ? 'is-available' : 'is-out-of-stock'}" id="pmodal-status-pill">
              ${isCurrentInStock ? 'พร้อมจำหน่าย' : 'หมดชั่วคราว'}
            </span>
          </div>
          <div class="pmodal-sku">รหัสสินค้า: ${product.sku}</div>
          <h3 class="pmodal-title">${product.name}</h3>
          <div class="pmodal-price">
            ฿<span id="pmodal-price-val">${formatPrice(currentVariant.price)}</span>
            <small id="pmodal-unit-val">/ ${currentVariant.unit}</small>
          </div>
          ${variantsHtml}
          <p class="pmodal-desc">${product.description || 'ผลไม้คุณภาพสดใหม่ คัดเกรดพิเศษจากแหล่งปลูกชั้นนำ'}</p>
          <div class="pmodal-trust-box">
            <div class="pmodal-trust-pill">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>รับประกันเคลม 100% หากช้ำหรือเสียหาย</span>
            </div>
            <div class="pmodal-trust-pill">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="16" height="13" x="1" y="6" rx="2"/><path d="M17 9h4l3 3v4a2 2 0 0 1-2 2h-1"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 9V6"/></svg>
              <span>แพ็กกันกระแทก &amp; จัดส่งรวดเร็วทั่วไทย</span>
            </div>
          </div>
          <div class="pmodal-actions">
            <div class="cart-qty-control pmodal-qty" id="pmodal-qty-control">
              <button type="button" class="cart-qty-btn" id="pmodal-qty-minus" aria-label="ลดจำนวน">${ICONS.minus}</button>
              <span class="cart-qty-value" id="pmodal-qty-val">1</span>
              <button type="button" class="cart-qty-btn" id="pmodal-qty-plus" aria-label="เพิ่มจำนวน">${ICONS.plus}</button>
            </div>
            <button
              type="button"
              class="shop-btn-add pmodal-add-btn${!isCurrentInStock ? ' is-disabled' : ''}"
              id="pmodal-add-cart-btn"
              ${!isCurrentInStock ? 'disabled' : ''}
            >
              ${isCurrentInStock ? ICONS.plus : ''}
              <span id="pmodal-add-cart-label">
                ${isCurrentInStock ? `เพิ่มลงตะกร้า (฿${formatPrice(currentVariant.price)})` : 'สินค้าหมดชั่วคราว'}
              </span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Gallery Interactivity Handlers
    function updateGalleryView(newIdx) {
      if (newIdx < 0 || newIdx >= galleryImages.length) return;
      activeImageIndex = newIdx;
      state.activeGalleryIndex = newIdx;

      const mainImg = document.getElementById('pmodal-main-img');
      const counterEl = document.getElementById('pmodal-gallery-counter');
      const thumbsContainer = document.getElementById('pmodal-gallery-thumbs');

      if (mainImg) {
        mainImg.style.opacity = '0.3';
        mainImg.src = galleryImages[activeImageIndex].url;
        setTimeout(() => {
          if (mainImg) mainImg.style.opacity = '1';
        }, 120);
      }
      if (counterEl) {
        counterEl.textContent = `${activeImageIndex + 1} / ${galleryImages.length}`;
      }
      if (thumbsContainer) {
        thumbsContainer.querySelectorAll('.pmodal-thumb-btn').forEach((btn, idx) => {
          const isActive = idx === activeImageIndex;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      }
    }

    const prevBtn = document.getElementById('pmodal-gallery-prev');
    const nextBtn = document.getElementById('pmodal-gallery-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const targetIdx = (activeImageIndex - 1 + galleryImages.length) % galleryImages.length;
        updateGalleryView(targetIdx);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const targetIdx = (activeImageIndex + 1) % galleryImages.length;
        updateGalleryView(targetIdx);
      });
    }

    const thumbsContainer = document.getElementById('pmodal-gallery-thumbs');
    if (thumbsContainer) {
      thumbsContainer.addEventListener('click', (e) => {
        const thumbBtn = e.target.closest('.pmodal-thumb-btn');
        if (!thumbBtn) return;
        const targetIdx = Number(thumbBtn.getAttribute('data-thumb-idx')) || 0;
        updateGalleryView(targetIdx);
      });
    }

    // Touch Swipe Gesture on Main Image
    const galleryMain = content.querySelector('.pmodal-gallery-main');
    if (galleryMain && hasMultipleImages) {
      let touchStartX = 0;
      let touchStartY = 0;

      galleryMain.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches && e.touches[0]) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        },
        { passive: true }
      );

      galleryMain.addEventListener(
        'touchend',
        (e) => {
          if (e.changedTouches && e.changedTouches[0]) {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const deltaY = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX < 0) {
                // Swipe Left -> Next
                const targetIdx = (activeImageIndex + 1) % galleryImages.length;
                updateGalleryView(targetIdx);
              } else {
                // Swipe Right -> Prev
                const targetIdx = (activeImageIndex - 1 + galleryImages.length) % galleryImages.length;
                updateGalleryView(targetIdx);
              }
            }
          }
        },
        { passive: true }
      );
    }

    // Variant Selection Handlers
    function updateVariantView(newVidx) {
      if (newVidx < 0 || newVidx >= variants.length) return;
      selectedVariantIndex = newVidx;
      state.selectedVariantIndex = newVidx;

      const v = variants[selectedVariantIndex];
      const isInStock = Boolean(v.in_stock);

      const priceValEl = document.getElementById('pmodal-price-val');
      const unitValEl = document.getElementById('pmodal-unit-val');
      const statusPill = document.getElementById('pmodal-status-pill');
      const addBtn = document.getElementById('pmodal-add-cart-btn');
      const addLabel = document.getElementById('pmodal-add-cart-label');
      const qtyControl = document.getElementById('pmodal-qty-control');

      if (priceValEl) priceValEl.textContent = formatPrice(v.price);
      if (unitValEl) unitValEl.textContent = `/ ${v.unit}`;

      if (statusPill) {
        statusPill.className = `pmodal-status-pill ${isInStock ? 'is-available' : 'is-out-of-stock'}`;
        statusPill.textContent = isInStock ? 'พร้อมจำหน่าย' : 'หมดชั่วคราว';
      }

      if (isInStock) {
        if (addBtn) {
          addBtn.disabled = false;
          addBtn.classList.remove('is-disabled');
        }
        if (addLabel) {
          addLabel.textContent = `เพิ่มลงตะกร้า (฿${formatPrice(v.price * state.modalQty)})`;
        }
        if (qtyControl) qtyControl.style.opacity = '1';
      } else {
        if (addBtn) {
          addBtn.disabled = true;
          addBtn.classList.add('is-disabled');
        }
        if (addLabel) {
          addLabel.textContent = 'สินค้าหมดชั่วคราว';
        }
        if (qtyControl) qtyControl.style.opacity = '0.5';
      }

      const vOptions = document.getElementById('pmodal-variant-options');
      if (vOptions) {
        vOptions.querySelectorAll('.pmodal-variant-btn').forEach((btn, idx) => {
          btn.classList.toggle('is-active', idx === selectedVariantIndex);
        });
      }
    }

    const vOptions = document.getElementById('pmodal-variant-options');
    if (vOptions) {
      vOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('.pmodal-variant-btn');
        if (!btn) return;
        const targetVidx = Number(btn.getAttribute('data-vidx')) || 0;
        updateVariantView(targetVidx);
      });
    }

    // Modal Qty Stepper
    const minusBtn = document.getElementById('pmodal-qty-minus');
    const plusBtn = document.getElementById('pmodal-qty-plus');
    const qtyValEl = document.getElementById('pmodal-qty-val');
    const addBtn = document.getElementById('pmodal-add-cart-btn');
    const addLabel = document.getElementById('pmodal-add-cart-label');

    function syncModalQty() {
      if (qtyValEl) qtyValEl.textContent = String(state.modalQty);
      const v = variants[selectedVariantIndex];
      if (v && v.in_stock && addLabel) {
        addLabel.textContent = `เพิ่มลงตะกร้า (฿${formatPrice(v.price * state.modalQty)})`;
      }
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        state.modalQty = Math.max(1, state.modalQty - 1);
        syncModalQty();
      });
    }
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        state.modalQty = Math.min(99, state.modalQty + 1);
        syncModalQty();
      });
    }
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const v = variants[selectedVariantIndex];
        if (!v || !v.in_stock) return;
        addToCart(product.id, state.modalQty, v.id || v.unit);
        closeProductModal();
      });
    }

    const closeBtn = document.getElementById('product-modal-close');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    state.isProductModalOpen = false;
    state.activeModalProduct = null;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScrollLock();
  }

  const CHECKOUT_STORAGE_KEY = 'sg_fruit_checkout_info';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadCheckoutInfo() {
    try {
      const raw = global.localStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            recipientName: String(parsed.recipientName || ''),
            phone: String(parsed.phone || ''),
            address: String(parsed.address || ''),
            subdistrict: String(parsed.subdistrict || ''),
            district: String(parsed.district || ''),
            province: String(parsed.province || ''),
            postalCode: String(parsed.postalCode || ''),
            note: String(parsed.note || ''),
            paymentMethod: parsed.paymentMethod === 'cod' ? 'cod' : 'promptpay',
            codAgreed: false
          };
        }
      }
    } catch (e) {}
    return {
      recipientName: '',
      phone: '',
      address: '',
      subdistrict: '',
      district: '',
      province: '',
      postalCode: '',
      note: '',
      paymentMethod: 'promptpay',
      codAgreed: false
    };
  }

  function saveCheckoutInfo(info) {
    try {
      global.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({
        recipientName: info.recipientName,
        phone: info.phone,
        address: info.address,
        subdistrict: info.subdistrict,
        district: info.district,
        province: info.province,
        postalCode: info.postalCode,
        note: info.note,
        paymentMethod: info.paymentMethod
      }));
    } catch (e) {}
  }

  // คำนวณส่วนลดโอนจ่าย PromptPay ตามยอดรวมสินค้าแบบขั้นบันได
  function getPromptPayDiscount(subtotal) {
    if (subtotal <= 0) return 0;
    if (subtotal <= 299) return 15;        // ไม่เกิน 299 บาท -> ลด 15 บาท
    if (subtotal <= 499) return 30;        // 300–499 บาท -> ลด 30 บาท
    return 50;                             // 500 บาทขึ้นไป -> ลด 50 บาท
  }

  // ชุดข้อมูลรหัสไปรษณีย์พื้นที่ห่างไกล / ข้ามเกาะ (69 รหัส / 70 รายการมาตรฐาน)
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

  function isRemotePostalCode(code) {
    if (!code) return false;
    const clean = String(code).trim().replace(/\s/g, '');
    return REMOTE_POSTAL_CODES.has(clean);
  }

  global.SG_REMOTE_POSTAL_CODES = REMOTE_POSTAL_CODES;
  global.isRemotePostalCode = isRemotePostalCode;

  // Checkout & Order Summary Modal
  function openOrderSummaryModal() {
    if (state.cart.length === 0) {
      showToast('กรุณาเลือกสินค้าลงตะกร้าก่อนดำเนินการสั่งซื้อ');
      return;
    }
    const modal = document.getElementById('order-summary-modal');
    const bodyEl = document.getElementById('order-summary-body');
    if (!modal || !bodyEl) return;

    const { totalItems, subtotal } = getCartTotals();
    const checkoutData = loadCheckoutInfo();
    const isCodAllowed = subtotal <= 800;
    if (!isCodAllowed && checkoutData.paymentMethod === 'cod') {
      checkoutData.paymentMethod = 'promptpay';
    }

    const rowsHtml = state.cart
      .map((item) => {
        const lineTotal = item.price * item.qty;
        const unitSuffix = item.unit ? ` (${item.unit})` : '';
        return `
          <div class="order-summary-item">
            <div class="order-summary-item-left">
              <strong>${item.name}${unitSuffix}</strong>
              <span>จำนวน ${item.qty} ชิ้น (× ฿${formatPrice(item.price)})</span>
            </div>
            <div class="order-summary-item-right">฿${formatPrice(lineTotal)}</div>
          </div>
        `;
      })
      .join('');

    const tierDiscount = getPromptPayDiscount(subtotal);
    let uploadedSlipFile = null;
    let uploadedSlipPreview = null;
    let uploadedSlipName = '';
    let isSubmitting = false;

    function fallbackCopy(text) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('คัดลอกเลขบัญชี 2412502003 สำเร็จแล้ว');
      } catch (e) {
        showToast('เลขบัญชี: 2412502003');
      }
    }

    function syncFormValuesFromDOM() {
      const nameEl = document.getElementById('checkout-name');
      const phoneEl = document.getElementById('checkout-phone');
      const addrEl = document.getElementById('checkout-address');
      const subEl = document.getElementById('checkout-subdistrict');
      const distEl = document.getElementById('checkout-district');
      const provEl = document.getElementById('checkout-province');
      const postEl = document.getElementById('checkout-postal');
      const noteEl = document.getElementById('checkout-note');
      const codCheckEl = document.getElementById('checkout-cod-agreed');

      if (nameEl) checkoutData.recipientName = nameEl.value;
      if (phoneEl) checkoutData.phone = phoneEl.value;
      if (addrEl) checkoutData.address = addrEl.value;
      if (subEl) checkoutData.subdistrict = subEl.value;
      if (distEl) checkoutData.district = distEl.value;
      if (provEl) checkoutData.province = provEl.value;
      if (postEl) checkoutData.postalCode = postEl.value;
      if (noteEl) checkoutData.note = noteEl.value;
      if (codCheckEl) checkoutData.codAgreed = codCheckEl.checked;
      saveCheckoutInfo(checkoutData);
    }

    function renderModal() {
      const isRemote = isRemotePostalCode(checkoutData.postalCode);
      const shippingFee = isRemote ? 50 : 0;
      const isCodOverLimit = subtotal > 800;
      const isCodAllowed = !isRemote && !isCodOverLimit;

      if (!isCodAllowed && checkoutData.paymentMethod === 'cod') {
        checkoutData.paymentMethod = 'promptpay';
        saveCheckoutInfo(checkoutData);
      }

      const isCod = checkoutData.paymentMethod === 'cod' && isCodAllowed;
      const discount = isCod ? 0 : tierDiscount;
      const netTotal = Math.max(0, subtotal + shippingFee - discount);

      bodyEl.innerHTML = `
        <div class="order-summary-trust-card" role="region" aria-label="ข้อมูลความปลอดภัยการจัดส่งและชำระเงิน">
          <div class="order-trust-grid">
            <div class="order-trust-chip">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="16" height="13" x="1" y="6" rx="2"/><path d="M17 9h4l3 3v4a2 2 0 0 1-2 2h-1"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 9V6"/></svg>
              <span>จัดส่งด่วนแบบปกติ (แพ็กกันกระแทก)</span>
            </div>
            <div class="order-trust-chip">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>รับประกันเคลม 100%</span>
            </div>
            <div class="order-trust-chip">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M6 15h.01"/><path d="M10 15h2"/></svg>
              <span>โอนผ่านบัญชี / COD</span>
            </div>
          </div>
        </div>

        <!-- 1. รายการสินค้า -->
        <div class="checkout-form-section">
          <div class="checkout-section-title">
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span>รายการสินค้าในคำสั่งซื้อ (${totalItems} รายการ)</span>
          </div>
          <div class="order-summary-list">
            ${rowsHtml}
          </div>
        </div>

        <!-- 2. ฟอร์มที่อยู่จัดส่ง -->
        <div class="checkout-form-section">
          <div class="checkout-section-title">
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>ข้อมูลที่อยู่จัดส่งสินค้า</span>
          </div>
          <div class="checkout-grid">
            <div class="checkout-field">
              <label class="checkout-label" for="checkout-name">ชื่อ-นามสกุล ผู้รับ <span class="required">*</span></label>
              <input type="text" id="checkout-name" class="checkout-input" placeholder="ระบุชื่อและนามสกุลจริง" value="${escapeHtml(checkoutData.recipientName)}" autocomplete="name" />
            </div>
            <div class="checkout-field">
              <label class="checkout-label" for="checkout-phone">เบอร์โทรศัพท์ (10 หลัก) <span class="required">*</span></label>
              <input type="tel" id="checkout-phone" class="checkout-input" placeholder="เช่น 0812345678" maxlength="10" inputmode="numeric" value="${escapeHtml(checkoutData.phone)}" autocomplete="tel" />
            </div>
            <div class="checkout-field is-full">
              <label class="checkout-label" for="checkout-address">ที่อยู่จัดส่ง (บ้านเลขที่ / หมู่ / ซอย / ถนน) <span class="required">*</span></label>
              <input type="text" id="checkout-address" class="checkout-input" placeholder="บ้านเลขที่, หมู่, อาคาร, ซอย, ถนน" value="${escapeHtml(checkoutData.address)}" autocomplete="street-address" />
            </div>
            <div class="checkout-field">
              <label class="checkout-label" for="checkout-subdistrict">ตำบล / แขวง <span class="required">*</span></label>
              <input type="text" id="checkout-subdistrict" class="checkout-input" placeholder="ระบุตำบลหรือแขวง" value="${escapeHtml(checkoutData.subdistrict)}" />
            </div>
            <div class="checkout-field">
              <label class="checkout-label" for="checkout-district">อำเภอ / เขต <span class="required">*</span></label>
              <input type="text" id="checkout-district" class="checkout-input" placeholder="ระบุอำเภอหรือเขต" value="${escapeHtml(checkoutData.district)}" />
            </div>
            <div class="checkout-field">
              <label class="checkout-label" for="checkout-province">จังหวัด <span class="required">*</span></label>
              <input type="text" id="checkout-province" class="checkout-input" placeholder="ระบุจังหวัด" value="${escapeHtml(checkoutData.province)}" />
            </div>
            <div class="checkout-field">
              <label class="checkout-label" for="checkout-postal">รหัสไปรษณีย์ (5 หลัก) <span class="required">*</span></label>
              <input type="text" id="checkout-postal" class="checkout-input" placeholder="5 หลัก เช่น 10110" maxlength="5" inputmode="numeric" value="${escapeHtml(checkoutData.postalCode)}" autocomplete="postal-code" />
            </div>
            <div class="checkout-field is-full">
              <label class="checkout-label" for="checkout-note">หมายเหตุเพิ่มเติมถึงขนส่ง (ไม่บังคับ)</label>
              <input type="text" id="checkout-note" class="checkout-input" placeholder="เช่น วางไว้หน้าบ้าน, ฝากป้อมยาม, โทรแจ้งก่อนส่ง" value="${escapeHtml(checkoutData.note)}" />
            </div>
          </div>
        </div>

        <!-- 3. ตัวเลือกช่องทางการชำระเงิน -->
        <div class="checkout-form-section">
          <div class="checkout-section-title">
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M6 15h.01"/><path d="M10 15h2"/></svg>
            <span>ตัวเลือกช่องทางการชำระเงิน</span>
          </div>

          <div class="checkout-payment-options">
            <!-- ตัวเลือกที่ 1 (Default): โอนเงินผ่านบัญชีธนาคาร -->
            <div class="payment-option-card ${!isCod ? 'is-selected' : ''}" id="payment-card-promptpay" role="button" tabindex="0">
              <div class="payment-option-header">
                <div class="payment-option-title-group">
                  <div class="payment-radio-custom"></div>
                  <span class="payment-option-name">โอนเงินผ่านบัญชีธนาคาร</span>
                </div>
                <span class="payment-badge is-green">แนะนำ · ส่วนลดพิเศษทันที</span>
              </div>
              <div class="payment-option-desc">
                รับส่วนลดพิเศษทันที <strong class="payment-discount-highlight">ลดทันที ${tierDiscount} บาท</strong> (ยอดชำระเพียง ฿${formatPrice(subtotal + shippingFee - tierDiscount)})
              </div>

              ${!isCod ? `
                <div class="checkout-bank-details" id="checkout-bank-details-box">
                  <div class="checkout-bank-row">
                    <span class="checkout-bank-label">ธนาคาร:</span>
                    <span class="checkout-bank-val">ธนาคารกสิกรไทย (KBANK)</span>
                  </div>
                  <div class="checkout-bank-row">
                    <span class="checkout-bank-label">ชื่อบัญชี:</span>
                    <span class="checkout-bank-val">บจก. ศิริวัตร์เมธานินท์ กรุ๊ป</span>
                  </div>
                  <div class="checkout-bank-row">
                    <span class="checkout-bank-label">เลขที่บัญชี:</span>
                    <div class="checkout-bank-acc-wrap">
                      <span class="checkout-bank-acc-num">241-2-50200-3</span>
                      <button type="button" class="checkout-copy-btn" id="checkout-copy-acc-btn" title="คลิกเพื่อคัดลอกเลขที่บัญชี">
                        <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        <span id="copy-btn-label">คัดลอกเลขบัญชี</span>
                      </button>
                    </div>
                  </div>

                  <div class="checkout-slip-box">
                    <label class="checkout-slip-label" for="checkout-slip-input">
                      แนบสลิปหลักฐานการโอนเงิน <span class="required" style="color: #dc2626;">*</span>
                    </label>
                    <div class="checkout-slip-uploader" id="checkout-slip-uploader">
                      <input type="file" id="checkout-slip-input" class="checkout-slip-file-input" accept="image/*" />
                      <div id="checkout-slip-upload-prompt" style="${uploadedSlipPreview ? 'display: none;' : ''}">
                        <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 6px; display: block; color: #16a34a;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span style="font-size: 13px; font-weight: 700; color: #15803d;">คลิกหรือแตะเพื่อแนบรูปสลิป</span>
                        <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">รองรับไฟล์รูปภาพ PNG, JPG, JPEG, WebP (สูงสุด 10MB)</div>
                      </div>
                      ${uploadedSlipPreview ? `
                        <div class="checkout-slip-preview-container" id="checkout-slip-preview-box">
                          <img src="${uploadedSlipPreview}" class="checkout-slip-preview-img" alt="ตัวอย่างสลิปโอนเงิน" />
                          <div style="flex: 1; min-width: 0; text-align: left;">
                            <div style="font-size: 12px; font-weight: 700; color: #15803d;">แนบไฟล์สลิปเรียบร้อย ✓</div>
                            <div style="font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(uploadedSlipName || 'slip.jpg')}</div>
                          </div>
                          <span class="checkout-copy-btn" style="border-color: #64748b; color: #475569; background: #fff;">
                            เปลี่ยนรูป
                          </span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- ตัวเลือกที่ 2: เก็บเงินปลายทาง (COD) -->
            <div class="payment-option-card ${isCod ? 'is-selected' : ''} ${!isCodAllowed ? 'is-disabled' : ''}" id="payment-card-cod" role="button" tabindex="${isCodAllowed ? '0' : '-1'}" ${!isCodAllowed ? 'aria-disabled="true"' : 'aria-disabled="false"'}>
              <div class="payment-option-header">
                <div class="payment-option-title-group">
                  <div class="payment-radio-custom"></div>
                  <span class="payment-option-name">เก็บเงินปลายทาง (COD)</span>
                </div>
                <span class="payment-badge is-gray">${isRemote ? 'ไม่รองรับพื้นที่ห่างไกล' : 'ไม่มีบวกเพิ่ม'}</span>
              </div>
              ${isRemote ? `
                <div class="payment-disabled-alert">
                  ⚠️ พื้นที่ห่างไกล/ข้ามเกาะ มีค่าจัดส่งเพิ่ม 50 บาท และสงวนสิทธิ์เฉพาะแบบโอนจ่ายเท่านั้น
                </div>
              ` : (isCodOverLimit ? `
                <div class="payment-disabled-alert">
                  ⚠️ ออเดอร์ยอดเกิน 800 บาท สงวนสิทธิ์เฉพาะแบบโอนจ่ายเท่านั้น (รับส่วนลดเพิ่มทันที 50.-)
                </div>
              ` : `
                <div class="payment-option-desc">
                  ชำระเงินสดหรือโอนกับพนักงานขนส่งเมื่อได้รับสินค้าที่บ้าน
                </div>
              `)}
            </div>
          </div>

          <!-- กล่องแจ้งเตือนเงื่อนไขและข้อกฎหมาย COD (แสดงเมื่อเลือก COD) -->
          ${isCod ? `
            <div class="checkout-cod-alert" id="checkout-cod-box">
              <div class="checkout-cod-alert-header">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <strong>เงื่อนไขและข้อกฎหมายการเก็บเงินปลายทาง (COD):</strong>
              </div>
              <ul>
                <li>กรุณาตรวจสอบเบอร์โทรศัพท์และรับสายเจ้าหน้าที่ขนส่ง เนื่องจากสินค้าเป็นผักและผลไม้สด</li>
                <li>การกดสั่งซื้อถือเป็นการทำสัญญาซื้อขายที่สมบูรณ์ตาม ป.พ.พ. มาตรา 168 และมาตรา 458</li>
                <li>หากปฏิเสธการรับสินค้าโดยไม่มีเหตุอันสมควร ถือเป็นการผิดสัญญาซื้อขาย ทางร้านมีสิทธิเรียกร้องค่าเสียหายที่เกิดขึ้นจริงตาม ป.พ.พ. มาตรา 213 และมาตรา 222 (ครอบคลุมค่าจัดส่งไป-กลับ และมูลค่าสินค้าสดที่เน่าเสียจากการตีกลับ)</li>
              </ul>
              <label class="checkout-cod-checkbox-wrap" id="checkout-cod-checkbox-wrap">
                <input type="checkbox" id="checkout-cod-agreed" ${checkoutData.codAgreed ? 'checked' : ''} />
                <span>ข้าพเจ้ารับทราบเงื่อนไขและยืนยันว่าจะรอรับสินค้าตามที่อยู่ที่ระบุ</span>
              </label>
            </div>
          ` : ''}
        </div>

        <!-- 4. สรุปยอดชำระเงินสุทธิ -->
        <div class="checkout-form-section">
          <div class="checkout-section-title">
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>สรุปยอดชำระเงินสุทธิ (Order Summary)</span>
          </div>

          <div class="order-summary-totals">
            <div class="order-summary-row">
              <span>ยอดรวมสินค้า (${totalItems} รายการ)</span>
              <strong>฿${formatPrice(subtotal)}</strong>
            </div>
            ${isRemote ? `
              <div class="order-summary-row is-shipping">
                <span>ค่าจัดส่งพื้นที่ห่างไกล / ข้ามเกาะ</span>
                <strong style="color: #ea580c;">+฿50</strong>
              </div>
            ` : `
              <div class="order-summary-row is-free-ship">
                <span>ค่าจัดส่ง (จัดส่งปกติ)</span>
                <strong style="color: #15803d;">ฟรี</strong>
              </div>
            `}
            ${!isCod && discount > 0 ? `
              <div class="order-summary-row is-discount">
                <span>ส่วนลดพิเศษโอนจ่าย</span>
                <strong style="color: #15803d;">-฿${formatPrice(discount)}</strong>
              </div>
            ` : ''}
            <div class="order-summary-row is-grand">
              <span>ยอดสุทธิที่ต้องชำระ</span>
              <strong style="color: var(--forest); font-size: 20px;">฿${formatPrice(netTotal)}</strong>
            </div>
          </div>

          <div class="checkout-remote-area-note">
            หมายเหตุ: พื้นที่ห่างไกล/ข้ามเกาะ มีค่าจัดส่งเพิ่ม 50 บาท และสงวนสิทธิ์เฉพาะแบบโอนจ่ายเท่านั้น
          </div>
        </div>

        <!-- 5. ปุ่มยืนยันสั่งซื้อ -->
        <div class="checkout-actions" style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
          <button
            type="button"
            class="primary-cta order-line-btn"
            id="checkout-confirm-btn"
            ${isSubmitting ? 'disabled' : ''}
            style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 22px; border-radius: 14px; background: #16a34a; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.28); border: none; cursor: ${isSubmitting ? 'not-allowed' : 'pointer'}; opacity: ${isSubmitting ? '0.7' : '1'}; transition: all 0.2s;"
          >
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20 6 9 17l-5-5"/></svg>
            <span>${isSubmitting ? 'กำลังบันทึกคำสั่งซื้อ...' : (!isCod ? `ยืนยันสั่งซื้อและส่งสลิป (฿${formatPrice(netTotal)})` : `ยืนยันสั่งซื้อแบบเก็บเงินปลายทาง (฿${formatPrice(netTotal)})`)}</span>
          </button>
          <div style="text-align: center; font-size: 11.5px; color: var(--muted); line-height: 1.5; margin-top: 4px;">
            คำสั่งซื้อจะถูกส่งตรงเข้าสู่ระบบหลังบ้านเพื่อเตรียมแพ็กจัดส่งสินค้าทันที
          </div>
        </div>
      `;

      attachModalEvents();
    }

    function attachModalEvents() {
      const promptpayCard = document.getElementById('payment-card-promptpay');
      const codCard = document.getElementById('payment-card-cod');
      const codCheck = document.getElementById('checkout-cod-agreed');
      const confirmBtn = document.getElementById('checkout-confirm-btn');
      const copyBtn = document.getElementById('checkout-copy-acc-btn');
      const slipInput = document.getElementById('checkout-slip-input');

      if (promptpayCard) {
        promptpayCard.addEventListener('click', (e) => {
          if (e.target.closest('#checkout-bank-details-box')) return;
          syncFormValuesFromDOM();
          if (checkoutData.paymentMethod !== 'promptpay') {
            checkoutData.paymentMethod = 'promptpay';
            saveCheckoutInfo(checkoutData);
            renderModal();
          }
        });
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const accNumber = '2412502003';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(accNumber).then(() => {
              showToast('คัดลอกเลขบัญชี 2412502003 สำเร็จแล้ว');
              const lbl = document.getElementById('copy-btn-label');
              if (lbl) {
                lbl.textContent = 'คัดลอกแล้ว ✓';
                setTimeout(() => { if (lbl) lbl.textContent = 'คัดลอกเลขบัญชี'; }, 2000);
              }
            }).catch(() => {
              fallbackCopy(accNumber);
            });
          } else {
            fallbackCopy(accNumber);
          }
        });
      }

      if (slipInput) {
        slipInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            showToast('ขนาดไฟล์รูปภาพสลิปต้องไม่เกิน 10MB');
            return;
          }
          uploadedSlipFile = file;
          uploadedSlipName = file.name;
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            uploadedSlipPreview = loadEvt.target.result;
            syncFormValuesFromDOM();
            renderModal();
          };
          reader.readAsDataURL(file);
        });
      }

      if (codCard) {
        codCard.addEventListener('click', () => {
          syncFormValuesFromDOM();
          const isRemoteNow = isRemotePostalCode(checkoutData.postalCode);
          if (isRemoteNow) {
            showToast('พื้นที่ห่างไกล/ข้ามเกาะ มีค่าจัดส่งเพิ่ม 50 บาท และสงวนสิทธิ์เฉพาะแบบโอนจ่ายเท่านั้น');
            return;
          }
          if (subtotal > 800) {
            showToast('ออเดอร์ยอดเกิน 800 บาท สงวนสิทธิ์เฉพาะแบบโอนจ่ายเท่านั้น (รับส่วนลดเพิ่มทันที 50.-)');
            return;
          }
          if (checkoutData.paymentMethod !== 'cod') {
            checkoutData.paymentMethod = 'cod';
            saveCheckoutInfo(checkoutData);
            renderModal();
          }
        });
      }

      if (codCheck) {
        codCheck.addEventListener('change', (e) => {
          checkoutData.codAgreed = e.target.checked;
          const wrap = document.getElementById('checkout-cod-checkbox-wrap');
          if (wrap && e.target.checked) wrap.classList.remove('is-invalid');
        });
      }

      // Input listener to save and clear invalid styling
      const inputs = bodyEl.querySelectorAll('.checkout-input');
      inputs.forEach((input) => {
        input.addEventListener('input', () => {
          input.classList.remove('is-invalid');
          syncFormValuesFromDOM();
        });
      });

      const postalInput = document.getElementById('checkout-postal');
      if (postalInput) {
        postalInput.addEventListener('input', () => {
          const oldVal = checkoutData.postalCode;
          const newVal = postalInput.value;
          checkoutData.postalCode = newVal;
          saveCheckoutInfo(checkoutData);

          const wasRemote = isRemotePostalCode(oldVal);
          const nowRemote = isRemotePostalCode(newVal);
          if (wasRemote !== nowRemote) {
            const start = postalInput.selectionStart;
            const end = postalInput.selectionEnd;
            renderModal();
            const reInput = document.getElementById('checkout-postal');
            if (reInput) {
              reInput.focus();
              try { reInput.setSelectionRange(start, end); } catch (e) {}
            }
          }
        });
        postalInput.addEventListener('change', () => {
          syncFormValuesFromDOM();
          renderModal();
        });
      }

      // Bind Thai Address Autocomplete across all 4 fields
      if (global.THAI_ADDRESS_AUTOCOMPLETE && typeof global.THAI_ADDRESS_AUTOCOMPLETE.bindAutocomplete === 'function') {
        global.THAI_ADDRESS_AUTOCOMPLETE.bindAutocomplete({
          subdistrictEl: document.getElementById('checkout-subdistrict'),
          districtEl: document.getElementById('checkout-district'),
          provinceEl: document.getElementById('checkout-province'),
          postalEl: document.getElementById('checkout-postal'),
          onSelect: (item) => {
            checkoutData.subdistrict = item.district;
            checkoutData.district = item.amphoe;
            checkoutData.province = item.province;
            checkoutData.postalCode = item.zipcode;
            saveCheckoutInfo(checkoutData);
            if (global.THAI_ADDRESS_AUTOCOMPLETE && typeof global.THAI_ADDRESS_AUTOCOMPLETE.closeAllDropdowns === 'function') {
              global.THAI_ADDRESS_AUTOCOMPLETE.closeAllDropdowns();
            }
            renderModal();
          }
        });
      }

      // Confirm Order Handler
      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          if (isSubmitting) return;
          syncFormValuesFromDOM();

          const name = checkoutData.recipientName.trim();
          const rawPhone = checkoutData.phone.replace(/[\s-]/g, '');
          const address = checkoutData.address.trim();
          const subdistrict = checkoutData.subdistrict.trim();
          const district = checkoutData.district.trim();
          const province = checkoutData.province.trim();
          const rawPostal = checkoutData.postalCode.replace(/\s/g, '');
          const note = checkoutData.note.trim();
          const isCod = checkoutData.paymentMethod === 'cod' && isCodAllowed;

          // Validation
          if (!name) {
            showToast('กรุณากรอกชื่อ-นามสกุล ผู้รับ');
            const el = document.getElementById('checkout-name');
            if (el) { el.classList.add('is-invalid'); el.focus(); }
            return;
          }

          if (!/^0[0-9]{9}$/.test(rawPhone)) {
            showToast('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก (เช่น 0812345678)');
            const el = document.getElementById('checkout-phone');
            if (el) { el.classList.add('is-invalid'); el.focus(); }
            return;
          }

          if (!address) {
            showToast('กรุณากรอกที่อยู่จัดส่ง (บ้านเลขที่ / ซอย / ถนน)');
            const el = document.getElementById('checkout-address');
            if (el) { el.classList.add('is-invalid'); el.focus(); }
            return;
          }

          if (!subdistrict) {
            showToast('กรุณากรอกตำบล / แขวง');
            const el = document.getElementById('checkout-subdistrict');
            if (el) { el.classList.add('is-invalid'); el.focus(); }
            return;
          }

          if (!district) {
            showToast('กรุณากรอกอำเภอ / เขต');
            const el = document.getElementById('checkout-district');
            if (el) { el.classList.add('is-invalid'); el.focus(); }
            return;
          }

          if (!province) {
            showToast('กรุณากรอกจังหวัด');
            const el = document.getElementById('checkout-province');
            if (el) { el.classList.add('is-invalid'); el.focus(); }
            return;
          }

          if (!/^[0-9]{5}$/.test(rawPostal)) {
            showToast('กรุณากรอกรหัสไปรษณีย์ 5 หลัก (เช่น 10110)');
            const el = document.getElementById('checkout-postal');
            if (el) { el.classList.add('is-invalid'); el.focus(); }
            return;
          }

          if (isCod && !checkoutData.codAgreed) {
            showToast('กรุณาติ๊กรับทราบเงื่อนไขและข้อกฎหมายการเก็บเงินปลายทาง (COD)');
            const wrap = document.getElementById('checkout-cod-checkbox-wrap');
            if (wrap) {
              wrap.classList.add('is-invalid');
              wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            const chk = document.getElementById('checkout-cod-agreed');
            if (chk) chk.focus();
            return;
          }

          if (!isCod && !uploadedSlipFile) {
            showToast('กรุณาแนบสลิปหลักฐานการโอนเงิน');
            const uploader = document.getElementById('checkout-slip-uploader');
            if (uploader) {
              uploader.classList.add('is-invalid');
              uploader.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
          }

          isSubmitting = true;
          renderModal();

          try {
            const apiBase = (global.SG_API_ADAPTER && typeof global.SG_API_ADAPTER.getApiBaseUrl === 'function')
              ? global.SG_API_ADAPTER.getApiBaseUrl()
              : 'https://staging-api.siriwatmedhanin.com/api';

            let slipUrl = null;

            // 1. Upload slip if transfer
            if (!isCod && uploadedSlipFile) {
              const formData = new FormData();
              formData.append('slip', uploadedSlipFile);

              const slipRes = await fetch(`${apiBase}/orders/upload-slip`, {
                method: 'POST',
                body: formData,
              });

              const slipJson = await slipRes.json();
              if (!slipRes.ok || !slipJson.ok) {
                throw new Error(slipJson.message || 'อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
              }
              slipUrl = slipJson.data.slip_url;
            }

            // 2. Submit Order
            const isRemoteOrder = isRemotePostalCode(rawPostal);
            const shippingFee = isRemoteOrder ? 50 : 0;
            const discount = isCod ? 0 : tierDiscount;
            const netTotal = Math.max(0, subtotal + shippingFee - discount);

            const orderPayload = {
              customer: {
                name,
                phone: rawPhone,
                address,
                subdistrict,
                district,
                province,
                zipcode: rawPostal,
                note
              },
              payment_method: isCod ? 'cod' : 'transfer',
              slip_url: slipUrl,
              items: state.cart.map(i => ({
                product_id: i.productId || i.id,
                product_name: i.name,
                variant_id: i.variantId || null,
                variation: i.unit || null,
                unit: i.unit || 'หน่วย',
                sku: i.sku || null,
                price: i.price,
                quantity: i.qty,
                subtotal: i.price * i.qty
              })),
              subtotal,
              discount_amount: discount,
              shipping_fee: shippingFee,
              total_amount: netTotal
            };

            const orderRes = await fetch(`${apiBase}/orders`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(orderPayload)
            });

            const orderJson = await orderRes.json();
            if (!orderRes.ok || !orderJson.ok) {
              throw new Error(orderJson.message || 'บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            }

            const createdOrder = orderJson.data;

            // Save to recent orders in localStorage
            saveRecentOrder({
              orderNumber: createdOrder.order_no,
              phone: rawPhone,
              totalAmount: createdOrder.total_amount,
              paymentMethod: createdOrder.payment_method,
              createdAt: createdOrder.created_at
            });

            // 3. Clear cart
            state.cart = [];
            saveCart();
            updateCartUI();

            // 4. Render Success Screen inside modal
            bodyEl.innerHTML = `
              <div class="order-success-screen">
                <div class="order-success-icon-wrap">
                  <svg class="ui-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <h3 class="order-success-title">สั่งซื้อสินค้าสำเร็จ เรียบร้อยแล้ว!</h3>
                <p class="order-success-subtitle">ขอบพระคุณที่เลือกซื้อผลไม้สดกับ SG FRUIT ทางร้านได้รับคำสั่งซื้อของท่านเรียบร้อยแล้ว</p>
                
                <div class="order-success-card">
                  <div class="order-success-row">
                    <span>เลขที่คำสั่งซื้อ (Order No.):</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="order-success-orderno" id="order-success-orderno-text">${escapeHtml(createdOrder.order_no)}</span>
                      <button type="button" class="checkout-copy-btn" id="order-success-copy-btn" title="คลิกเพื่อคัดลอกเลขคำสั่งซื้อ" style="padding: 3px 8px; font-size: 11px;">
                        คัดลอกเลขคำสั่งซื้อ
                      </button>
                    </div>
                  </div>
                  <div class="order-success-row">
                    <span>ช่องทางการชำระเงิน:</span>
                    <strong>${escapeHtml(createdOrder.payment_method)}</strong>
                  </div>
                  <div class="order-success-row">
                    <span>ชื่อผู้รับ / เบอร์โทร:</span>
                    <span>${escapeHtml(name)} (${escapeHtml(rawPhone)})</span>
                  </div>
                  <div class="order-success-row">
                    <span>สถานที่จัดส่ง:</span>
                    <span style="max-width: 62%; text-align: right; line-height: 1.4;">${escapeHtml(address)} ต.${escapeHtml(subdistrict)} อ.${escapeHtml(district)} จ.${escapeHtml(province)} ${escapeHtml(rawPostal)}</span>
                  </div>
                  <div class="order-success-row">
                    <span>ยอดสุทธิที่ชำระ:</span>
                    <span style="font-size: 16px; color: #15803d; font-weight: 800;">฿${formatPrice(createdOrder.total_amount)}</span>
                  </div>
                </div>

                <div style="padding: 10px 14px; background: #fffbeb; border-radius: 10px; border: 1px solid #fef3c7; font-size: 12px; color: #b45309; line-height: 1.5; margin-bottom: 14px; text-align: left; display: flex; align-items: flex-start; gap: 8px;">
                  <span style="font-size: 16px; line-height: 1;">📸</span>
                  <span><strong>คำแนะนำ:</strong> กรุณาแคปหน้าจอหน้านี้เก็บไว้เพื่อเป็นหลักฐานในการรับสินค้าและเช็กสถานะการจัดส่ง</span>
                </div>

                <div style="padding: 12px 14px; background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0; font-size: 12.5px; color: #166534; line-height: 1.5; margin-bottom: 18px; text-align: left;">
                  ✓ ข้อมูลคำสั่งซื้อถูกบันทึกเข้าสู่ระบบหลังบ้านเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการเตรียมคัดเกรดผลไม้สดและแพ็กจัดส่งให้ท่านโดยเร็วที่สุด
                </div>

                ${(() => {
                  const rawLineId = (global.__SG_SITE_PROFILE__ && global.__SG_SITE_PROFILE__.line_oa_id) || '@sgfruit';
                  const cleanLineId = String(rawLineId).replace(/[^a-zA-Z0-9_@.-]/g, '');
                  const rawLineUrl = (global.__SG_SITE_PROFILE__ && global.__SG_SITE_PROFILE__.line_oa_url) || `https://line.me/R/ti/p/${cleanLineId}`;
                  const cleanLineUrl = /^https?:\/\//i.test(rawLineUrl) ? rawLineUrl : `https://line.me/R/ti/p/${cleanLineId}`;
                  return `
                    <div style="margin-bottom: 16px; font-size: 12px; color: var(--muted);">
                      มีข้อสงสัยเกี่ยวกับออเดอร์? ติดต่อเราได้ทาง LINE: 
                      <a href="${cleanLineUrl}" target="_blank" rel="noopener noreferrer" style="color: #15803d; font-weight: 700; text-decoration: underline;">
                        ${cleanLineId}
                      </a>
                    </div>
                  `;
                })()}

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button type="button" class="primary-cta" id="order-success-track-btn" style="width: 100%; padding: 13px; border-radius: 12px; background: #15803d; color: #ffffff; font-weight: 800; font-size: 14.5px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 14px rgba(21, 128, 61, 0.25);">
                    <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect width="16" height="13" x="1" y="6" rx="2"/><path d="M17 9h4l3 3v4a2 2 0 0 1-2 2h-1"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
                    <span>ติดตามสถานะคำสั่งซื้อนี้</span>
                  </button>
                  <button type="button" class="primary-cta" id="order-success-done-btn" style="width: 100%; padding: 12px; border-radius: 12px; background: #f8fafc; color: #475569; font-weight: 700; font-size: 14px; border: 1px solid #cbd5e1; cursor: pointer;">
                    เสร็จสิ้น / กลับสู่หน้าร้าน
                  </button>
                </div>
              </div>
            `;

            // Copy Order Number button handler
            const copyOrderBtn = document.getElementById('order-success-copy-btn');
            if (copyOrderBtn) {
              copyOrderBtn.addEventListener('click', () => {
                const orderText = createdOrder.order_no;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(orderText).then(() => {
                    showToast(`คัดลอกเลขคำสั่งซื้อ ${orderText} สำเร็จ`);
                    copyOrderBtn.textContent = 'คัดลอกแล้ว ✓';
                    setTimeout(() => { if (copyOrderBtn) copyOrderBtn.textContent = 'คัดลอกเลขคำสั่งซื้อ'; }, 2000);
                  }).catch(() => fallbackCopy(orderText));
                } else {
                  fallbackCopy(orderText);
                }
              });
            }

            // Track Order button handler
            const trackOrderBtn = document.getElementById('order-success-track-btn');
            if (trackOrderBtn) {
              trackOrderBtn.addEventListener('click', () => {
                closeOrderSummaryModal();
                openOrderTrackingModal(createdOrder.order_no, rawPhone);
              });
            }

            const doneBtn = document.getElementById('order-success-done-btn');
            if (doneBtn) {
              doneBtn.addEventListener('click', () => {
                closeOrderSummaryModal();
              });
            }

          } catch (err) {
            isSubmitting = false;
            showToast(err.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ');
            renderModal();
          }
        });
      }
    }

    renderModal();

    state.isOrderModalOpen = true;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateBodyScrollLock();

    const closeBtn = document.getElementById('order-summary-close');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function closeOrderSummaryModal() {
    const modal = document.getElementById('order-summary-modal');
    if (!modal) return;
    if (global.THAI_ADDRESS_AUTOCOMPLETE && typeof global.THAI_ADDRESS_AUTOCOMPLETE.closeAllDropdowns === 'function') {
      global.THAI_ADDRESS_AUTOCOMPLETE.closeAllDropdowns();
    }
    state.isOrderModalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScrollLock();
  }

  // ==========================================
  // GUEST ORDER TRACKING & RECENT ORDERS
  // ==========================================
  const RECENT_ORDERS_STORAGE_KEY = 'sg_fruit_recent_orders';

  function copyTextToClipboard(text, successMsg) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (successMsg) showToast(successMsg);
      }).catch(() => {
        fallbackCopyGeneral(text, successMsg);
      });
    } else {
      fallbackCopyGeneral(text, successMsg);
    }
  }

  function fallbackCopyGeneral(text, successMsg) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (successMsg) showToast(successMsg);
    } catch {
      if (successMsg) showToast(successMsg);
    }
  }

  function getRecentOrders() {
    try {
      const raw = localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecentOrder(orderData) {
    if (!orderData || !orderData.orderNumber) return;
    try {
      const list = getRecentOrders();
      const filtered = list.filter(o => o.orderNumber !== orderData.orderNumber);
      filtered.unshift({
        orderNumber: orderData.orderNumber,
        phone: orderData.phone || '',
        totalAmount: orderData.totalAmount || 0,
        paymentMethod: orderData.paymentMethod || '',
        createdAt: orderData.createdAt || new Date().toISOString()
      });
      const trimmed = filtered.slice(0, 5);
      localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(trimmed));
      updateRecentOrderPill();
    } catch (err) {
      console.warn('Failed to save recent order to localStorage:', err);
    }
  }

  function updateRecentOrderPill() {
    const pill = document.getElementById('recent-order-pill');
    if (!pill) return;
    const isDismissed = sessionStorage.getItem('sg_dismiss_recent_pill') === '1';
    if (isDismissed) {
      pill.style.display = 'none';
      return;
    }
    const recents = getRecentOrders();
    if (recents.length === 0) {
      pill.style.display = 'none';
      return;
    }
    const latest = recents[0];
    const textEl = document.getElementById('recent-order-pill-text');
    if (textEl) {
      textEl.textContent = `ติดตามออเดอร์ล่าสุด (${latest.orderNumber})`;
    }
    pill.style.display = 'flex';
  }

  function openOrderTrackingModal(prefillOrderNo, prefillPhone) {
    const modal = document.getElementById('order-tracking-modal');
    if (!modal) return;
    state.isTrackingModalOpen = true;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateBodyScrollLock();

    const bodyEl = document.getElementById('order-tracking-body');
    if (bodyEl) {
      renderOrderTrackingForm(bodyEl, prefillOrderNo, prefillPhone);
    }
    const closeBtn = document.getElementById('order-tracking-close');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function closeOrderTrackingModal() {
    const modal = document.getElementById('order-tracking-modal');
    if (!modal) return;
    state.isTrackingModalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScrollLock();
  }

  function renderOrderTrackingForm(containerEl, prefillOrderNo, prefillPhone) {
    const recents = getRecentOrders();
    const defaultOrderNo = prefillOrderNo || (recents.length > 0 ? recents[0].orderNumber : '');
    const defaultPhone = prefillPhone || (recents.length > 0 ? (recents[0].phone || '') : '');

    let recentChipsHtml = '';
    if (recents.length > 0) {
      const chips = recents.map(r => {
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
        return `
          <button type="button" class="recent-order-chip" data-orderno="${escapeHtml(r.orderNumber)}" data-phone="${escapeHtml(r.phone || '')}">
            <span>📦</span>
            <strong>${escapeHtml(r.orderNumber)}</strong>
            ${r.totalAmount ? `<span style="color: #64748b;">(฿${Number(r.totalAmount).toLocaleString()})</span>` : ''}
            ${dateStr ? `<span style="font-size: 11px; color: #94a3b8;">${dateStr}</span>` : ''}
          </button>
        `;
      }).join('');

      recentChipsHtml = `
        <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>🕒 คำสั่งซื้อล่าสุดในเครื่องของคุณ (แตะเพื่อกรอกทันที):</span>
          </div>
          <div class="recent-orders-chips-wrap">
            ${chips}
          </div>
        </div>
      `;
    }

    containerEl.innerHTML = `
      ${recentChipsHtml}
      <form id="order-tracking-form" style="margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 700; color: var(--forest); margin-bottom: 6px;">
              เลขที่คำสั่งซื้อ (Order Number) <span style="color: #dc2626;">*</span>
            </label>
            <input type="text" id="track-input-orderno" class="checkout-input" placeholder="เช่น SG-261120-1234" value="${escapeHtml(defaultOrderNo)}" required style="width: 100%; box-sizing: border-box;" autocomplete="off" autocapitalize="characters" />
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 700; color: var(--forest); margin-bottom: 6px;">
              เบอร์โทรศัพท์ (10 หลัก) <span style="color: #dc2626;">*</span>
            </label>
            <input type="tel" id="track-input-phone" class="checkout-input" placeholder="เช่น 0812345678" value="${escapeHtml(defaultPhone)}" maxlength="10" required style="width: 100%; box-sizing: border-box;" autocomplete="tel" inputmode="numeric" />
          </div>
        </div>
        <button type="submit" class="primary-cta" id="track-submit-btn" style="width: 100%; padding: 13px; border-radius: 12px; background: #16a34a; color: #ffffff; font-weight: 800; font-size: 15px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.28);">
          <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span id="track-btn-text">ค้นหาสถานะคำสั่งซื้อ</span>
        </button>
      </form>
      <div id="order-tracking-result"></div>
    `;

    // Chip click listeners
    const chipBtns = containerEl.querySelectorAll('.recent-order-chip');
    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const orderNo = btn.getAttribute('data-orderno');
        const phone = btn.getAttribute('data-phone');
        const orderInput = document.getElementById('track-input-orderno');
        const phoneInput = document.getElementById('track-input-phone');
        if (orderInput && orderNo) orderInput.value = orderNo;
        if (phoneInput && phone) phoneInput.value = phone;
        if (orderNo && phone) {
          executeTrackOrder(orderNo, phone, containerEl);
        }
      });
    });

    // Form submit listener
    const form = containerEl.querySelector('#order-tracking-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const orderInput = document.getElementById('track-input-orderno');
        const phoneInput = document.getElementById('track-input-phone');
        const orderNo = orderInput ? orderInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        if (!orderNo) {
          showToast('กรุณากรอกเลขที่คำสั่งซื้อ');
          if (orderInput) orderInput.focus();
          return;
        }
        if (!phone || phone.replace(/\D/g, '').length !== 10) {
          showToast('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
          if (phoneInput) phoneInput.focus();
          return;
        }
        executeTrackOrder(orderNo, phone, containerEl);
      });
    }

    // Auto-search if both parameters are provided
    if (prefillOrderNo && prefillPhone && prefillPhone.replace(/\D/g, '').length === 10) {
      executeTrackOrder(prefillOrderNo, prefillPhone, containerEl);
    }
  }

  function executeTrackOrder(orderNo, phone, containerEl) {
    const resultBox = document.getElementById('order-tracking-result');
    const submitBtn = document.getElementById('track-submit-btn');
    const btnText = document.getElementById('track-btn-text');
    if (!resultBox) return;

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'กำลังค้นหาข้อมูล...';

    resultBox.innerHTML = `
      <div style="text-align: center; padding: 36px 16px; color: var(--muted);">
        <div class="cart-spinner" style="width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px;"></div>
        <div style="font-size: 14px; font-weight: 600;">กำลังตรวจสอบข้อมูลคำสั่งซื้อ...</div>
      </div>
    `;

    const apiBase = (global.SG_API_ADAPTER && typeof global.SG_API_ADAPTER.getApiBaseUrl === 'function')
      ? global.SG_API_ADAPTER.getApiBaseUrl()
      : 'https://staging-api.siriwatmedhanin.com/api';

    const cleanPhone = phone.replace(/\D/g, '');

    fetch(`${apiBase}/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: orderNo.trim(), phone: cleanPhone })
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.message || 'ไม่พบข้อมูลคำสั่งซื้อ');
        }
        return json.data;
      })
      .then((data) => {
        saveRecentOrder({
          orderNumber: data.orderNumber,
          phone: cleanPhone,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          createdAt: data.createdAt
        });
        renderTrackingResult(resultBox, data, containerEl);
      })
      .catch((err) => {
        resultBox.innerHTML = `
          <div style="padding: 16px 18px; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; color: #991b1b; text-align: left; line-height: 1.5; font-size: 13.5px;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 20px; line-height: 1;">⚠️</span>
              <div>
                <strong style="display: block; font-size: 14.5px; margin-bottom: 4px; color: #b91c1c;">ไม่พบข้อมูลคำสั่งซื้อ</strong>
                <div>กรุณาตรวจสอบ <strong>เลขที่คำสั่งซื้อ</strong> และ <strong>เบอร์โทรศัพท์ 10 หลัก</strong> ให้ถูกต้องตรงกับที่ใช้ตอนสั่งซื้อ หรือหากเพิ่งสั่งซื้อ ระบบอาจใช้เวลา 1-2 นาทีในการอัปเดตข้อมูล</div>
              </div>
            </div>
          </div>
        `;
      })
      .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.textContent = 'ค้นหาสถานะคำสั่งซื้อ';
      });
  }

  function renderTrackingResult(resultBox, data, containerEl) {
    const rawStatus = data.status || 'pending';
    const statusMap = {
      pending: { label: 'รอตรวจสอบชำระเงิน', badgeClass: 'checkout-status-pending', stepIdx: 1 },
      confirmed: { label: 'ชำระเงินเรียบร้อยแล้ว', badgeClass: 'checkout-status-confirmed', stepIdx: 2 },
      processing: { label: 'กำลังแพ็กสินค้า', badgeClass: 'checkout-status-processing', stepIdx: 3 },
      shipped: { label: 'จัดส่งแล้ว', badgeClass: 'checkout-status-shipped', stepIdx: 4 },
      cancelled: { label: 'ยกเลิกแล้ว', badgeClass: 'checkout-status-cancelled', stepIdx: 0 }
    };

    const isCod = data.paymentMethod === 'cod';
    const currentStatusInfo = statusMap[rawStatus] || { label: rawStatus, badgeClass: '', stepIdx: 1 };
    const currentStepIdx = isCod && rawStatus === 'pending' ? 1 : currentStatusInfo.stepIdx;

    const steps = [
      { num: 1, title: 'ได้รับคำสั่งซื้อ', desc: 'บันทึกเข้าระบบ' },
      { num: 2, title: isCod ? 'ยืนยันออเดอร์' : 'ชำระเงินแล้ว', desc: isCod ? 'ปลายทาง COD' : 'ตรวจสลิปเรียบร้อย' },
      { num: 3, title: 'กำลังแพ็กสินค้า', desc: 'คัดสรรและแพ็กสด' },
      { num: 4, title: 'จัดส่งแล้ว', desc: 'ส่งมอบให้ขนส่ง' }
    ];

    const progressPercent = currentStepIdx <= 1 ? 0 : Math.min(100, Math.round(((currentStepIdx - 1) / (steps.length - 1)) * 100));

    const stepsHtml = steps.map((s, idx) => {
      let stateClass = '';
      if (currentStepIdx > s.num) {
        stateClass = 'is-completed';
      } else if (currentStepIdx === s.num) {
        stateClass = 'is-active';
      }
      return `
        <div class="tracking-step ${stateClass}">
          <div class="tracking-step-circle">
            ${currentStepIdx > s.num ? '✓' : s.num}
          </div>
          <div class="tracking-step-label">${s.title}</div>
        </div>
      `;
    }).join('');

    let trackingInfoHtml = '';
    if (data.trackingNumber) {
      trackingInfoHtml = `
        <div style="margin: 16px 0; padding: 14px 16px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #166534; margin-bottom: 2px;">
              🚚 พัสดุจัดส่งแล้ว (${escapeHtml(data.carrier || 'ไปรษณีย์ไทย/Flash')})
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #14532d; letter-spacing: 0.5px;">
              ${escapeHtml(data.trackingNumber)}
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="checkout-copy-btn" id="track-copy-tracking-btn" style="padding: 6px 12px; font-size: 12px;">
              คัดลอกเลขพัสดุ
            </button>
            ${data.trackingUrl ? `
              <a href="${escapeHtml(data.trackingUrl)}" target="_blank" rel="noopener noreferrer" class="recent-order-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;">
                <span>เช็กพัสดุ</span>
                <span>↗</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      trackingInfoHtml = `
        <div style="margin: 16px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 12.5px; color: #64748b; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">📦</span>
          <span>ขณะนี้เจ้าหน้าที่กำลังจัดเตรียมสินค้า เมื่อพัสดุถูกจัดส่ง เลขติดตามจะปรากฏที่นี่ทันที</span>
        </div>
      `;
    }

    const formattedDate = data.createdAt ? new Date(data.createdAt).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '-';

    const itemsHtml = Array.isArray(data.items) ? data.items.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px;">
        <div>
          <strong style="color: var(--forest);">${escapeHtml(item.productName || item.product_name || 'สินค้า')}</strong>
          <span style="color: var(--muted); font-size: 12px;"> × ${item.quantity} ${item.sku ? `(${escapeHtml(item.sku)})` : ''}</span>
        </div>
        <div style="font-weight: 700; color: var(--ink);">
          ฿${Number(item.subtotal || (item.price * item.quantity)).toLocaleString()}
        </div>
      </div>
    `).join('') : '';

    const paymentLabel = isCod ? 'เก็บเงินปลายทาง (COD)' : 'โอนเงินชำระ (QR PromptPay)';

    const siteProfile = global.__SG_SITE_PROFILE__ || {};
    const cleanLineId = (siteProfile.line_oa_id || '@sgfruit').replace(/^@?/, '@');
    const rawLineUrl = siteProfile.line_oa_url || `https://line.me/R/ti/p/${encodeURIComponent(cleanLineId)}`;
    const cleanLineUrl = /^https?:\/\//i.test(rawLineUrl) ? rawLineUrl : `https://line.me/R/ti/p/${encodeURIComponent(cleanLineId)}`;

    resultBox.innerHTML = `
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; animation: pillFadeIn 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-size: 11.5px; color: var(--muted); text-transform: uppercase; font-weight: 700;">เลขที่คำสั่งซื้อ</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--forest); display: flex; align-items: center; gap: 8px;">
              <span>${escapeHtml(data.orderNumber)}</span>
              <button type="button" class="checkout-copy-btn" id="track-copy-orderno-btn" title="คัดลอกเลขที่คำสั่งซื้อ" style="padding: 2px 8px; font-size: 11px;">
                คัดลอก
              </button>
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">สั่งซื้อเมื่อ: ${formattedDate}</div>
          </div>
          <div style="text-align: right;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; background: ${rawStatus === 'shipped' ? '#dcfce7; color: #15803d;' : (rawStatus === 'processing' ? '#eff6ff; color: #1d4ed8;' : '#fef3c7; color: #b45309;')}">
              ● ${currentStatusInfo.label}
            </span>
            <div style="font-size: 11.5px; color: var(--muted); margin-top: 4px;">${paymentLabel}</div>
          </div>
        </div>

        <div class="tracking-timeline">
          <div class="tracking-timeline-line"></div>
          <div class="tracking-timeline-line-fill" style="width: ${progressPercent}%;"></div>
          ${stepsHtml}
        </div>

        ${trackingInfoHtml}

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 13px;">
          <div style="font-weight: 700; color: var(--forest); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ข้อมูลผู้รับและที่อยู่จัดส่ง (PDPA Protected)
          </div>
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px 12px; line-height: 1.5;">
            <span style="color: var(--muted);">ชื่อผู้รับ:</span>
            <span style="font-weight: 700; color: var(--ink);">${escapeHtml(data.customerName || '-')}</span>

            <span style="color: var(--muted);">เบอร์โทรศัพท์:</span>
            <span style="font-weight: 700; color: var(--ink);">${escapeHtml(data.phone || '-')}</span>

            <span style="color: var(--muted);">ที่อยู่ปลายทาง:</span>
            <span style="color: var(--ink);">${escapeHtml(data.maskedAddress || '-')}</span>
          </div>

          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
            <button type="button" id="track-change-address-btn" style="width: 100%; padding: 10px; border-radius: 8px; background: #ffffff; border: 1.5px solid #16a34a; color: #15803d; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
              <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span>แจ้งแก้ไขที่อยู่จัดส่ง</span>
            </button>
            <div style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 6px; line-height: 1.4;">
              * สามารถแจ้งแก้ไขที่อยู่ได้ก่อนสถานะเปลี่ยนเป็น "กำลังแพ็กสินค้า" เท่านั้น (ไม่สามารถยกเลิกคำสั่งซื้อผ่านหน้าเว็บได้)
            </div>
          </div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: var(--forest); margin-bottom: 8px;">รายการสินค้าที่สั่งซื้อ</div>
          <div style="margin-bottom: 10px;">
            ${itemsHtml}
          </div>
          <div style="font-size: 12.5px; color: var(--muted); display: flex; flex-direction: column; gap: 4px; padding-top: 6px;">
            <div style="display: flex; justify-content: space-between;">
              <span>ยอดรวมสินค้า:</span>
              <span>฿${Number(data.subtotalAmount || data.totalAmount).toLocaleString()}</span>
            </div>
            ${data.shippingFee ? `
              <div style="display: flex; justify-content: space-between;">
                <span>ค่าจัดส่ง:</span>
                <span>฿${Number(data.shippingFee).toLocaleString()}</span>
              </div>
            ` : '<div style="display: flex; justify-content: space-between;"><span>ค่าจัดส่ง:</span><span style="color: #16a34a; font-weight: 700;">ส่งฟรี</span></div>'}
            ${data.discountAmount ? `
              <div style="display: flex; justify-content: space-between; color: #16a34a;">
                <span>ส่วนลดโอนชำระ:</span>
                <span>-฿${Number(data.discountAmount).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: var(--forest); padding-top: 6px; border-top: 1.5px solid #e2e8f0; margin-top: 4px;">
              <span>ยอดสุทธิ:</span>
              <span style="color: #15803d;">฿${Number(data.totalAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const copyOrderBtn = resultBox.querySelector('#track-copy-orderno-btn');
    if (copyOrderBtn) {
      copyOrderBtn.addEventListener('click', () => {
        copyTextToClipboard(data.orderNumber, `คัดลอกเลขคำสั่งซื้อ ${data.orderNumber} สำเร็จ`);
        copyOrderBtn.textContent = 'คัดลอกแล้ว ✓';
        setTimeout(() => { if (copyOrderBtn) copyOrderBtn.textContent = 'คัดลอก'; }, 2000);
      });
    }

    const copyTrackingBtn = resultBox.querySelector('#track-copy-tracking-btn');
    if (copyTrackingBtn && data.trackingNumber) {
      copyTrackingBtn.addEventListener('click', () => {
        copyTextToClipboard(data.trackingNumber, `คัดลอกเลขพัสดุ ${data.trackingNumber} สำเร็จ`);
        copyTrackingBtn.textContent = 'คัดลอกแล้ว ✓';
        setTimeout(() => { if (copyTrackingBtn) copyTrackingBtn.textContent = 'คัดลอกเลขพัสดุ'; }, 2000);
      });
    }

    const changeAddressBtn = resultBox.querySelector('#track-change-address-btn');
    if (changeAddressBtn) {
      changeAddressBtn.addEventListener('click', () => {
        const msg = `ขอแจ้งแก้ไขที่อยู่จัดส่ง เลขที่คำสั่งซื้อ: ${data.orderNumber} (เบอร์โทร: ${data.phone || ''})`;
        copyTextToClipboard(msg, 'คัดลอกข้อความแจ้งแก้ไขที่อยู่แล้ว กำลังนำท่านไปยัง LINE...');
        setTimeout(() => { window.open(cleanLineUrl, '_blank'); }, 600);
      });
    }
  }

  // Policy Content Data & Modal Management
  const POLICIES = {
    shipping: {
      title: 'นโยบายการจัดส่ง & การรับประกันเคลมสินค้า [รอการยืนยันทางการ]',
      html: `
        <div style="background:rgba(59,130,246,0.1);border-left:3px solid #3b82f6;padding:8px 12px;border-radius:6px;margin-bottom:14px;font-size:11.5px;color:#1e40af;line-height:1.5;">
          ℹ️ <strong>สถานะ: PENDING USER CONFIRMATION</strong> — นโยบายนี้จัดทำขึ้นเพื่อเตรียมความพร้อมสำหรับระบบร้านค้า โดยกระบวนการจริงจะต้องได้รับความเห็นชอบจากผู้บริหารและฝ่ายปฏิบัติการก่อนประกาศใช้งานจริงบน Production
        </div>
        <h4>1. มาตรฐานการจัดส่งผลไม้คัดสรรคุณภาพ</h4>
        <p>SG FRUIT คัดสรรผลไม้และผักคุณภาพจากแหล่งปลูกชั้นนำ บรรจุด้วยวัสดุกันกระแทกหนาแน่นและระบบควบคุมคุณภาพ เพื่อปกป้องผลผลิตไม่ให้ช้ำหรือเสียหายระหว่างการขนส่ง</p>
        <ul>
          <li><strong>ระยะเวลาจัดส่ง:</strong> จัดส่งถึงปลายทางภายใน 1–2 วันทำการ (กทม.และปริมณฑล) และ 2–3 วันทำการ (ต่างจังหวัด)</li>
          <li><strong>การติดตามพัสดุ:</strong> แจ้งเลขพัสดุผ่านทางข้อความ SMS และ LINE Official ทันทีที่จัดส่งออกจากคลังสินค้า</li>
        </ul>

        <h4>2. มาตรฐานการรับประกันคุณภาพผลผลิต</h4>
        <p>ผลไม้ทุกลูกผ่านการคัดแยกก่อนบรรจุ หากพบปัญหาเน่าเสีย ช้ำ แตกหัก หรือไม่ตรงตามมาตรฐาน ทางร้านมีกระบวนการดูแลช่วยเหลือลูกค้า:</p>
        <ul>
          <li><strong>การแจ้งเคลม:</strong> ถ่ายภาพหรือคลิปวิดีโอผลไม้ที่เสียหาย พร้อมภาพใบปะหน้ากล่องพัสดุ</li>
          <li><strong>ช่องทางติดต่อ:</strong> ทักแจ้งแอดมินทาง LINE Official: <strong>@sgfruit</strong> ภายใน 24 ชั่วโมงหลังจากได้รับสินค้า</li>
          <li><strong>แนวทางชดเชย:</strong> จัดส่งสินค้ากล่องใหม่ทดแทน หรือโอนเงินคืนตามสัดส่วนความเสียหายตามนโยบายที่ร้านค้ากำหนด</li>
        </ul>

        <h4>3. คำแนะนำในการเก็บรักษา</h4>
        <p>เมื่อได้รับผลไม้แล้ว แนะนำให้นำออกจากกล่องทันที ผลไม้ที่พร้อมทานควรนำแช่ตู้เย็น ส่วนผลไม้ที่ต้องรอสุก (เช่น อะโวคาโดบางสายพันธุ์) ควรวางไว้ที่อุณหภูมิห้องจนสุกพอดีก่อนนำเข้าตู้เย็น เพื่อรสชาติและเนื้อสัมผัสที่ดี</p>
      `
    },
    privacy: {
      title: 'นโยบายความเป็นส่วนตัว (Privacy Notice) [รอทบทวนทางกฎหมาย]',
      html: `
        <div style="background:rgba(217,119,6,0.1);border-left:3px solid #d97706;padding:8px 12px;border-radius:6px;margin-bottom:14px;font-size:11.5px;color:#92400e;line-height:1.5;">
          ⚠️ <strong>สถานะ: PENDING LEGAL/USER REVIEW</strong> — ประกาศความเป็นส่วนตัวนี้จัดทำขึ้นเป็นร่างเบื้องต้นตามโครงสร้าง พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) เพื่อเตรียมความพร้อมของระบบร้านค้า และต้องผ่านการตรวจสอบความถูกต้องโดยที่ปรึกษากฎหมายก่อนถือเป็นเอกสารมีผลบังคับใช้สมบูรณ์
        </div>
        <h4>1. ข้อมูลส่วนบุคคลที่เก็บรวบรวม</h4>
        <p>SG FRUIT เก็บรวบรวมข้อมูลเท่าที่จำเป็นเพื่อการให้บริการคำสั่งซื้อและการจัดส่งสินค้า ได้แก่: ชื่อ-นามสกุล, ที่อยู่สำหรับจัดส่ง, หมายเลขโทรศัพท์สำหรับติดต่อส่งของ, บัญชี LINE หรือช่องทางติดต่อสำหรับการประสานงาน และประวัติรายการสั่งซื้อ</p>

        <h4>2. วัตถุประสงค์และฐานทางกฎหมายในการประมวลผล (Lawful Basis)</h4>
        <ul>
          <li><strong>ฐานสัญญา (Contractual Basis):</strong> เพื่อดำเนินการบรรจุ ยืนยันการชำระเงิน และส่งมอบสินค้าตามคำสั่งซื้อของลูกค้า</li>
          <li><strong>ฐานหน้าที่ตามกฎหมาย (Legal Obligation):</strong> เพื่อการจัดทำเอกสารทางบัญชี การเงิน และภาษีอากรตามที่กฎหมายกำหนด</li>
          <li><strong>ฐานประโยชน์อันชอบธรรม (Legitimate Interest):</strong> เพื่อการบริการหลังการขาย การประสานงานการเคลม และการปรับปรุงคุณภาพบริการ</li>
        </ul>

        <h4>3. การเปิดเผยข้อมูลแก่บุคคลภายนอก (Data Processors)</h4>
        <p>เราเปิดเผยข้อมูลเฉพาะที่จำเป็นอย่างยิ่งให้แก่ผู้ให้บริการจัดส่งพัสดุและคู่ค้าด้านโลจิสติกส์ที่ได้รับมอบหมาย เพื่อให้สามารถนำส่งพัสดุถึงมือท่านได้อย่างถูกต้องปลอดภัย โดยไม่มีการจำหน่าย แลกเปลี่ยน หรือเปิดเผยแก่บุคคลภายนอกอื่นโดยไม่ได้รับความยินยอม</p>

        <h4>4. ระยะเวลาการเก็บรักษาข้อมูล (Data Retention Period)</h4>
        <p>ข้อมูลที่เกี่ยวข้องกับการสั่งซื้อจะถูกเก็บรักษาไว้ตามระยะเวลาที่จำเป็นต่อการบรรลุวัตถุประสงค์ในการให้บริการ และตามระยะเวลาที่กฎหมายบัญชีและภาษีอากรกำหนด (โดยทั่วไป 5–10 ปี) เมื่อพ้นระยะเวลาดังกล่าว ข้อมูลจะถูกทำลายหรือทำให้เป็นข้อมูลที่ไม่สามารถระบุตัวบุคคลได้</p>

        <h4>5. สิทธิของเจ้าของข้อมูลส่วนบุคคล (Data Subject Rights)</h4>
        <p>ท่านมีสิทธิตามกฎหมาย PDPA ในการขอเข้าถึง ขอรับสำเนา ขอแก้ไขข้อมูลให้ถูกต้อง ขอโอนย้าย ขอคัดค้าน ขอระงับการใช้ หรือขอลบข้อมูลส่วนบุคคลของท่าน รวมถึงสิทธิในการถอนความยินยอม</p>

        <h4>6. ช่องทางการติดต่อ การใช้สิทธิ และการร้องเรียน</h4>
        <p>ท่านสามารถติดต่อเจ้าหน้าที่คุ้มครองข้อมูลหรือแจ้งใช้สิทธิต่างๆ ได้ผ่าน LINE Official: <strong>@sgfruit</strong> ในเวลาทำการ (จันทร์–เสาร์ 08:30–17:30 น.) และหากพบการประมวลผลที่ไม่เป็นไปตามกฎหมาย ท่านมีสิทธิยื่นคำร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ตามช่องทางของหน่วยงานกำกับดูแล</p>
      `
    }
  };

  function openPolicyModal(type) {
    const modal = document.getElementById('policy-modal');
    const titleEl = document.getElementById('policy-modal-title');
    const contentEl = document.getElementById('policy-modal-content');
    if (!modal) return;

    const data = POLICIES[type] || POLICIES.shipping;
    if (titleEl) titleEl.textContent = data.title;
    if (contentEl) contentEl.innerHTML = data.html;

    state.isPolicyModalOpen = true;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateBodyScrollLock();

    const closeBtn = document.getElementById('policy-modal-close');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function closePolicyModal() {
    const modal = document.getElementById('policy-modal');
    if (!modal) return;
    state.isPolicyModalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScrollLock();
  }

  function initPolicyModals() {
    const shippingBtn = document.getElementById('policy-shipping-btn');
    const privacyBtn = document.getElementById('policy-privacy-btn');
    const closeBtn = document.getElementById('policy-modal-close');
    const modal = document.getElementById('policy-modal');
    const backdrop = document.getElementById('policy-modal-backdrop');

    if (shippingBtn) {
      shippingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openPolicyModal('shipping');
      });
    }

    if (privacyBtn) {
      privacyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openPolicyModal('privacy');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closePolicyModal();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        closePolicyModal();
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closePolicyModal();
        }
      });
    }
  }

  // โหลดแคตตาล็อกใหม่ (เมื่อสลับโหมด หรือเมื่อ API พร้อม)
  async function reloadCatalog() {
    if (global.SG_API_ADAPTER) {
      catalog = await global.SG_API_ADAPTER.fetchCatalog();
    } else {
      catalog = global.SG_FRUIT_CATALOG || { categories: [], products: [] };
    }
    products = catalog.products || [];
    categories = catalog.categories || [];

    renderModeBadge();
    renderCategories();
    renderProducts();
    renderCartUI();
  }

  // Initialize Event Listeners
  function initShopAndCart() {
    loadCart();

    // Initial Catalog Load
    reloadCatalog();

    // ฟัง Event เมื่อมีการเปลี่ยนโหมดหรือ API Fallback
    global.addEventListener('sg:mode-changed', () => {
      reloadCatalog();
    });

    global.addEventListener('sg:api-fallback', (e) => {
      showToast('⚠️ สลับเป็น Static Mode ชั่วคราว (ไม่สามารถติดต่อ API ได้)');
      reloadCatalog();
    });

    // Search Input
    const searchInput = document.getElementById('shop-search-input');
    const searchClearBtn = document.getElementById('shop-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value || '';
        state.currentPage = 1;
        if (searchClearBtn) searchClearBtn.hidden = !state.searchQuery;
        renderProducts();
      });
    }
    if (searchClearBtn && searchInput) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        state.currentPage = 1;
        searchClearBtn.hidden = true;
        renderProducts();
        searchInput.focus();
      });
    }

    // Sort Select & Label Sync
    const sortSelect = document.getElementById('shop-sort-select');
    const sortLabel = document.getElementById('shop-sort-label');
    const syncSortLabel = () => {
      if (!sortLabel || !sortSelect) return;
      const opt = sortSelect.options[sortSelect.selectedIndex];
      sortLabel.textContent = opt ? opt.text : 'เรียงตาม: แนะนำ';
    };

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        state.sortBy = sortSelect.value || 'default';
        state.currentPage = 1;
        syncSortLabel();
        renderProducts();
      });
      syncSortLabel();
    }

    // Available Only Checkbox
    const availCheck = document.getElementById('shop-available-only');
    if (availCheck) {
      availCheck.addEventListener('change', () => {
        state.availableOnly = Boolean(availCheck.checked);
        state.currentPage = 1;
        renderProducts();
      });
    }

    // Reset Filters Button in Empty State
    const resetBtn = document.getElementById('shop-reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.category = 'all';
        state.searchQuery = '';
        state.sortBy = 'default';
        state.availableOnly = false;
        state.currentPage = 1;
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.hidden = true;
        if (sortSelect) {
          sortSelect.value = 'default';
          syncSortLabel();
        }
        if (availCheck) availCheck.checked = false;
        renderCategories();
        renderProducts();
      });
    }

    // Delegate clicks on Product Grid
    const gridEl = document.getElementById('shop-product-grid');
    if (gridEl) {
      gridEl.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-action');
        const id = actionEl.getAttribute('data-id');
        if (action === 'add-to-cart' && id) {
          addToCart(id, 1);
        } else if (action === 'detail' && id) {
          openProductModal(id);
        }
      });

      gridEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const mediaEl = e.target.closest('.shop-card-media[data-action="detail"]');
          if (mediaEl) {
            e.preventDefault();
            openProductModal(mediaEl.getAttribute('data-id'));
          }
        }
      });
    }

    // Open Cart Triggers (Navbar & any data-open-cart button)
    document.querySelectorAll('[data-open-cart]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openCartDrawer();
      });
    });

    // Cart Drawer internal actions
    const drawer = document.getElementById('cart-drawer');
    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target.classList.contains('cart-drawer-backdrop') || e.target.closest('#cart-drawer-close')) {
          closeCartDrawer();
          return;
        }
        const actBtn = e.target.closest('[data-cart-action]');
        if (!actBtn) return;
        const action = actBtn.getAttribute('data-cart-action');
        const key = actBtn.getAttribute('data-key') || actBtn.getAttribute('data-id');
        const item = state.cart.find((c) => (c.key && c.key === key) || c.id === key);
        if (!item) return;
        if (action === 'increase') {
          updateCartItemQty(key, item.qty + 1);
        } else if (action === 'decrease') {
          updateCartItemQty(key, item.qty - 1);
        } else if (action === 'remove') {
          removeFromCart(key);
        }
      });
    }

    const clearCartBtn = document.getElementById('cart-clear-btn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => clearCart());
    }

    const checkoutBtn = document.getElementById('cart-checkout-demo-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        openOrderSummaryModal();
      });
    }

    const browseFromEmptyCartBtn = document.getElementById('cart-empty-browse-btn');
    if (browseFromEmptyCartBtn) {
      browseFromEmptyCartBtn.addEventListener('click', () => {
        closeCartDrawer();
        const shopSec = document.getElementById('shop');
        if (shopSec) {
          const top = shopSec.getBoundingClientRect().top + global.scrollY - 82;
          global.scrollTo({ top, behavior: 'smooth' });
        }
      });
    }

    // Product Modal close
    const pModal = document.getElementById('product-modal');
    if (pModal) {
      pModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop') || e.target.closest('#product-modal-close')) {
          closeProductModal();
        }
      });
    }

    // Order Summary Modal close
    const oModal = document.getElementById('order-summary-modal');
    if (oModal) {
      oModal.addEventListener('click', (e) => {
        if (
          e.target.classList.contains('modal-backdrop') ||
          e.target.closest('#order-summary-close') ||
          e.target.closest('#order-summary-back-btn')
        ) {
          closeOrderSummaryModal();
        }
      });
    }

    // Category Quick Links in Footer / Elsewhere
    document.querySelectorAll('[data-filter-category]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.getAttribute('data-filter-category') || 'all';
        state.category = cat;
        state.currentPage = 1;
        renderCategories();
        renderProducts();
        const shopSec = document.getElementById('shop');
        if (shopSec) {
          const top = shopSec.getBoundingClientRect().top + global.scrollY - 82;
          global.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });

    // Global Keydown Handler: Escape & Gallery Arrow Navigation
    global.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.isTrackingModalOpen) {
          closeOrderTrackingModal();
        } else if (state.isPolicyModalOpen) {
          closePolicyModal();
        } else if (state.isOrderModalOpen) {
          closeOrderSummaryModal();
        } else if (state.isProductModalOpen) {
          closeProductModal();
        } else if (state.isDrawerOpen) {
          closeCartDrawer();
        }
      } else if (state.isProductModalOpen) {
        if (e.key === 'ArrowRight') {
          const nextBtn = document.getElementById('pmodal-gallery-next');
          if (nextBtn) nextBtn.click();
        } else if (e.key === 'ArrowLeft') {
          const prevBtn = document.getElementById('pmodal-gallery-prev');
          if (prevBtn) prevBtn.click();
        }
      }
    });

    // Floating Recent Order Pill
    const pillBtn = document.getElementById('recent-order-pill-btn');
    if (pillBtn) {
      pillBtn.addEventListener('click', () => {
        const recents = getRecentOrders();
        if (recents.length > 0) {
          openOrderTrackingModal(recents[0].orderNumber, recents[0].phone);
        } else {
          openOrderTrackingModal();
        }
      });
    }
    const pillDismissBtn = document.getElementById('recent-order-dismiss-btn');
    if (pillDismissBtn) {
      pillDismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pill = document.getElementById('recent-order-pill');
        if (pill) pill.style.display = 'none';
        sessionStorage.setItem('sg_dismiss_recent_pill', '1');
      });
    }

    // Desktop navbar & Mobile drawer track links
    const navTrackLink = document.getElementById('nav-track-link');
    if (navTrackLink) {
      navTrackLink.addEventListener('click', (e) => {
        e.preventDefault();
        openOrderTrackingModal();
      });
    }
    const mobileTrackLink = document.getElementById('mobile-track-link');
    if (mobileTrackLink) {
      mobileTrackLink.addEventListener('click', (e) => {
        e.preventDefault();
        const mobileNav = document.getElementById('mobile-nav');
        if (mobileNav && mobileNav.classList.contains('is-open')) {
          mobileNav.classList.remove('is-open');
        }
        openOrderTrackingModal();
      });
    }

    // Order Tracking Modal backdrop & close button
    const trackModal = document.getElementById('order-tracking-modal');
    if (trackModal) {
      const backdrop = trackModal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', closeOrderTrackingModal);
      }
      const closeBtn = document.getElementById('order-tracking-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', closeOrderTrackingModal);
      }
    }

    // Initialize Recent Order Pill on load
    updateRecentOrderPill();

    // Initialize Policy Modals
    initPolicyModals();
  }

  // Expose public API for testing, automation & integration
  global.SG_FRUIT_SHOP = {
    addToCart,
    removeFromCart,
    updateCartItemQty,
    clearCart,
    openCartDrawer,
    closeCartDrawer,
    openProductModal,
    closeProductModal,
    openOrderSummaryModal,
    closeOrderSummaryModal,
    openOrderTrackingModal,
    closeOrderTrackingModal,
    getRecentOrders,
    saveRecentOrder,
    updateRecentOrderPill,
    openPolicyModal,
    closePolicyModal,
    reloadCatalog,
    setCategory: (cat) => {
      state.category = cat || 'all';
      state.currentPage = 1;
      renderCategories();
      renderProducts();
    },
    getCartState: () => ({
      items: [...state.cart],
      ...getCartTotals(),
      isSample: false
    }),
    getFilteredProducts,
    getState: () => ({ ...state }),
    getCatalog: () => catalog
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShopAndCart);
  } else {
    initShopAndCart();
  }
})(window);
