import type { Context, Next } from 'hono';
import type { Env, AuthContext, UserRole } from '../types/env';
import { AppError } from './error';

/**
 * In-memory cache for Cloudflare Access Public JWKS keys
 */
interface JwksKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

let cachedJwks: { keys: JwksKey[]; expiresAt: number } | null = null;

async function getCloudflareAccessJwks(teamName: string): Promise<JwksKey[]> {
  const now = Date.now();
  if (cachedJwks && cachedJwks.expiresAt > now) {
    return cachedJwks.keys;
  }

  const certsUrl = `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const res = await fetch(certsUrl);
  if (!res.ok) {
    throw new AppError(`Failed to fetch Cloudflare Access certificates from ${certsUrl}`, 502, 'AUTH_CERTS_FETCH_FAILED');
  }

  const data = (await res.json()) as { keys: JwksKey[] };
  if (!data || !Array.isArray(data.keys)) {
    throw new AppError('Invalid JWKS response from Cloudflare Access', 502, 'AUTH_INVALID_CERTS');
  }

  // Cache keys for 1 hour
  cachedJwks = {
    keys: data.keys,
    expiresAt: now + 3600 * 1000,
  };

  return cachedJwks.keys;
}

/**
 * Base64URL to Uint8Array converter
 */
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Cryptographically verifies a Cloudflare Access RS256 JWT
 * Validates:
 * 1. RS256 signature using Cloudflare Access Team public key
 * 2. Token expiration (exp)
 * 3. Not Before (nbf)
 * 4. Issuer (iss)
 * 5. Application Audience (aud)
 */
async function verifyCloudflareAccessJwt(token: string, env: Env): Promise<{ email: string; name?: string; payload: any }> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Malformed JWT: must contain 3 segments', 401, 'AUTH_MALFORMED_JWT');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Parse Header
  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(headerB64)));
  } catch {
    throw new AppError('Failed to parse JWT header', 401, 'AUTH_INVALID_HEADER');
  }

  if (header.alg !== 'RS256') {
    throw new AppError(`Unsupported JWT algorithm: ${header.alg}. Expected RS256`, 401, 'AUTH_UNSUPPORTED_ALGORITHM');
  }

  if (!header.kid) {
    throw new AppError('Missing kid (Key ID) in JWT header', 401, 'AUTH_MISSING_KID');
  }

  // 2. Parse Payload
  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
  } catch {
    throw new AppError('Failed to parse JWT payload', 401, 'AUTH_INVALID_PAYLOAD');
  }

  // 3. Claims Validation
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw new AppError('Cloudflare Access Token has expired', 401, 'AUTH_TOKEN_EXPIRED');
  }

  if (payload.nbf && payload.nbf > now) {
    throw new AppError('Cloudflare Access Token is not yet valid (nbf)', 401, 'AUTH_TOKEN_NOT_YET_VALID');
  }

  const teamName = env.CF_ACCESS_TEAM_NAME;
  if (teamName) {
    const expectedIss = `https://${teamName}.cloudflareaccess.com`;
    if (payload.iss !== expectedIss) {
      throw new AppError(`JWT Issuer mismatch: expected ${expectedIss}, got ${payload.iss}`, 401, 'AUTH_ISSUER_MISMATCH');
    }
  }

  if (env.CF_ACCESS_AUD) {
    const audClaim = payload.aud;
    const isAudValid = Array.isArray(audClaim) ? audClaim.includes(env.CF_ACCESS_AUD) : audClaim === env.CF_ACCESS_AUD;
    if (!isAudValid) {
      throw new AppError('Cloudflare Access Audience (aud) mismatch', 403, 'AUTH_AUDIENCE_MISMATCH');
    }
  }

  if (!payload.email) {
    throw new AppError('Cloudflare Access Token missing email claim', 401, 'AUTH_MISSING_EMAIL');
  }

  // 4. Cryptographic Signature Verification using Web Crypto API
  if (!teamName) {
    throw new AppError('Server configuration missing CF_ACCESS_TEAM_NAME for signature verification', 500, 'AUTH_CONFIG_ERROR');
  }

  const keys = await getCloudflareAccessJwks(teamName);
  const matchingKey = keys.find((k) => k.kid === header.kid);
  if (!matchingKey) {
    throw new AppError(`No matching public key found for kid: ${header.kid}`, 401, 'AUTH_UNKNOWN_KEY_ID');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    matchingKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlToUint8Array(signatureB64);

  const isValidSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    signedData
  );

  if (!isValidSignature) {
    throw new AppError('Cryptographic signature verification failed: invalid RS256 signature', 401, 'AUTH_INVALID_SIGNATURE');
  }

  return {
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    payload,
  };
}

