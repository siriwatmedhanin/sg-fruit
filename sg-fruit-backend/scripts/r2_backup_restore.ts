/**
 * SG FRUIT — Production-Grade R2 Backup & Restore Engine
 * Supports Manifest Verification, SHA-256 Checksums, Metadata Preservation,
 * and Dry-Run Safety Mode.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface R2ObjectRecord {
  key: string;
  size_bytes: number;
  content_type: string;
  cache_control?: string;
  content_disposition?: string;
  content_encoding?: string;
  etag: string;
  sha256: string;
  custom_metadata?: Record<string, string>;
  backup_timestamp: string;
}

export interface R2Manifest {
  manifest_version: string;
  generated_at: string;
  bucket_name: string;
  total_objects: number;
  total_bytes: number;
  objects: R2ObjectRecord[];
}

export interface R2StorageDriver {
  listObjects(): Promise<Array<{
    key: string;
    size: number;
    etag: string;
    contentType?: string;
    cacheControl?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    customMetadata?: Record<string, string>;
  }>>;
  getObject(key: string): Promise<{
    body: Buffer;
    contentType: string;
    cacheControl?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    etag: string;
    customMetadata?: Record<string, string>;
  }>;
  putObject(
    key: string,
    body: Buffer,
    metadata: {
      contentType: string;
      cacheControl?: string;
      contentDisposition?: string;
      contentEncoding?: string;
      customMetadata?: Record<string, string>;
    }
  ): Promise<void>;
}

/**
 * Calculates SHA-256 of buffer
 */
export function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Creates full backup of R2 bucket into target directory
 */
export async function runR2Backup(
  driver: R2StorageDriver,
  bucketName: string,
  backupDir: string
): Promise<R2Manifest> {
  const timestamp = new Date().toISOString();
  const objectsDir = path.join(backupDir, 'objects');
  fs.mkdirSync(objectsDir, { recursive: true });

  const objectList = await driver.listObjects();
  const manifestObjects: R2ObjectRecord[] = [];
  let totalBytes = 0;

  for (const item of objectList) {
    const obj = await driver.getObject(item.key);
    const sha256 = calculateSha256(obj.body);
    totalBytes += obj.body.length;

    // Preserve object relative path structure on disk
    const targetFilePath = path.join(objectsDir, item.key);
    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    fs.writeFileSync(targetFilePath, obj.body);

    manifestObjects.push({
      key: item.key,
      size_bytes: obj.body.length,
      content_type: obj.contentType || 'application/octet-stream',
      cache_control: obj.cacheControl,
      content_disposition: obj.contentDisposition,
      content_encoding: obj.contentEncoding,
      etag: obj.etag,
      sha256,
      custom_metadata: obj.customMetadata || {},
      backup_timestamp: timestamp,
    });
  }

  const manifest: R2Manifest = {
    manifest_version: '2.0.0',
    generated_at: timestamp,
    bucket_name: bucketName,
    total_objects: manifestObjects.length,
    total_bytes: totalBytes,
    objects: manifestObjects,
  };

  const manifestPath = path.join(backupDir, 'r2_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return manifest;
}

export interface RestoreResult {
  is_dry_run: boolean;
  total_manifest_objects: number;
  verified_checksums: number;
  restored_objects: number;
  failed_objects: number;
  errors: string[];
}

/**
 * Restores objects from backup directory to target R2 storage
 * Defaults to DRY RUN. Requires apply === true to perform mutations.
 */
export async function runR2Restore(
  driver: R2StorageDriver,
  backupDir: string,
  options: { apply: boolean }
): Promise<RestoreResult> {
  const manifestPath = path.join(backupDir, 'r2_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`R2 Manifest not found at: ${manifestPath}`);
  }

  const manifest: R2Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const objectsDir = path.join(backupDir, 'objects');

  const result: RestoreResult = {
    is_dry_run: !options.apply,
    total_manifest_objects: manifest.objects.length,
    verified_checksums: 0,
    restored_objects: 0,
    failed_objects: 0,
    errors: [],
  };

  for (const item of manifest.objects) {
    const localFilePath = path.join(objectsDir, item.key);
    if (!fs.existsSync(localFilePath)) {
      result.failed_objects++;
      result.errors.push(`Missing local backup file for key: ${item.key}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const computedSha256 = calculateSha256(fileBuffer);

    // Strict SHA-256 pre-restore integrity check
    if (computedSha256 !== item.sha256) {
      result.failed_objects++;
      result.errors.push(
        `SHA-256 Mismatch for ${item.key}: expected ${item.sha256}, got ${computedSha256}`
      );
      continue;
    }

    result.verified_checksums++;

    if (options.apply) {
      await driver.putObject(item.key, fileBuffer, {
        contentType: item.content_type,
        cacheControl: item.cache_control,
        contentDisposition: item.content_disposition,
        contentEncoding: item.content_encoding,
        customMetadata: item.custom_metadata,
      });
      result.restored_objects++;
    }
  }

  return result;
}
