import { Hono } from 'hono';
import type { Env } from '../types/env';

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.get('/', async (c) => {
  const d1Available = Boolean(c.env.DB);
  const r2Available = Boolean(c.env.PRODUCT_IMAGES);

  // Probe D1 if bound
  let d1Probe = 'untested';
  if (d1Available) {
    try {
      await c.env.DB.prepare('SELECT 1 as test').first();
      d1Probe = 'connected';
    } catch (e: any) {
      d1Probe = `error: ${e.message}`;
    }
  }

  return c.json({
    ok: true,
    service: c.env.APP_NAME || 'SG FRUIT API',
    status: 'healthy',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
    bindings: {
      d1_database: {
        bound: d1Available,
        probe: d1Probe,
      },
      r2_bucket: {
        bound: r2Available,
        probe: r2Available ? 'ready' : 'not_bound',
      },
    },
  });
});
