import { Hono } from 'hono';
import type { Env, AuthContext } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';

// Initialize Hono Application
const app = new Hono<{ Bindings: Env; Variables: { user: AuthContext } }>();

// 1. Global Middleware
app.use('*', corsMiddleware);

// 2. Global Error Handler
app.onError(errorHandler);

// Helper to normalize path and resolve dot segments & encoded slashes
function normalizePathname(rawPath: string): string {
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // Keep raw if URI malformed
  }
  decoded = decoded.replace(/\/+/g, '/');
  const segments = decoded.split('/');
  const resolved: string[] = [];
  for (const seg of segments) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') {
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }
  return '/' + resolved.join('/').toLowerCase();
}

// 2.5 Defense-in-Depth Hostname Isolation & Port Guard
// Strictly separates Public API and Admin API on Staging & Production
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT && c.env.ENVIRONMENT !== 'development') {
    const url = new URL(c.req.url);
    const rawHost = c.req.header('Host') || url.hostname;
    const [rawHostname, port] = rawHost.split(':');
    const hostname = rawHostname.toLowerCase();

    // Port Validation: Only default HTTPS port 443 (or standard port 80) is allowed at edge
    if (port && port !== '443' && port !== '80') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'INVALID_PORT',
            message: `Requests with unauthorized port :${port} are prohibited`,
          },
        },
        400
      );
    }

    // Hostname Allowlist Check
    const allowedHosts = [
      'staging-api.siriwatmedhanin.com',
      'staging-admin-api.siriwatmedhanin.com',
      'api.siriwatmedhanin.com',
      'admin-api.siriwatmedhanin.com',
    ];

    if (!allowedHosts.includes(hostname)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED_HOST',
            message: `Host '${hostname}' is not authorized to access this service`,
          },
        },
        403
      );
    }

    // Path Normalization & Slash Collapse
    const normalizedPath = normalizePathname(url.pathname);
    const isAdminPath = normalizedPath.startsWith('/api/admin') || normalizedPath === '/api/admin';
    const isPublicHost = hostname === 'staging-api.siriwatmedhanin.com' || hostname === 'api.siriwatmedhanin.com';

    if (isAdminPath && isPublicHost) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'ADMIN_HOST_REQUIRED',
            message: 'Access denied: Admin endpoints are restricted to the designated Admin API Hostname',
          },
        },
        403
      );
    }
  }
  await next();
});

// 3. Mount Routes
app.route('/health', healthRouter);
app.route('/api/health', healthRouter);
app.route('/api', publicRouter);
app.route('/api/admin', adminRouter);

// 4. Default Not Found Handler
app.notFound((c) => {
  return c.json(
    {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${c.req.method} ${c.req.path} not found on SG FRUIT API`,
      },
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// Export Cloudflare Workers Handler
export default app;
