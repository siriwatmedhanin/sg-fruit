import {
  runR2Backup,
  runR2Restore,
  calculateSha256,
  type R2StorageDriver,
} from '../scripts/r2_backup_restore';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// In-Memory Mock R2 Driver
class MockR2Driver implements R2StorageDriver {
  public store = new Map<
    string,
    {
      body: Buffer;
      contentType: string;
      cacheControl?: string;
      contentDisposition?: string;
      contentEncoding?: string;
      etag: string;
      customMetadata?: Record<string, string>;
    }
  >();

  async listObjects() {
    return Array.from(this.store.entries()).map(([key, val]) => ({
      key,
      size: val.body.length,
      etag: val.etag,
      contentType: val.contentType,
      cacheControl: val.cacheControl,
      customMetadata: val.customMetadata,
    }));
  }

  async getObject(key: string) {
    const item = this.store.get(key);
    if (!item) throw new Error(`Object not found: ${key}`);
    return item;
  }

  async putObject(key: string, body: Buffer, metadata: any) {
    this.store.set(key, {
      body,
      contentType: metadata.contentType,
      cacheControl: metadata.cacheControl,
      contentDisposition: metadata.contentDisposition,
      contentEncoding: metadata.contentEncoding,
      etag: `"${crypto.createHash('md5').update(body).digest('hex')}"`,
      customMetadata: metadata.customMetadata,
    });
  }
}

async function testR2BackupRestore() {
  console.log('===============================================================');
  console.log('SG FRUIT STEP 7.3 — R2 BACKUP & RESTORE UNIT TEST SUITE');
  console.log('===============================================================\n');

  const driver = new MockR2Driver();

  // Create real synthetic image buffers
  // 1. Flagship product image (exactly 45,120 bytes)
  const productImgBody = crypto.randomBytes(45120);
  const realSha256_45k = calculateSha256(productImgBody);
  console.log('Real SHA-256 for 45,120 bytes file:', realSha256_45k);

  // 2. Thumbnail image (4,096 bytes)
  const thumbBody = crypto.randomBytes(4096);

  // 3. Gallery image (20,480 bytes)
  const galleryBody = crypto.randomBytes(20480);

  // Populate driver
  await driver.putObject('products/sg-001/main.webp', productImgBody, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000',
    customMetadata: { product_id: 'sg-001', variant: 'main' },
  });

  await driver.putObject('products/sg-001/thumb.webp', thumbBody, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=86400',
    customMetadata: { product_id: 'sg-001', variant: 'thumbnail' },
  });

  await driver.putObject('products/sg-001/gallery-1.webp', galleryBody, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000',
    customMetadata: { product_id: 'sg-001', role: 'gallery', index: '1' },
  });

  const testBackupDir = path.join(
    'C:/Users/user/.gemini/antigravity/brain/a64e862e-6ef7-4734-a789-db3e8a56e570/scratch/r2_test_backup'
  );

  // 1. Test Backup Execution
  console.log('--- 1. Testing R2 Backup ---');
  const manifest = await runR2Backup(driver, 'sg-fruit-products-staging', testBackupDir);

  const backupPassed =
    manifest.total_objects === 3 &&
    manifest.total_bytes === 45120 + 4096 + 20480 &&
    manifest.objects.find((o) => o.key === 'products/sg-001/main.webp')?.sha256 === realSha256_45k;

  console.log(
    `[${backupPassed ? 'PASS' : 'FAIL'}] Backup Manifest Generated: ${manifest.total_objects} objects, ${manifest.total_bytes} bytes`
  );

  // 2. Test Dry Run Restore
  console.log('\n--- 2. Testing R2 Dry Run Restore ---');
  const dryRunResult = await runR2Restore(driver, testBackupDir, { apply: false });
  const dryRunPassed =
    dryRunResult.is_dry_run === true &&
    dryRunResult.verified_checksums === 3 &&
    dryRunResult.restored_objects === 0 &&
    dryRunResult.failed_objects === 0;

  console.log(
    `[${dryRunPassed ? 'PASS' : 'FAIL'}] Dry Run Safety: Checksums verified: ${dryRunResult.verified_checksums}, Restored: ${dryRunResult.restored_objects}`
  );

  // 3. Test Apply Restore into Empty Driver
  console.log('\n--- 3. Testing R2 Apply Restore ---');
  driver.store.clear(); // Simulate complete bucket loss
  const applyResult = await runR2Restore(driver, testBackupDir, { apply: true });
  const restoredObj = await driver.getObject('products/sg-001/main.webp');

  const applyPassed =
    applyResult.is_dry_run === false &&
    applyResult.restored_objects === 3 &&
    driver.store.size === 3 &&
    restoredObj.body.length === 45120 &&
    restoredObj.customMetadata?.product_id === 'sg-001';

  console.log(
    `[${applyPassed ? 'PASS' : 'FAIL'}] Apply Restore: Restored ${applyResult.restored_objects} objects with intact metadata`
  );

  // 4. Test Tamper Detection
  console.log('\n--- 4. Testing Tamper & Corrupt File Detection ---');
  const tamperedFile = path.join(testBackupDir, 'objects/products/sg-001/thumb.webp');
  fs.appendFileSync(tamperedFile, Buffer.from('TAMPERED_BYTE'));

  const tamperResult = await runR2Restore(driver, testBackupDir, { apply: true });
  const tamperPassed =
    tamperResult.failed_objects === 1 &&
    tamperResult.errors[0].includes('SHA-256 Mismatch');

  console.log(
    `[${tamperPassed ? 'PASS' : 'FAIL'}] Tamper Detection: Caught SHA-256 mismatch as expected (${tamperResult.errors[0]})`
  );

  // Clean up test backup
  fs.rmSync(testBackupDir, { recursive: true, force: true });
  console.log('\nTest backup files cleaned up.');

  const allPassed = backupPassed && dryRunPassed && applyPassed && tamperPassed;
  console.log('===============================================================');
  console.log(`R2 BACKUP & RESTORE SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'TESTS FAILED'}`);
  console.log('===============================================================');

  if (!allPassed) process.exit(1);
}

testR2BackupRestore().catch((err) => {
  console.error('Fatal R2 Test Error:', err);
  process.exit(1);
});
