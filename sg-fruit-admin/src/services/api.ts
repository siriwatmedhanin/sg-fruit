import type {
  AdminApiResponse,
  ApiHealth,
  AuthRole,
  Category,
  CategoryFormData,
  ProductFormData,
  ProductGalleryImage,
  ProductStatus,
  ProductVariantRow,
  SiteProfile,
  SiteProfileFormData,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

function getHeaders(role: AuthRole): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Only inject X-Dev-Role if in local development mode
  if (import.meta.env.DEV) {
    if (role === 'admin') {
      headers['X-Dev-Role'] = 'admin';
    }
  }
  // When role === 'unauthenticated', we deliberately do NOT set X-Dev-Role or Authorization
  return headers;
}

// Centralized Fetch Wrapper: Always includes credentials for Cloudflare Access session cookies
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
}

/**
 * Resolves relative image keys or URLs to full public URLs in Staging/Production
 */
export function resolveImageUrl(urlOrKey?: string | null): string {
  if (!urlOrKey) return '';
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) return urlOrKey;

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
  let imageApiBase = apiBase;
  if (apiBase.includes('staging-admin-api.')) {
    imageApiBase = apiBase.replace('staging-admin-api.', 'staging-api.');
  } else if (apiBase.includes('admin-api.')) {
    imageApiBase = apiBase.replace('admin-api.', 'api.');
  }

  const cleanBase = imageApiBase.replace(/\/api$/, '');
  if (urlOrKey.startsWith('/api/')) {
    return `${cleanBase}${urlOrKey}`;
  }
  return `${imageApiBase}/images/${urlOrKey.replace(/^\/+/, '')}`;
}

export interface DashboardStats {
  total_products: number;
  available_products: number;
  out_of_stock_products: number;
  total_variants: number;
  total_orders: number;
  pending_packing: number;
}

export async function fetchHealth(): Promise<ApiHealth> {
  // In staging/production, prioritize public staging-api endpoint to bypass CF Access redirect
  if (API_BASE.includes('staging-admin-api.')) {
    try {
      const r = await fetch('https://staging-api.siriwatmedhanin.com/api/health', { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch {
      // Fallback below
    }
  }
  const res = await apiFetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const endpoints: string[] = [];
  if (API_BASE.includes('staging-admin-api.')) {
    endpoints.push('https://staging-api.siriwatmedhanin.com/api/dashboard-stats');
  }
  endpoints.push(`${API_BASE}/dashboard-stats`);
  endpoints.push(`${API_BASE}/admin/dashboard-stats`);

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          return json.data;
        }
      }
    } catch {
      // Continue to next endpoint
    }
  }
  throw new Error('Could not fetch dashboard stats');
}

