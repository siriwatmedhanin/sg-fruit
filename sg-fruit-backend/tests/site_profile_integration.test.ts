/**
 * SG FRUIT — STEP 7.10.5: SITE PROFILE & STORE SETTINGS INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. D1 Schema & Singleton Record Integrity (id='default', Soft Premium tone)
 * 2. Public Read-Only Endpoint (GET /api/site-profile, Safe Fallback, Zero Sensitive Leaks)
 * 3. Single Admin & Default Deny Security (401 unauth, 403 unregistered/staff)
 * 4. Admin Management (GET, PUT /api/admin/site-profile)
 * 5. Strict URL Scheme Validation (XSS Prevention: Rejects javascript:, data:, vbscript:)
 * 6. Brand Positioning Rule Enforcement (Rejects private orchard claims)
 * 7. Asset Upload & Magic Bytes Verification (logo, favicon, og-image)
 * 8. Storage Cleanup Queue Integration (Orphaned asset enqueuing upon replacement)
 * 9. Public Image Serving for Brand Assets (R2 site/ prefix allowed, Traversal blocked)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import app from '../src/index';

// -------------------------------------------------------------
// 1. D1 & R2 TEST WRAPPERS
// -------------------------------------------------------------
const d1Path = 'F:/Khet/งานส่วนตัว/sg-fruit-backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite';
const sqliteDb = new DatabaseSync(d1Path);

function createD1Wrapper(sqlite: DatabaseSync) {
  return {
    prepare(sql: string) {
      let boundParams: any[] = [];
      return {
        bind(...params: any[]) {
          boundParams = params;
          return this;
        },
        async all<T = any>() {
          const stmt = sqlite.prepare(sql);
          const results = stmt.all(...boundParams) as T[];
          return { results, success: true };
        },
        async first<T = any>(col?: string) {
          const stmt = sqlite.prepare(sql);
          const row = stmt.get(...boundParams) as any;
          if (!row) return null;
          if (col) return row[col] as T;
          return row as T;
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const info = stmt.run(...boundParams);
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        }
      };
    },
    async batch(statements: any[]) {
      const results: any[] = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    }
  };
}

const mockR2Storage = new Map<string, { body: Uint8Array; mime: string }>();
const r2Wrapper = {
  async get(key: string) {
    const item = mockR2Storage.get(key);
    if (!item) return null;
    return {
      body: item.body,
      arrayBuffer: async () => item.body.buffer,
      writeHttpMetadata(headers: Headers) {
        headers.set('content-type', item.mime);
      },
      httpMetadata: { contentType: item.mime },
      httpEtag: '"mock-etag"'
    };
  },
  async put(key: string, value: any, options?: any) {
    let buf: Uint8Array;
    if (value instanceof Uint8Array) {
      buf = value;
    } else if (value instanceof ArrayBuffer) {
      buf = new Uint8Array(value);
    } else {
      buf = new Uint8Array(32);
    }
    const mime = options?.httpMetadata?.contentType || 'application/octet-stream';
    mockR2Storage.set(key, { body: buf, mime });
    return { key };
  },
  async delete(key: string) {
    mockR2Storage.delete(key);
    return true;
  }
};

// -------------------------------------------------------------
// 2. CRYPTOGRAPHIC RSA KEYS & JWKS SETUP
// -------------------------------------------------------------
const teamName = 'sgfruit-staging-team';
const expectedAud = 'aud-staging-sgfruit-access-778899';

const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = pubKey.export({ format: 'jwk' }) as any;
jwk.kid = 'kid-staging-key-site-profile';
jwk.alg = 'RS256';
jwk.use = 'sig';

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`) {
    return new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return originalFetch(input, init);
};

function base64UrlEncode(data: string | Buffer): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createSignedJwt(header: any, payload: any, privateKey: crypto.KeyObject): string {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = base64UrlEncode(sign.sign(privateKey));
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

const env: any = {
  ENVIRONMENT: 'staging',
  APP_NAME: 'SG FRUIT API (Staging Test)',
  CF_ACCESS_TEAM_NAME: teamName,
  CF_ACCESS_AUD: expectedAud,
  CORS_ADMIN_ORIGINS: 'https://staging-admin.siriwatmedhanin.com',
  CORS_ALLOW_ORIGIN: 'https://staging-admin.siriwatmedhanin.com',
  CORS_PUBLIC_ORIGINS: '',
  DB: createD1Wrapper(sqliteDb),
  PRODUCT_IMAGES: r2Wrapper
};

function getAdminHeaders(): Record<string, string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = createSignedJwt(
    { alg: 'RS256', typ: 'JWT', kid: jwk.kid },
    {
      iss: `https://${teamName}.cloudflareaccess.com`,
      aud: expectedAud,
      email: 'admin-auditor@siriwatmedhanin.com',
      'custom:roles': ['admin'],
      exp: now + 3600,
      nbf: now - 60
    },
    privKey
  );
  return {
    'Cf-Access-Jwt-Assertion': jwt,
    Host: 'staging-admin-api.siriwatmedhanin.com'
  };
}

// =============================================================
// TEST SUITE: SITE PROFILE & STORE SETTINGS
// =============================================================

test('SG FRUIT - Site Profile & Store Settings Suite', async (t) => {

  // 1. D1 Schema & Singleton Record Integrity
  await t.test('1.1 D1 Schema has site_profile table with singleton id="default"', async () => {
    const row = sqliteDb.prepare('SELECT id, site_name, line_oa_id FROM site_profile WHERE id = ?').get('default') as any;
    assert.ok(row, 'site_profile singleton record should exist');
    assert.strictEqual(row.id, 'default');
    assert.strictEqual(row.site_name, 'SG FRUIT');
    assert.strictEqual(row.line_oa_id, '@sgfruit');
  });

  // 2. Public Read-Only Endpoint (GET /api/site-profile)
  await t.test('2.1 GET /api/site-profile returns 200 with sanitized public structure', async () => {
    const res = await app.request('/api/site-profile', {
      headers: { Host: 'staging-api.siriwatmedhanin.com' }
    }, env);

    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.ok, true);
    assert.ok(body.data, 'Should have data payload');
    assert.strictEqual(body.data.site_name, 'SG FRUIT');
    assert.strictEqual(body.data.line_oa_id, '@sgfruit');
    assert.ok(body.data.social, 'Should have social object');
    assert.ok(body.data.announcement, 'Should have announcement object');
    assert.ok(body.data.footer, 'Should have footer object');
    assert.ok(body.data.seo, 'Should have seo object');

    // Security Gate: Ensure no internal admin metadata is leaked in public endpoint
    assert.strictEqual(body.data.updated_by, undefined, 'updated_by must NOT be exposed in public API');
    assert.strictEqual(body.data.id, undefined, 'Internal DB primary key id must NOT be exposed in public API');
  });

  await t.test('2.2 GET /api/site-profile falls back cleanly to default data if DB is unavailable', async () => {
    const envNoDb = { ...env, DB: null };
    const res = await app.request('/api/site-profile', {
      headers: { Host: 'staging-api.siriwatmedhanin.com' }
    }, envNoDb);

    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.site_name, 'SG FRUIT');
    assert.strictEqual(body.data.line_oa_id, '@sgfruit');
  });

  // 3. Single Admin & Default Deny Security
  await t.test('3.1 Anonymous access to GET /api/admin/site-profile is rejected (401)', async () => {
    const res = await app.request('/api/admin/site-profile', {
      headers: { Host: 'staging-admin-api.siriwatmedhanin.com' }
    }, env);
    assert.strictEqual(res.status, 401);
  });

  await t.test('3.2 Anonymous access to PUT /api/admin/site-profile is rejected (401)', async () => {
    const res = await app.request('/api/admin/site-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Host: 'staging-admin-api.siriwatmedhanin.com' },
      body: JSON.stringify({ site_name: 'Hacked' })
    }, env);
    assert.strictEqual(res.status, 401);
  });

  await t.test('3.3 Unregistered user access to /api/admin/site-profile is rejected (403 Default Deny)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const intruderJwt = createSignedJwt(
      { alg: 'RS256', typ: 'JWT', kid: jwk.kid },
      {
        iss: `https://${teamName}.cloudflareaccess.com`,
        aud: expectedAud,
        email: 'intruder@external.com',
        exp: now + 3600,
        nbf: now - 60
      },
      privKey
    );

    const res = await app.request('/api/admin/site-profile', {
      headers: {
        'Cf-Access-Jwt-Assertion': intruderJwt,
        Host: 'staging-admin-api.siriwatmedhanin.com'
      }
    }, env);
    assert.strictEqual(res.status, 403);
  });

  // 4. Admin Management (GET & PUT /api/admin/site-profile)
  await t.test('4.1 Authorized Admin GET /api/admin/site-profile returns full settings row', async () => {
    const res = await app.request('/api/admin/site-profile', {
      headers: getAdminHeaders()
    }, env);

    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.id, 'default');
    assert.strictEqual(body.data.site_name, 'SG FRUIT');
    assert.strictEqual(body.data.line_oa_id, '@sgfruit');
  });

  // 5. Strict URL Scheme Validation & XSS Prevention
  await t.test('5.1 PUT /api/admin/site-profile rejects javascript: URL scheme (XSS Prevention)', async () => {
    const res = await app.request('/api/admin/site-profile', {
      method: 'PUT',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facebook_url: 'javascript:alert(document.cookie)'
      })
    }, env);

    assert.strictEqual(res.status, 400);
    const body: any = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'INVALID_URL');
  });

  await t.test('5.2 PUT /api/admin/site-profile rejects data: URL scheme', async () => {
    const res = await app.request('/api/admin/site-profile', {
      method: 'PUT',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcement_link: 'data:text/html,<script>alert(1)</script>'
      })
    }, env);

    assert.strictEqual(res.status, 400);
    const body: any = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'INVALID_URL');
  });

  await t.test('5.3 PUT /api/admin/site-profile rejects invalid email format', async () => {
    const res = await app.request('/api/admin/site-profile', {
      method: 'PUT',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-without-at'
      })
    }, env);

    assert.strictEqual(res.status, 400);
    const body: any = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'INVALID_EMAIL');
  });

  // 6. Brand Positioning Rule Enforcement
  await t.test('6.1 PUT /api/admin/site-profile rejects forbidden claim "เราปลูกเองทั้งหมด"', async () => {
    const res = await app.request('/api/admin/site-profile', {
      method: 'PUT',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tagline: 'ผลไม้สดจากสวนเราปลูกเองทั้งหมด คุณภาพสูง'
      })
    }, env);

    assert.strictEqual(res.status, 400);
    const body: any = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'BRAND_POSITIONING_VIOLATION');
  });

  await t.test('6.2 PUT /api/admin/site-profile rejects forbidden claim "สวนผลไม้ของเราเอง 100%"', async () => {
    const res = await app.request('/api/admin/site-profile', {
      method: 'PUT',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'สวนผลไม้ของเราเอง 100% ดูแลโดยครอบครัว'
      })
    }, env);

    assert.strictEqual(res.status, 400);
    const body: any = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error, 'BRAND_POSITIONING_VIOLATION');
  });

  // 7. Successful Settings Update
  await t.test('7.1 PUT /api/admin/site-profile updates store profile successfully', async () => {
    const updatePayload = {
      site_name: 'SG FRUIT',
      site_name_th: 'เอสจี ผลไม้ตามฤดูกาล',
      tagline: 'A Brand by Siriwatmedhanin Group',
      description: 'คัดสรรผลไม้พรีเมียมจากแหล่งปลูกชั้นเลิศ ส่งมอบความสดใหม่สู่ทุกวันของคุณ',
      line_oa_id: '@sgfruit',
      line_oa_url: 'https://line.me/R/ti/p/@sgfruit',
      phone: '081-234-5678',
      email: 'contact@siriwatmedhanin.com',
      address: '123 ถนนช้างคลาน ตำบลช้างคลาน อำเภอเมือง จังหวัดเชียงใหม่ 50100',
      business_hours: 'เปิดบริการทุกวัน 08:00 - 18:00 น.',
      facebook_url: 'https://facebook.com/sgfruit.th',
      instagram_url: 'https://instagram.com/sgfruit.th',
      announcement_enabled: 1,
      announcement_text: 'โปรโมชั่นพิเศษประจำฤดูกาล อะโวคาโดแฮสส์เกรดส่งออก สั่งซื้อได้ทาง LINE: @sgfruit',
      announcement_link: 'https://line.me/R/ti/p/@sgfruit',
      footer_about: 'คัดสรรผลไม้ไทยและนำเข้าคุณภาพระดับพรีเมียม เพื่อคุณและคนที่คุณรัก',
      footer_copyright: '© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by Siriwatmedhanin Group)',
      seo_title: 'SG FRUIT | เอสจี ผลไม้ตามฤดูกาล — Seasonal Curated Fruits',
      seo_description: 'SG FRUIT แหล่งคัดสรรผลไม้ตามฤดูกาลคุณภาพสูง สดใหม่ส่งตรงถึงบ้านคุณ'
    };

    const res = await app.request('/api/admin/site-profile', {
      method: 'PUT',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    }, env);

    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.phone, '081-234-5678');
    assert.strictEqual(body.data.announcement_enabled, 1);
    assert.strictEqual(body.data.announcement_text, updatePayload.announcement_text);

    // Verify change in SQLite DB directly
    const row = sqliteDb.prepare('SELECT phone, announcement_enabled FROM site_profile WHERE id = ?').get('default') as any;
    assert.strictEqual(row.phone, '081-234-5678');
    assert.strictEqual(row.announcement_enabled, 1);
  });

  // 8. Asset Upload & Magic Bytes Verification
  await t.test('8.1 POST /api/admin/site-profile/assets/invalid-type returns 400', async () => {
    const formData = new FormData();
    formData.append('file', new File([new Uint8Array(10)], 'test.txt'));

    const res = await app.request('/api/admin/site-profile/assets/invalid-type', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData
    }, env);

    assert.strictEqual(res.status, 400);
    const body: any = await res.json();
    assert.strictEqual(body.error, 'INVALID_ASSET_TYPE');
  });

  await t.test('8.2 POST /api/admin/site-profile/assets/logo rejects fake WebP header', async () => {
    // Fake buffer not matching WebP RIFF....WEBP or PNG magic bytes
    const fakeBuf = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B]);
    const formData = new FormData();
    formData.append('file', new File([fakeBuf], 'fake.webp', { type: 'image/webp' }));

    const res = await app.request('/api/admin/site-profile/assets/logo', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData
    }, env);

    assert.strictEqual(res.status, 400);
    const body: any = await res.json();
    assert.strictEqual(body.error, 'INVALID_FILE_TYPE');
  });

  await t.test('8.3 POST /api/admin/site-profile/assets/logo accepts valid WebP logo', async () => {
    // Valid WebP Header: RIFF (4 bytes) + file size (4 bytes) + WEBP (4 bytes)
    const validWebp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      0x20, 0x00, 0x00, 0x00, // size
      0x57, 0x45, 0x42, 0x50, // 'WEBP'
      0x56, 0x50, 0x38, 0x20, // 'VP8 '
      0x14, 0x00, 0x00, 0x00  // payload
    ]);
    const formData = new FormData();
    formData.append('file', new File([validWebp], 'sg-fruit-logo.webp', { type: 'image/webp' }));

    const res = await app.request('/api/admin/site-profile/assets/logo', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData
    }, env);

    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.asset_type, 'logo');
    assert.ok(body.data.storage_key.startsWith('site/logo_'));
    assert.strictEqual(body.data.mime_type, 'image/webp');

    // Verify updated in DB
    const row = sqliteDb.prepare('SELECT logo_url FROM site_profile WHERE id = ?').get('default') as any;
    assert.strictEqual(row.logo_url, body.data.url);
  });

  await t.test('8.4 Uploading replacement asset enqueues previous asset to storage_cleanup_queue', async () => {
    // Previous logo is now set in DB. Uploading a PNG logo should queue previous key
    const currentLogoRow = sqliteDb.prepare('SELECT logo_url FROM site_profile WHERE id = ?').get('default') as any;
    const previousLogoUrl = currentLogoRow.logo_url;
    assert.ok(previousLogoUrl.startsWith('/api/images/site/'));
    const expectedQueuedKey = previousLogoUrl.replace('/api/images/', '');

    // Valid PNG Header: 89 50 4E 47 0D 0A 1A 0A
    const validPng = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
    ]);
    const formData = new FormData();
    formData.append('file', new File([validPng], 'sg-fruit-logo-replacement.png', { type: 'image/png' }));

    const res = await app.request('/api/admin/site-profile/assets/logo', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData
    }, env);

    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.data.mime_type, 'image/png');

    // Check storage_cleanup_queue has the previous key
    const queueItem = sqliteDb.prepare('SELECT storage_key, reason FROM storage_cleanup_queue WHERE storage_key = ?').get(expectedQueuedKey) as any;
    assert.ok(queueItem, `Previous asset ${expectedQueuedKey} should be queued in storage_cleanup_queue`);
    assert.ok(queueItem.reason.includes('Replaced site asset: logo'));
  });

  // 9. Public Image Serving & Path Traversal Guard
  await t.test('9.1 GET /api/images/site/:key serves brand image with correct content-type', async () => {
    // We put a mock image into R2 under site/logo_test.webp
    const sampleData = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    mockR2Storage.set('site/logo_test.webp', { body: sampleData, mime: 'image/webp' });

    const res = await app.request('/api/images/site/logo_test.webp', {
      headers: { Host: 'staging-api.siriwatmedhanin.com' }
    }, env);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/webp');
  });

  await t.test('9.2 Path traversal attack on /api/images/ is strictly rejected (400)', async () => {
    const res = await app.request('/api/images/..%2F..%2Fsecret.txt', {
      headers: { Host: 'staging-api.siriwatmedhanin.com' }
    }, env);

    assert.strictEqual(res.status, 400);
  });

  await t.test('9.3 Non-image file extension on /api/images/ is strictly rejected (403)', async () => {
    const res = await app.request('/api/images/site/malicious.php', {
      headers: { Host: 'staging-api.siriwatmedhanin.com' }
    }, env);

    assert.strictEqual(res.status, 403);
  });
});
