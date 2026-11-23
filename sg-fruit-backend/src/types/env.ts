/**
 * SG FRUIT — Backend Environment & Type Definitions
 */

export interface Env {
  // Cloudflare D1 Database Binding
  DB: D1Database;

  // Cloudflare R2 Object Storage Binding (supports primary PRODUCT_IMAGES and alias IMAGES_BUCKET)
  PRODUCT_IMAGES: R2Bucket;
  IMAGES_BUCKET?: R2Bucket;

  // Environment Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  APP_NAME: string;
  CORS_ALLOW_ORIGIN: string;
  CORS_ADMIN_ORIGINS?: string;
  CORS_PUBLIC_ORIGINS?: string;

  // Cloudflare Access Configuration
  CF_ACCESS_TEAM_NAME?: string;
  CF_ACCESS_AUD?: string;
  DEV_AUTH_MOCK_ENABLED?: string;
  STAGING_ADMIN_EMAIL?: string;

  // LINE Messaging API Notifications
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_ADMIN_USER_ID?: string;
}

export type UserRole = 'admin';

export interface AuthContext {
  email: string;
  role: UserRole;
  user_id?: string;
  name?: string;
}

// Category Entity
export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

// Product Entity (Internal Model)
export interface Product {
  id: string;
  name: string;
  name_en?: string | null;
  category_id: string;
  description: string | null;
  image_key: string | null;
  thumbnail_key?: string | null;
  image_meta?: string | null;
  status?: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Product Image Gallery Entity
export interface ProductImage {
  id: string;
  product_id: string;
  image_key: string;
  thumbnail_key: string;
  sort_order: number;
  is_primary: number; // 0 or 1
  image_meta?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Product Variant Entity (Internal Model)
 * CRITICAL BUSINESS RULE:
 * - `sku` is a custom sales unit text (e.g. "1 โล", "2 โล", "1 ชุด", "1 แท่ง", "500 กรัม")
 * - `sku` can be freely entered and CAN BE DUPLICATED across products/variants
 * - NO UNIQUE CONSTRAINT on `sku`
 * - Internal unique identification is `id`
 * - `sku` MUST NOT be exposed in Public API endpoints
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string; // Sales unit label, e.g. "1 โล", "2 โล" (Can be duplicated!)
  unit: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  is_active: boolean;
}

// Public API Product (Sanitized: SKU and cost_price are strictly omitted)
export interface PublicProductVariant {
  id: string;
  unit: string;
  price: number;
  in_stock: boolean;
  // NOTE: sku and cost_price are intentionally omitted for public consumers!
}

export interface PublicProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  is_featured: boolean;
  variants: PublicProductVariant[];
}

// Order Import Batch Entity (Step 4A)
export interface OrderImportBatch {
  id: string;
  file_name: string;
  file_hash: string | null;
  file_size: number;
  sheet_name: string;
  total_rows: number;
  imported_orders_count: number;
  imported_items_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  imported_by: string | null;
  notes: string | null;
  error_log: string | null;
  created_at: string;
  updated_at: string;
}

// Order Entity (Extended for Platform Orders & Logistics)
export interface Order {
  id: string;
  order_no: string;
  batch_id?: string | null;
  platform: string;
  platform_order_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'packed' | 'shipped' | 'cancelled';
  packing_status: 'unpacked' | 'packing' | 'packed';
  notes: string | null;
  // Platform logistics and metadata (TikTok Shop 65-column compatibility)
  platform_order_status?: string | null;
  platform_order_substatus?: string | null;
  cancel_return_type?: string | null;
  order_type?: string | null;
  fulfillment_type?: string | null;
  warehouse_name?: string | null;
  tracking_id?: string | null;
  delivery_option?: string | null;
  shipping_provider_name?: string | null;
  buyer_message?: string | null;
  buyer_username?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  zipcode?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  detail_address?: string | null;
  additional_address_info?: string | null;
  payment_method?: string | null;
  package_id?: string | null;
  seller_note?: string | null;
  checked_status?: string | null;
  checked_marked_by?: string | null;
  order_channel?: string | null;
  creator_handle?: string | null;
  request_tax_invoice?: string | null;
  tax_buyer_id?: string | null;
  tax_type?: string | null;
  tax_buyer_name?: string | null;
  tax_email?: string | null;
  tax_phone?: string | null;
  tax_registered_address?: string | null;
  tax_address_type?: string | null;
  platform_created_at?: string | null;
  platform_paid_at?: string | null;
  platform_rts_at?: string | null;
  platform_shipped_at?: string | null;
  platform_delivered_at?: string | null;
  platform_cancelled_at?: string | null;
  cancel_by?: string | null;
  cancel_reason?: string | null;
  sku_total_amount?: number;
  shipping_fee_after_discount?: number;
  original_shipping_fee?: number;
  shipping_fee_seller_discount?: number;
  shipping_fee_platform_discount?: number;
  payment_platform_discount?: number;
  taxes?: number;
  order_refund_amount?: number;
  raw_data?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Order Item Entity
 * CRITICAL BUSINESS RULES:
 * 1. 1 Excel row = 1 Order Item (NO AGGREGATION).
 * 2. `seller_sku` is preserved as received from platform.
 * 3. `sg_sku` is an independent field, free-text, non-unique, CAN BE DUPLICATED.
 * 4. `product_id` and `variant_id` are nullable so unmapped items can be stored.
 * 5. `raw_data` preserves all 65 original Excel columns losslessly.
 */
export interface OrderItem {
  id: string;
  order_id: string;
  batch_id?: string | null;
  source_row_number: number;
  platform_order_id: string;
  platform_sku_id?: string | null;
  seller_sku?: string | null;
  sg_sku?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  product_name: string;
  variation?: string | null;
  sku?: string | null;
  unit?: string | null;
  quantity: number;
  return_quantity?: number;
  price: number;
  unit_price?: number;
  subtotal: number;
  subtotal_before_discount?: number;
  platform_discount?: number;
  seller_discount?: number;
  subtotal_after_discount?: number;
  weight_kg?: number | null;
  product_category?: string | null;
  package_id?: string | null;
  item_packing_status?: 'unpacked' | 'packing' | 'packed';
  packed_quantity?: number;
  raw_data?: string | null;
  created_at: string;
  updated_at?: string;
}

// Site Profile Entity (Step 7.10.5)
export interface SiteProfile {
  id: string; // 'default'
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
  announcement_enabled: number; // 0 or 1
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

// Public Site Profile (Sanitized Read-Only Model)
export interface PublicSiteProfile {
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
  social: {
    facebook: string;
    tiktok: string;
    instagram: string;
    shopee: string;
    lazada: string;
  };
  announcement: {
    enabled: boolean;
    text: string;
    link: string;
  };
  footer: {
    about: string;
    copyright: string;
  };
  seo: {
    title: string;
    description: string;
    og_image: string;
  };
  extra_info: Record<string, any>;
  updated_at: string;
}

