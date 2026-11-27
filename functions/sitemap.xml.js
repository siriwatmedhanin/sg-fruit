/**
 * Cloudflare Pages Function: Dynamic /sitemap.xml
 * Dynamically queries active products from D1 Backend API and combines
 * with core storefront routes and dedicated category SEO pages.
 */

const BACKEND_API = 'https://staging-api.siriwatmedhanin.com';
const SITE_ORIGIN = 'https://sg-fruit.siriwatmedhanin.com';

export async function onRequestGet(context) {
  const { env, next } = context;
  const apiOrigin = (env && env.API_BASE_URL) || BACKEND_API;
  const today = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch(`${apiOrigin}/api/products`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) {
      return next();
    }

    const payload = await res.json();
    const products = (payload && payload.ok && Array.isArray(payload.data)) ? payload.data : [];

    const coreRoutes = [
      { loc: `${SITE_ORIGIN}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_ORIGIN}/seasonal-fruits`, priority: '0.85', changefreq: 'daily' },
      { loc: `${SITE_ORIGIN}/imported-produce`, priority: '0.85', changefreq: 'daily' },
      { loc: `${SITE_ORIGIN}/fresh-vegetables`, priority: '0.85', changefreq: 'daily' },
      { loc: `${SITE_ORIGIN}/#shop`, priority: '0.9', changefreq: 'daily' },
      { loc: `${SITE_ORIGIN}/#story`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${SITE_ORIGIN}/#about`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${SITE_ORIGIN}/#faq`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${SITE_ORIGIN}/#contact`, priority: '0.7', changefreq: 'monthly' }
    ];

    const productRoutes = products.map(p => {
      const slug = p.slug || p.id;
      return {
        loc: `${SITE_ORIGIN}/products/${encodeURIComponent(slug)}`,
        priority: '0.80',
        changefreq: 'daily',
        lastmod: today
      };
    });

    const allRoutes = [...coreRoutes, ...productRoutes];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allRoutes.map(r => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${r.lastmod || today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    });
  } catch (_) {
    // If dynamic API call times out or fails, serve static sitemap.xml fallback
    return next();
  }
}
