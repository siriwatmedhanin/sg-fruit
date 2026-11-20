import type { Env } from '../types/env';

export interface CleanupQueueItem {
  id: string;
  storage_key: string;
  reason: string;
  attempts: number;
  last_error: string | null;
  status: 'pending' | 'resolved' | 'failed';
  created_at: string;
  updated_at: string;
}

/**
 * Record an R2 object key that failed deletion into storage_cleanup_queue
 */
export async function queueStorageCleanup(
  db: D1Database,
  storageKey: string,
  reason: string,
  lastError?: string
): Promise<void> {
  const id = 'cln-' + crypto.randomUUID().slice(0, 8);
  const errMsg = lastError ? String(lastError).slice(0, 500) : 'R2 Delete Error';

  await db.prepare(`
    INSERT INTO storage_cleanup_queue (id, storage_key, reason, attempts, last_error, status, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(storage_key) DO UPDATE SET
      attempts = attempts + 1,
      last_error = excluded.last_error,
      status = 'pending',
      updated_at = CURRENT_TIMESTAMP;
  `).bind(id, storageKey, reason, errMsg).run();
}

/**
 * Process pending items in storage_cleanup_queue
 * Safe: Strictly checks if storage_key is still referenced in products or product_images
 * before attempting deletion! Never deletes actively referenced images.
 */
export async function processStorageCleanupQueue(env: Env): Promise<{
  attempted: number;
  deleted: number;
  skippedActive: number;
  failed: number;
}> {
  if (!env.DB || !env.PRODUCT_IMAGES) {
    throw new Error('D1 or R2 service not bound');
  }

  const pendingItems = await env.DB.prepare(`
    SELECT id, storage_key, attempts
    FROM storage_cleanup_queue
    WHERE status = 'pending' AND attempts < 10
    ORDER BY created_at ASC
    LIMIT 20;
  `).all<{ id: string; storage_key: string; attempts: number }>();

  const items = pendingItems.results || [];
  let deletedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    // 1. Safety Check: Verify key is not actively referenced in any product or gallery image
    const isReferencedInGallery = await env.DB.prepare(`
      SELECT 1 FROM product_images WHERE image_key = ? OR thumbnail_key = ? LIMIT 1;
    `).bind(item.storage_key, item.storage_key).first();

    const isReferencedInProducts = await env.DB.prepare(`
      SELECT 1 FROM products WHERE image_key = ? OR thumbnail_key = ? LIMIT 1;
    `).bind(item.storage_key, item.storage_key).first();

    const isReferencedInSite = await env.DB.prepare(`
      SELECT 1 FROM site_profile WHERE instr(logo_url, ?) > 0 OR instr(favicon_url, ?) > 0 OR instr(og_image_url, ?) > 0 LIMIT 1;
    `).bind(item.storage_key, item.storage_key, item.storage_key).first();

    if (isReferencedInGallery || isReferencedInProducts || isReferencedInSite) {
      // Key is still actively referenced! Mark resolved / remove from queue without deleting from R2
      await env.DB.prepare('DELETE FROM storage_cleanup_queue WHERE id = ?').bind(item.id).run();
      skippedCount++;
      continue;
    }

    // 2. Safe to delete from R2 (Key is definitely orphaned)
    try {
      await env.PRODUCT_IMAGES.delete(item.storage_key);
      await env.DB.prepare('DELETE FROM storage_cleanup_queue WHERE id = ?').bind(item.id).run();
      deletedCount++;
    } catch (delErr: any) {
      failedCount++;
      const nextStatus = item.attempts >= 9 ? 'failed' : 'pending';
      await env.DB.prepare(`
        UPDATE storage_cleanup_queue
        SET attempts = attempts + 1, last_error = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
      `).bind(delErr.message || 'Delete retry failed', nextStatus, item.id).run();
    }
  }

  return {
    attempted: items.length,
    deleted: deletedCount,
    skippedActive: skippedCount,
    failed: failedCount,
  };
}

/**
 * Get count of pending orphan items awaiting cleanup
 */
export async function getPendingCleanupCount(db: D1Database): Promise<number> {
  const res = await db.prepare("SELECT COUNT(*) as cnt FROM storage_cleanup_queue WHERE status = 'pending'").first<{ cnt: number }>();
  return res?.cnt || 0;
}
