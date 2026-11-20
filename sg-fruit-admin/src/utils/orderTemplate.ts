/**
 * SG FRUIT — Official TikTok Shop Order Template Definition (OrderSKUList)
 * Exactly 65 columns (A–BM) verified from actual platform export.
 */

export const ORDER_SHEET_NAME = 'OrderSKUList';

export interface OrderColumnDef {
  key: string;
  header: string;
  description: string;
  isText?: boolean; // Must be stored and exported as string to preserve leading zeros
  isNumeric?: boolean; // Numeric field (prices, quantities, discounts, amounts)
}

export const ORDER_EXCEL_COLUMNS: OrderColumnDef[] = [
  { key: 'order_id', header: 'Order ID', description: 'Platform unique order ID.', isText: true },
  { key: 'order_status', header: 'Order Status', description: 'Current order status.' },
  { key: 'order_substatus', header: 'Order Substatus', description: '' },
  { key: 'cancel_return_type', header: 'Cancelation/Return Type', description: 'The filed to explain the order is in cancellation or in return/refund.' },
  { key: 'normal_or_preorder', header: 'Normal or Pre-order', description: '' },
  { key: 'sku_id', header: 'SKU ID', description: 'Platform SKU ID.', isText: true },
  { key: 'seller_sku', header: 'Seller SKU', description: 'Seller sku input by the seller in the product system.', isText: true },
  { key: 'product_name', header: 'Product Name', description: 'Platform product name.' },
  { key: 'variation', header: 'Variation', description: 'Platform SKU variation' },
  { key: 'quantity', header: 'Quantity', description: 'SKU sold quantity in the order.', isNumeric: true },
  { key: 'sku_qty_return', header: 'Sku Quantity of return', description: 'SKU returned quantity in the order.', isNumeric: true },
  { key: 'sku_unit_price', header: 'SKU Unit Original Price', description: '1 SKU original price.', isNumeric: true },
  { key: 'sku_subtotal_before_discount', header: 'SKU Subtotal Before Discount', description: 'It equals to SKU Unit Original Price * Sku Quantity.', isNumeric: true },
  { key: 'sku_platform_discount', header: 'SKU Platform Discount', description: 'Total platform discount in this SKU ID.', isNumeric: true },
  { key: 'sku_seller_discount', header: 'SKU Seller Discount', description: 'Total seller discount in this SKU ID.', isNumeric: true },
  { key: 'sku_subtotal_after_discount', header: 'SKU Subtotal After Discount', description: 'It equals SKU Subtotal Before Discount - SKU Platform Discount - SKU Seller Discount.', isNumeric: true },
  { key: 'shipping_fee_after_discount', header: 'Shipping Fee After Discount', description: 'It equals to Original Shipping Fee - Shipping Fee Seller Discount - Shipping Fee Platform Discount.', isNumeric: true },
  { key: 'original_shipping_fee', header: 'Original Shipping Fee', description: "The order's original shipping fee.", isNumeric: true },
  { key: 'shipping_fee_seller_discount', header: 'Shipping Fee Seller Discount', description: "The order's  shipping fee discount from the seller.", isNumeric: true },
  { key: 'shipping_fee_platform_discount', header: 'Shipping Fee Platform Discount', description: "The order's  shipping fee discount from the platform.", isNumeric: true },
  { key: 'payment_platform_discount', header: 'Payment platform discount', description: 'The discount provided by a third-party payment platform, which the buyer used to place the order.', isNumeric: true },
  { key: 'taxes', header: 'Taxes', description: '', isNumeric: true },
  { key: 'order_amount', header: 'Order Amount', description: '', isNumeric: true },
  { key: 'order_refund_amount', header: 'Order Refund Amount', description: '', isNumeric: true },
  { key: 'created_time', header: 'Created Time', description: '' },
  { key: 'paid_time', header: 'Paid Time', description: '' },
  { key: 'rts_time', header: 'RTS Time', description: '' },
  { key: 'shipped_time', header: 'Shipped Time', description: '' },
  { key: 'delivered_time', header: 'Delivered Time', description: 'The time when the order status changes to Delivered.' },
  { key: 'cancelled_time', header: 'Cancelled Time', description: 'The time when the order status changes to Cancelled.' },
  { key: 'cancel_by', header: 'Cancel By', description: 'The order is cancelled by whom.' },
  { key: 'cancel_reason', header: 'Cancel Reason', description: 'The order cancel reason.' },
  { key: 'fulfillment_type', header: 'Fulfillment Type', description: '' },
  { key: 'warehouse_name', header: 'Warehouse Name', description: '' },
  { key: 'tracking_id', header: 'Tracking ID', description: "The order's tracking number.", isText: true },
  { key: 'delivery_option', header: 'Delivery Option', description: "The order's delivery option." },
  { key: 'shipping_provider_name', header: 'Shipping Provider Name', description: "The order's shipping provider name." },
  { key: 'buyer_message', header: 'Buyer Message', description: '' },
  { key: 'buyer_username', header: 'Buyer Username', description: '' },
  { key: 'recipient', header: 'Recipient', description: '' },
  { key: 'phone', header: 'Phone #', description: '', isText: true },
  { key: 'zipcode', header: 'Zipcode', description: '', isText: true },
  { key: 'country', header: 'Country', description: '' },
  { key: 'province', header: 'Province', description: '' },
  { key: 'district', header: 'District', description: '' },
  { key: 'districts', header: 'Districts', description: '' },
  { key: 'detail_address', header: 'Detail Address', description: '' },
  { key: 'additional_address', header: 'Additional address information', description: '' },
  { key: 'payment_method', header: 'Payment Method', description: "The order's payment method." },
  { key: 'weight_kg', header: 'Weight(kg)', description: '', isNumeric: true },
  { key: 'product_category', header: 'Product Category', description: "SKU's product category." },
  { key: 'package_id', header: 'Package ID', description: "The order's Package ID", isText: true },
  { key: 'seller_note', header: 'Seller Note', description: '' },
  { key: 'checked_status', header: 'Checked Status', description: '' },
  { key: 'checked_marked_by', header: 'Checked Marked by', description: '' },
  { key: 'order_channel', header: 'Order Channel', description: '' },
  { key: 'creator_handle', header: 'Creator Handle', description: '' },
  { key: 'request_tax_invoice', header: 'Request Tax Invoice', description: 'Yes - buyer requested tax invoice for the order. If no, the tax information will be blank' },
  { key: 'tax_buyer_id', header: 'Tax Info - Buyer Tax ID', description: 'Buyer Tax ID for tax invoice', isText: true },
  { key: 'tax_type', header: 'Tax Info - Type', description: 'Personal or Company' },
  { key: 'tax_buyer_name', header: 'Tax Info - Full Name of Buyer', description: 'Name of the tax invoice issued to' },
  { key: 'tax_email', header: 'Tax Info - Email', description: 'Email address for tax invoice' },
  { key: 'tax_phone', header: 'Tax Info - Phone Number', description: 'Phone number for tax invoice', isText: true },
  { key: 'tax_registered_address', header: 'Tax Info - Registered Address', description: 'Registered address for tax invoice' },
  { key: 'tax_address_type', header: 'Tax Info - Address Type', description: 'Address type if the tax receiver type is business (Branch or Head Office)' }
];

