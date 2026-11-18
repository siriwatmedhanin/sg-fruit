/**
 * SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Shop UI, Filtering, Search, Modal & Cart System (V2)
 * ทำงานแบบ Standalone Frontend รองรับการทำงานแม้ GSAP ไม่ทำงาน และไม่รบกวน ScrollTrigger
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sg_fruit_cart_v2';
  const catalog = global.SG_FRUIT_CATALOG || { categories: [], products: [] };
  const products = catalog.products || [];
  const categories = catalog.categories || [];

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
    modalQty: 1,
    savedScrollY: 0,
    isDrawerOpen: false,
    isProductModalOpen: false,
    isOrderModalOpen: false
  };

  // Load persisted cart safely
  function loadCart() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          state.cart = parsed.filter(
            (item) => item && typeof item.id === 'string' && typeof item.qty === 'number' && item.qty > 0
          );
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

  // Filter & Sort logic
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
      if (state.availableOnly && !item.available) {
        return false;
      }
      // Search query match
      if (q) {
        const hay = `${item.name} ${item.sku} ${item.category} ${(item.tags || []).join(' ')} ${item.description}`.toLowerCase();
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

  // Render Product Grid, Count, Empty State, and Pagination
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
      countEl.innerHTML = `แสดง <strong>${pagedItems.length}</strong> จาก <strong>${totalFiltered}</strong> รายการ <span class="shop-count-demo">(ข้อมูลจำลอง DEMO ทั้งหมด ${products.length} รายการ)</span>`;
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
        const statusClass = item.available ? 'is-available' : 'is-seasonal-wait';
        const inCartItem = state.cart.find((c) => c.id === item.id);
        const inCartBadge = inCartItem ? `<span class="shop-card-incart-pill" aria-label="อยู่ในตะกร้า ${inCartItem.qty} รายการ">ในตะกร้า ${inCartItem.qty}</span>` : '';

        return `
          <article class="shop-card" data-sku="${item.sku}" data-product-id="${item.id}" data-category="${item.category}">
            <div class="shop-card-media" data-action="detail" data-id="${item.id}" role="button" tabindex="0" aria-label="ดูรายละเอียด ${item.name}">
              <div class="shop-card-badges-top">
                <span class="shop-badge shop-badge-cat">${item.category}</span>
                ${hasSeasonalTag ? '<span class="shop-badge shop-badge-seasonal">ตามฤดูกาล</span>' : ''}
              </div>
              <span class="shop-badge shop-badge-demo" title="ข้อมูลจำลองสำหรับทดสอบ">DEMO</span>
              <img
                class="shop-card-img"
                src="${item.image}"
                alt="${item.name} - ${item.category} (DEMO)"
                width="400"
                height="400"
              />
            </div>
            <div class="shop-card-body">
              <div class="shop-card-meta-row">
                <span class="shop-card-sku">${item.sku}</span>
                <span class="shop-card-status ${statusClass}">
                  <i aria-hidden="true"></i> ${item.statusLabel}
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
                <button type="button" class="shop-btn-add" data-action="add-to-cart" data-id="${item.id}" aria-label="เพิ่ม ${item.name} ลงตะกร้า">
                  ${ICONS.plus}
                  <span>เพิ่มลงตะกร้า</span>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    // Render Pagination / View Mode Controls
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
            แสดงรายการที่ ${startIdx + 1}–${startIdx + pagedItems.length} จาก ${totalFiltered} รายการจำลอง
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
          state.pageSize = state.pageSize <= 10 ? 15 : 10;
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

  // Cart Operations
  function addToCart(productId, qtyToAdd) {
    const product = getProductById(productId);
    if (!product) return;
    const qty = Math.max(1, Number(qtyToAdd) || 1);

    const existing = state.cart.find((item) => item.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        unit: product.unit,
        image: product.image,
        category: product.category,
        qty: qty
      });
    }

    saveCart();
    renderCartUI();
    renderProducts();
    showToast(`เพิ่มสินค้าลงตะกร้าแล้ว · ${product.name} (${qty} ${product.unit})`);
  }

  function updateCartItemQty(productId, newQty) {
    const idx = state.cart.findIndex((item) => item.id === productId);
    if (idx === -1) return;
    if (newQty <= 0) {
      const removedName = state.cart[idx].name;
      state.cart.splice(idx, 1);
      showToast(`ลบ ${removedName} ออกจากตะกร้าแล้ว`);
    } else {
      state.cart[idx].qty = Math.min(99, newQty);
    }
    saveCart();
    renderCartUI();
    renderProducts();
  }

  function removeFromCart(productId) {
    updateCartItemQty(productId, 0);
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
      const product = getProductById(item.id);
      const price = product ? product.price : item.price;
      totalItems += item.qty;
      subtotal += price * item.qty;
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
        const product = getProductById(item.id) || item;
        const lineTotal = product.price * item.qty;
        return `
          <div class="cart-item" data-cart-item-id="${item.id}">
            <img class="cart-item-img" src="${product.image}" alt="${product.name}" width="72" height="72" loading="lazy" />
            <div class="cart-item-info">
              <div class="cart-item-top">
                <div>
                  <span class="cart-item-sku">${product.sku} · DEMO</span>
                  <h4 class="cart-item-name">${product.name}</h4>
                </div>
                <button type="button" class="cart-item-remove" data-cart-action="remove" data-id="${item.id}" aria-label="ลบ ${product.name} ออกจากตะกร้า">
                  ${ICONS.trash}
                  <span>ลบ</span>
                </button>
              </div>
              <div class="cart-item-unit">฿${formatPrice(product.price)} / ${product.unit}</div>
              <div class="cart-item-bottom">
                <div class="cart-qty-control" aria-label="ปรับจำนวน ${product.name}">
                  <button type="button" class="cart-qty-btn" data-cart-action="decrease" data-id="${item.id}" aria-label="ลดจำนวน ${product.name}">${ICONS.minus}</button>
                  <span class="cart-qty-value" aria-live="polite">${item.qty}</span>
                  <button type="button" class="cart-qty-btn" data-cart-action="increase" data-id="${item.id}" aria-label="เพิ่มจำนวน ${product.name}">${ICONS.plus}</button>
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

  // Product Detail Modal
  function openProductModal(productId) {
    const product = getProductById(productId);
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-body');
    if (!product || !modal || !content) return;

    state.activeModalProductId = product.id;
    state.modalQty = 1;
    state.isProductModalOpen = true;

    const tagsHtml = (product.tags || [])
      .map((t) => `<span class="shop-badge ${t === 'ผลไม้ตามฤดูกาล' ? 'shop-badge-seasonal' : 'shop-badge-cat'}">${t}</span>`)
      .join('');

    content.innerHTML = `
      <div class="pmodal-grid">
        <div class="pmodal-media">
          <img src="${product.image}" alt="${product.name}" width="480" height="480" />
          <span class="shop-badge shop-badge-demo">DEMO PRODUCT IMAGE</span>
        </div>
        <div class="pmodal-details">
          <div class="pmodal-badges">${tagsHtml}</div>
          <div class="pmodal-sku">รหัสสินค้าจำลอง: ${product.sku} · สถานะ: ${product.statusLabel}</div>
          <h3 class="pmodal-title">${product.name}</h3>
          <div class="pmodal-price">฿${formatPrice(product.price)} <small>/ ${product.unit}</small></div>
          <p class="pmodal-desc">${product.description}</p>
          <div class="pmodal-disclaimer">
            <strong>หมายเหตุ (DEMO ONLY):</strong> ข้อมูลสินค้า ราคา และสถานะในหน้านี้เป็นข้อมูลสมมติสำหรับทดสอบ UI/UX เท่านั้น ไม่ใช่ราคาขายจริงหรือสต็อกจริงของร้าน SG FRUIT
          </div>
          <div class="pmodal-actions">
            <div class="cart-qty-control pmodal-qty">
              <button type="button" class="cart-qty-btn" id="pmodal-qty-minus" aria-label="ลดจำนวน">${ICONS.minus}</button>
              <span class="cart-qty-value" id="pmodal-qty-val">1</span>
              <button type="button" class="cart-qty-btn" id="pmodal-qty-plus" aria-label="เพิ่มจำนวน">${ICONS.plus}</button>
            </div>
            <button type="button" class="shop-btn-add pmodal-add-btn" id="pmodal-add-cart-btn">
              ${ICONS.plus}
              <span id="pmodal-add-cart-label">เพิ่มลงตะกร้า (฿${formatPrice(product.price)})</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const minusBtn = document.getElementById('pmodal-qty-minus');
    const plusBtn = document.getElementById('pmodal-qty-plus');
    const qtyValEl = document.getElementById('pmodal-qty-val');
    const addBtn = document.getElementById('pmodal-add-cart-btn');

    function syncModalQty() {
      if (qtyValEl) qtyValEl.textContent = String(state.modalQty);
      const labelEl = document.getElementById('pmodal-add-cart-label');
      if (labelEl) {
        labelEl.textContent = `เพิ่มลงตะกร้า (฿${formatPrice(product.price * state.modalQty)})`;
      } else if (addBtn) {
        addBtn.innerHTML = `${ICONS.plus} <span>เพิ่มลงตะกร้า (฿${formatPrice(product.price * state.modalQty)})</span>`;
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
        addToCart(product.id, state.modalQty);
        closeProductModal();
      });
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateBodyScrollLock();

    const closeBtn = document.getElementById('product-modal-close');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    state.isProductModalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScrollLock();
  }

  // Demo Order Summary Modal (Phase 6 Checkout Requirement)
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
        const product = getProductById(item.id) || item;
        const lineTotal = product.price * item.qty;
        return `
          <div class="order-summary-item">
            <div class="order-summary-item-left">
              <strong>${product.name}</strong>
              <span>รหัส ${product.sku} · จำนวน ${item.qty} ${product.unit} (× ฿${formatPrice(product.price)})</span>
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
          <strong>DEMO ORDER SUMMARY (ข้อมูลทดลองเท่านั้น)</strong>
        </div>
        <p>หน้านี้แสดงสรุปรายการสำหรับทดสอบระบบตะกร้าสินค้าเท่านั้น เว็บไซต์เวอร์ชันนี้ยังไม่มีระบบชำระเงินจริง ไม่มีการรับข้อมูลบัตรเครดิต และไม่มีการส่งคำสั่งซื้อจริงไปยังร้าน SG FRUIT</p>
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
          <span>ยอดรวมสินค้าจำลอง (DEMO SUBTOTAL)</span>
          <strong>฿${formatPrice(subtotal)}</strong>
        </div>
      </div>
      <div class="order-summary-note">
        * โครงสร้างข้อมูลตะกร้าสินค้า (<code>window.SG_FRUIT_SHOP.getCartState()</code>) พร้อมเชื่อมต่อกับระบบ Checkout หรือ LINE Official Account ของทางร้านในอนาคต
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

  // Initialize Event Listeners
  function initShopAndCart() {
    loadCart();
    renderCategories();
    renderProducts();
    renderCartUI();

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
        const id = actBtn.getAttribute('data-id');
        const item = state.cart.find((c) => c.id === id);
        if (!item) return;
        if (action === 'increase') {
          updateCartItemQty(id, item.qty + 1);
        } else if (action === 'decrease') {
          updateCartItemQty(id, item.qty - 1);
        } else if (action === 'remove') {
          removeFromCart(id);
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

    // Global Escape key handler for Drawer & Modals
    global.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.isOrderModalOpen) {
          closeOrderSummaryModal();
        } else if (state.isProductModalOpen) {
          closeProductModal();
        } else if (state.isDrawerOpen) {
          closeCartDrawer();
        }
      }
    });
  }

  // Expose public API for testing & integration
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
    setCategory: (cat) => {
      state.category = cat || 'all';
      state.currentPage = 1;
      renderCategories();
      renderProducts();
    },
    getCartState: () => ({
      items: [...state.cart],
      ...getCartTotals(),
      isDemo: true
    }),
    getFilteredProducts
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShopAndCart);
  } else {
    initShopAndCart();
  }
})(window);
