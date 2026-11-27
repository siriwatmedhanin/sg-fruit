/**
 * Cloudflare Pages Function: /products/:slug
 * Serves static pre-rendered product page if available (via next()),
 * or dynamically SSR-renders the product page from D1 Backend API.
 */

const BACKEND_API = 'https://staging-api.siriwatmedhanin.com';
const SITE_ORIGIN = 'https://sg-fruit.siriwatmedhanin.com';

function normalizeCategory(raw) {
  const cat = (raw.category_name || raw.category || raw.category_id || '').trim();
  if (cat.includes('ผัก') || cat === 'cat-veg' || cat === 'fresh-vegetables') {
    return { name: 'ผักสด', slug: 'fresh-vegetables' };
  }
  if (cat.includes('นำเข้า') || cat === 'cat-imported' || cat === 'imported-produce' || cat === 'imported-fruits') {
    return { name: 'ผลไม้นำเข้า', slug: 'imported-produce' };
  }
  return { name: 'ผลไม้ไทยตามฤดูกาล', slug: 'seasonal-fruits' };
}

function resolveImgUrl(url, apiOrigin) {
  if (!url) return `${SITE_ORIGIN}/Pic/sg-fruit-logo.webp`;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/')) return `${apiOrigin}${url}`;
  return `${SITE_ORIGIN}/${url.replace(/^\/+/, '')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(product, apiOrigin) {
  const catInfo = normalizeCategory(product);
  const slug = product.slug || product.id;
  const canonicalUrl = `${SITE_ORIGIN}/products/${encodeURIComponent(slug)}`;
  const altText = `${product.name} — ${catInfo.name} คัดสดจากตลาดไท ตลาดสี่มุมเมือง โดย SG FRUIT`;

  const variant = (Array.isArray(product.variants) && product.variants.length > 0) ? product.variants[0] : null;
  const price = variant && typeof variant.price === 'number' ? variant.price : (Number(product.price) || 0);
  const unit = (variant && variant.unit) || product.unit || 'กิโลกรัม';
  const priceFormatted = Number(price).toLocaleString('th-TH');

  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.primary_image ? [product.primary_image] : [{ url: product.image || '/Pic/sg-fruit-logo.webp' }]);

  const images = rawImages.map((img, idx) => ({
    url: resolveImgUrl(img.url || img, apiOrigin),
    thumbnail_url: resolveImgUrl(img.thumbnail_url || img.url || img, apiOrigin),
    is_primary: idx === 0 || Boolean(img.is_primary)
  }));
  const mainImage = images[0].url;

  const rawDesc = (product.description || '').trim();
  const cleanDesc = rawDesc
    ? rawDesc.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').substring(0, 155)
    : `สั่งซื้อ ${product.name} คัดสดใหม่จากตลาดไท ตลาดสี่มุมเมือง และสวนเกษตรกร ราคา ฿${priceFormatted}/${unit} จัดส่งด่วนทั่วไทย รับประกันเคลม 100% โดย SG FRUIT`;

  const schemaJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Store', 'OnlineStore', 'Organization'],
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'SG FRUIT (เอสจี ฟรุ๊ต ผลไม้ตามฤดูกาล)',
        legalName: 'บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด',
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/Pic/sg-fruit-logo.webp`,
        image: `${SITE_ORIGIN}/Pic/sg-fruit-logo.webp`,
        email: 'contact@siriwatmedhanin.com',
        telephone: '091-909-8902',
        sameAs: [
          'https://siriwatmedhanin.com',
          'https://www.facebook.com/share/1E7H4sXEYz/?mibextid=wwXIfr',
          'https://www.tiktok.com/@sg_fruit?_r=1&_t=ZS-9BaDvzLju8y'
        ],
        address: {
          '@type': 'PostalAddress',
          streetAddress: '115/1 หมู่ 2 ตำบลท่าแค',
          addressLocality: 'อำเภอเมืองพัทลุง',
          addressRegion: 'พัทลุง',
          postalCode: '93000',
          addressCountry: 'TH'
        }
      },
      {
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        name: product.name,
        description: cleanDesc,
        image: mainImage,
        sku: product.sku || `SG-${product.id}`,
        category: `Food, Beverages & Tobacco > Food Items > Fruits & Vegetables > ${catInfo.name}`,
        brand: { '@type': 'Brand', name: 'SG FRUIT' },
        offers: {
          '@type': 'Offer',
          price: price,
          priceCurrency: 'THB',
          priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          url: canonicalUrl,
          seller: {
            '@type': 'Organization',
            '@id': `${SITE_ORIGIN}/#organization`,
            name: 'SG FRUIT (บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด)'
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: { '@type': 'MonetaryAmount', value: 60, currency: 'THB' },
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'TH' }
          }
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: catInfo.name, item: `${SITE_ORIGIN}/${catInfo.slug}` },
          { '@type': 'ListItem', position: 3, name: product.name, item: canonicalUrl }
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#f7f5e9" />
  <title>${escapeHtml(product.name)} — ${escapeHtml(catInfo.name)} คัดสดจากตลาดไท ตลาดสี่มุมเมือง | SG FRUIT</title>
  <meta name="description" content="${escapeHtml(cleanDesc)}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <meta property="og:type" content="product" />
  <meta property="og:locale" content="th_TH" />
  <meta property="og:site_name" content="SG FRUIT โดย บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(product.name)} — ฿${priceFormatted}/${unit} | SG FRUIT" />
  <meta property="og:description" content="${escapeHtml(cleanDesc)}" />
  <meta property="og:image" content="${mainImage}" />
  <meta property="product:price:amount" content="${price}" />
  <meta property="product:price:currency" content="THB" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(product.name)} — ฿${priceFormatted}/${unit} | SG FRUIT" />
  <meta name="twitter:description" content="${escapeHtml(cleanDesc)}" />
  <meta name="twitter:image" content="${mainImage}" />

  <script type="application/ld+json">
