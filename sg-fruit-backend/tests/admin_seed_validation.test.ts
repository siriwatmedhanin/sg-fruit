/**
 * SG FRUIT — Automated Test Suite: Single Admin Seed Fail-Closed Validation
 * Proves:
 * 1. Missing STAGING_ADMIN_EMAIL fails closed (returns error / CLI exits code 1)
 * 2. Empty string STAGING_ADMIN_EMAIL fails closed
 * 3. Invalid email formats fail closed
 * 4. Valid email succeeds and generates idempotent SQL
 * 5. CLI process exit code is non-zero (1) when missing or invalid
 * 6. seed_staging_data.sql does NOT contain hardcoded admin-auditor@siriwatmedhanin.com
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  validateStagingAdminEmail,
  buildAdminSeedSql
} from '../scripts/seed_staging';

test('SG FRUIT - Single Admin Seed Fail-Closed Suite', async (t) => {

  await t.test('1. Missing STAGING_ADMIN_EMAIL (undefined / null) must fail closed', () => {
    const resUndefined = validateStagingAdminEmail(undefined);
    assert.strictEqual(resUndefined.ok, false);
    assert.match(resUndefined.error!, /FAIL CLOSED/);

    const resNull = validateStagingAdminEmail(null);
    assert.strictEqual(resNull.ok, false);
    assert.match(resNull.error!, /FAIL CLOSED/);
  });

  await t.test('2. Empty string or whitespace STAGING_ADMIN_EMAIL must fail closed', () => {
    const resEmpty = validateStagingAdminEmail('');
    assert.strictEqual(resEmpty.ok, false);
    assert.match(resEmpty.error!, /FAIL CLOSED/);

    const resSpaces = validateStagingAdminEmail('   ');
    assert.strictEqual(resSpaces.ok, false);
    assert.match(resSpaces.error!, /FAIL CLOSED/);
  });

  await t.test('3. Invalid email formats must fail closed', () => {
    const invalidFormats = [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@domain.com',
      'Joe Smith <email@domain.com>',
      'email.domain.com',
      'email@domain@domain.com',
      'user@domain',
      'user@.com',
      'user@domain..com'
    ];

    for (const badEmail of invalidFormats) {
      const res = validateStagingAdminEmail(badEmail);
      assert.strictEqual(res.ok, false, `Expected ${badEmail} to fail validation`);
      assert.match(res.error!, /FAIL CLOSED: Invalid email format/);
    }
  });

  await t.test('4. Valid email formats must succeed and normalize', () => {
    const validEmails = [
      { input: 'admin@siriwatmedhanin.com', expected: 'admin@siriwatmedhanin.com' },
      { input: 'OPERATOR.LEAD@FRUIT.CO.TH', expected: 'operator.lead@fruit.co.th' },
      { input: '  admin+staging@siriwatmedhanin.com  ', expected: 'admin+staging@siriwatmedhanin.com' }
    ];

    for (const tc of validEmails) {
      const res = validateStagingAdminEmail(tc.input);
      assert.strictEqual(res.ok, true);
      assert.strictEqual(res.email, tc.expected);

      const sql = buildAdminSeedSql(res.email!);
      assert.ok(sql.includes(tc.expected));
      assert.ok(sql.includes("role = 'admin'"));
      assert.ok(sql.includes("is_active = 1"));
    }
  });

  await t.test('5. CLI Execution: Missing STAGING_ADMIN_EMAIL exits with code 1', () => {
    const scriptPath = path.resolve('scripts/seed_staging.ts');
    let threw = false;
    let exitCode: number | null = null;
    let stderrOutput = '';

    try {
      execSync(`npx.cmd tsx "${scriptPath}"`, {
        env: { ...process.env, STAGING_ADMIN_EMAIL: '' },
        stdio: 'pipe'
      });
    } catch (err: any) {
      threw = true;
      exitCode = err.status;
      stderrOutput = err.stderr?.toString() || '';
    }

    assert.strictEqual(threw, true, 'CLI must throw/fail when STAGING_ADMIN_EMAIL is empty');
    assert.strictEqual(exitCode, 1, 'Exit code must be 1 (non-zero fail closed)');
    assert.match(stderrOutput, /FAIL CLOSED/);
  });

  await t.test('6. CLI Execution: Valid STAGING_ADMIN_EMAIL exits with code 0', () => {
    const scriptPath = path.resolve('scripts/seed_staging.ts');
    const output = execSync(`npx.cmd tsx "${scriptPath}"`, {
      env: { ...process.env, STAGING_ADMIN_EMAIL: 'verified-admin@siriwatmedhanin.com' },
      encoding: 'utf8'
    });

    assert.ok(output.includes('Validated admin email: verified-admin@siriwatmedhanin.com'));
    assert.ok(output.includes('INSERT INTO admin_users'));
  });

  await t.test('7. seed_staging_data.sql does NOT contain hardcoded admin-auditor@siriwatmedhanin.com', () => {
    const sqlPath = path.resolve('migrations/seed_staging_data.sql');
    const content = fs.readFileSync(sqlPath, 'utf8');
    assert.strictEqual(
      content.includes('admin-auditor@siriwatmedhanin.com'),
      false,
      'seed_staging_data.sql must NOT contain hardcoded admin-auditor@siriwatmedhanin.com'
    );
  });
});
