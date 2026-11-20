import type { Context } from 'hono';
import type { Env } from '../types/env';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(err: Error, c: Context<any>) {
  const isDev = c.env.ENVIRONMENT === 'development';
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';

  console.error(`[API Error] [${c.req.method} ${c.req.path}]`, err);

  return c.json(
    {
      ok: false,
      error: {
        code: errorCode,
        message: err.message || 'An unexpected error occurred',
        ...(isDev ? { stack: err.stack } : {}),
      },
      timestamp: new Date().toISOString(),
    },
    statusCode as any
  );
}
