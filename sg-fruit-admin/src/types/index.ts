export type AuthRole = 'admin' | 'unauthenticated';

export type ProductStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface AuthUser {
  email: string;
  role: AuthRole;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order?: number;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  sort_order?: number;
}

export interface ProductVariantRow {
  product_id: string;
  product_name: string;
  name_en?: string | null;
  category_id: string;
  category_name: string | null;
  description: string | null;
  image_key: string | null;
  thumbnail_key?: string | null;
  image_meta?: string | null;
  status?: ProductStatus;
  product_is_active: number;
  is_featured?: number | boolean;
  variant_id: string | null;
  sku: string | null;
  unit: string | null;
  price: number | null;
  cost_price: number | null;
  stock_quantity: number | null;
  variant_is_active: number | null;
}

export interface ProductFormData {
  product_id?: string;
  variant_id?: string;
  name: string;
  name_en?: string;
  category_id: string;
  description?: string;
  sku: string;
  unit: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  status: ProductStatus;
  is_featured?: boolean;
}

export interface ProductGalleryImage {
  id: string;
  product_id: string;
  image_key: string;
  thumbnail_key: string;
  image_url: string;
  thumbnail_url: string;
  sort_order: number;
  is_primary: boolean;
  image_meta?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminApiResponse<T> {
  ok: boolean;
  message?: string;
  user?: AuthUser;
  data: T;
  error?: string;
}

export interface ApiHealth {
  ok?: boolean;
  service?: string;
  status: string;
  timestamp: string;
  environment: string;
  bindings?: {
    d1_database?: {
      bound: boolean;
      probe: string;
    };
    r2_bucket?: {
      bound: boolean;
      probe: string;
    };
  };
  services?: {
    d1: string;
    r2: string;
  };
}

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'packing'
  | 'import'
  | 'export'
  | 'settings';

export interface OrderRow {
  id: string;
  order_no: string;
  platform: string;
  platform_order_id: string;
  platform_order_status?: string | null;
  tracking_id?: string | null;
  shipping_provider_name?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  detail_address?: string | null;
  zipcode?: string | null;
  customer_address?: string | null;
  payment_method?: string | null;
  slip_url?: string | null;
  discount_amount?: number | null;
  buyer_message?: string | null;
  status: string;
  packing_status: 'unpacked' | 'packing' | 'packed';
  total_amount?: number;
  platform_created_at?: string | null;
  created_at: string;
  items_count: number;
  packed_items_count: number;
}

export interface OrderItemDetail {
  id: string;
  order_id: string;
  source_row_number: number;
  platform_order_id: string;
  platform_sku_id?: string | null;
  seller_sku?: string | null;
  sg_sku?: string | null;
  product_name: string;
  variation?: string | null;
  quantity: number;
  unit_price?: number;
  price?: number;
  subtotal?: number;
  item_packing_status: 'unpacked' | 'packing' | 'packed';
  packed_quantity: number;
  product_id?: string | null;
  variant_id?: string | null;
  image_key?: string | null;
  thumbnail_key?: string | null;
  thumbnail_url?: string | null;
}

export interface OrderImportBatchItem {
  id: string;
  file_name: string;
  file_hash?: string | null;
  file_size: number;
  sheet_name: string;
  total_rows: number;
  imported_orders_count: number;
  imported_items_count: number;
  status: string;
  imported_by?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PackingSlipData {
  order: {
    id: string;
    order_no: string;
    platform: string;
    platform_order_id: string;
    platform_order_status?: string;
    tracking_id?: string;
    shipping_provider_name?: string;
    delivery_option?: string;
    recipient_name?: string;
    recipient_phone?: string;
    detail_address?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    zipcode?: string;
    buyer_message?: string;
    seller_note?: string;
    platform_created_at?: string;
    packing_status: string;
  };
  items: Array<{
    id: string;
    source_row_number: number;
    product_name: string;
    variation?: string;
    quantity: number;
    seller_sku?: string;
    sg_sku?: string;
    item_packing_status: string;
    packed_quantity: number;
  }>;
  printed_at: string;
}

export type StockMovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT'
  | 'DAMAGE'
  | 'RETURN'
  | 'ORDER_DEDUCTION'
  | 'OPENING_BALANCE';

export interface StockMovementRecord {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit?: string;
  movement_type: StockMovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reason?: string | null;
  note?: string | null;
  created_by: string;
  created_at: string;
}

export interface InventoryItem {
  variant_id: string;
  product_id: string;
  product_name: string;
  name_en?: string | null;
  category_id: string;
  category_name: string;
  sku: string;
  unit: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  inventory_quantity: number;
  low_stock_threshold: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'inactive';
  variant_is_active: number;
  product_is_active: number;
  product_status: string;
  image_key?: string | null;
  thumbnail_key?: string | null;
  thumbnail_url?: string | null;
  updated_at: string;
  last_movement_at?: string | null;
}

export interface InventorySummary {
  total_variants: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  inactive_count: number;
  total_units: number;
  needs_attention_count: number;
  recent_movements: StockMovementRecord[];
}

export interface SiteProfile {
  id: string;
  site_name: string;
  site_name_th: string;
  tagline: string;
  description: string;
  logo_url: string;
  favicon_url: string;
  line_oa_id: string;
  line_oa_url: string;
  phone: string;
  email: string;
  address: string;
  business_hours: string;
  facebook_url: string;
  tiktok_url: string;
  instagram_url: string;
  shopee_url: string;
  lazada_url: string;
  announcement_enabled: number;
  announcement_text: string;
  announcement_link: string;
  footer_about: string;
  footer_copyright: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  extra_info_json: string;
  updated_at: string;
  updated_by: string;
}

export interface SiteProfileFormData {
  site_name: string;
  site_name_th: string;
  tagline: string;
  description: string;
  logo_url: string;
  favicon_url: string;
  line_oa_id: string;
  line_oa_url: string;
  phone: string;
  email: string;
  address: string;
  business_hours: string;
  facebook_url: string;
  tiktok_url: string;
  instagram_url: string;
  shopee_url: string;
  lazada_url: string;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  footer_about: string;
  footer_copyright: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  extra_info_json: string;
}

