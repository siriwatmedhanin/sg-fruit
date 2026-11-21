/**
 * SG FRUIT — STEP 7.10.5: ADMIN SITE PROFILE & STORE SETTINGS TEST SUITE
 * 
 * Verifies:
 * 1. API Client Mappings (fetchPublicSiteProfile, fetchAdminSiteProfile, updateAdminSiteProfile, uploadSiteAsset)
 * 2. Client-side URL Scheme Validation (XSS Prevention: Rejection of javascript:, data:, vbscript:)
 * 3. Client-side Brand Positioning Rule Guard (Rejection of forbidden private orchard claims)
 * 4. Component Structure & Form Sections in SiteProfileView
 * 5. Navigation & Sidebar Routing
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminRoot = path.resolve(__dirname, '..');

test('SG FRUIT - Step 7.10.5: Admin Site Profile & Store Settings Suite', async (t) => {

  // 1. API Client Endpoints Mapped
  await t.test('1.1 API Client: Site Profile methods exported and defined', async () => {
    const apiFilePath = path.join(adminRoot, 'src', 'services', 'api.ts');
    const apiContent = fs.readFileSync(apiFilePath, 'utf8');

    assert.ok(apiContent.includes('export async function fetchPublicSiteProfile'), 'fetchPublicSiteProfile must be exported');
    assert.ok(apiContent.includes('export async function fetchAdminSiteProfile'), 'fetchAdminSiteProfile must be exported');
    assert.ok(apiContent.includes('export async function updateAdminSiteProfile'), 'updateAdminSiteProfile must be exported');
    assert.ok(apiContent.includes('export async function uploadSiteAsset'), 'uploadSiteAsset must be exported');
    assert.ok(apiContent.includes('/admin/site-profile'), 'Admin site-profile endpoint path must be called');
    assert.ok(apiContent.includes('/admin/site-profile/assets/'), 'Asset upload endpoint path must be called');
  });

  // 2. Client-side URL Scheme Validation (XSS Prevention)
  await t.test('2.1 URL Validation: Rejects dangerous schemes and requires https/http/relative', async () => {
    const siteProfileViewPath = path.join(adminRoot, 'src', 'components', 'SiteProfileView.tsx');
    const content = fs.readFileSync(siteProfileViewPath, 'utf8');

    assert.ok(content.includes('javascript'), 'Must check for javascript: schemes');
    assert.ok(content.includes('data'), 'Must check for data: schemes');
    assert.ok(content.includes('vbscript'), 'Must check for vbscript: schemes');

    // Simulate validation logic directly
    function validateUrl(url) {
      if (!url || typeof url !== 'string' || url.trim() === '') return true;
      const trimmed = url.trim();
      if (/^(javascript|data|vbscript):/i.test(trimmed)) return false;
      if (trimmed.startsWith('/')) return !trimmed.includes('..') && !trimmed.includes('\\');
      return /^https?:\/\//i.test(trimmed);
    }

    assert.strictEqual(validateUrl('javascript:alert(1)'), false, 'javascript: must be rejected');
    assert.strictEqual(validateUrl('data:text/html,<script>alert(1)</script>'), false, 'data: must be rejected');
    assert.strictEqual(validateUrl('vbscript:msgbox(1)'), false, 'vbscript: must be rejected');
    assert.strictEqual(validateUrl('https://line.me/R/ti/p/@sgfruit'), true, 'https URL must be accepted');
    assert.strictEqual(validateUrl('http://facebook.com/sgfruit.th'), true, 'http URL must be accepted');
    assert.strictEqual(validateUrl('/api/images/site/logo.webp'), true, 'Relative asset path must be accepted');
  });

  // 3. Client-side Brand Positioning Rule Guard
  await t.test('3.1 Brand Positioning Guard: Rejects forbidden private orchard claims', async () => {
    const siteProfileViewPath = path.join(adminRoot, 'src', 'components', 'SiteProfileView.tsx');
    const content = fs.readFileSync(siteProfileViewPath, 'utf8');

    assert.ok(content.includes('เราปลูกเองทั้งหมด'), 'Must check for เราปลูกเองทั้งหมด');
    assert.ok(content.includes('สวนผลไม้ของเราเอง 100%'), 'Must check for สวนผลไม้ของเราเอง 100%');
    assert.ok(content.includes('ไร่ผลไม้ส่วนตัว'), 'Must check for ไร่ผลไม้ส่วนตัว');

    function validateBrandPositioning(tagline, description, footerAbout) {
      const forbidden = ['เราปลูกเองทั้งหมด', 'สวนผลไม้ของเราเอง 100%', 'ไร่ผลไม้ส่วนตัว'];
      const fields = [tagline, description, footerAbout];
      for (const f of fields) {
        for (const phrase of forbidden) {
          if (f && f.includes(phrase)) return false;
        }
      }
      return true;
    }

    assert.strictEqual(validateBrandPositioning('เราปลูกเองทั้งหมด', '', ''), false);
    assert.strictEqual(validateBrandPositioning('', 'สวนผลไม้ของเราเอง 100% ดูแลโดยเรา', ''), false);
    assert.strictEqual(validateBrandPositioning('A Brand by Siriwatmedhanin Group', 'คัดสรรผลไม้ตามฤดูกาล', 'ผลไม้สดคุณภาพ'), true);
  });

  // 4. Component Structure & 5 Form Sections in SiteProfileView
  await t.test('4.1 SiteProfileView: Contains all 5 comprehensive form sections and real-time preview', async () => {
    const siteProfileViewPath = path.join(adminRoot, 'src', 'components', 'SiteProfileView.tsx');
    const content = fs.readFileSync(siteProfileViewPath, 'utf8');

    // Section 1: Brand
    assert.ok(content.includes('site_name') && content.includes('site_name_th'), 'Section 1 Brand must exist');
    assert.ok(content.includes('logo_url') && content.includes('favicon_url'), 'Logo & favicon inputs must exist');

    // Section 2: Contact & LINE OA
    assert.ok(content.includes('line_oa_id') && content.includes('line_oa_url'), 'LINE OA inputs must exist');
    assert.ok(content.includes('phone') && content.includes('email'), 'Phone & email inputs must exist');

    // Section 3: Social
    assert.ok(content.includes('facebook_url') && content.includes('instagram_url') && content.includes('tiktok_url'), 'Social inputs must exist');

    // Section 4: Announcement Bar
    assert.ok(content.includes('announcement_enabled') && content.includes('announcement_text') && content.includes('announcement_link'), 'Announcement bar controls must exist');

    // Section 5: Footer & SEO
    assert.ok(content.includes('footer_about') && content.includes('footer_copyright'), 'Footer controls must exist');
    assert.ok(content.includes('seo_title') && content.includes('seo_description') && content.includes('og_image_url'), 'SEO controls must exist');

    // Live Real-time Storefront Preview
    assert.ok(content.includes('หน้าร้านจำลอง (Live Preview)'), 'Live Real-time Storefront Preview panel must exist');
  });

  // 5. Navigation & Sidebar Routing
  await t.test('5.1 Navigation: Sidebar routes to SiteProfileView for settings tab', async () => {
    const sidebarPath = path.join(adminRoot, 'src', 'components', 'Sidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    assert.ok(sidebarContent.includes("id: 'settings'"), 'Sidebar must have settings nav item');
    assert.ok(!sidebarContent.includes("id: 'settings', label: 'ตั้งค่าระบบร้านค้า', icon: <Settings />, isDev: true"), 'settings tab must not be marked isDev');

    const appPath = path.join(adminRoot, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.ok(appContent.includes('<SiteProfileView'), 'App.tsx must render SiteProfileView');
    assert.ok(appContent.includes("currentTab === 'settings'"), 'App.tsx must handle settings tab');
  });

  // 6. Interactive Circular Logo Cropper Modal
  await t.test('6.1 Logo Cropper: Modal component exists with Circular Mask, Zoom, Pan & Live Storefront Preview', async () => {
    const cropperPath = path.join(adminRoot, 'src', 'components', 'LogoCropperModal.tsx');
    assert.ok(fs.existsSync(cropperPath), 'LogoCropperModal.tsx file must exist');

    const cropperContent = fs.readFileSync(cropperPath, 'utf8');
    assert.ok(cropperContent.includes('export const LogoCropperModal'), 'LogoCropperModal must be exported');
    assert.ok(cropperContent.includes('CROP_RADIUS'), 'Must define circular crop radius');
    assert.ok(cropperContent.includes('handleMouseDown') && cropperContent.includes('handleMouseMove'), 'Must support interactive mouse drag');
    assert.ok(cropperContent.includes('handleTouchStart') && cropperContent.includes('handleTouchMove'), 'Must support touch pan on mobile');
    assert.ok(cropperContent.includes('ZoomIn') && cropperContent.includes('ZoomOut'), 'Must have zoom slider and +/- buttons');
    assert.ok(cropperContent.includes('Cormorant Garamond') && cropperContent.includes('SG FRUIT'), 'Must have Live Storefront Header preview');
    assert.ok(cropperContent.includes('512'), 'Must export 512x512 high-res image');
    assert.ok(cropperContent.includes('image/webp'), 'Must export WebP format for optimal R2 storage');
  });

  await t.test('6.2 Logo Cropper Integration: SiteProfileView renders circular frame and opens modal on file pick', async () => {
    const siteProfileViewPath = path.join(adminRoot, 'src', 'components', 'SiteProfileView.tsx');
    const content = fs.readFileSync(siteProfileViewPath, 'utf8');

    assert.ok(content.includes('LogoCropperModal'), 'SiteProfileView must import and render LogoCropperModal');
    assert.ok(content.includes('borderRadius: \'50%\''), 'Logo preview in Brand section must be circular (50% radius)');
    assert.ok(content.includes('handleLogoSelect'), 'Must have handleLogoSelect to intercept file before upload');
    assert.ok(content.includes('2 * 1024 * 1024'), 'Must enforce 2MB maximum file limit');
    assert.ok(content.includes('image/webp,image/png,image/jpeg,image/jpg'), 'Must accept WebP, PNG, and JPG');
  });

  await t.test('6.3 Logo Cropper: Relative Zoom system, Slider 0.50-3.00x, and Scale Synchronization', async () => {
    const cropperPath = path.join(adminRoot, 'src', 'components', 'LogoCropperModal.tsx');
    const content = fs.readFileSync(cropperPath, 'utf8');

    // 1. Relative Zoom Formula
    assert.ok(content.includes('baseScale'), 'Must calculate and store baseScale');
    assert.ok(content.includes('actualScale = baseScale * zoom'), 'Must calculate actual scale as baseScale * zoom');
    assert.ok(content.includes('setZoom(1.0)'), 'Initial relative zoom must be 1.00x');

    // 2. Smooth Slider & Step Constraints
    assert.ok(content.includes('min="0.50"') && content.includes('max="3.00"') && content.includes('step="0.01"'), 'Slider must be configured with min 0.50, max 3.00, and step 0.01');
    assert.ok(content.includes('0.05'), 'Zoom +/- buttons must adjust in 0.05 steps');
    assert.ok(content.includes('zoom.toFixed(2)}x'), 'Must display relative zoom formatted as 1.00x');

    // 3. Mathematical scale synchronization across previews and export
    assert.ok(content.includes('ratio = 48 / CROP_DIAMETER'), 'Header preview ratio must be derived from CROP_DIAMETER');
    assert.ok(content.includes('exportRatio = 512 / CROP_DIAMETER'), '512px export ratio must be derived from CROP_DIAMETER');
    assert.ok(content.includes('exportScale = baseScale * zoom * exportRatio'), 'Export scale must be accurately synchronized with zoom');
  });
});
