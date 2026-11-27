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

    .p-nav {
      position: sticky; top: 0; z-index: 100; height: var(--header-h);
      background: rgba(247, 245, 233, 0.94); backdrop-filter: blur(14px);
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
    .p-nav-actions { display: flex; align-items: center; gap: 12px; }
    .p-cart-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--forest); color: #fff; padding: 9px 18px; border-radius: 999px;
      font-size: 13px; font-weight: 700; border: none; cursor: pointer;
    }
    .p-cart-count { background: #fff; color: var(--forest); font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 999px; }

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
    .p-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
    .p-btn-add { background: var(--forest); color: #fff; border: none; border-radius: 14px; padding: 14px 20px; font-size: 15px; font-weight: 700; cursor: pointer; }
    .p-btn-buy { background: #d4a359; color: #1a271d; border: none; border-radius: 14px; padding: 14px 20px; font-size: 15px; font-weight: 800; cursor: pointer; }

    .p-highlights { display: flex; flex-direction: column; gap: 8px; background: #fff; border: 1px solid rgba(33, 77, 52, 0.1); border-radius: 14px; padding: 14px 18px; font-size: 13px; line-height: 1.5; }
    .p-desc-section { border-top: 1px solid var(--line); padding-top: 18px; }
    .p-desc-title { font-size: 15px; font-weight: 700; color: var(--forest); margin-bottom: 6px; }
    .p-desc-body { font-size: 13.5px; color: var(--ink-soft); line-height: 1.65; white-space: pre-line; }

    .p-trust-section { margin-top: 48px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 24px; padding: 32px; }
    .p-trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center; }

    .p-footer { background: #1b261d; color: #e6eae4; padding: 56px clamp(20px, 4vw, 48px) 32px; margin-top: 64px; }
    .p-footer-inner { max-width: 1200px; margin: 0 auto 40px; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 40px; }
    .p-footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px; font-size: 12px; color: #8c9b8e; }

    @media (max-width: 900px) {
      .p-detail-grid { grid-template-columns: 1fr; }
      .p-trust-grid { grid-template-columns: repeat(2, 1fr); }
      .p-footer-inner { grid-template-columns: 1fr; }
      .p-nav-links { display: none; }
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
      <button type="button" class="p-cart-btn" data-open-cart>
        <span>ตะกร้า</span>
        <span class="p-cart-count" id="nav-cart-badge">0</span>
      </button>
    </div>
  </header>

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

        <div class="p-btn-row">
          <button type="button" class="p-btn-add" data-action="add-to-cart" data-id="${product.id}">ใส่ตะกร้า</button>
          <button type="button" class="p-btn-buy" data-action="buy-now" data-id="${product.id}">สั่งซื้อทันที</button>
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

  <script src="/js/products-data.js?v=20261127-v1"></script>
  <script src="/js/api-adapter.js?v=20261127-v1"></script>
  <script src="/js/site-profile.js?v=20261127-v1"></script>
  <script src="/js/thai-address.js?v=20261127-v1"></script>
  <script src="/js/shop-cart.js?v=20261127-v1"></script>
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
