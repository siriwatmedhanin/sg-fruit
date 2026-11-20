/**
 * SG FRUIT — Staging Single Admin Seed Provisioner (Fail-Closed)
 * 
 * Rules:
 * 1. Strictly requires STAGING_ADMIN_EMAIL environment variable.
 * 2. If STAGING_ADMIN_EMAIL is missing, empty, or has an invalid email format,
 *    the script THROWS AN ERROR and exits with code 1 (FAIL CLOSED).
 * 3. Never hardcodes production/staging admin emails in SQL files.
 */

import path from 'node:path';
import url from 'node:url';

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

export interface ValidationResult {
  ok: boolean;
  email?: string;
  error?: string;
}

/**
 * Validates the admin email for staging provisioning.
 * Enforces Fail-Closed behavior.
 */
export function validateStagingAdminEmail(rawEmail?: string | null): ValidationResult {
  if (rawEmail === undefined || rawEmail === null) {
    return {
      ok: false,
      error: 'FAIL CLOSED: STAGING_ADMIN_EMAIL environment variable is missing. Refusing to seed without explicit admin identity.'
    };
  }

  const trimmed = String(rawEmail).trim();
  if (trimmed === '') {
    return {
      ok: false,
      error: 'FAIL CLOSED: STAGING_ADMIN_EMAIL is empty string. Refusing to seed without explicit admin identity.'
    };
  }

  if (!EMAIL_REGEX.test(trimmed) || trimmed.includes('..')) {
    return {
      ok: false,
      error: `FAIL CLOSED: Invalid email format in STAGING_ADMIN_EMAIL: "${trimmed}". Must be a valid email address.`
    };
  }

  return {
    ok: true,
    email: trimmed.toLowerCase()
  };
}

/**
 * Builds the idempotent SQL statement to seed the single authorized admin user.
 */
export function buildAdminSeedSql(email: string, name = 'Staging Designated Admin'): string {
  const sanitizedEmail = email.replace(/'/g, "''");
  const sanitizedName = name.replace(/'/g, "''");
  return `INSERT INTO admin_users (id, email, name, role, is_active) VALUES ('usr-staging-admin-01', '${sanitizedEmail}', '${sanitizedName}', 'admin', 1) ON CONFLICT(email) DO UPDATE SET role = 'admin', is_active = 1;`;
}

// Execution block when invoked directly from CLI
const currentFilePath = path.resolve(url.fileURLToPath(import.meta.url));
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (entryFilePath && (currentFilePath.toLowerCase() === entryFilePath.toLowerCase())) {
  const validation = validateStagingAdminEmail(process.env.STAGING_ADMIN_EMAIL);
  if (!validation.ok) {
    console.error(`\x1b[31m[CRITICAL SEED ERROR] ${validation.error}\x1b[0m`);
    process.exit(1);
  }

  const sql = buildAdminSeedSql(validation.email!);
  console.log(`[SEED SCRIPT] Validated admin email: ${validation.email}`);
  console.log(`[SEED SCRIPT] Generated SQL:\n${sql}`);
}
