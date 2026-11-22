/**
 * Cloudflare Pages Middleware: Dynamic Open Graph & Deep Linking for SG FRUIT
 * Intercepts requests with ?product=<ID> or /p/<ID>
 * Injects dynamic <title>, Open Graph (og:title, og:description, og:image, og:url),
 * and Twitter Card metadata for social bots (LINE, Facebook, X, etc.) and deep linking.
 */

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Check for product deep link parameter (?product=... or ?p=... or /p/...)
  let productId = url.searchParams.get('product') || url.searchParams.get('p');
  const isPPath = url.pathname.startsWith('/p/');
  if (!productId && isPPath) {
    const parts = url.pathname.replace(/^\/p\//, '').split('/');
    productId = parts[0];
  }

  // If no product requested, pass through immediately
  if (!productId) {
    return next();
  }

  productId = productId.trim();
  if (!productId || !/^[a-zA-Z0-9_\-]+$/.test(productId)) {
    return next();
  }

  try {
    // 1. Fetch product details from staging backend with 2.5s abort timeout
    const apiOrigin = (env && env.API_BASE_URL) || 'https://staging-api.siriwatmedhanin.com';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const apiRes = await fetch(`${apiOrigin}/api/products/${encodeURIComponent(productId)}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SGFruit-OpenGraph-Bot/1.0'
      }
    });
    clearTimeout(timeout);

    if (!apiRes.ok) {
      // If product not found or backend error, fallback to default static page
      return next();
    }

    const payload = await apiRes.json();
    if (!payload || !payload.ok || !payload.data) {
      return next();
    }

    const product = payload.data;
    const productName = (product.name || '').trim() || 'ผลไม้คุณภาพ SG FRUIT';
    const variant = (Array.isArray(product.variants) && product.variants.length > 0) ? product.variants[0] : null;
    const priceNum = variant && typeof variant.price === 'number' ? variant.price : (product.price || 0);
    const unitStr = variant && variant.unit ? variant.unit : 'กิโลกรัม';
    const priceFormatted = Number(priceNum).toLocaleString('th-TH');

    // Title format: [ชื่อสินค้า] — ฿[ราคา]/[หน่วย] | SG FRUIT
    const ogTitle = `${productName} — ฿${priceFormatted}/${unitStr} | SG FRUIT`;

    // Clean description format
    let rawDesc = (product.description || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!rawDesc) {
      rawDesc = 'ผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสด คัดเกรดพิเศษ ส่งตรงความสดใหม่ถึงมือคุณ';
    }
    if (rawDesc.length > 155) {
      rawDesc = rawDesc.slice(0, 152) + '...';
    }
    const ogDesc = `${ogTitle}. ${rawDesc}`;

    // Resolve Image URL
    let ogImage = 'https://sg-fruit.siriwatmedhanin.com/Pic/sg-fruit-logo.webp';
    if (product.primary_image && product.primary_image.url) {
      const pUrl = product.primary_image.url;
      if (pUrl.startsWith('http://') || pUrl.startsWith('https://')) {
        ogImage = pUrl;
      } else if (pUrl.startsWith('/api/')) {
        ogImage = `${apiOrigin}${pUrl}`;
      } else if (pUrl.startsWith('/')) {
        ogImage = `https://sg-fruit.siriwatmedhanin.com${pUrl}`;
      }
    } else if (product.image_key) {
      ogImage = `${apiOrigin}/api/images/${product.image_key}`;
    }

    const canonicalUrl = `https://sg-fruit.siriwatmedhanin.com/?product=${encodeURIComponent(productId)}`;

    // Product JSON-LD Structured Data for Merchant Listings & Google Search Console
    const productJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': canonicalUrl,
      name: productName,
      description: rawDesc,
      image: ogImage,
      sku: product.sku || `SG-SKU-${productId}`,
      category: 'Food, Beverages & Tobacco > Food Items > Fruits & Vegetables',
      brand: {
        '@type': 'Brand',
        name: 'SG FRUIT'
      },
      offers: {
        '@type': 'Offer',
        price: Number(priceNum),
        priceCurrency: 'THB',
        validFrom: '2026-01-01T00:00:00+07:00',
        priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        availability: (product.status === 'available' || (variant && Number(variant.stock) > 0))
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        url: canonicalUrl,
        seller: {
          '@id': 'https://sg-fruit.siriwatmedhanin.com/#organization',
          name: 'บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด'
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: 60,
            currency: 'THB'
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'TH'
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY'
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 3,
              unitCode: 'DAY'
            }
          }
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'TH',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 1,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn',
          refundType: 'https://schema.org/FullRefund',
          url: 'https://sg-fruit.siriwatmedhanin.com/'
        }
      }
    };

    // 2. Fetch base HTML response
    let response;
    if (isPPath && env && env.ASSETS) {
      const rootUrl = new URL('/', request.url);
      response = await env.ASSETS.fetch(new Request(rootUrl, request));
    } else {
      response = await next();
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    // 3. Transform HTML using HTMLRewriter
    if (typeof HTMLRewriter !== 'undefined') {
      return new HTMLRewriter()
        .on('title', {
          element(e) {
            e.setInnerContent(ogTitle);
          }
        })
        .on('meta[name="description"]', {
          element(e) {
            e.setAttribute('content', ogDesc);
          }
        })
        .on('link[rel="canonical"]', {
          element(e) {
            e.setAttribute('href', canonicalUrl);
          }
        })
        .on('meta[property="og:title"]', {
          element(e) {
            e.setAttribute('content', ogTitle);
          }
        })
        .on('meta[property="og:description"]', {
          element(e) {
            e.setAttribute('content', ogDesc);
          }
        })
        .on('meta[property="og:image"]', {
          element(e) {
            e.setAttribute('content', ogImage);
          }
        })
        .on('meta[property="og:image:secure_url"]', {
          element(e) {
            e.setAttribute('content', ogImage);
          }
        })
        .on('meta[property="og:url"]', {
          element(e) {
            e.setAttribute('content', canonicalUrl);
          }
        })
        .on('meta[name="twitter:title"]', {
          element(e) {
            e.setAttribute('content', ogTitle);
          }
        })
        .on('meta[name="twitter:description"]', {
          element(e) {
            e.setAttribute('content', ogDesc);
          }
        })
        .on('meta[name="twitter:image"]', {
          element(e) {
            e.setAttribute('content', ogImage);
          }
        })
        .on('head', {
          element(e) {
            e.append(`\n  <script type="application/ld+json" id="sg-product-deeplink-jsonld">${JSON.stringify(productJsonLd)}</script>`, { html: true });
          }
        })
        .transform(response);
    }

    // Fallback if HTMLRewriter is not globally present (e.g. testing)
    const originalHtml = await response.text();
    let transformedHtml = originalHtml;
    transformedHtml = transformedHtml.replace(/<title>.*?<\/title>/i, `<title>${ogTitle}</title>`);
    transformedHtml = transformedHtml.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${ogTitle}" />`);
    transformedHtml = transformedHtml.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${ogDesc}" />`);
    transformedHtml = transformedHtml.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${ogImage}" />`);
    transformedHtml = transformedHtml.replace(/<meta property="og:image:secure_url" content=".*?" \/>/i, `<meta property="og:image:secure_url" content="${ogImage}" />`);
    transformedHtml = transformedHtml.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
    transformedHtml = transformedHtml.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${ogTitle}" />`);
    transformedHtml = transformedHtml.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${ogDesc}" />`);
    transformedHtml = transformedHtml.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${ogImage}" />`);
    transformedHtml = transformedHtml.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
    transformedHtml = transformedHtml.replace('</head>', `  <script type="application/ld+json" id="sg-product-deeplink-jsonld">${JSON.stringify(productJsonLd)}</script>\n</head>`);

    return new Response(transformedHtml, {
      status: response.status,
      headers: response.headers
    });
  } catch (err) {
    console.warn('[SG FRUIT Dynamic OG] Fallback to default metadata:', err);
    return next();
  }
}