${JSON.stringify(schemaJson, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />

  <!-- Centralized Cart Drawer & Checkout UI Stylesheet -->
  <link rel="stylesheet" href="/css/cart-checkout-ui.css" />

  <style>
    :root {
      --bg: #f7f5e9;
      --card-bg: #fffef9;
      --forest: #214d34;
      --forest-dark: #163824;
      --gold: #d4a359;
      --ink: #1e261f;
      --ink-soft: #38423b;
      --muted: #6b776e;
      --line: rgba(33, 77, 52, 0.14);
      --font-th: "Noto Sans Thai", "Plus Jakarta Sans", sans-serif;
      --font-display: "Cinzel", "Playfair Display", serif;
      --shadow-sm: 0 4px 14px rgba(22, 56, 36, 0.06);
      --header-h: 74px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; font-family: var(--font-th); background: var(--bg); color: var(--ink); }
    body { min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

    /* ================= SVG ICON SYSTEM ================= */
    .ui-icon {
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
      width: 19px;
      height: 19px;
      stroke: currentColor;
      stroke-width: 1.85;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      pointer-events: none;
      transition: transform 0.2s ease, stroke 0.2s ease, color 0.2s ease;
    }
    .ui-icon-xs { width: 13px; height: 13px; stroke-width: 2.2; }
    .ui-icon-sm { width: 16px; height: 16px; stroke-width: 2; }
    .ui-icon-lg { width: 22px; height: 22px; }

    .p-nav {
      position: sticky; top: 0; z-index: 100; height: var(--header-h);
      background: rgba(247, 245, 233, 0.94); backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--line);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 clamp(20px, 4vw, 48px);
    }
    .p-nav-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--forest); }
    .p-nav-logo { width: 44px; height: 44px; border-radius: 50%; object-fit: contain; }
    .p-brand-text { display: flex; flex-direction: column; }
    .p-brand-title { font-family: var(--font-display); font-size: 19px; font-weight: 800; }
    .p-brand-sub { font-size: 10.5px; color: var(--muted); }
    .p-nav-links { display: flex; align-items: center; gap: 24px; list-style: none; }
    .p-nav-links a { text-decoration: none; color: var(--ink-soft); font-size: 13.5px; font-weight: 600; }
    .p-nav-actions { display: flex; align-items: center; gap: 8px; }
    .p-cart-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--forest); color: #fff; padding: 9px 18px; border-radius: 999px;
      font-size: 13.5px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.2); cursor: pointer;
      box-shadow: 0 4px 14px rgba(33, 77, 52, 0.22);
      transition: background 0.2s, transform 0.15s;
    }
    .p-cart-btn:hover { background: var(--forest-dark); transform: translateY(-1px); }
    .cart-count-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
      background: #fff; color: var(--forest); font-size: 11px; font-weight: 800; line-height: 1;
    }

    /* Admin Portal Link in Desktop Navbar */
    .nav-admin-divider {
      width: 1px; height: 20px; background: rgba(33, 77, 52, 0.16);
      margin: 0 4px 0 6px; flex-shrink: 0;
    }
    .nav-admin-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px;
      border: 1px solid rgba(33, 77, 52, 0.22); border-radius: 999px;
      background: rgba(255, 255, 255, 0.65); color: var(--forest);
      font-size: 12px; font-weight: 600; text-decoration: none; white-space: nowrap;
      cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
    }
    .nav-admin-btn:hover {
      background: #ffffff; color: var(--ink); border-color: var(--forest);
      box-shadow: 0 2px 8px rgba(24, 53, 38, 0.10); transform: translateY(-1px);
    }
    .nav-admin-btn:focus-visible { outline: 2px solid var(--forest); outline-offset: 2px; }
    .nav-admin-icon { width: 13px; height: 13px; stroke-width: 2.1; flex-shrink: 0; color: currentColor; }

    /* Mobile Menu Toggle & Drawer */
    .mobile-menu-toggle {
      display: none; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 50%;
      border: 1px solid rgba(33, 77, 52, 0.18); background: rgba(255, 255, 255, 0.85);
      color: var(--ink); padding: 0; cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }
    .mobile-menu-toggle:hover {
      background: rgba(33, 77, 52, 0.08); color: var(--forest); border-color: var(--forest);
    }
    .mobile-nav-drawer {
      display: none; position: fixed; top: var(--header-h); left: 0; right: 0;
      z-index: 119; background: rgba(247, 245, 233, 0.98);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--line); padding: 14px 20px 20px;
      box-shadow: 0 16px 32px rgba(24, 53, 38, 0.12); flex-direction: column; gap: 6px;
    }
    .mobile-nav-drawer.is-open { display: flex; }
    .mobile-nav-drawer a, .mobile-nav-drawer button {
      text-align: left; padding: 11px 14px; border-radius: 12px;
      text-decoration: none; font-weight: 700; font-size: 14px;
      color: var(--ink); border: 0; background: transparent;
      display: flex; align-items: center; justify-content: space-between; cursor: pointer;
    }
    .mobile-nav-drawer a:hover, .mobile-nav-drawer button:hover {
      background: rgba(115, 153, 56, 0.14);
    }
    .mobile-drawer-divider { height: 1px; background: rgba(33, 77, 52, 0.12); margin: 8px 4px 4px; border: 0; }
    .mobile-admin-link {
      color: var(--ink-soft) !important; font-weight: 600 !important;
      border: 1px solid rgba(33, 77, 52, 0.14) !important; border-radius: 12px !important;
      background: rgba(255, 255, 255, 0.5) !important; transition: all 0.2s ease;
    }
    .mobile-admin-link:hover {
      color: var(--forest) !important; background: #ffffff !important; border-color: var(--forest) !important;
    }

    .p-breadcrumb-wrap { background: #f1edde; border-bottom: 1px solid var(--line); padding: 14px clamp(20px, 4vw, 48px); }
    .p-breadcrumb { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 8px; font-size: 13px; flex-wrap: wrap; }
    .p-breadcrumb a { color: var(--forest); text-decoration: none; font-weight: 600; }
    .p-breadcrumb-sep { color: var(--muted); }
    .p-breadcrumb-cur { color: var(--muted); }

    .p-container { max-width: 1200px; width: 100%; margin: 36px auto 64px; padding: 0 clamp(16px, 3.5vw, 32px); flex: 1; }
    .p-detail-grid {
      display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(32px, 4.5vw, 64px);
      background: var(--card-bg); border: 1px solid var(--line); border-radius: 28px;
      padding: clamp(24px, 4vw, 48px); box-shadow: var(--shadow-sm);
    }
    .p-main-img-box { width: 100%; aspect-ratio: 1/1; border-radius: 20px; overflow: hidden; background: #f9f8f2; border: 1px solid rgba(33, 77, 52, 0.1); }
    .p-main-img { width: 100%; height: 100%; object-fit: cover; }
    .p-info { display: flex; flex-direction: column; gap: 16px; }
    .p-cat-badge { display: inline-flex; align-items: center; background: rgba(33, 77, 52, 0.08); color: var(--forest); font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px; text-decoration: none; }
    .p-stock-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 4px 10px; border-radius: 999px; }
    .p-stock-dot { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; }
    .p-title { font-size: clamp(22px, 3vw, 32px); font-weight: 800; line-height: 1.25; color: var(--ink); }
    .p-price-card { background: #fbf9f0; border: 1px solid rgba(33, 77, 52, 0.12); border-radius: 16px; padding: 16px 20px; display: flex; align-items: baseline; gap: 8px; }
    .p-price-num { font-size: 34px; font-weight: 800; color: var(--forest); }
    .p-price-unit { font-size: 14px; color: var(--muted); }

    /* Quantity and Action Buttons */
    .p-cta-box { display: flex; flex-direction: column; gap: 14px; margin-top: 6px; }
    .p-qty-row { display: flex; align-items: center; gap: 14px; }
    .p-qty-label { font-size: 13.5px; font-weight: 700; color: var(--ink-soft); }
    .p-qty-controls {
      display: inline-flex; align-items: center; border: 1px solid rgba(33, 77, 52, 0.2);
      border-radius: 999px; background: #fff; overflow: hidden;
    }
    .p-qty-btn {
      width: 36px; height: 36px; border: 0; background: transparent;
      font-size: 18px; font-weight: 700; color: var(--forest); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .p-qty-btn:hover { background: rgba(33, 77, 52, 0.08); }
    .p-qty-input {
      width: 44px; height: 36px; border: 0; text-align: center;
      font-size: 15px; font-weight: 700; color: var(--ink); background: transparent;
    }
    .p-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
    .p-btn-add {
      background: var(--forest); color: #fff; border: none; border-radius: 14px;
      padding: 14px 20px; font-size: 15px; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      transition: background 0.2s, transform 0.15s;
    }
    .p-btn-add:hover { background: var(--forest-dark); transform: translateY(-1px); }
    .p-btn-buy {
      background: #d4a359; color: #1a271d; border: none; border-radius: 14px;
      padding: 14px 20px; font-size: 15px; font-weight: 800; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      transition: opacity 0.2s, transform 0.15s;
    }
    .p-btn-buy:hover { opacity: 0.92; transform: translateY(-1px); }

    .p-highlights { display: flex; flex-direction: column; gap: 8px; background: #fff; border: 1px solid rgba(33, 77, 52, 0.1); border-radius: 14px; padding: 14px 18px; font-size: 13px; line-height: 1.5; }
    .p-desc-section { border-top: 1px solid var(--line); padding-top: 18px; }
    .p-desc-title { font-size: 15px; font-weight: 700; color: var(--forest); margin-bottom: 6px; }
    .p-desc-body { font-size: 13.5px; color: var(--ink-soft); line-height: 1.65; white-space: pre-line; }

    .p-trust-section { margin-top: 48px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 24px; padding: 32px; }
    .p-trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center; }

    .p-footer { background: #1b261d; color: #e6eae4; padding: 56px clamp(20px, 4vw, 48px) 32px; margin-top: 64px; }
    .p-footer-inner { max-width: 1200px; margin: 0 auto 40px; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 40px; }
    .p-footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px; font-size: 12px; color: #8c9b8e; }

    /* Cart Drawer, Modals, Checkout, Address Autocomplete, Bank Details & Slip Upload are centralized in /css/cart-checkout-ui.css */

    @media (max-width: 900px) {
      .p-detail-grid { grid-template-columns: 1fr; }
      .p-trust-grid { grid-template-columns: repeat(2, 1fr); }
      .p-footer-inner { grid-template-columns: 1fr; }
      .p-nav-links, .nav-admin-btn, .nav-admin-divider { display: none !important; }
      .mobile-menu-toggle { display: inline-flex !important; }
    }
  </style>
</head>
<body>
  <header class="p-nav">
    <a href="/" class="p-nav-brand">
      <img src="/Pic/sg-fruit-logo.webp" alt="SG FRUIT โลโก้" class="p-nav-logo" width="44" height="44" />
      <div class="p-brand-text">
        <span class="p-brand-title">SG FRUIT</span>
        <span class="p-brand-sub">เอสจี ฟรุ๊ต ผลไม้ตามฤดูกาล</span>
      </div>
    </a>
    <nav>
      <ul class="p-nav-links">
        <li><a href="/">หน้าแรก</a></li>
        <li><a href="/#shop">เลือกซื้อสินค้า</a></li>
        <li><a href="/seasonal-fruits">ผลไม้ตามฤดูกาล</a></li>
        <li><a href="/imported-produce">ผลไม้นำเข้า</a></li>
        <li><a href="/fresh-vegetables">ผักสด</a></li>
      </ul>
    </nav>
    <div class="p-nav-actions">
      <button type="button" class="p-cart-btn" data-open-cart aria-label="เปิดตะกร้าสินค้า">
        <svg class="ui-icon nav-cart-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 11-1 9"/>
          <path d="m19 11-4-7"/>
          <path d="M2 11h20"/>
          <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/>
          <path d="M4.5 15.5h15"/>
          <path d="m5 11 4-7"/>
          <path d="m9 11 1 9"/>
        </svg>
        <span>ตะกร้า</span>
        <span class="cart-count-badge" data-cart-count>0</span>
      </button>

      <div class="nav-admin-divider" aria-hidden="true"></div>
      <a href="https://staging-admin.siriwatmedhanin.com" target="_blank" rel="noopener noreferrer" class="nav-admin-btn" aria-label="เข้าสู่ระบบหลังบ้านสำหรับแอดมิน" title="ระบบหลังบ้านสำหรับแอดมิน">
        <svg class="ui-icon nav-admin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>แอดมิน</span>
      </a>

      <button type="button" class="mobile-menu-toggle" id="mobile-menu-toggle" aria-expanded="false" aria-controls="mobile-nav-drawer" aria-label="เปิดเมนูนำทาง">
        <svg class="ui-icon menu-icon-bars" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="4" x2="20" y1="12" y2="12"/>
          <line x1="4" x2="20" y1="6" y2="6"/>
          <line x1="4" x2="20" y1="18" y2="18"/>
        </svg>
        <svg class="ui-icon menu-icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: none;">
          <path d="M18 6 6 18"/>
          <path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
  </header>

  <!-- MOBILE NAV DRAWER -->
  <div class="mobile-nav-drawer" id="mobile-nav-drawer" aria-label="เมนูมือถือ">
    <a href="/"><span>หน้าแรก</span> ↗</a>
    <a href="/#shop"><span>เลือกซื้อสินค้า</span> ↗</a>
    <a href="/seasonal-fruits"><span>ผลไม้ตามฤดูกาล</span> ↗</a>
    <a href="/imported-produce"><span>ผลไม้นำเข้า</span> ↗</a>
    <a href="/fresh-vegetables"><span>ผักสด</span> ↗</a>
    <a href="/#about"><span>เกี่ยวกับ SG FRUIT</span> ↗</a>
    <a href="/#contact"><span>ติดต่อเรา</span> ↗</a>
    <a href="/#track" id="mobile-track-link"><span>เช็กสถานะออเดอร์</span> ↗</a>
    <button type="button" data-open-cart>
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 11-1 9"/>
          <path d="m19 11-4-7"/>
          <path d="M2 11h20"/>
          <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/>
          <path d="M4.5 15.5h15"/>
          <path d="m5 11 4-7"/>
          <path d="m9 11 1 9"/>
        </svg>
        เปิดตะกร้าสินค้า
      </span>
      <span class="cart-count-badge" data-cart-count>0</span>
    </button>
    <div class="mobile-drawer-divider" aria-hidden="true"></div>
    <a href="https://staging-admin.siriwatmedhanin.com" target="_blank" rel="noopener noreferrer" class="mobile-admin-link" aria-label="เข้าสู่ระบบหลังบ้านสำหรับแอดมิน">
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        แอดมิน (เข้าสู่ระบบหลังบ้าน)
      </span>
      <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
    </a>
  </div>

  <nav class="p-breadcrumb-wrap" aria-label="Breadcrumb">
    <div class="p-breadcrumb">
      <a href="/">หน้าแรก</a>
      <span class="p-breadcrumb-sep">/</span>
      <a href="/${catInfo.slug}">${catInfo.name}</a>
      <span class="p-breadcrumb-sep">/</span>
      <span class="p-breadcrumb-cur">${escapeHtml(product.name)}</span>
    </div>
  </nav>

  <main class="p-container">
    <article class="p-detail-grid">
      <div class="p-main-img-box">
        <img id="product-hero-image" class="p-main-img" src="${mainImage}" alt="${escapeHtml(altText)}" width="600" height="600" />
      </div>

      <div class="p-info">
        <div>
          <a href="/${catInfo.slug}" class="p-cat-badge">${catInfo.name}</a>
          <span class="p-stock-pill"><span class="p-stock-dot"></span>พร้อมจัดส่ง</span>
        </div>
        <h1 class="p-title">${escapeHtml(product.name)}</h1>
        <div class="p-price-card">
          <span style="font-size:20px;font-weight:700;color:var(--forest);">฿</span>
          <span class="p-price-num">${priceFormatted}</span>
          <span class="p-price-unit">/ ${escapeHtml(unit)}</span>
        </div>

        <div class="p-cta-box">
          <div class="p-qty-row">
            <span class="p-qty-label">จำนวน:</span>
            <div class="p-qty-controls">
              <button type="button" class="p-qty-btn" id="p-qty-minus" aria-label="ลดจำนวน">−</button>
              <input type="number" class="p-qty-input" id="pdetail-qty-input" value="1" min="1" max="99" aria-label="จำนวนสินค้า" />
              <button type="button" class="p-qty-btn" id="p-qty-plus" aria-label="เพิ่มจำนวน">+</button>
            </div>
            <span style="font-size: 13px; color: var(--muted);">${escapeHtml(unit)}</span>
          </div>

          <div class="p-btn-row">
            <button
              type="button"
              class="p-btn-add"
              data-action="add-to-cart"
              data-id="${product.id}"
              aria-label="เพิ่ม ${escapeHtml(product.name)} ลงตะกร้า"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>ใส่ตะกร้า</span>
            </button>

            <button
              type="button"
              class="p-btn-buy"
              data-action="buy-now"
              data-id="${product.id}"
              aria-label="สั่งซื้อ ${escapeHtml(product.name)} ทันที"
            >
              <span>สั่งซื้อทันที</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="p-highlights">
          <div>✓ คัดสดใหม่วันต่อวันจาก<strong>ตลาดไท ตลาดสี่มุมเมือง</strong> และสวนเกษตรกร</div>
          <div>✓ ห่อโฟมและตาข่ายกันกระแทกทุกลูก ป้องกันการช้ำเสียหาย</div>
          <div>✓ จัดส่งด่วนทั่วไทย รองรับ<strong>เก็บเงินปลายทาง (COD)</strong></div>
          <div>✓ <strong>รับประกันเคลม 100%</strong> ภายใน 24 ชม. หากช้ำเสียหาย</div>
        </div>

        <div class="p-desc-section">
          <h2 class="p-desc-title">รายละเอียดสินค้าและแหล่งที่มา</h2>
          <div class="p-desc-body">${escapeHtml(product.description || `${product.name} คุณภาพเกรดพรีเมียม คัดสดตรงจากตลาดไท ตลาดสี่มุมเมือง ส่งตรงถึงบ้านคุณ`)}</div>
        </div>
      </div>
    </article>

    <section class="p-trust-section">
      <div class="p-trust-grid">
        <div><strong>คัดตรงจากตลาดไท-สี่มุมเมือง</strong><p style="font-size:12px;color:var(--muted);margin-top:4px;">คัดสดใหม่วันต่อวัน</p></div>
        <div><strong>แพ็กกันกระแทกทุกลูก</strong><p style="font-size:12px;color:var(--muted);margin-top:4px;">หุ้มโฟมหนาพิเศษ ไม่ช้ำ</p></div>
        <div><strong>เก็บเงินปลายทาง (COD)</strong><p style="font-size:12px;color:var(--muted);margin-top:4px;">หรือโอนผ่าน QR พร้อมเพย์</p></div>
        <div><strong>รับประกันเคลม 100%</strong><p style="font-size:12px;color:var(--muted);margin-top:4px;">เคลมง่ายใน 24 ชั่วโมง</p></div>
      </div>
    </section>
  </main>

  <footer class="p-footer">
    <div class="p-footer-inner">
      <div>
        <h4>SG FRUIT</h4>
        <p>บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด (Siriwatmedhanin Group Co., Ltd.)</p>
        <a href="https://line.me/R/ti/p/@934wscfl" target="_blank" rel="noopener noreferrer" class="p-footer-line-btn" aria-label="ติดต่อ LINE Official SG FRUIT" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#f0fdf4;border:1px solid #06C755;color:#059640;font-size:12px;font-weight:700;text-decoration:none;margin-top:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          <span>LINE Official: SG FRUIT</span>
        </a>
      </div>
      <div>
        <h5>หมวดหมู่</h5>
        <ul style="list-style:none;line-height:2;">
          <li><a href="/seasonal-fruits" style="color:#d1dbd2;text-decoration:none;">ผลไม้ตามฤดูกาล</a></li>
          <li><a href="/imported-produce" style="color:#d1dbd2;text-decoration:none;">ผลไม้นำเข้า</a></li>
          <li><a href="/fresh-vegetables" style="color:#d1dbd2;text-decoration:none;">ผักสด</a></li>
        </ul>
      </div>
      <div>
        <h5>ติดต่อเรา</h5>
        <p style="font-size:13px;color:#a9b5ab;line-height:1.8;">091-909-8902<br/>contact@siriwatmedhanin.com<br/><a href="https://siriwatmedhanin.com" target="_blank" rel="noopener noreferrer" style="color:#d4a359;">บริษัทแม่ (siriwatmedhanin.com) ↗</a></p>
      </div>
    </div>
    <div class="p-footer-bottom">
      <span>© 2026 บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด</span>
    </div>
  </footer>

  <!-- SHOPPING CART DRAWER -->
  <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" aria-hidden="true">
    <div class="cart-drawer-backdrop"></div>
    <div class="cart-drawer-panel">
      <header class="cart-drawer-header">
        <h3 class="cart-drawer-title" id="cart-drawer-title">
          <span>ตะกร้าสินค้า SG FRUIT</span>
          <span class="cart-count-badge" data-cart-count>0</span>
        </h3>
        <button type="button" class="cart-drawer-close" id="cart-drawer-close" aria-label="ปิดตะกร้าสินค้า">
          <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      </header>
      <div class="cart-drawer-trust-note">
        <div class="cart-trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <span>รับประกันเคลม 100% หากผลไม้เสียหายจากการขนส่ง</span>
        </div>
        <div class="cart-trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="1" y="6" rx="2"/><path d="M17 9h4l3 3v4a2 2 0 0 1-2 2h-1"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
          <span>แพ็กกันกระแทกอย่างดี · จัดส่งรวดเร็วทั่วไทย</span>
        </div>
      </div>
      <div class="cart-drawer-body">
        <div class="cart-drawer-items" id="cart-drawer-items"></div>
        <div class="cart-drawer-empty" id="cart-drawer-empty">
          <h4>ยังไม่มีสินค้าในตะกร้า</h4>
          <p>เลือกชมผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดได้ในหน้าร้านค้า</p>
          <a href="/#shop" class="cart-checkout-btn" style="margin-top:12px;font-size:13.5px;padding:10px 20px;text-decoration:none;display:inline-block;">เลือกซื้อสินค้า ↗</a>
        </div>
      </div>
      <footer class="cart-drawer-footer" id="cart-drawer-footer" hidden>
        <div class="cart-summary-row">
          <span>จำนวนสินค้าที่เลือก</span>
          <span id="cart-total-items-label">0 รายการ</span>
        </div>
        <div class="cart-summary-row is-total">
          <span>ยอดรวมสินค้า</span>
          <strong id="cart-subtotal-value">฿0</strong>
        </div>
        <div class="cart-footer-actions">
          <button type="button" class="cart-clear-btn" id="cart-clear-btn">ล้างตะกร้า</button>
          <button type="button" class="cart-checkout-btn" id="cart-checkout-demo-btn">
            <span>ดำเนินการสั่งซื้อ (Checkout)</span> ↗
          </button>
        </div>
      </footer>
    </div>
  </aside>

  <!-- ORDER SUMMARY MODAL -->
  <div class="modal-overlay" id="order-summary-modal" role="dialog" aria-modal="true" aria-labelledby="order-summary-title" aria-hidden="true">
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <button type="button" class="modal-close-btn" id="order-summary-close" aria-label="ปิดหน้าสรุปรายการ">✕</button>
      <h3 id="order-summary-title" style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: var(--forest);">ขั้นตอนการสั่งซื้อและชำระเงิน (Checkout)</h3>
      <div id="order-summary-body"></div>
      <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
        <button type="button" class="cart-clear-btn" id="order-summary-back-btn">
          <span>กลับไปแก้ไขตะกร้า / เลือกสินค้าต่อ</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ORDER TRACKING MODAL -->
  <div class="modal-overlay" id="order-tracking-modal" role="dialog" aria-modal="true" aria-labelledby="order-tracking-title" aria-hidden="true">
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <button type="button" class="modal-close-btn" id="order-tracking-close" aria-label="ปิดหน้าต่างติดตามคำสั่งซื้อ">✕</button>
      <div style="margin-bottom: 16px;">
        <h3 id="order-tracking-title" style="margin: 0 0 4px; font-size: 21px; font-weight: 800; color: var(--forest);">ติดตามสถานะคำสั่งซื้อ (Order Tracking)</h3>
        <p style="margin: 0; font-size: 13px; color: var(--muted);">ตรวจสอบสถานะการแพ็กและเลขพัสดุได้ทันทีโดยไม่ต้องเข้าสู่ระบบ</p>
      </div>
      <div id="order-tracking-body"></div>
    </div>
  </div>

  <!-- POLICY INFO MODAL -->
  <div class="modal-overlay" id="policy-modal" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title" aria-hidden="true">
    <div class="modal-backdrop" id="policy-modal-backdrop"></div>
    <div class="modal-dialog policy-modal-card">
      <button type="button" class="modal-close-btn" id="policy-modal-close" aria-label="ปิดหน้าต่าง">✕</button>
      <header class="modal-header" style="margin-bottom: 16px; padding-right: 40px;">
        <h3 class="modal-title" id="policy-modal-title" style="font-size: 20px; font-weight: 700; color: var(--forest); margin: 0;">นโยบายและการรับประกัน SG FRUIT</h3>
      </header>
      <div class="modal-body policy-modal-body" id="policy-modal-content"></div>
    </div>
  </div>

  <!-- TOAST CONTAINER -->
  <div id="toast" class="toast" role="status" aria-live="polite"></div>

  <!-- SG FRUIT Storefront Core Engine -->
  <script src="/js/products-data.js?v=20261127-v2"></script>
  <script src="/js/api-adapter.js?v=20261127-v2"></script>
  <script src="/js/site-profile.js?v=20261127-v2"></script>
  <script src="/js/thai-address.js?v=20261127-v2"></script>
  <script src="/js/shop-cart.js?v=20261127-v2"></script>

  <!-- Client-side Interactive Scripts -->
  <script>
    (function() {
      // Quantity selector (+ / -)
      const qtyInput = document.getElementById('pdetail-qty-input');
      const minusBtn = document.getElementById('p-qty-minus');
      const plusBtn = document.getElementById('p-qty-plus');

      if (qtyInput && minusBtn && plusBtn) {
        minusBtn.addEventListener('click', () => {
          let val = parseInt(qtyInput.value, 10) || 1;
          if (val > 1) qtyInput.value = val - 1;
        });
        plusBtn.addEventListener('click', () => {
          let val = parseInt(qtyInput.value, 10) || 1;
          if (val < 99) qtyInput.value = val + 1;
        });
        qtyInput.addEventListener('change', () => {
          let val = parseInt(qtyInput.value, 10);
          if (isNaN(val) || val < 1) val = 1;
          if (val > 99) val = 99;
          qtyInput.value = val;
        });
      }

      // Add to Cart & Buy Now Handlers
      document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-action="add-to-cart"]');
        if (addBtn && !addBtn.closest('#shop-product-grid')) {
          const id = addBtn.getAttribute('data-id');
          const qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
          if (id && window.SG_FRUIT_SHOP && typeof window.SG_FRUIT_SHOP.addToCart === 'function') {
            window.SG_FRUIT_SHOP.addToCart(id, qty);
            if (typeof window.SG_FRUIT_SHOP.openCartDrawer === 'function') {
              window.SG_FRUIT_SHOP.openCartDrawer();
            }
          }
        }

        const buyBtn = e.target.closest('[data-action="buy-now"]');
        if (buyBtn) {
          const id = buyBtn.getAttribute('data-id');
          const qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
          if (id && window.SG_FRUIT_SHOP && typeof window.SG_FRUIT_SHOP.addToCart === 'function') {
            window.SG_FRUIT_SHOP.addToCart(id, qty);
            if (typeof window.SG_FRUIT_SHOP.closeCartDrawer === 'function') {
              window.SG_FRUIT_SHOP.closeCartDrawer();
            }
            if (typeof window.SG_FRUIT_SHOP.openOrderSummaryModal === 'function') {
              window.SG_FRUIT_SHOP.openOrderSummaryModal();
            }
          }
        }
      });

      // Mobile Menu Toggle
      const mobileToggle = document.getElementById('mobile-menu-toggle');
      const mobileDrawer = document.getElementById('mobile-nav-drawer');
      if (mobileToggle && mobileDrawer) {
        mobileToggle.addEventListener('click', () => {
          const isOpen = mobileDrawer.classList.toggle('is-open');
          mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          const bars = mobileToggle.querySelector('.menu-icon-bars');
          const close = mobileToggle.querySelector('.menu-icon-close');
          if (bars && close) {
            bars.style.display = isOpen ? 'none' : 'inline-block';
            close.style.display = isOpen ? 'inline-block' : 'none';
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { request, params, env, next } = context;
  const slug = params.slug;

  if (!slug) {
    return next();
  }

  // 1. Try static asset first (via Pages asset pipeline)
  const staticRes = await next();
  if (staticRes.status !== 404) {
    return staticRes;
  }

  // 2. Fallback: Dynamic SSR from Backend API
  const apiOrigin = (env && env.API_BASE_URL) || BACKEND_API;
  try {
    const apiRes = await fetch(`${apiOrigin}/api/products/${encodeURIComponent(slug)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });

    if (apiRes.ok) {
      const payload = await apiRes.json();
      if (payload && payload.ok && payload.data) {
        const html = renderHtml(payload.data, apiOrigin);
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400'
          }
        });
      }
    }
  } catch (err) {
    // If backend times out or fails, let Pages return 404
  }

  return staticRes;
}
