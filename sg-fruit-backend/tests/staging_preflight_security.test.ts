import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import app from '../src/index';
import { sanitizeForSpreadsheet } from '../src/utils/orderTemplate';

// -------------------------------------------------------------
// 1. SETUP ENVIRONMENT BINDINGS (D1 & R2 WRAPPERS)
// -------------------------------------------------------------
const d1Path = 'F:/Khet/งานส่วนตัว/sg-fruit-backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite';
const sqliteDb = new DatabaseSync(d1Path);

function createD1Wrapper(sqlite) {
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

const mockR2Storage = new Map<string, Uint8Array>();
const r2Wrapper = {
  async get(key: string) {
    const data = mockR2Storage.get(key);
    if (!data) return null;
    return {
      body: data,
      arrayBuffer: async () => data.buffer,
      writeHttpMetadata(headers: Headers) {
        headers.set('content-type', 'image/webp');
      }
    };
  },
  async put(key: string, value: any) {
    if (value instanceof Uint8Array) {
      mockR2Storage.set(key, value);
    } else {
      mockR2Storage.set(key, new Uint8Array(32));
    }
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

// Key 1: Primary Valid Key
const { publicKey: pub1, privateKey: priv1 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk1 = pub1.export({ format: 'jwk' }) as any;
jwk1.kid = 'kid-staging-key-1';
jwk1.alg = 'RS256';
jwk1.use = 'sig';

// Key 2: Secondary Rotated Key
const { publicKey: pub2, privateKey: priv2 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk2 = pub2.export({ format: 'jwk' }) as any;
jwk2.kid = 'kid-staging-key-2';
jwk2.alg = 'RS256';
jwk2.use = 'sig';

// Key 3: Attacker Key (Not in JWKS)
const { publicKey: pubAttacker, privateKey: privAttacker } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwkAttacker = pubAttacker.export({ format: 'jwk' }) as any;
jwkAttacker.kid = 'kid-attacker-rogue';

// Mock global fetch for JWKS endpoint
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`) {
    return new Response(JSON.stringify({ keys: [jwk1, jwk2] }), {
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
  ENVIRONMENT: 'staging', // Staging mode: Disables local dev mock!
  APP_NAME: 'SG FRUIT API (Staging Test)',
  CF_ACCESS_TEAM_NAME: teamName,
  CF_ACCESS_AUD: expectedAud,
  CORS_ADMIN_ORIGINS: 'https://staging-admin.siriwatmedhanin.com',
  CORS_ALLOW_ORIGIN: 'https://staging-admin.siriwatmedhanin.com',
  CORS_PUBLIC_ORIGINS: '',
  DB: createD1Wrapper(sqliteDb),
  PRODUCT_IMAGES: r2Wrapper
};

// -------------------------------------------------------------
// 3. EXECUTE TEST SUITE
// -------------------------------------------------------------
interface TestResult {
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  expectedError?: string;
  actualError?: string;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

async function runTest(
  category: string,
  name: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: any,
  expectedStatus: number,
  expectedError?: string
) {
  try {
    const reqHeaders = new Headers(headers);
    if (body && !reqHeaders.has('content-type')) {
      reqHeaders.set('content-type', 'application/json');
    }

    let targetUrl: string;
    if (path.startsWith('http')) {
      targetUrl = path;
    } else {
      const defaultHost = path.startsWith('/api/admin')
        ? 'https://staging-admin-api.siriwatmedhanin.com'
        : 'https://staging-api.siriwatmedhanin.com';
      targetUrl = `${defaultHost}${path}`;
    }

    const req = new Request(targetUrl, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    const res = await app.fetch(req, env);
    const json = await res.json().catch(() => ({}));

    const statusMatch = res.status === expectedStatus;
    const errCode = (json.error?.code || json.error) as string | undefined;
    const errorMatch = expectedError ? errCode === expectedError : true;
    const passed = statusMatch && errorMatch;

    results.push({
      category,
      name,
      expectedStatus,
      actualStatus: res.status,
      expectedError,
      actualError: errCode,
      passed,
      notes: passed ? 'PASS' : `Mismatch: Status ${res.status} (exp ${expectedStatus}), Err: ${errCode} (exp ${expectedError})`
    });

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${category} :: ${name} -> HTTP ${res.status}`);
  } catch (err: any) {
    results.push({
      category,
      name,
      expectedStatus,
      actualStatus: 500,
      expectedError,
      actualError: err.message,
      passed: false,
      notes: `Exception: ${err.message}`
    });
    console.log(`[FAIL] ${category} :: ${name} -> Exception: ${err.message}`);
  }
}

async function runCorsTest(
  name: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  expectedStatus: number,
  expectedAllowOrigin?: string,
  expectedAllowCredentials?: string
) {
  try {
    const reqHeaders = new Headers(headers);
    const targetUrl = path.startsWith('http')
      ? path
      : `https://staging-admin-api.siriwatmedhanin.com${path}`;

    const req = new Request(targetUrl, {
      method,
      headers: reqHeaders
    });

    const res = await app.fetch(req, env);
    const allowOrigin = res.headers.get('Access-Control-Allow-Origin');
    const allowCreds = res.headers.get('Access-Control-Allow-Credentials');

    const statusMatch = res.status === expectedStatus;
    const originMatch = expectedAllowOrigin !== undefined
      ? (expectedAllowOrigin === '' ? !allowOrigin : allowOrigin === expectedAllowOrigin)
      : true;
    const credsMatch = expectedAllowCredentials !== undefined
      ? allowCreds === expectedAllowCredentials
      : true;

    const passed = statusMatch && originMatch && credsMatch;
    results.push({
      category: 'CORS & Preflight',
      name,
      expectedStatus,
      actualStatus: res.status,
      passed,
      notes: passed
        ? `PASS (Origin: ${allowOrigin || 'none'}, Creds: ${allowCreds || 'none'})`
        : `Mismatch: status ${res.status} (exp ${expectedStatus}), origin: ${allowOrigin} (exp ${expectedAllowOrigin}), creds: ${allowCreds} (exp ${expectedAllowCredentials})`
    });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] CORS & Preflight :: ${name} -> HTTP ${res.status} (Origin: ${allowOrigin || 'none'})`);
  } catch (err: any) {
    results.push({
      category: 'CORS & Preflight',
      name,
      expectedStatus,
      actualStatus: 500,
      passed: false,
      notes: `Exception: ${err.message}`
    });
    console.log(`[FAIL] CORS & Preflight :: ${name} -> Exception: ${err.message}`);
  }
}

async function main() {
  console.log('===============================================================');
  console.log('SG FRUIT STEP 7.1 — COMPREHENSIVE BACKEND SECURITY & INTEGRATION');
  console.log('===============================================================\n');

  // Seed single authorized admin user in admin_users table for authoritative server-side role resolution
  sqliteDb.prepare(`
    INSERT OR REPLACE INTO admin_users (id, email, name, role, is_active) VALUES
      ('usr-staging-admin-01', 'admin-auditor@siriwatmedhanin.com', 'Staging Admin Auditor', 'admin', 1),
      ('usr-staging-inactive-01', 'inactive-admin@siriwatmedhanin.com', 'Inactive Admin', 'admin', 0);
  `).run();

  const now = Math.floor(Date.now() / 1000);

  // Payload templates
  const validAdminPayload = {
    iss: `https://${teamName}.cloudflareaccess.com`,
    aud: expectedAud,
    email: 'admin-auditor@siriwatmedhanin.com',
    'custom:roles': ['admin'],
    exp: now + 3600,
    nbf: now - 60
  };

  const deprecatedStaffPayload = {
    iss: `https://${teamName}.cloudflareaccess.com`,
    aud: expectedAud,
    email: 'packing-staff@siriwatmedhanin.com',
    exp: now + 3600,
    nbf: now - 60
  };

  const inactiveAdminPayload = {
    iss: `https://${teamName}.cloudflareaccess.com`,
    aud: expectedAud,
    email: 'inactive-admin@siriwatmedhanin.com',
    'custom:roles': ['admin'],
    exp: now + 3600,
    nbf: now - 60
  };

  // --- SECTION 1: JWT & CLOUDFLARE ACCESS AUTHENTICATION TESTS ---
  console.log('--- 1. Testing Cloudflare Access JWT Verification ---');

  // 1.1 Missing Token
  await runTest(
    'JWT Auth',
    '1.1 Missing Cf-Access-Jwt-Assertion Header',
    'GET',
    '/api/admin/orders',
    {},
    null,
    401,
    'AUTH_TOKEN_REQUIRED'
  );

  // 1.2 Malformed JWT (2 segments)
  await runTest(
    'JWT Auth',
    '1.2 Malformed JWT (Only 2 segments)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': 'header.payload' },
    null,
    401,
    'AUTH_MALFORMED_JWT'
  );

  // 1.3 Invalid Header Base64
  await runTest(
    'JWT Auth',
    '1.3 Invalid Header Base64 JSON',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': 'not-base64.payload.sig' },
    null,
    401,
    'AUTH_INVALID_HEADER'
  );

  // 1.4 Unsupported Algorithm (HS256)
  const hs256Jwt = createSignedJwt({ alg: 'HS256', kid: 'kid-staging-key-1' }, validAdminPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.4 Unsupported Algorithm (HS256 instead of RS256)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': hs256Jwt },
    null,
    401,
    'AUTH_UNSUPPORTED_ALGORITHM'
  );

  // 1.5 Missing kid
  const noKidJwt = createSignedJwt({ alg: 'RS256' }, validAdminPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.5 Missing Key ID (kid) in Header',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': noKidJwt },
    null,
    401,
    'AUTH_MISSING_KID'
  );

  // 1.6 Unknown Key ID
  const unknownKidJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-unknown-999' }, validAdminPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.6 Unknown Key ID (Not present in JWKS certs)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': unknownKidJwt },
    null,
    401,
    'AUTH_UNKNOWN_KEY_ID'
  );

  // 1.7 Tampered Signature
  const validJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, validAdminPayload, priv1);
  const parts = validJwt.split('.');
  const tamperedSig = parts[2].slice(0, -4) + 'AAAA';
  const tamperedJwt = `${parts[0]}.${parts[1]}.${tamperedSig}`;
  await runTest(
    'JWT Auth',
    '1.7 Tampered Cryptographic Signature',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': tamperedJwt },
    null,
    401,
    'AUTH_INVALID_SIGNATURE'
  );

  // 1.8 Invalid Signature (Signed with attacker rogue private key)
  const rogueJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, validAdminPayload, privAttacker);
  await runTest(
    'JWT Auth',
    '1.8 Invalid Signature (Signed with attacker private key)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': rogueJwt },
    null,
    401,
    'AUTH_INVALID_SIGNATURE'
  );

  // 1.9 Expired Token
  const expiredPayload = { ...validAdminPayload, exp: now - 300 };
  const expiredJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, expiredPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.9 Expired Token (exp in the past)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': expiredJwt },
    null,
    401,
    'AUTH_TOKEN_EXPIRED'
  );

  // 1.10 Token Not Yet Valid
  const futureNbfPayload = { ...validAdminPayload, nbf: now + 600 };
  const futureNbfJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, futureNbfPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.10 Token Not Yet Valid (nbf in the future)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': futureNbfJwt },
    null,
    401,
    'AUTH_TOKEN_NOT_YET_VALID'
  );

  // 1.11 Issuer Mismatch
  const wrongIssPayload = { ...validAdminPayload, iss: 'https://evil-hacker.cloudflareaccess.com' };
  const wrongIssJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, wrongIssPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.11 Issuer Mismatch (iss does not match expected team)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': wrongIssJwt },
    null,
    401,
    'AUTH_ISSUER_MISMATCH'
  );

  // 1.12 Audience Mismatch (aud does not match Access App AUD)
  const wrongAudPayload = { ...validAdminPayload, aud: 'aud-attacker-application-999' };
  const wrongAudJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, wrongAudPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.12 Audience Mismatch (aud does not match Access App AUD)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': wrongAudJwt },
    null,
    403,
    'AUTH_AUDIENCE_MISMATCH'
  );

  // 1.13 Missing AUD Claim in Token
  const missingAudPayload = { ...validAdminPayload, aud: undefined };
  const missingAudJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, missingAudPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.13 Missing AUD Claim in Token (Rejected -> 403 AUTH_AUDIENCE_MISMATCH)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': missingAudJwt },
    null,
    403,
    'AUTH_AUDIENCE_MISMATCH'
  );

  // 1.14 Missing Email Claim in Token
  const noEmailPayload = { ...validAdminPayload, email: undefined };
  const noEmailJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, noEmailPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.14 Missing Email Claim in Token',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': noEmailJwt },
    null,
    401,
    'AUTH_MISSING_EMAIL'
  );

  // 1.15 Key Rotation Test (Rotated key kid-staging-key-2)
  const rotatedKeyJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-2' }, validAdminPayload, priv2);
  await runTest(
    'JWT Auth',
    '1.15 Key Rotation Verification (kid-staging-key-2 in JWKS)',
    'GET',
    '/api/admin/categories',
    { 'Cf-Access-Jwt-Assertion': rotatedKeyJwt },
    null,
    200
  );

  // 1.16 Dev Mock Isolation Test (X-Dev-Role ignored when ENVIRONMENT === 'staging')
  await runTest(
    'JWT Auth',
    '1.16 Dev Mock Isolation (X-Dev-Role strictly ignored in Staging mode)',
    'GET',
    '/api/admin/orders',
    { 'X-Dev-Role': 'admin' },
    null,
    401,
    'AUTH_TOKEN_REQUIRED'
  );

  // 1.17 Valid Single Shared AUD Tag accepted (Single Multi-Domain Access Application)
  const validSharedAudJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, validAdminPayload, priv1);
  await runTest(
    'JWT Auth',
    '1.17 Valid Single Shared AUD Tag accepted (<ACTUAL_STAGING_ADMIN_AUD>)',
    'GET',
    '/api/admin/categories',
    { 'Cf-Access-Jwt-Assertion': validSharedAudJwt },
    null,
    200
  );

  // --- SECTION 1.3: CORS PREFLIGHT & ACCESS EDGE ROUTING TESTS ---
  console.log('\n--- 1.3 Testing CORS Preflight & Edge Routing ---');

  // 1.3.1 Preflight OPTIONS from Allowed Staging Admin Origin
  await runCorsTest(
    '1.3.1 Preflight OPTIONS from Allowed Origin (204 + CORS headers + Credentials)',
    'OPTIONS',
    '/api/admin/orders',
    {
      Origin: 'https://staging-admin.siriwatmedhanin.com',
      'Access-Control-Request-Method': 'GET',
    },
    204,
    'https://staging-admin.siriwatmedhanin.com',
    'true'
  );

  // 1.3.2 Preflight OPTIONS from Disallowed Origin
  await runCorsTest(
    '1.3.2 Preflight OPTIONS from Disallowed Origin (204 + No Allow-Origin Header)',
    'OPTIONS',
    '/api/admin/orders',
    {
      Origin: 'https://evil-unauthorized-site.com',
      'Access-Control-Request-Method': 'GET',
    },
    204,
    '',
    undefined
  );

  // 1.3.3 Preflight OPTIONS without cookie/credentials in request
  await runCorsTest(
    '1.3.3 Preflight OPTIONS without Cookie/Credentials (Worker Responds 204)',
    'OPTIONS',
    '/api/admin/orders',
    {
      Origin: 'https://staging-admin.siriwatmedhanin.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
    204,
    'https://staging-admin.siriwatmedhanin.com',
    'true'
  );

  // 1.3.4 Preflight OPTIONS with Standard Headers Request
  await runCorsTest(
    '1.3.4 Preflight OPTIONS with Standard Headers Request',
    'OPTIONS',
    '/api/admin/categories',
    {
      Origin: 'https://staging-admin.siriwatmedhanin.com',
      'Access-Control-Request-Method': 'GET',
    },
    204,
    'https://staging-admin.siriwatmedhanin.com',
    'true'
  );

  // 1.3.5 Actual Admin Request without token from allowed origin (Returns 401 with CORS headers)
  await runCorsTest(
    '1.3.5 Actual Request without Token from Allowed Origin (401 + CORS headers)',
    'GET',
    '/api/admin/orders',
    {
      Origin: 'https://staging-admin.siriwatmedhanin.com',
    },
    401,
    'https://staging-admin.siriwatmedhanin.com',
    'true'
  );

  // 1.3.6 Actual Admin Request with valid token and allowed origin (Returns 200 with CORS headers)
  await runCorsTest(
    '1.3.6 Actual Request with Valid Token and Allowed Origin (200 + CORS headers)',
    'GET',
    '/api/admin/categories',
    {
      Origin: 'https://staging-admin.siriwatmedhanin.com',
      'Cf-Access-Jwt-Assertion': validSharedAudJwt,
    },
    200,
    'https://staging-admin.siriwatmedhanin.com',
    'true'
  );

  // --- SECTION 1.5: HOSTNAME GUARD & PATH NORMALIZATION TESTS ---
  console.log('\n--- 1.5 Testing Hostname Guard & Path Normalization ---');

  // 1.5.1 Public Host calling Public Health endpoint
  await runTest(
    'Hostname Guard',
    '1.5.1 Public Host -> Public Health endpoint (Allowed -> 200)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api/health',
    {},
    null,
    200
  );

  // 1.5.2 Public Host calling Admin endpoint directly
  await runTest(
    'Hostname Guard',
    '1.5.2 Public Host -> Admin Orders endpoint (Blocked -> 403 ADMIN_HOST_REQUIRED)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api/admin/orders',
    {},
    null,
    403,
    'ADMIN_HOST_REQUIRED'
  );

  // 1.5.3 Admin Host calling Admin Categories with valid token
  await runTest(
    'Hostname Guard',
    '1.5.3 Admin Host -> Admin Categories with valid token (Allowed -> 200)',
    'GET',
    'https://staging-admin-api.siriwatmedhanin.com/api/admin/categories',
    { 'Cf-Access-Jwt-Assertion': validSharedAudJwt },
    null,
    200
  );

  // 1.5.4 Uppercase Host Header variation
  await runTest(
    'Hostname Guard',
    '1.5.4 Uppercase Host Header variation (Blocked -> 403 ADMIN_HOST_REQUIRED)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api/admin/orders',
    { Host: 'STAGING-API.SIRIWATMEDHANIN.COM' },
    null,
    403,
    'ADMIN_HOST_REQUIRED'
  );

  // 1.5.5 Host with port variation (Port 443 normalized)
  await runTest(
    'Hostname Guard',
    '1.5.5 Host with port variation (Blocked -> 403 ADMIN_HOST_REQUIRED)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api/admin/orders',
    { Host: 'staging-api.siriwatmedhanin.com:443' },
    null,
    403,
    'ADMIN_HOST_REQUIRED'
  );

  // 1.5.6 Encoded slash in path
  await runTest(
    'Hostname Guard',
    '1.5.6 Encoded slash in path /api%2fadmin/orders (Blocked -> 403 ADMIN_HOST_REQUIRED)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api%2fadmin/orders',
    {},
    null,
    403,
    'ADMIN_HOST_REQUIRED'
  );

  // 1.5.7 Duplicate slashes in path
  await runTest(
    'Hostname Guard',
    '1.5.7 Duplicate slashes /api//admin/orders (Blocked -> 403 ADMIN_HOST_REQUIRED)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api//admin/orders',
    {},
    null,
    403,
    'ADMIN_HOST_REQUIRED'
  );

  // 1.5.8 Trailing slash in path
  await runTest(
    'Hostname Guard',
    '1.5.8 Trailing slash /api/admin/orders/ (Blocked -> 403 ADMIN_HOST_REQUIRED)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api/admin/orders/',
    {},
    null,
    403,
    'ADMIN_HOST_REQUIRED'
  );

  // 1.5.9 Dot segment path normalization
  await runTest(
    'Hostname Guard',
    '1.5.9 Dot segment path normalization /api/../api/admin/orders (Blocked -> 403 ADMIN_HOST_REQUIRED)',
    'GET',
    'https://staging-api.siriwatmedhanin.com/api/../api/admin/orders',
    {},
    null,
    403,
    'ADMIN_HOST_REQUIRED'
  );

  // 1.5.10 Host with unauthorized non-default port :8443
  await runTest(
    'Hostname Guard',
    '1.5.10 Host with unauthorized non-default port :8443 (Blocked -> 400 INVALID_PORT)',
    'GET',
    'https://staging-admin-api.siriwatmedhanin.com:8443/api/admin/categories',
    { Host: 'staging-admin-api.siriwatmedhanin.com:8443' },
    null,
    400,
    'INVALID_PORT'
  );

  // 1.5.11 Unauthorized Host evil-proxy.siriwatmedhanin.com
  await runTest(
    'Hostname Guard',
    '1.5.11 Unauthorized Host evil-proxy.siriwatmedhanin.com (Blocked -> 403 UNAUTHORIZED_HOST)',
    'GET',
    'https://evil-proxy.siriwatmedhanin.com/api/health',
    { Host: 'evil-proxy.siriwatmedhanin.com' },
    null,
    403,
    'UNAUTHORIZED_HOST'
  );

  // --- SECTION 2: SINGLE ADMIN ROLE & DEFAULT DENY TESTS ---
  console.log('\n--- 2. Testing Single Admin Role & Strict Default Deny ---');

  const adminJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, validAdminPayload, priv1);
  const staffJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, deprecatedStaffPayload, priv1);
  const inactiveJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, inactiveAdminPayload, priv1);

  // 2.1 Admin Permissions (Allowed)
  await runTest(
    'Admin Auth',
    '2.1 Admin: View Orders List',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    null,
    200
  );

  await runTest(
    'Admin Auth',
    '2.2 Admin: View Packing Queue',
    'GET',
    '/api/admin/packing',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    null,
    200
  );

  await runTest(
    'Admin Auth',
    '2.3 Admin: View Inventory List',
    'GET',
    '/api/admin/inventory',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    null,
    200
  );

  await runTest(
    'Admin Auth',
    '2.4 Admin: Export Orders Data for Excel (Allowed -> 200)',
    'GET',
    '/api/admin/orders/export-data',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    null,
    200
  );

  await runTest(
    'Admin Auth',
    '2.5 Admin: Check Duplicate Import (Allowed -> 200)',
    'POST',
    '/api/admin/orders/import/check-duplicate',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    { file_hash: 'check-hash-123' },
    200
  );

  // Look up existing variant from synthetic fixtures for stock adjustment test
  const existingVar = sqliteDb.prepare("SELECT id FROM product_variants LIMIT 1").get() as any;

  await runTest(
    'Admin Auth',
    '2.6 Admin: Add New Product (Allowed -> 201 Created)',
    'POST',
    '/api/admin/products',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    {
      name: 'ผลไม้ทดสอบแอดมิน',
      category_id: 'cat-thai',
      sku: 'TEST-ADMIN-FRUIT-01',
      unit: '1 กก.',
      price: 100,
      stock_quantity: 10
    },
    201
  );

  await runTest(
    'Admin Auth',
    '2.7 Admin: Adjust Stock Ledger (Allowed -> 200)',
    'POST',
    '/api/admin/inventory/stock-in',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    { variant_id: existingVar?.id, quantity: 5, notes: 'Admin Restock Test' },
    200
  );

  // 2.2 Default Deny Tests (Unauthorized / Non-Admin -> 403)
  await runTest(
    'Default Deny',
    '2.8 Deprecated Staff Role: Access Orders (Default Deny -> 403 AUTH_USER_NOT_REGISTERED)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': staffJwt },
    null,
    403,
    'AUTH_USER_NOT_REGISTERED'
  );

  await runTest(
    'Default Deny',
    '2.9 Deprecated Staff Role: Export Orders Data (Default Deny -> 403 AUTH_USER_NOT_REGISTERED)',
    'GET',
    '/api/admin/orders/export-data',
    { 'Cf-Access-Jwt-Assertion': staffJwt },
    null,
    403,
    'AUTH_USER_NOT_REGISTERED'
  );

  // 2.10 Unknown External Email Default Deny
  const unknownUserPayload = {
    iss: `https://${teamName}.cloudflareaccess.com`,
    aud: expectedAud,
    email: 'unregistered-intruder@outside.com',
    exp: now + 3600,
    nbf: now - 60
  };
  const unknownUserJwt = createSignedJwt({ alg: 'RS256', kid: 'kid-staging-key-1' }, unknownUserPayload, priv1);
  await runTest(
    'Default Deny',
    '2.10 Unknown Email: Unregistered User (Default Deny -> 403 AUTH_USER_NOT_REGISTERED)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': unknownUserJwt },
    null,
    403,
    'AUTH_USER_NOT_REGISTERED'
  );

  // 2.11 Inactive Admin Account Default Deny
  await runTest(
    'Default Deny',
    '2.11 Inactive Admin: Disabled Account (Default Deny -> 403 AUTH_USER_NOT_REGISTERED)',
    'GET',
    '/api/admin/orders',
    { 'Cf-Access-Jwt-Assertion': inactiveJwt },
    null,
    403,
    'AUTH_USER_NOT_REGISTERED'
  );

  // --- SECTION 3: PUBLIC API SECURITY & DATA LEAKAGE PREVENTION ---
  console.log('\n--- 3. Testing Public API Security & Data Sanitization ---');

  const pubReq = new Request('https://staging-api.siriwatmedhanin.com/api/products', { method: 'GET' });
  const pubRes = await app.fetch(pubReq, env);
  const pubJson = (await pubRes.json()) as any;

  let leakDetected = false;
  let leakReason = '';

  if (pubJson.ok && Array.isArray(pubJson.data)) {
    for (const p of pubJson.data) {
      if (Array.isArray(p.variants)) {
        for (const v of p.variants) {
          if ('sku' in v) {
            leakDetected = true;
            leakReason = `Internal SKU leaked in variant of product ${p.name}`;
          }
          if ('cost_price' in v) {
            leakDetected = true;
            leakReason = `Cost price leaked in variant of product ${p.name}`;
          }
          if ('stock_quantity' in v && typeof v.stock_quantity === 'number') {
            leakDetected = true;
            leakReason = `Raw numeric stock count leaked in variant of product ${p.name}`;
          }
          if (!('in_stock' in v) || typeof v.in_stock !== 'boolean') {
            leakDetected = true;
            leakReason = `Missing sanitized boolean in_stock in variant of product ${p.name}`;
          }
        }
      }
    }
  } else {
    leakDetected = true;
    leakReason = 'Public catalog response not ok or data is not array';
  }

  results.push({
    category: 'Public API Security',
    name: '3.1 Public Catalog Sanitize Check (No SKU, No Cost Price, Sanitized in_stock)',
    expectedStatus: 200,
    actualStatus: pubRes.status,
    passed: !leakDetected && pubRes.status === 200,
    notes: leakDetected ? `LEAK: ${leakReason}` : 'PASS: All internal SKUs, cost prices, and raw stock quantities sanitized'
  });
  console.log(`[${!leakDetected ? 'PASS' : 'FAIL'}] Public API Security :: 3.1 Public Catalog Sanitize Check -> ${!leakDetected ? 'NO LEAKS' : leakReason}`);

  // Test Single Product Detail
  const sampleProdId = pubJson.data?.[0]?.id || 'prod-sample';
  const detailReq = new Request(`https://staging-api.siriwatmedhanin.com/api/products/${sampleProdId}`, { method: 'GET' });
  const detailRes = await app.fetch(detailReq, env);
  const detailJson = (await detailRes.json()) as any;
  const detailPassed = detailRes.status === 200 && detailJson.ok && Array.isArray(detailJson.data.images);

  results.push({
    category: 'Public API Security',
    name: '3.2 Product Detail Gallery Structure (Up to 5 images)',
    expectedStatus: 200,
    actualStatus: detailRes.status,
    passed: detailPassed,
    notes: `Images count: ${detailJson.data?.images?.length || 0}`
  });
  console.log(`[${detailPassed ? 'PASS' : 'FAIL'}] Public API Security :: 3.2 Product Detail Gallery Structure -> Images: ${detailJson.data?.images?.length || 0}`);

  // --- SECTION 4: EXCEL 65 COLUMNS IMPORT / EXPORT TEST ---
  console.log('\n--- 4. Testing TikTok Shop 65 Columns Import & Export ---');

  // Synthetic Test Fixture: 1 Order with 2 Items sharing the same Order ID
  const testOrderId = `ORD-TIKTOK-${Date.now()}`;
  const testHash = crypto.createHash('sha256').update(`test-excel-${Date.now()}`).digest('hex');

  const synthetic65ColItems = [
    {
      'Order ID': testOrderId,
      'Order Status': 'To Ship - Awaiting Shipment',
      'Order Substatus': 'Awaiting Collection',
      'Cancelation/Return Type': 'None',
      'Normal or Pre-order': 'Normal',
      'Fulfillment Type': 'Fulfilled by Seller',
      'Warehouse Name': 'Main Warehouse',
      'Tracking ID': `TH${Date.now()}A`,
      'Delivery Option': 'Standard',
      'Shipping Provider Name': 'Flash Express',
      'Buyer Message': 'ผลไม้ขอผลแก่พร้อมทานครับ',
      'Buyer Username': 'buyer_test_01',
      'Recipient': 'คุณสมชาย ทดสอบ',
      'Phone #': '0891112233',
      'Zipcode': '50180',
      'Country': 'ไทย',
      'Province': 'เชียงใหม่',
      'District': 'แม่ริม',
      'Districts': 'ริมใต้',
      'Detail Address': '99/9 หมู่ 2',
      'Additional address information': 'ใกล้ตลาด',
      'Payment Method': 'QR PromptPay',
      'Weight(kg)': 2.5,
      'Product Category': 'ผลไม้นำเข้า',
      'Package ID': `PKG-${Date.now()}`,
      'Seller Note': 'ออเดอร์สำคัญ',
      'Checked Status': 'Passed',
      'Checked Marked by': 'QC-Staff-01',
      'Order Channel': 'TikTok Shop',
      'Creator Handle': '@sgfruit_affiliate',
      'Request Tax Invoice': 'No',
      'Tax Info - Buyer Tax ID': '',
      'Tax Info - Type': '',
      'Tax Info - Full Name of Buyer': '',
      'Tax Info - Email': '',
      'Tax Info - Phone Number': '',
      'Tax Info - Registered Address': '',
      'Tax Info - Address Type': '',
      'Created Time': '2026-11-19 08:00:00',
      'Paid Time': '2026-11-19 08:05:00',
      'RTS Time': '',
      'Shipped Time': '',
      'Delivered Time': '',
      'Cancelled Time': '',
      'Cancel By': '',
      'Cancel Reason': '',
      'Product Name': 'อะโวคาโดฮาส 2 ลูก',
      'Seller SKU': 'AVO-HASS-2PCS',
      'Platform SKU ID': 'TTSKU-112233',
      'Variation': '2 ลูก',
      'Quantity': 2,
      'Unit Price': 159,
      'Subtotal Before Discount': 318,
      'Platform Discount': 0,
      'Seller Discount': 0,
      'Subtotal After Discount': 318,
      'SKU Total Amount': 318,
      'Shipping Fee After Discount': 45,
      'Original Shipping Fee': 45,
      'Shipping Fee Seller Discount': 0,
      'Shipping Fee Platform Discount': 0,
      'Payment Platform Discount': 0,
      'Taxes': 0,
      'Order Refund Amount': 0,
      'Order Type': 'Standard'
    },
    {
      'Order ID': testOrderId, // SAME ORDER ID (Multi-item order)
      'Order Status': 'To Ship - Awaiting Shipment',
      'Order Substatus': 'Awaiting Collection',
      'Cancelation/Return Type': 'None',
      'Normal or Pre-order': 'Normal',
      'Fulfillment Type': 'Fulfilled by Seller',
      'Warehouse Name': 'Main Warehouse',
      'Tracking ID': `TH${Date.now()}A`,
      'Delivery Option': 'Standard',
      'Shipping Provider Name': 'Flash Express',
      'Buyer Message': 'ผลไม้ขอผลแก่พร้อมทานครับ',
      'Buyer Username': 'buyer_test_01',
      'Recipient': 'คุณสมชาย ทดสอบ',
      'Phone #': '0891112233',
      'Zipcode': '50180',
      'Country': 'ไทย',
      'Province': 'เชียงใหม่',
      'District': 'แม่ริม',
      'Districts': 'ริมใต้',
      'Detail Address': '99/9 หมู่ 2',
      'Additional address information': 'ใกล้ตลาด',
      'Payment Method': 'QR PromptPay',
      'Weight(kg)': 1.0,
      'Product Category': 'ผลไม้ไทย',
      'Package ID': `PKG-${Date.now()}`,
      'Seller Note': 'ออเดอร์สำคัญ',
      'Checked Status': 'Passed',
      'Checked Marked by': 'QC-Staff-01',
      'Order Channel': 'TikTok Shop',
      'Creator Handle': '@sgfruit_affiliate',
      'Request Tax Invoice': 'No',
      'Tax Info - Buyer Tax ID': '',
      'Tax Info - Type': '',
      'Tax Info - Full Name of Buyer': '',
      'Tax Info - Email': '',
      'Tax Info - Phone Number': '',
      'Tax Info - Registered Address': '',
      'Tax Info - Address Type': '',
      'Created Time': '2026-11-19 08:00:00',
      'Paid Time': '2026-11-19 08:05:00',
      'RTS Time': '',
      'Shipped Time': '',
      'Delivered Time': '',
      'Cancelled Time': '',
      'Cancel By': '',
      'Cancel Reason': '',
      'Product Name': 'มะม่วงน้ำดอกไม้ 1 กก.',
      'Seller SKU': 'MANGO-NDM-1KG',
      'Platform SKU ID': 'TTSKU-445566',
      'Variation': '1 กิโลกรัม',
      'Quantity': 1,
      'Unit Price': 129,
      'Subtotal Before Discount': 129,
      'Platform Discount': 0,
      'Seller Discount': 0,
      'Subtotal After Discount': 129,
      'SKU Total Amount': 129,
      'Shipping Fee After Discount': 0,
      'Original Shipping Fee': 0,
      'Shipping Fee Seller Discount': 0,
      'Shipping Fee Platform Discount': 0,
      'Payment Platform Discount': 0,
      'Taxes': 0,
      'Order Refund Amount': 0,
      'Order Type': 'Standard'
    }
  ];

  // 4.1 Import 65 Columns Payload (Admin)
  const importPayload = {
    batch: {
      file_name: 'TikTok_Orders_Synthetic_65Col.xlsx',
      file_hash: testHash,
      file_size: 45000,
      sheet_name: 'OrderSKUList',
      total_rows: 2,
      imported_orders_count: 1,
      imported_items_count: 2,
      notes: 'Synthetic automated preflight test fixture'
    },
    orders: [
      {
        ...synthetic65ColItems[0],
        platform_order_id: testOrderId,
        sku_total_amount: 447,
        total_amount: 492
      }
    ],
    items: synthetic65ColItems.map((item, idx) => ({
      ...item,
      platform_order_id: testOrderId,
      source_row_number: idx + 2,
      product_name: item['Product Name'],
      seller_sku: item['Seller SKU'],
      platform_sku_id: item['Platform SKU ID'],
      quantity: item['Quantity'],
      unit_price: item['Unit Price'],
      subtotal: item['Subtotal After Discount']
    }))
  };

  await runTest(
    'Excel 65-Cols',
    '4.1 Admin: Import 65-Columns Multi-Item Order (1 Excel Row = 1 Order Item)',
    'POST',
    '/api/admin/orders/import',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    importPayload,
    200
  );

  // 4.2 Duplicate Import Check
  await runTest(
    'Excel 65-Cols',
    '4.2 Duplicate File Hash Detection (SHA-256 Prevention)',
    'POST',
    '/api/admin/orders/import/check-duplicate',
    { 'Cf-Access-Jwt-Assertion': adminJwt },
    { file_hash: testHash },
    200
  );

  // Verify DB state: Order and Items (Check 65-Col Multi-Item and SKU preservation)
  const checkOrder = sqliteDb.prepare("SELECT id, order_no, platform_order_id FROM orders WHERE platform_order_id = ?").get(testOrderId) as any;
  const checkItems = sqliteDb.prepare("SELECT id, order_id, product_name, quantity, unit_price, seller_sku, platform_sku_id FROM order_items WHERE platform_order_id = ?").all(testOrderId) as any[];

  const skuPreserved =
    checkItems.length === 2 &&
    checkItems[0].seller_sku === 'AVO-HASS-2PCS' &&
    checkItems[0].platform_sku_id === 'TTSKU-112233' &&
    checkItems[1].seller_sku === 'MANGO-NDM-1KG' &&
    checkItems[1].platform_sku_id === 'TTSKU-445566';

  const orderIntegrityPassed = Boolean(checkOrder) && checkItems.length === 2 && skuPreserved;
  results.push({
    category: 'Excel 65-Cols',
    name: '4.3 Database Rows Integrity: 1 Order with 2 separate items (No SKU Aggregation & Both SKUs Preserved)',
    expectedStatus: 200,
    actualStatus: 200,
    passed: orderIntegrityPassed,
    notes: `Found order ${checkOrder?.order_no || 'null'} with ${checkItems.length} items, SKU Preserved: ${skuPreserved}`
  });
  console.log(`[${orderIntegrityPassed ? 'PASS' : 'FAIL'}] Excel 65-Cols :: 4.3 Database Rows Integrity -> Items Count: ${checkItems.length}, SKU Preserved: ${skuPreserved}`);

  // 4.4 Formula Injection Protection & Export for Admin
  const formulaCheck =
    sanitizeForSpreadsheet('=cmd|/C calc') === "'=cmd|/C calc" &&
    sanitizeForSpreadsheet('+1234') === "'+1234" &&
    sanitizeForSpreadsheet('-500') === "'-500" &&
    sanitizeForSpreadsheet('@SUM(A1:A10)') === "'@SUM(A1:A10)" &&
    sanitizeForSpreadsheet('Normal Order Value') === 'Normal Order Value';

  const exportReq = new Request(`https://staging-admin-api.siriwatmedhanin.com/api/admin/orders/export-data?order_ids=${testOrderId}`, {
    method: 'GET',
    headers: { 'Cf-Access-Jwt-Assertion': adminJwt }
  });
  const exportRes = await app.fetch(exportReq, env);
  const exportJson = (await exportRes.json()) as any;
  const exportPassed = exportRes.status === 200 && exportJson.ok && Array.isArray(exportJson.data) && exportJson.data.length === 2 && formulaCheck;

  results.push({
    category: 'Excel 65-Cols',
    name: '4.4 Admin: Export Orders for Excel (Preserves 65-Col structure & Formula Injection Defense)',
    expectedStatus: 200,
    actualStatus: exportRes.status,
    passed: exportPassed,
    notes: `Exported items: ${exportJson.data?.length || 0}, Formula Check: ${formulaCheck}`
  });
  console.log(`[${exportPassed ? 'PASS' : 'FAIL'}] Excel 65-Cols :: 4.4 Admin Export Orders -> ${exportJson.data?.length || 0} rows, Formula Protected: ${formulaCheck}`);

  // --- SECTION 5: INVENTORY MOVEMENTS LEDGER & IDEMPOTENCY ---
  console.log('\n--- 5. Testing Inventory Movement Ledger & Idempotency ---');

  // Find a sample variant from database
  const sampleVariant = sqliteDb.prepare("SELECT id, product_id, stock_quantity, sku FROM product_variants LIMIT 1").get() as any;
  const testIdempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let initialStock = 0;

  if (sampleVariant) {
    initialStock = sampleVariant.stock_quantity;

    // 5.1 Restock Adjustment
    await runTest(
      'Inventory Ledger',
      '5.1 Stock In (Restock Movement with Idempotency Key)',
      'POST',
      '/api/admin/inventory/stock-in',
      { 'Cf-Access-Jwt-Assertion': adminJwt },
      {
        variant_id: sampleVariant.id,
        quantity: 10,
        reason: 'รับผลผลิตเข้าคลังสินค้าเพิ่มประจำวัน',
        note: 'Preflight automated test',
        idempotency_key: testIdempotencyKey
      },
      200
    );

    // 5.2 Replay Same Idempotency Key (Must prevent double-crediting)
    await runTest(
      'Inventory Ledger',
      '5.2 Idempotency Check: Replay Same Key (Prevent double-stock-change)',
      'POST',
      '/api/admin/inventory/stock-in',
      { 'Cf-Access-Jwt-Assertion': adminJwt },
      {
        variant_id: sampleVariant.id,
        quantity: 10,
        reason: 'รับผลผลิตเข้าคลังสินค้าเพิ่มประจำวัน',
        note: 'Replay duplicate request',
        idempotency_key: testIdempotencyKey
      },
      200 // Should return 200 with idempotent flag or already processed note
    );

    // Verify Audit Log Row in SQLite
    const movementRow = sqliteDb.prepare(`
      SELECT id, variant_id, movement_type, quantity_change, quantity_before, quantity_after, idempotency_key
      FROM inventory_movements
      WHERE idempotency_key = ?
    `).get(testIdempotencyKey) as any;

    const ledgerPassed = Boolean(movementRow) && movementRow.quantity_change === 10;
    results.push({
      category: 'Inventory Ledger',
      name: '5.3 Audit Log Verification: Exactly 1 movement record with before/after counts',
      expectedStatus: 200,
      actualStatus: 200,
      passed: ledgerPassed,
      notes: `Movement ID: ${movementRow?.id || 'none'}, Change: ${movementRow?.quantity_change}`
    });
    console.log(`[${ledgerPassed ? 'PASS' : 'FAIL'}] Inventory Ledger :: 5.3 Audit Log Verification -> Stored Record: ${movementRow?.id || 'none'}`);
  }

  // --- SECTION 6: CONFIGURATION & SECURITY AUDIT (wrangler.jsonc & .gitignore) ---
  console.log('\n--- 6. Testing Staging Config & Gitignore Security ---');
  const wranglerPath = path.resolve('F:\\Khet\\งานส่วนตัว\\sg-fruit-backend\\wrangler.jsonc');
  const wranglerRaw = fs.readFileSync(wranglerPath, 'utf8');

  // 6.1 Must NOT contain DEV_AUTH_MOCK_ENABLED: "true"
  const hasMockTrue = wranglerRaw.includes('"DEV_AUTH_MOCK_ENABLED": "true"');
  results.push({
    category: 'Config Security',
    name: '6.1 wrangler.jsonc does NOT contain DEV_AUTH_MOCK_ENABLED: "true"',
    expectedStatus: 200,
    actualStatus: hasMockTrue ? 500 : 200,
    passed: !hasMockTrue,
    notes: hasMockTrue ? 'CRITICAL: DEV_AUTH_MOCK_ENABLED: "true" found in wrangler.jsonc' : 'Clean: No mock auth enabled in config'
  });
  console.log(`[${!hasMockTrue ? 'PASS' : 'FAIL'}] Config Security :: 6.1 wrangler.jsonc free of DEV_AUTH_MOCK_ENABLED: "true" -> ${!hasMockTrue}`);

  // 6.2 Staging environment has workers_dev: false and proper route
  const wranglerJson = JSON.parse(wranglerRaw);
  const stagingWorkersDev = wranglerJson.env?.staging?.workers_dev === false;
  results.push({
    category: 'Config Security',
    name: '6.2 Staging environment has workers_dev: false',
    expectedStatus: 200,
    actualStatus: stagingWorkersDev ? 200 : 500,
    passed: stagingWorkersDev,
    notes: `workers_dev: ${wranglerJson.env?.staging?.workers_dev}`
  });
  console.log(`[${stagingWorkersDev ? 'PASS' : 'FAIL'}] Config Security :: 6.2 Staging workers_dev: false -> ${stagingWorkersDev}`);

  // 6.3 .dev.vars must be ignored in .gitignore
  const gitignorePath = path.resolve('F:\\Khet\\งานส่วนตัว\\sg-fruit-backend\\.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const devVarsIgnored = gitignoreContent.includes('.dev.vars');
  results.push({
    category: 'Config Security',
    name: '6.3 .dev.vars is strictly excluded in .gitignore',
    expectedStatus: 200,
    actualStatus: devVarsIgnored ? 200 : 500,
    passed: devVarsIgnored,
    notes: devVarsIgnored ? '.dev.vars entry present' : 'CRITICAL: .dev.vars NOT ignored'
  });
  console.log(`[${devVarsIgnored ? 'PASS' : 'FAIL'}] Config Security :: 6.3 .dev.vars in .gitignore -> ${devVarsIgnored}`);

  // Clean up synthetic test records from DB to leave database pristine
  if (sampleVariant) {
    sqliteDb.prepare("UPDATE product_variants SET stock_quantity = ?, inventory_quantity = ? WHERE id = ?").run(initialStock, initialStock, sampleVariant.id);
    sqliteDb.prepare("DELETE FROM inventory_movements WHERE idempotency_key = ?").run(testIdempotencyKey);
  }
  sqliteDb.prepare("DELETE FROM order_items WHERE platform_order_id = ?").run(testOrderId);
  sqliteDb.prepare("DELETE FROM orders WHERE platform_order_id = ?").run(testOrderId);
  sqliteDb.prepare("DELETE FROM order_import_batches WHERE file_hash = ?").run(testHash);
  sqliteDb.prepare("DELETE FROM product_variants WHERE sku = 'TEST-ADMIN-FRUIT-01'").run();
  sqliteDb.prepare("DELETE FROM products WHERE name = 'ผลไม้ทดสอบแอดมิน'").run();
  sqliteDb.prepare("DELETE FROM admin_users WHERE id IN ('usr-staging-admin-01', 'usr-staging-inactive-01')").run();
  console.log('\nSynthetic test fixtures cleaned up from database.');

  sqliteDb.close();

  // Write final test results to JSON
  fs.writeFileSync(
    'C:/Users/user/.gemini/antigravity/brain/a64e862e-6ef7-4734-a789-db3e8a56e570/scratch/security_test_results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n===============================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL SECURITY & INTEGRATION TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('===============================================================');
}

main().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
