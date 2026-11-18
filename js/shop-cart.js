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
    isOrderModalOpen: false
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
    const shouldLock = state.isDrawerOpen || state.isProductModalOpen || state.isOrderModalOpen;
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

  // Render Storefront Mode Indicator & Switcher
  function renderModeBadge() {
    const container = document.getElementById('shop-mode-container');
    if (!container || !global.SG_API_ADAPTER) return;

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
        const isAvailable = item.available && (Array.isArray(item.variants) && item.variants.length > 0 ? item.variants.some((v) => v.in_stock) : true);
        const statusClass = isAvailable ? (hasSeasonalTag ? 'is-seasonal-wait' : 'is-available') : 'is-out-of-stock';
        const statusText = isAvailable ? item.statusLabel : 'หมดชั่วคราว';

        // นับจำนวนสินค้านี้ในตะกร้า (รวมทุก variants)
        const inCartItems = state.cart.filter((c) => c.id === item.id);
        const inCartTotalQty = inCartItems.reduce((acc, c) => acc + c.qty, 0);
        const inCartBadge = inCartTotalQty > 0 ? `<span class="shop-card-incart-pill" aria-label="อยู่ในตะกร้า ${inCartTotalQty} รายการ">ในตะกร้า ${inCartTotalQty}</span>` : '';

        // รูปภาพหลัก (พร้อม Fallback)
        const imgSrc = item.image || (global.SG_API_ADAPTER ? global.SG_API_ADAPTER.PLACEHOLDER_SVG : '');

        return `
          <article class="shop-card${!isAvailable ? ' is-out-of-stock' : ''}" data-sku="${item.sku}" data-product-id="${item.id}" data-category="${item.category}">
            <div class="shop-card-media" data-action="detail" data-id="${item.id}" role="button" tabindex="0" aria-label="ดูรายละเอียด ${item.name}">
              <div class="shop-card-badges-top">
                <span class="shop-badge shop-badge-cat">${item.category}</span>
                ${hasSeasonalTag ? '<span class="shop-badge shop-badge-seasonal">ตามฤดูกาล</span>' : ''}
              </div>

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
                <span class="shop-card-sku">${item.sku}</span>
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
                  <span>${isAvailable ? 'เพิ่มลงตะกร้า' : 'หมดชั่วคราว'}</span>
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
          <div class="pmodal-disclaimer">
            <strong>หมายเหตุ:</strong> ข้อมูลสินค้าและราคาอยู่ระหว่างการปรับปรุง กรุณายืนยันกับร้านก่อนสั่งซื้อ
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

  // Demo Order Summary Modal (Checkout Demo Requirement)
  function openOrderSummaryModal() {
    if (state.cart.length === 0) {
      showToast('กรุณาเลือกสินค้าลงตะกร้าก่อนดูสรุปรายการ');
      return;
    }
    const modal = document.getElementById('order-summary-modal');
    const bodyEl = document.getElementById('order-summary-body');
    if (!modal || !bodyEl) return;

    const { totalItems, subtotal } = getCartTotals();

    const rowsHtml = state.cart
      .map((item) => {
        const lineTotal = item.price * item.qty;
        const unitSuffix = item.unit ? ` (${item.unit})` : '';
        return `
          <div class="order-summary-item">
            <div class="order-summary-item-left">
              <strong>${item.name}${unitSuffix}</strong>
              <span>รหัส ${item.sku} · จำนวน ${item.qty} ชิ้น (× ฿${formatPrice(item.price)})</span>
            </div>
            <div class="order-summary-item-right">฿${formatPrice(lineTotal)}</div>
          </div>
        `;
      })
      .join('');

    bodyEl.innerHTML = `
      <div class="order-demo-alert" role="note">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <strong>สรุปรายการสินค้าสำหรับตรวจสอบ</strong>
        </div>
        <p>ข้อมูลสินค้าและราคาอยู่ระหว่างการทดสอบระบบ สามารถสั่งซื้อล่วงหน้าหรือติดต่อร้านได้โดยตรง</p>
      </div>
      <div class="order-summary-list">
        ${rowsHtml}
      </div>
      <div class="order-summary-totals">
        <div class="order-summary-row">
          <span>จำนวนสินค้ารวม</span>
          <strong>${totalItems} รายการ</strong>
        </div>
        <div class="order-summary-row is-grand">
          <span>ยอดรวมสินค้า</span>
          <strong>฿${formatPrice(subtotal)}</strong>
        </div>
      </div>
      <div class="order-summary-note">
        * กรุณายืนยันรายการสินค้าและราคากับร้านค้าก่อนสั่งซื้อจริง
      </div>
    `;

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
    state.isOrderModalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScrollLock();
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
        if (state.isOrderModalOpen) {
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