export async function fetchAdminCategories(role: AuthRole): Promise<AdminApiResponse<Category[]>> {
  const res = await apiFetch(`${API_BASE}/admin/categories`, {
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function createCategory(
  role: AuthRole,
  data: CategoryFormData
): Promise<AdminApiResponse<Category>> {
  const res = await apiFetch(`${API_BASE}/admin/categories`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function updateCategory(
  role: AuthRole,
  categoryId: string,
  data: Partial<CategoryFormData>
): Promise<AdminApiResponse<Category>> {
  const res = await apiFetch(`${API_BASE}/admin/categories/${categoryId}`, {
    method: 'PUT',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function deleteCategory(
  role: AuthRole,
  categoryId: string
): Promise<AdminApiResponse<{ id: string }>> {
  const res = await apiFetch(`${API_BASE}/admin/categories/${categoryId}`, {
    method: 'DELETE',
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchAdminProducts(role: AuthRole): Promise<AdminApiResponse<ProductVariantRow[]>> {
  const res = await apiFetch(`${API_BASE}/admin/products`, {
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function createProduct(
  role: AuthRole,
  data: ProductFormData
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/products`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function updateProduct(
  role: AuthRole,
  productId: string,
  data: ProductFormData
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/products/${productId}`, {
    method: 'PUT',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function updateProductStatus(
  role: AuthRole,
  productId: string,
  status: ProductStatus
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/status`, {
    method: 'PATCH',
    headers: getHeaders(role),
    body: JSON.stringify({ status }),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function deleteProduct(
  role: AuthRole,
  productId: string,
  variantId?: string
): Promise<AdminApiResponse<{ id: string; deleted?: boolean; soft_deleted?: boolean; status?: string }>> {
  const url = variantId
    ? `${API_BASE}/admin/products/${productId}?variant_id=${encodeURIComponent(variantId)}`
    : `${API_BASE}/admin/products/${productId}`;
  const res = await apiFetch(url, {
    method: 'DELETE',
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function toggleProductFeatured(
  role: AuthRole,
  productId: string,
  isFeatured: boolean
): Promise<AdminApiResponse<{ id: string; is_featured: boolean }>> {
  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/featured`, {
    method: 'PATCH',
    headers: getHeaders(role),
    body: JSON.stringify({ is_featured: isFeatured }),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchAdminOrders(role: AuthRole): Promise<AdminApiResponse<any[]>> {
  const res = await apiFetch(`${API_BASE}/admin/orders`, {
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchAdminPacking(role: AuthRole): Promise<AdminApiResponse<any[]>> {
  const res = await apiFetch(`${API_BASE}/admin/packing`, {
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function uploadProductImage(
  role: AuthRole,
  productId: string,
  mainBlob: Blob,
  thumbBlob: Blob,
  metadata?: any
): Promise<AdminApiResponse<{
  product_id: string;
  image_key: string;
  thumbnail_key: string;
  image_url: string;
  thumbnail_url: string;
  image_meta?: string;
}>> {
  const formData = new FormData();
  formData.append('main_image', mainBlob, 'main.webp');
  formData.append('thumbnail_image', thumbBlob, 'thumb.webp');
  if (metadata) {
    formData.append('metadata', typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
  }

  const headers: Record<string, string> = {};
  if (import.meta.env.DEV) {
    if (role === 'admin') headers['X-Dev-Role'] = 'admin';
  }

  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/image`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function deleteProductImage(
  role: AuthRole,
  productId: string
): Promise<AdminApiResponse<null>> {
  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/image`, {
    method: 'DELETE',
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

// =========================================================================
// Product Gallery API Functions (Max 5 Images)
// =========================================================================

export async function fetchProductImages(
  role: AuthRole,
  productId: string
): Promise<AdminApiResponse<ProductGalleryImage[]>> {
  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/images`, {
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function addGalleryImage(
  role: AuthRole,
  productId: string,
  mainBlob: Blob,
  thumbBlob: Blob,
  metadata?: any,
  isPrimary?: boolean,
  sortOrder?: number
): Promise<AdminApiResponse<ProductGalleryImage>> {
  const formData = new FormData();
  formData.append('main_image', mainBlob, 'main.webp');
  formData.append('thumbnail_image', thumbBlob, 'thumb.webp');
  if (metadata) {
    formData.append('metadata', typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
  }
  if (isPrimary !== undefined) {
    formData.append('is_primary', String(isPrimary));
  }
  if (sortOrder !== undefined) {
    formData.append('sort_order', String(sortOrder));
  }

  const headers: Record<string, string> = {};
  if (import.meta.env.DEV) {
    if (role === 'admin') headers['X-Dev-Role'] = 'admin';
  }

  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/images`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function replaceGalleryImage(
  role: AuthRole,
  productId: string,
  imageId: string,
  mainBlob: Blob,
  thumbBlob: Blob,
  metadata?: any
): Promise<AdminApiResponse<ProductGalleryImage>> {
  const formData = new FormData();
  formData.append('main_image', mainBlob, 'main.webp');
  formData.append('thumbnail_image', thumbBlob, 'thumb.webp');
  if (metadata) {
    formData.append('metadata', typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
  }

  const headers: Record<string, string> = {};
  if (import.meta.env.DEV) {
    if (role === 'admin') headers['X-Dev-Role'] = 'admin';
  }

  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/images/${imageId}`, {
    method: 'PUT',
    headers,
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function deleteGalleryImage(
  role: AuthRole,
  productId: string,
  imageId: string
): Promise<AdminApiResponse<{ deleted_id: string; was_primary: boolean }>> {
  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
    headers: getHeaders(role),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function reorderGalleryImages(
  role: AuthRole,
  productId: string,
  imageIds: string[],
  primaryImageId?: string
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/products/${productId}/images/reorder`, {
    method: 'PATCH',
    headers: getHeaders(role),
    body: JSON.stringify({ image_ids: imageIds, primary_image_id: primaryImageId }),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

// =========================================================================
// ORDERS, EXCEL IMPORT, PACKING & EXPORT API CLIENT (Step 4 Complete)
// =========================================================================

export async function checkDuplicateImport(
  role: AuthRole,
  fileHash: string,
  fileName: string
): Promise<{ ok: boolean; is_duplicate: boolean; existing_batch: any | null }> {
  const res = await apiFetch(`${API_BASE}/admin/orders/import/check-duplicate`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify({ file_hash: fileHash, file_name: fileName }),
  });
  return res.json();
}

export async function importOrdersPayload(
  role: AuthRole,
  payload: {
    batch: any;
    orders: any[];
    items: any[];
  }
): Promise<AdminApiResponse<{ batch_id: string; orders_imported: number; items_imported: number }>> {
  const res = await apiFetch(`${API_BASE}/admin/orders/import`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchImportBatches(role: AuthRole): Promise<AdminApiResponse<any[]>> {
  const res = await apiFetch(`${API_BASE}/admin/orders/batches`, {
    headers: getHeaders(role),
  });
  return res.json();
}

export async function fetchOrderList(
  role: AuthRole,
  params?: {
    q?: string;
    status?: string;
    packing_status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<AdminApiResponse<any[]> & { total: number }> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.status) query.set('status', params.status);
  if (params?.packing_status) query.set('packing_status', params.packing_status);
  if (params?.date_from) query.set('date_from', params.date_from);
  if (params?.date_to) query.set('date_to', params.date_to);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const res = await apiFetch(`${API_BASE}/admin/orders?${query.toString()}`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchOrderDetail(
  role: AuthRole,
  orderId: string
): Promise<AdminApiResponse<{ order: any; items: any[] }>> {
  const res = await apiFetch(`${API_BASE}/admin/orders/${orderId}`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function updateOrderPackingStatus(
  role: AuthRole,
  orderId: string,
  packingStatus: 'unpacked' | 'packing' | 'packed',
  notes?: string
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/orders/${orderId}/packing`, {
    method: 'PATCH',
    headers: getHeaders(role),
    body: JSON.stringify({ packing_status: packingStatus, notes }),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function updateItemPackingStatus(
  role: AuthRole,
  itemId: string,
  itemPackingStatus: 'unpacked' | 'packing' | 'packed',
  packedQuantity?: number
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/orders/items/${itemId}/packing`, {
    method: 'PATCH',
    headers: getHeaders(role),
    body: JSON.stringify({ item_packing_status: itemPackingStatus, packed_quantity: packedQuantity }),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchPackingSlip(
  role: AuthRole,
  orderId: string
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/orders/${orderId}/packing-slip`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchExportData(
  role: AuthRole,
  params?: {
    status?: string;
    packing_status?: string;
    date_from?: string;
    date_to?: string;
    order_ids?: string;
  }
): Promise<{ ok: boolean; total_rows: number; data: any[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.packing_status) query.set('packing_status', params.packing_status);
  if (params?.date_from) query.set('date_from', params.date_from);
  if (params?.date_to) query.set('date_to', params.date_to);
  if (params?.order_ids) query.set('order_ids', params.order_ids);

  const res = await apiFetch(`${API_BASE}/admin/orders/export-data?${query.toString()}`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

// =========================================================================
// INVENTORY API CALLS (STEP 5)
// =========================================================================
export async function fetchInventory(
  role: AuthRole,
  params?: {
    q?: string;
    category_id?: string;
    status?: string;
    sort_by?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ ok: boolean; data: any[]; total: number; page: number; limit: number; total_pages: number }> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category_id) query.set('category_id', params.category_id);
  if (params?.status) query.set('status', params.status);
  if (params?.sort_by) query.set('sort_by', params.sort_by);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await apiFetch(`${API_BASE}/admin/inventory?${query.toString()}`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchInventorySummary(
  role: AuthRole
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/summary`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function stockIn(
  role: AuthRole,
  data: { variant_id: string; quantity: number; reason?: string; note?: string; idempotency_key?: string }
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/stock-in`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function stockOut(
  role: AuthRole,
  data: { variant_id: string; quantity: number; reason?: string; note?: string; idempotency_key?: string }
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/stock-out`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function adjustStock(
  role: AuthRole,
  data: { variant_id: string; actual_quantity: number; reason?: string; note?: string; idempotency_key?: string }
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/adjustment`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function recordDamage(
  role: AuthRole,
  data: { variant_id: string; quantity: number; reason?: string; note?: string; idempotency_key?: string }
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/damage`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function returnStock(
  role: AuthRole,
  data: { variant_id: string; quantity: number; reason?: string; note?: string; reference_id?: string; idempotency_key?: string }
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/return`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function updateThreshold(
  role: AuthRole,
  variantId: string,
  threshold: number
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/variants/${variantId}/threshold`, {
    method: 'PATCH',
    headers: getHeaders(role),
    body: JSON.stringify({ low_stock_threshold: threshold }),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchStockMovements(
  role: AuthRole,
  params?: {
    variant_id?: string;
    product_id?: string;
    movement_type?: string;
    reference_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ ok: boolean; data: any[]; total: number; page: number; limit: number; total_pages: number }> {
  const query = new URLSearchParams();
  if (params?.variant_id) query.set('variant_id', params.variant_id);
  if (params?.product_id) query.set('product_id', params.product_id);
  if (params?.movement_type) query.set('movement_type', params.movement_type);
  if (params?.reference_type) query.set('reference_type', params.reference_type);
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await apiFetch(`${API_BASE}/admin/inventory/movements?${query.toString()}`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function deductOrderStock(
  role: AuthRole,
  orderId: string,
  itemMappings?: Array<{ order_item_id: string; product_id: string; variant_id: string }>
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/orders/${orderId}/deduct`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify({ item_mappings: itemMappings }),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string; data?: any };
    err.status = res.status;
    err.code = json.error;
    (err as any).data = json;
    throw err;
  }
  return json;
}

export async function reverseOrderStock(
  role: AuthRole,
  orderId: string,
  reason?: string
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/orders/${orderId}/reverse`, {
    method: 'POST',
    headers: getHeaders(role),
    body: JSON.stringify({ reason }),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function mapOrderItemVariant(
  role: AuthRole,
  itemId: string,
  productId: string,
  variantId: string
): Promise<AdminApiResponse<any>> {
  const res = await apiFetch(`${API_BASE}/admin/inventory/order-items/${itemId}/map`, {
    method: 'PATCH',
    headers: getHeaders(role),
    body: JSON.stringify({ product_id: productId, variant_id: variantId }),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

// =========================================================================
// SITE PROFILE & STORE SETTINGS (Step 7.10.5)
// =========================================================================

export async function fetchPublicSiteProfile(): Promise<any> {
  const res = await apiFetch(`${API_BASE}/site-profile`);
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function fetchAdminSiteProfile(role: AuthRole): Promise<AdminApiResponse<SiteProfile>> {
  const res = await apiFetch(`${API_BASE}/admin/site-profile`, {
    headers: getHeaders(role),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function updateAdminSiteProfile(
  role: AuthRole,
  data: Partial<SiteProfileFormData>
): Promise<AdminApiResponse<SiteProfile>> {
  const res = await apiFetch(`${API_BASE}/admin/site-profile`, {
    method: 'PUT',
    headers: getHeaders(role),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

export async function uploadSiteAsset(
  role: AuthRole,
  assetType: 'logo' | 'favicon' | 'og-image',
  file: File
): Promise<AdminApiResponse<{ asset_type: string; storage_key: string; url: string; mime_type: string; size_bytes: number }>> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (import.meta.env.DEV && role === 'admin') {
    headers['X-Dev-Role'] = 'admin';
  }

  const res = await apiFetch(`${API_BASE}/admin/site-profile/assets/${assetType}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

