/**
 * SG FRUIT - Technical SEO, AEO, Entity Graph, Open Graph & Bot Crawler Test Suite
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('SG FRUIT - Technical SEO, AEO, Entity SEO & Official Channels Suite', async (t) => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // 1. Meta Tags, Canonical & Language
  await t.test('1.1 Head tags: html lang="th", canonical, title, and description', () => {
    assert.ok(indexHtml.includes('<html lang="th">'), 'HTML lang must be "th"');
    assert.ok(
      indexHtml.includes('SG FRUIT | สั่งผักสด ผลไม้ตามฤดูกาล ผลไม้นำเข้า คัดตรงจากตลาดไท-ตลาดสี่มุมเมือง'),
      'Must contain exact comprehensive SEO title'
    );
    assert.ok(
      indexHtml.includes('สั่งผักสด ผลไม้ไทยตามฤดูกาล ผลไม้นำเข้า คัดสดใหม่จากตลาดไท ตลาดสี่มุมเมือง จัดส่งด่วนทั่วไทย รองรับเก็บเงินปลายทาง (COD) รับประกันเคลม 100% โดย SG FRUIT'),
      'Must contain comprehensive meta description'
    );
    assert.ok(
      indexHtml.includes('<link rel="canonical" href="https://sg-fruit.siriwatmedhanin.com/" />'),
      'Must define exact canonical URL'
    );
  });

  // 2. Open Graph & Twitter Cards
  await t.test('2.1 Open Graph and Twitter Card tags', () => {
    assert.ok(indexHtml.includes('property="og:type" content="website"'), 'Must have og:type');
    assert.ok(indexHtml.includes('property="og:locale" content="th_TH"'), 'Must have og:locale th_TH');
    assert.ok(indexHtml.includes('property="og:site_name" content="SG FRUIT โดย บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด"'), 'Must have og:site_name');
    assert.ok(indexHtml.includes('property="og:url" content="https://sg-fruit.siriwatmedhanin.com/"'), 'Must have og:url');
    assert.ok(indexHtml.includes('property="og:image" content="https://sg-fruit.siriwatmedhanin.com/Pic/sg-fruit-logo.webp"'), 'Must have full HTTPS og:image');
    assert.ok(indexHtml.includes('name="twitter:card" content="summary_large_image"'), 'Must have twitter:card summary_large_image');
  });

  // 3. JSON-LD Structured Data Schema Validation
  await t.test('3.1 JSON-LD Structured Data: Organization, Person (Founder), WebSite, and FAQPage', () => {
    const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdMatch, 'Must contain JSON-LD script block');

    const schema = JSON.parse(jsonLdMatch[1]);
    assert.ok(schema['@context'] === 'https://schema.org', 'Context must be schema.org');
    assert.ok(Array.isArray(schema['@graph']), '@graph must be an array');

    const org = schema['@graph'].find((e) => e['@id']?.includes('#organization'));
    assert.ok(org, 'Must include Organization entity');
    assert.strictEqual(org.legalName, 'บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด');
    assert.ok(org.sameAs.includes('https://siriwatmedhanin.com'), 'Organization sameAs must include Corporate Website');
    assert.ok(org.sameAs.includes('https://www.facebook.com/share/1E7H4sXEYz/?mibextid=wwXIfr'), 'Organization sameAs must include Facebook Page');
    assert.ok(org.sameAs.includes('https://www.tiktok.com/@sg_fruit?_r=1&_t=ZS-9BaDvzLju8y'), 'Organization sameAs must include TikTok');
    assert.strictEqual(org.email, 'contact@siriwatmedhanin.com');
    assert.strictEqual(org.telephone, '091-909-8902');
    assert.strictEqual(org.address?.postalCode, '93000');

    const founder = schema['@graph'].find((e) => e['@id']?.includes('#founder'));
    assert.ok(founder, 'Must include Person (Founder) entity');
    assert.strictEqual(founder.name, 'ณัฐชาธรณ์ ศิริวัตร์เมธานินท์');
    assert.ok(founder.alternateName.includes('Natchathon Sirivaddhamedhanin'));

    const faq = schema['@graph'].find((e) => e['@type'] === 'FAQPage');
    assert.ok(faq, 'Must include FAQPage entity');
    assert.strictEqual(faq.mainEntity.length, 6, 'FAQPage must contain exactly 6 questions');
  });

  // 4. UI Elements: FAQ Accordion, About Section, and Official Social Buttons
  await t.test('4.1 UI: Accessible FAQ Accordion with 6 items', () => {
    assert.ok(indexHtml.includes('id="faq"'), 'Must contain #faq section');
    const detailsCount = (indexHtml.match(/<details class="faq-item"/g) || []).length;
    assert.strictEqual(detailsCount, 6, 'Must contain 6 FAQ details accordion items');
    assert.ok(indexHtml.includes('SG FRUIT ขายผลไม้อะไรบ้าง และคัดสรรสินค้าจากแหล่งไหน?'));
    assert.ok(indexHtml.includes('SG FRUIT เป็นของบริษัทอะไร และใครเป็นผู้ก่อตั้ง?'));
  });

  await t.test('4.2 UI: About Section mentions legal entity, founder, and wholesale markets', () => {
    assert.ok(indexHtml.includes('บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด'), 'Must mention company legal name');
    assert.ok(indexHtml.includes('ณัฐชาธรณ์ ศิริวัตร์เมธานินท์'), 'Must mention founder');
    assert.ok(indexHtml.includes('ตลาดไท'), 'Must mention Talaad Thai');
    assert.ok(indexHtml.includes('ตลาดสี่มุมเมือง'), 'Must mention Talaad Simummuang');
  });

  await t.test('4.3 UI: Footer contains official social channel buttons with target="_blank"', () => {
    assert.ok(indexHtml.includes('https://www.facebook.com/share/1E7H4sXEYz/?mibextid=wwXIfr'), 'Footer must have Facebook link');
    assert.ok(indexHtml.includes('https://www.tiktok.com/@sg_fruit?_r=1&_t=ZS-9BaDvzLju8y'), 'Footer must have TikTok link');
    assert.ok(indexHtml.includes('target="_blank" rel="noopener noreferrer"'), 'External social links must have safe attributes');
    assert.ok(indexHtml.includes('contact@siriwatmedhanin.com'), 'Footer must include contact email');
  });

  await t.test('4.4 UI: Navbar and Mobile Drawer contain admin portal link to staging-admin', () => {
    assert.ok(indexHtml.includes('class="nav-admin-btn"'), 'Desktop navbar must include nav-admin-btn');
    assert.ok(indexHtml.includes('class="mobile-admin-link"'), 'Mobile drawer must include mobile-admin-link');
    assert.ok(indexHtml.includes('href="https://staging-admin.siriwatmedhanin.com"'), 'Admin links must point to staging-admin portal');
    assert.ok(indexHtml.includes('aria-label="เข้าสู่ระบบหลังบ้านสำหรับแอดมิน"'), 'Admin links must have aria-label');
  });

  await t.test('4.5 UI: Corporate parent website links in Footer and About section', () => {
    assert.ok(indexHtml.includes('class="footer-corp-link"'), 'Footer must contain footer-corp-link');
    assert.ok(indexHtml.includes('class="about-corp-btn"'), 'About section must contain about-corp-btn');
    assert.ok(indexHtml.includes('href="https://siriwatmedhanin.com"'), 'Must link to https://siriwatmedhanin.com');
    assert.ok(indexHtml.includes('aria-label="เยี่ยมชมเว็บไซต์ บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด"'), 'Footer corporate link must have aria-label');
  });

  // 5. Bot Crawler & Search Navigation Files
  await t.test('5.1 robots.txt, sitemap.xml, and llms.txt exist with proper content', () => {
    const robotsTxt = fs.readFileSync(path.join(ROOT_DIR, 'robots.txt'), 'utf8');
    assert.ok(robotsTxt.includes('User-agent: Googlebot'));
    assert.ok(robotsTxt.includes('User-agent: GPTBot'));
    assert.ok(robotsTxt.includes('User-agent: PerplexityBot'));
    assert.ok(robotsTxt.includes('Disallow: /api/'), 'robots.txt must disallow /api/');
    assert.ok(robotsTxt.includes('Sitemap: https://sg-fruit.siriwatmedhanin.com/sitemap.xml'));

    const sitemapXml = fs.readFileSync(path.join(ROOT_DIR, 'sitemap.xml'), 'utf8');
    assert.ok(sitemapXml.includes('<loc>https://sg-fruit.siriwatmedhanin.com/</loc>'));
    assert.ok(sitemapXml.includes('<loc>https://sg-fruit.siriwatmedhanin.com/#faq</loc>'));
    assert.ok(sitemapXml.includes('/products/'), 'sitemap.xml must include product pages');

    const llmsTxt = fs.readFileSync(path.join(ROOT_DIR, 'llms.txt'), 'utf8');
    assert.ok(llmsTxt.includes('บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด'));
    assert.ok(llmsTxt.includes('ณัฐชาธรณ์ ศิริวัตร์เมธานินท์'));
    assert.ok(llmsTxt.includes('https://www.facebook.com/share/1E7H4sXEYz/?mibextid=wwXIfr'));
    assert.ok(llmsTxt.includes('https://www.tiktok.com/@sg_fruit?_r=1&_t=ZS-9BaDvzLju8y'));
  });

  // 6. Admin Indexing Protection
  await t.test('6.1 Admin: Disallow crawler robots.txt and noindex meta tag', () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'sg-fruit-admin', 'index.html'), 'utf8');
    assert.ok(adminHtml.includes('<meta name="robots" content="noindex, nofollow" />'), 'Admin must have noindex, nofollow');

    const adminRobots = fs.readFileSync(path.join(ROOT_DIR, 'sg-fruit-admin', 'public', 'robots.txt'), 'utf8');
    assert.ok(adminRobots.includes('Disallow: /'), 'Admin robots.txt must disallow all crawlers');
  });

  // 7. On-Page Structure & Core Web Vitals
  await t.test('7.1 Exactly one <h1> tag in document', () => {
    const h1Matches = indexHtml.match(/<h1[\s>]/g) || [];
    assert.strictEqual(h1Matches.length, 1, 'Storefront document must have exactly one <h1> element');
  });

  await t.test('7.2 shop-cart.js: Dynamic ItemList Product Schema and lazy-loaded product images', () => {
    const shopCartJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'shop-cart.js'), 'utf8');
    assert.ok(shopCartJs.includes('updateProductStructuredData'), 'shop-cart.js must define updateProductStructuredData');
    assert.ok(shopCartJs.includes('loading="lazy"'), 'shop-cart.js must include loading="lazy" for product card images');
    assert.ok(shopCartJs.includes('getProductAltText'), 'shop-cart.js must define getProductAltText');
    assert.ok(shopCartJs.includes('คัดสดจากตลาดไท ตลาดสี่มุมเมือง โดย SG FRUIT'), 'Product image alt must include keyword brand text');

    // Merchant listings & Google Search Console Schema Validation
    assert.ok(
      shopCartJs.includes("'@type': 'Brand'") && shopCartJs.includes("name: 'SG FRUIT'"),
      'Product Schema must define brand as Brand object'
    );
    assert.ok(
      shopCartJs.includes("'Food, Beverages & Tobacco > Food Items > Fruits & Vegetables'"),
      'Product Schema must define category using standard Google Product Taxonomy'
    );
    assert.ok(
      shopCartJs.includes("'@type': 'OfferShippingDetails'"),
      'Product Schema offers must include OfferShippingDetails'
    );
    assert.ok(
      shopCartJs.includes("'@type': 'MerchantReturnPolicy'"),
      'Product Schema offers must include MerchantReturnPolicy'
    );
    assert.ok(
      shopCartJs.includes("validFrom: '2026-01-01T00:00:00+07:00'"),
      'Product Schema offers must include validFrom'
    );
  });

  // 8. Dedicated Category SEO Landing Pages Suite
  await t.test('8.1 About section cards in index.html link to 3 category landing pages', () => {
    assert.ok(indexHtml.includes('href="/seasonal-fruits"'), 'Must link to /seasonal-fruits');
    assert.ok(indexHtml.includes('href="/imported-produce"'), 'Must link to /imported-produce');
    assert.ok(indexHtml.includes('href="/fresh-vegetables"'), 'Must link to /fresh-vegetables');
    assert.ok(indexHtml.includes('about-pillar-more'), 'Must have about-pillar-more class');
    assert.ok(indexHtml.includes('อ่านรายละเอียดเพิ่มเติม →'), 'Must have "อ่านรายละเอียดเพิ่มเติม →" text');
  });

  await t.test('8.2 Category landing pages exist with valid content, schemas, and CTAs', () => {
    const pages = [
      {
        slug: 'seasonal-fruits',
        h1: 'ผลไม้ไทยและผลไม้ตามฤดูกาล คัดสดจากตลาดไท ตลาดสี่มุมเมือง และสวนเกษตรกร',
        cta: '/?category=seasonal-fruits#shop',
        ctaText: 'เลือกซื้อผลไม้ตามฤดูกาลเลย ↗'
      },
      {
        slug: 'imported-produce',
        h1: 'ผลไม้นำเข้าพรีเมียมและวัตถุดิบคัดเกรด ส่งตรงจากแหล่งค้าส่งตลาดไท-ตลาดสี่มุมเมือง',
        cta: '/?category=imported-produce#shop',
        ctaText: 'เลือกซื้อผลไม้นำเข้าคัดเกรดเลย ↗'
      },
      {
        slug: 'fresh-vegetables',
        h1: 'ผักสดสะอาดเพื่อสุขภาพและซูเปอร์ฟู้ด คัดสดใหม่ทุกวันจากตลาดไท-ตลาดสี่มุมเมือง',
        cta: '/?category=fresh-vegetables#shop',
        ctaText: 'เลือกซื้อผักสดเพื่อสุขภาพเลย ↗'
      }
    ];

    for (const p of pages) {
      const htmlPath = path.join(ROOT_DIR, `${p.slug}.html`);
      assert.ok(fs.existsSync(htmlPath), `${p.slug}.html must exist`);

      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes(p.h1), `${p.slug} must include H1`);
      assert.ok(content.includes(p.cta), `${p.slug} must include CTA link`);
      assert.ok(content.includes(p.ctaText), `${p.slug} must include CTA text`);
      assert.ok(content.includes('ดูผักและผลไม้ทั้งหมด'), `${p.slug} must include outline button`);
      assert.ok(content.includes('href="/?category=all#shop"'), `${p.slug} outline button must link to all#shop`);

      // Schemas
      assert.ok(content.includes('"@type": "FAQPage"'), `${p.slug} must have FAQPage schema`);
      assert.ok(content.includes('"@type": "BreadcrumbList"'), `${p.slug} must have BreadcrumbList schema`);
      assert.ok(content.includes('<link rel="canonical" href="https://sg-fruit.siriwatmedhanin.com/' + p.slug + '" />'), `${p.slug} must have canonical`);
    }
  });

  await t.test('8.3 sitemap.xml contains 3 category landing pages', () => {
    const sitemap = fs.readFileSync(path.join(ROOT_DIR, 'sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes('https://sg-fruit.siriwatmedhanin.com/seasonal-fruits'), 'Sitemap must contain seasonal-fruits');
    assert.ok(sitemap.includes('https://sg-fruit.siriwatmedhanin.com/imported-produce'), 'Sitemap must contain imported-produce');
    assert.ok(sitemap.includes('https://sg-fruit.siriwatmedhanin.com/fresh-vegetables'), 'Sitemap must contain fresh-vegetables');
  });

  await t.test('8.4 shop-cart.js supports category deep linking', () => {
    const shopCartJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'shop-cart.js'), 'utf8');
    assert.ok(shopCartJs.includes('checkUrlCategoryDeepLink'), 'shop-cart.js must define checkUrlCategoryDeepLink');
    assert.ok(shopCartJs.includes('seasonal-fruits'), 'shop-cart.js must map seasonal-fruits');
    assert.ok(shopCartJs.includes('imported-produce'), 'shop-cart.js must map imported-produce');
    assert.ok(shopCartJs.includes('fresh-vegetables'), 'shop-cart.js must map fresh-vegetables');
  });

  // 9. Dedicated Product SEO Pages & Edge Infrastructure Suite
  await t.test('9.1 Product card buttons link to /products/:slug', () => {
    const shopCartJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'shop-cart.js'), 'utf8');
    assert.ok(shopCartJs.includes('class="shop-btn-detail"'), 'Detail button must exist');
    assert.ok(shopCartJs.includes('class="shop-card-title-link"'), 'Title must link to product page');
    assert.ok(shopCartJs.includes('getProductAltText'), 'Must use getProductAltText helper');
  });

  await t.test('9.2 Static product pages generated and valid', () => {
    const productsDir = path.join(ROOT_DIR, 'products');
    assert.ok(fs.existsSync(productsDir), 'products/ directory must exist');
    const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.html'));
    assert.ok(files.length >= 30, 'Must generate at least 30 product pages');

    const sampleFile = path.join(productsDir, 'prod-e29dec06.html');
    assert.ok(fs.existsSync(sampleFile), 'prod-e29dec06.html must exist');
    const content = fs.readFileSync(sampleFile, 'utf8');
    assert.ok(content.includes('<title>'), 'Must have title');
    assert.ok(content.includes('ผักสด คัดสดจากตลาดไท ตลาดสี่มุมเมือง | SG FRUIT'), 'Must have SEO title formula');
    assert.ok(content.includes('<h1 class="p-title">'), 'Must have H1');
    assert.ok(content.includes('id="product-hero-image"'), 'Must have hero image');
    assert.ok(content.includes('— ผักสด คัดสดจากตลาดไท ตลาดสี่มุมเมือง โดย SG FRUIT'), 'Alt must follow formula without "- ผลไม้" for vegetables');
    assert.ok(content.includes('"@type": "Product"'), 'Must contain Product schema');
    assert.ok(content.includes('"@type": "BreadcrumbList"'), 'Must contain BreadcrumbList schema');
    assert.ok(content.includes('p-trust-section'), 'Must contain procurement trust block');
  });

  await t.test('9.3 Cloudflare Pages Functions & edge routing exist', () => {
    const funcProd = path.join(ROOT_DIR, 'functions', 'products', '[slug].js');
    const funcSitemap = path.join(ROOT_DIR, 'functions', 'sitemap.xml.js');
    assert.ok(fs.existsSync(funcProd), 'functions/products/[slug].js must exist');
    assert.ok(fs.existsSync(funcSitemap), 'functions/sitemap.xml.js must exist');
  });
});
