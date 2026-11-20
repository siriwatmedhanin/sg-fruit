import type { Context, Next } from 'hono';
import type { Env } from '../types/env';

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.req.header('Origin') || '';
  const isDev = !c.env.ENVIRONMENT || c.env.ENVIRONMENT === 'development';
  const url = new URL(c.req.url);
  const host = url.hostname.toLowerCase();

  let isAllowed = false;

  if (isDev) {
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:8892',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8892',
    ];
    // In local development, allow dev origins or direct test requests without origin header
    isAllowed = !origin || devOrigins.includes(origin) || (c.env.CORS_ALLOW_ORIGIN || '').split(',').map((s: string) => s.trim()).includes(origin);
  } else {
    // Non-Development (Staging / Production): Strictly segregate by Hostname
    const isAdminHost = host.includes('admin-api');
    
    if (isAdminHost) {
      // Admin API: Strictly only allow configured Admin UI origins (e.g. https://staging-admin.siriwatmedhanin.com)
      const allowedAdmin = (c.env.CORS_ADMIN_ORIGINS || c.env.CORS_ALLOW_ORIGIN || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      isAllowed = Boolean(origin && allowedAdmin.includes(origin));
    } else {
      // Public API: Strictly only allow configured Public Storefront origins
      const allowedPublic = (c.env.CORS_PUBLIC_ORIGINS || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      isAllowed = Boolean(origin && allowedPublic.includes(origin));
    }
  }

  // Allowed Headers: X-Dev-Role is strictly prohibited in Staging & Production!
  // Cf-Access-Jwt-Assertion is an edge-injected header from Cloudflare Access, not a frontend header.
  const allowedHeaders = isDev
    ? 'Content-Type, Authorization, X-Dev-Role'
    : 'Content-Type, Authorization';

  if (c.req.method === 'OPTIONS') {
    const preflightHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': allowedHeaders,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (isAllowed && origin) {
      preflightHeaders['Access-Control-Allow-Origin'] = origin;
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
    return new Response(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  await next();

  if (isAllowed && origin) {
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Vary', 'Origin');
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}
