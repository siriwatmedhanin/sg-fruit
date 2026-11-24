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
      indexHtml.includes('SG FRUIT (เอสจี ฟรุ๊ต) | ผลไม้สด ผลไม้ตามฤดูกาล คัดเกรดจากสวน ตลาดไท และตลาดสี่มุมเมือง ส่งทั่วไทย'),
      'Must contain exact comprehensive SEO title'
    );
    assert.ok(
      indexHtml.includes('สั่งซื้อผลไม้สด ผลไม้ตามฤดูกาล ผลไม้ไทยและนำเข้า ผักสดคัดเกรดพรีเมียม ส่งตรงจากสวน แหล่งคัดสรรตลาดไทและตลาดสี่มุมเมือง โดย SG FRUIT บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด'),
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
    assert.ok(org.sameAs.includes('https://www.facebook.com/share/1E7H4sXEYz/?mibextid=wwXIfr'), 'Organization sameAs must include Facebook Page');
    assert.ok(org.sameAs.includes('https://www.tiktok.com/@sg_fruit?_r=1&_t=ZS-9BaDvzLju8y'), 'Organization sameAs must include TikTok');
    assert.strictEqual(org.email, 'contact@siriwatmedhanin.com');
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

  // 5. Bot Crawler & Search Navigation Files
  await t.test('5.1 robots.txt, sitemap.xml, and llms.txt exist with proper content', () => {
    const robotsTxt = fs.readFileSync(path.join(ROOT_DIR, 'robots.txt'), 'utf8');
    assert.ok(robotsTxt.includes('User-agent: Googlebot'));
    assert.ok(robotsTxt.includes('User-agent: GPTBot'));
    assert.ok(robotsTxt.includes('User-agent: PerplexityBot'));
    assert.ok(robotsTxt.includes('Sitemap: https://sg-fruit.siriwatmedhanin.com/sitemap.xml'));

    const sitemapXml = fs.readFileSync(path.join(ROOT_DIR, 'sitemap.xml'), 'utf8');
    assert.ok(sitemapXml.includes('<loc>https://sg-fruit.siriwatmedhanin.com/</loc>'));
    assert.ok(sitemapXml.includes('<loc>https://sg-fruit.siriwatmedhanin.com/#faq</loc>'));

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
    assert.ok(shopCartJs.includes('ผลไม้สดคัดเกรด SG FRUIT'), 'Product image alt must include keyword brand text');

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
});