export const SG_FRUIT_SKU_COLUMN: OrderColumnDef = {
  key: 'sg_sku',
  header: 'SG FRUIT SKU (หน่วยขายภายใน)',
  description: 'รหัสหน่วยขายภายใน SG FRUIT เช่น 1 โล, 2 โล, 1 ชุด (ซ้ำกันได้)',
  isText: true
};

/**
 * Sanitize cell values against CSV/Spreadsheet formula injection
 * Protects against execution of =, +, -, @, full-width ＝, ＋, －, ＠,
 * leading whitespace, tabs, and control characters in text cells.
 *
 * For numeric fields, preserves true number values (including negative numbers and decimals)
 * so Excel can calculate formulas.
 */
export function sanitizeForSpreadsheet(val: any, isNumericField = false): any {
  if (val === null || val === undefined) {
    return isNumericField ? 0 : '';
  }

  // If value is Date object, format as ISO timestamp
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString();
  }

  // If value is already a pure number
  if (typeof val === 'number') {
    return isNaN(val) ? (isNumericField ? 0 : '') : val;
  }

  const str = String(val);
  if (!str) return isNumericField ? 0 : '';

  // If designated as a numeric field, check if it is a valid numeric literal
  if (isNumericField) {
    const trimmed = str.trim();
    if (/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!isNaN(num)) {
        return num;
      }
    }
  }

  // Formula trigger regex:
  // Detects leading whitespace or control characters followed by formula characters (=, +, -, @)
  // or full-width equivalents (＝, ＋, －, ＠), or tabs/newlines/pipes/percents/semicolons
  const formulaRegex = /^[\s\t\r\n\x00-\x1F]*[=+\-@＝＋－＠\t\r\n|%;]/;

  if (formulaRegex.test(str)) {
    return `'${str}`;
  }

  return str;
}

/**
 * Format a cell value for safe CSV export (RFC 4180 compliant escaping)
 * Combines formula protection with proper double-quote wrapping to prevent separator/quote breakout
 */
export function formatCellForCsv(val: any, isNumericField = false): string {
  const sanitized = sanitizeForSpreadsheet(val, isNumericField);
  if (isNumericField && typeof sanitized === 'number') {
    return String(sanitized);
  }
  const str = String(sanitized ?? '');
  // If string contains comma, semicolon, newline, carriage return, double quote, or starts with quote, escape and wrap in quotes
  if (/[,;\r\n"]/.test(str) || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