/**
 * Cloudflare Access JWT Authentication & Role-Based Access Control (RBAC) Middleware
 */
export function requireAuth(allowedRoles: UserRole[] = ['admin']) {
  return async (c: Context<{ Bindings: Env; Variables: { user: AuthContext } }>, next: Next) => {
    const isProductionOrStaging = c.env.ENVIRONMENT === 'production' || c.env.ENVIRONMENT === 'staging';
    const isDev = !isProductionOrStaging && (c.env.ENVIRONMENT === 'development' || (c.env.ENVIRONMENT as any) === 'local');
    const cfJwt = c.req.header('Cf-Access-Jwt-Assertion');
    const devMockHeader = c.req.header('X-Dev-Role');
    const host = (c.req.header('host') || '').toLowerCase();
    const isLoopback = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('::1');

    let authUser: AuthContext | null = null;

    // 1. Local Development Mock (Explicitly restricted to Local Dev loopback and strictly disabled in Production/Staging)
    if (isDev && isLoopback && c.env.DEV_AUTH_MOCK_ENABLED === 'true' && !cfJwt && devMockHeader) {
      if (devMockHeader !== 'admin') {
        throw new AppError(
          `Forbidden: Invalid development role '${devMockHeader}'. Only 'admin' is authorized.`,
          403,
          'AUTH_INVALID_ROLE'
        );
      }
      authUser = {
        email: 'admin@sg-fruit.local',
        role: 'admin',
        name: 'Local Admin (Dev Mock)',
      };
    } else if (cfJwt) {
      // 2. Production Cryptographic Verification
      const { email, name, payload } = await verifyCloudflareAccessJwt(cfJwt, c.env);
      const role = await resolveUserRole(email, payload, c.env.DB);

      if (!role) {
        throw new AppError(
          `Forbidden: User '${email}' is not authorized or active in SG Fruit Admin`,
          403,
          'AUTH_USER_NOT_REGISTERED'
        );
      }

      authUser = {
        email,
        role,
        name,
      };
    } else {
      throw new AppError('Missing Cloudflare Access Token (Cf-Access-Jwt-Assertion)', 401, 'AUTH_TOKEN_REQUIRED');
    }

    // 3. Strict Role-Based Authorization
    if (!allowedRoles.includes(authUser.role)) {
      throw new AppError(
        `Forbidden: Role '${authUser.role}' does not have sufficient permissions for this endpoint`,
        403,
        'AUTH_INSUFFICIENT_PERMISSIONS'
      );
    }

    c.set('user', authUser);
    await next();
  };
}

async function resolveUserRole(email: string, payload: any, db?: D1Database): Promise<UserRole | null> {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Authoritative Server-side Database Source (D1 admin_users table)
  if (db) {
    try {
      const user = await db
        .prepare('SELECT role, is_active FROM admin_users WHERE LOWER(email) = ?')
        .bind(normalizedEmail)
        .first<{ role: string; is_active: number }>();

      if (user) {
        // Authoritative record found in D1: Check active admin status
        if (user.is_active === 1 && user.role === 'admin') {
          return 'admin';
        }
        // Account disabled (is_active !== 1) or role revoked -> STRICT DENY
        return null;
      }
    } catch {
      // In case DB query fails, fall through to trusted IdP claims
    }
  }

  // 2. Cloudflare Access IdP Custom Claims / Groups (Edge-Injected RS256-verified claims)
  const rolesClaim = payload?.['custom:roles'] || payload?.groups || [];
  if (Array.isArray(rolesClaim) && rolesClaim.includes('admin')) {
    return 'admin';
  }

  // 3. Strict Default Deny: Unknown or unregistered emails get NO role
  return null;
}
