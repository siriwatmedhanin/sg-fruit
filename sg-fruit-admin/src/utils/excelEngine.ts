/**
 * SG FRUIT — Excel Import & Export Engine
 * Compatible with TikTok Shop 65-column OrderSKUList specification
 * Strictly preserves 1 row = 1 order item (ZERO AGGREGATION)
 */

import * as XLSX from 'xlsx';
import {
  ORDER_SHEET_NAME,
  ORDER_EXCEL_COLUMNS,
  SG_FRUIT_SKU_COLUMN,
  sanitizeForSpreadsheet,
  formatCellForCsv,
  type OrderColumnDef,
} from './orderTemplate.ts';

export interface ParseResult {
  ok: boolean;
  error?: string;
  sheetName?: string;
  fileHash: string;
  fileSize: number;
  fileName: string;
  totalRows: number;
  ordersCount: number;
  itemsCount: number;
  previewItems: any[];
  ordersPayload: any[];
  itemsPayload: any[];
  rowErrors: Array<{ row: number; error: string }>;
}

/**
 * Compute SHA-256 hash of a File in the browser
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse an uploaded .xlsx file against the OrderSKUList specification
 */
export async function parseOrderExcelFile(file: File): Promise<ParseResult> {
  const fileHash = await computeFileHash(file);
  const buffer = await file.arrayBuffer();

  // Read workbook
  const workbook = XLSX.read(buffer, {
    type: 'array',
    raw: true,
    cellText: false,
  });

  // 1. Verify sheet existence
  if (!workbook.SheetNames.includes(ORDER_SHEET_NAME)) {
    return {
      ok: false,
      error: `ไม่พบแผ่นงาน (Worksheet) ชื่อ "${ORDER_SHEET_NAME}" ในไฟล์ (แผ่นงานที่มีอยู่: ${workbook.SheetNames.join(', ')})`,
      fileHash,
      fileSize: file.size,
      fileName: file.name,
      totalRows: 0,
      ordersCount: 0,
      itemsCount: 0,
      previewItems: [],
      ordersPayload: [],
      itemsPayload: [],
      rowErrors: [],
    };
  }

  const sheet = workbook.Sheets[ORDER_SHEET_NAME];
  // Convert sheet to 2D array of raw values
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false, // get formatted text strings to keep leading zeros!
  });

  if (rows.length < 3) {
    return {
      ok: false,
      error: 'ไฟล์ไม่มีแถวข้อมูลคำสั่งซื้อ (ต้องมีแถวที่ 1 Header, แถวที่ 2 คำอธิบาย, และแถวที่ 3 เป็นต้นไปเป็นข้อมูล)',
      fileHash,
      fileSize: file.size,
      fileName: file.name,
      totalRows: 0,
      ordersCount: 0,
      itemsCount: 0,
      previewItems: [],
      ordersPayload: [],
      itemsPayload: [],
      rowErrors: [],
    };
  }

  const headerRow = rows[0] || [];
  // Build header index map
  const colIndexMap = new Map<string, number>();
  headerRow.forEach((colName, idx) => {
    if (colName) {
      colIndexMap.set(String(colName).trim().toLowerCase(), idx);
    }
  });

  // Verify critical headers
  const requiredHeaders = ['order id', 'product name', 'quantity'];
  const missingRequired = requiredHeaders.filter((h) => !colIndexMap.has(h));
  if (missingRequired.length > 0) {
    return {
      ok: false,
      error: `หัวตารางขาดฟิลด์บังคับ: ${missingRequired.join(', ')}`,
      fileHash,
      fileSize: file.size,
      fileName: file.name,
      totalRows: 0,
      ordersCount: 0,
      itemsCount: 0,
      previewItems: [],
      ordersPayload: [],
      itemsPayload: [],
      rowErrors: [],
    };
  }

  const orderMap = new Map<string, any>();
  const itemsPayload: any[] = [];
  const rowErrors: Array<{ row: number; error: string }> = [];

  // Parse data rows starting at Row 3 (index 2)
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    const sourceRowNumber = r + 1; // 1-based row number in Excel

    // If completely empty row, skip
    if (!row || row.every((c) => String(c).trim() === '')) {
      continue;
    }

    // Build raw_data object mapping exactly to 65 columns
    const rawData65: Record<string, any> = {};
    ORDER_EXCEL_COLUMNS.forEach((colDef, idx) => {
      // Find by column header match or fall back to column index
      const mappedIdx = colIndexMap.has(colDef.header.toLowerCase())
        ? colIndexMap.get(colDef.header.toLowerCase())!
        : idx;
      let val = row[mappedIdx] !== undefined ? String(row[mappedIdx]).trim() : '';
      rawData65[colDef.header] = val;
    });

    const platformOrderId = String(rawData65['Order ID'] || '').trim();
    if (!platformOrderId) {
      rowErrors.push({ row: sourceRowNumber, error: 'ไม่พบหมายเลขคำสั่งซื้อ (Order ID ว่าง)' });
      continue;
    }

    const productName = String(rawData65['Product Name'] || '').trim();
    const qtyParsed = parseInt(rawData65['Quantity'] || '1', 10);
    const quantity = isNaN(qtyParsed) || qtyParsed <= 0 ? 1 : qtyParsed;

    const unitPrice = parseFloat(rawData65['SKU Unit Original Price'] || '0') || 0;
    const subtotal = parseFloat(rawData65['SKU Subtotal After Discount'] || '0') || unitPrice * quantity;

    // Track order header
    if (!orderMap.has(platformOrderId)) {
      orderMap.set(platformOrderId, {
        platform_order_id: platformOrderId,
        order_no: `SG-${platformOrderId.slice(-8)}`,
        platform: 'tiktok_shop',
        platform_order_status: rawData65['Order Status'] || null,
        platform_order_substatus: rawData65['Order Substatus'] || null,
        cancel_return_type: rawData65['Cancelation/Return Type'] || null,
        order_type: rawData65['Normal or Pre-order'] || null,
        fulfillment_type: rawData65['Fulfillment Type'] || null,
        warehouse_name: rawData65['Warehouse Name'] || null,
        tracking_id: rawData65['Tracking ID'] || null,
        delivery_option: rawData65['Delivery Option'] || null,
        shipping_provider_name: rawData65['Shipping Provider Name'] || null,
        buyer_message: rawData65['Buyer Message'] || null,
        buyer_username: rawData65['Buyer Username'] || null,
        recipient_name: rawData65['Recipient'] || null,
        recipient_phone: rawData65['Phone #'] || null,
        zipcode: rawData65['Zipcode'] || null,
        country: rawData65['Country'] || 'ไทย',
        province: rawData65['Province'] || null,
        district: rawData65['District'] || null,
        subdistrict: rawData65['Districts'] || null,
        detail_address: rawData65['Detail Address'] || null,
        additional_address_info: rawData65['Additional address information'] || null,
        payment_method: rawData65['Payment Method'] || null,
        package_id: rawData65['Package ID'] || null,
        seller_note: rawData65['Seller Note'] || null,
        checked_status: rawData65['Checked Status'] || null,
        checked_marked_by: rawData65['Checked Marked by'] || null,
        order_channel: rawData65['Order Channel'] || null,
        creator_handle: rawData65['Creator Handle'] || null,
        request_tax_invoice: rawData65['Request Tax Invoice'] || null,
        tax_buyer_id: rawData65['Tax Info - Buyer Tax ID'] || null,
        tax_type: rawData65['Tax Info - Type'] || null,
        tax_buyer_name: rawData65['Tax Info - Full Name of Buyer'] || null,
        tax_email: rawData65['Tax Info - Email'] || null,
        tax_phone: rawData65['Tax Info - Phone Number'] || null,
        tax_registered_address: rawData65['Tax Info - Registered Address'] || null,
        tax_address_type: rawData65['Tax Info - Address Type'] || null,
        platform_created_at: rawData65['Created Time'] || null,
        platform_paid_at: rawData65['Paid Time'] || null,
        platform_rts_at: rawData65['RTS Time'] || null,
        platform_shipped_at: rawData65['Shipped Time'] || null,
        platform_delivered_at: rawData65['Delivered Time'] || null,
        platform_cancelled_at: rawData65['Cancelled Time'] || null,
        cancel_by: rawData65['Cancel By'] || null,
        cancel_reason: rawData65['Cancel Reason'] || null,
        sku_total_amount: subtotal,
        shipping_fee_after_discount: parseFloat(rawData65['Shipping Fee After Discount'] || '0') || 0,
        original_shipping_fee: parseFloat(rawData65['Original Shipping Fee'] || '0') || 0,
        shipping_fee_seller_discount: parseFloat(rawData65['Shipping Fee Seller Discount'] || '0') || 0,
        shipping_fee_platform_discount: parseFloat(rawData65['Shipping Fee Platform Discount'] || '0') || 0,
        payment_platform_discount: parseFloat(rawData65['Payment platform discount'] || '0') || 0,
        taxes: parseFloat(rawData65['Taxes'] || '0') || 0,
        order_refund_amount: parseFloat(rawData65['Order Refund Amount'] || '0') || 0,
        total_amount: parseFloat(rawData65['Order Amount'] || String(subtotal)) || subtotal,
        raw_data: JSON.stringify(rawData65),
      });
    } else {
      // Accumulate order totals
      const existing = orderMap.get(platformOrderId);
      existing.sku_total_amount = (existing.sku_total_amount || 0) + subtotal;
    }

    // Build Item (1-to-1 with this exact Excel row)
    itemsPayload.push({
      source_row_number: sourceRowNumber,
      platform_order_id: platformOrderId,
      platform_sku_id: rawData65['SKU ID'] || null,
      seller_sku: rawData65['Seller SKU'] || null,
      sg_sku: null, // Initial SG SKU is empty until mapped or assigned
      product_name: productName,
      variation: rawData65['Variation'] || null,
      quantity,
      return_quantity: parseInt(rawData65['Sku Quantity of return'] || '0', 10) || 0,
      unit_price: unitPrice,
      price: unitPrice,
      subtotal,
      subtotal_before_discount: parseFloat(rawData65['SKU Subtotal Before Discount'] || String(unitPrice * quantity)) || 0,
      platform_discount: parseFloat(rawData65['SKU Platform Discount'] || '0') || 0,
      seller_discount: parseFloat(rawData65['SKU Seller Discount'] || '0') || 0,
      subtotal_after_discount: subtotal,
      weight_kg: rawData65['Weight(kg)'] ? parseFloat(rawData65['Weight(kg)']) : null,
      product_category: rawData65['Product Category'] || null,
      package_id: rawData65['Package ID'] || null,
      raw_data: JSON.stringify(rawData65),
    });
  }

  const ordersPayload = Array.from(orderMap.values());

  return {
    ok: true,
    fileHash,
    fileSize: file.size,
    fileName: file.name,
    sheetName: ORDER_SHEET_NAME,
    totalRows: itemsPayload.length,
    ordersCount: ordersPayload.length,
    itemsCount: itemsPayload.length,
    previewItems: itemsPayload.slice(0, 5),
    ordersPayload,
    itemsPayload,
    rowErrors,
  };
}

/**
 * Resolve single cell value from raw_data or fallback domain item fields
 */
function resolveItemCellValue(itm: any, rawObj: Record<string, any>, colDef: OrderColumnDef): any {
  let val = rawObj[colDef.header];

  if (val !== undefined && val !== null && val !== '') {
    return val;
  }

  // Check if item has property matching column key (e.g. sku_unit_price, order_refund_amount)
  if (itm[colDef.key] !== undefined && itm[colDef.key] !== null && itm[colDef.key] !== '') {
    return itm[colDef.key];
  }

  // Fallback to database / domain model property names
  switch (colDef.key) {
    case 'order_id':
      return itm.platform_order_id || itm.order_no || '';
    case 'order_status':
      return itm.platform_order_status || 'จัดส่งแล้ว';
    case 'sku_id':
      return itm.platform_sku_id || '';
    case 'seller_sku':
      return itm.seller_sku || '';
    case 'product_name':
      return itm.product_name || '';
    case 'variation':
      return itm.variation || '';
    case 'quantity':
      return itm.quantity !== undefined ? itm.quantity : 1;
    case 'sku_unit_price':
      return itm.unit_price ?? itm.price ?? 0;
    case 'sku_subtotal_before_discount':
      return itm.subtotal_before_discount ?? (Number(itm.unit_price ?? itm.price ?? 0) * Number(itm.quantity ?? 1));
    case 'sku_platform_discount':
      return itm.platform_discount ?? 0;
    case 'sku_seller_discount':
      return itm.seller_discount ?? 0;
    case 'sku_subtotal_after_discount':
      return itm.subtotal_after_discount ?? itm.subtotal ?? 0;
    case 'shipping_fee_after_discount':
      return itm.shipping_fee_after_discount ?? 0;
    case 'original_shipping_fee':
      return itm.original_shipping_fee ?? 0;
    case 'shipping_fee_seller_discount':
      return itm.shipping_fee_seller_discount ?? 0;
    case 'shipping_fee_platform_discount':
      return itm.shipping_fee_platform_discount ?? 0;
    case 'payment_platform_discount':
      return itm.payment_platform_discount ?? 0;
    case 'taxes':
      return itm.taxes ?? 0;
    case 'order_amount':
      return itm.total_amount ?? itm.sku_total_amount ?? 0;
    case 'order_refund_amount':
      return itm.refund_amount ?? 0;
    case 'tracking_id':
      return itm.tracking_id || '';
    case 'shipping_provider_name':
      return itm.shipping_provider_name || 'J&T Express';
    case 'buyer_message':
      return itm.buyer_message || '';
    case 'buyer_username':
      return itm.buyer_username || '';
    case 'recipient':
      return itm.recipient_name || '';
    case 'phone':
      return itm.recipient_phone || '';
    case 'detail_address':
      return itm.detail_address || '';
    case 'province':
      return itm.province || '';
    case 'district':
      return itm.district || '';
    case 'districts':
      return itm.subdistrict || '';
    case 'zipcode':
      return itm.zipcode || '';
    case 'weight_kg':
      return itm.weight_kg ?? null;
    default:
      return '';
  }
}

/**
 * Build workbook conforming to the OrderSKUList specification
 * Strictly enforces 1 row per order item (ZERO AGGREGATION)
 * Exactly 65 columns (A:BM) by default (or 66 when includeSgSku is true)
 */
export function generateOrderWorkbook(
  items: any[],
  options?: {
    includeSgSku?: boolean;
  }
): { workbook: XLSX.WorkBook; rowsExported: number } {
  const includeSgSku = options?.includeSgSku ?? false;

  // Build Header Row (Row 1)
  const headerRow: string[] = ORDER_EXCEL_COLUMNS.map((col) => col.header);
  if (includeSgSku) {
    headerRow.push(SG_FRUIT_SKU_COLUMN.header);
  }

  // Build Description Row (Row 2)
  const descRow: string[] = ORDER_EXCEL_COLUMNS.map((col) => col.description);
  if (includeSgSku) {
    descRow.push(SG_FRUIT_SKU_COLUMN.description);
  }

  // Build Data Rows (Row 3+)
  const dataRows: any[][] = [];

  for (const itm of items) {
    // Parse raw_data if available to retrieve full original 65 columns
    let rawObj: Record<string, any> = {};
    if (itm.raw_data) {
      try {
        rawObj = typeof itm.raw_data === 'string' ? JSON.parse(itm.raw_data) : itm.raw_data;
      } catch {
        rawObj = {};
      }
    }

    const row: any[] = [];

    // Map each of the 65 columns
    for (const colDef of ORDER_EXCEL_COLUMNS) {
      let val = resolveItemCellValue(itm, rawObj, colDef);

      // Formula injection sanitizer & data type preservation
      val = sanitizeForSpreadsheet(val, colDef.isNumeric);

      row.push(val);
    }

    // Optional column 66: SG FRUIT SKU
    if (includeSgSku) {
      const sgSkuVal = itm.sg_sku || '';
      row.push(sanitizeForSpreadsheet(sgSkuVal, false));
    }

    dataRows.push(row);
  }

  // Combine rows into sheet matrix
  const sheetData = [headerRow, descRow, ...dataRows];

  // Convert to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set explicit string and numeric cell types
  ORDER_EXCEL_COLUMNS.forEach((colDef, cIdx) => {
    for (let r = 2; r < sheetData.length; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
      const cell = worksheet[cellRef];
      if (!cell) continue;

      if (colDef.isText) {
        cell.t = 's'; // Force string type to preserve leading zeros
        cell.v = String(cell.v ?? '');
      } else if (colDef.isNumeric) {
        if (typeof cell.v === 'number' && !isNaN(cell.v)) {
          cell.t = 'n';
        } else if (typeof cell.v === 'string' && cell.v !== '' && !isNaN(Number(cell.v))) {
          cell.t = 'n';
          cell.v = Number(cell.v);
        } else {
          cell.t = 's'; // Preserved string with single quote if formula payload
        }
      }
    }
  });

  if (includeSgSku) {
    const cIdx = ORDER_EXCEL_COLUMNS.length;
    for (let r = 2; r < sheetData.length; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
      const cell = worksheet[cellRef];
      if (cell) {
        cell.t = 's';
        cell.v = String(cell.v ?? '');
      }
    }
  }

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, ORDER_SHEET_NAME);

  return {
    workbook,
    rowsExported: dataRows.length,
  };
}

/**
 * Generate and download an exact .xlsx file conforming to the OrderSKUList specification
 * Strictly enforces 1 row per order item (NO AGGREGATION)
 */
export function exportOrderExcelFile(
  items: any[],
  options?: {
    includeSgSku?: boolean;
    fileName?: string;
  }
) {
  const { workbook, rowsExported } = generateOrderWorkbook(items, options);
  const dateStr = new Date().toISOString().slice(0, 10);
  const outFileName = options?.fileName || `SG_FRUIT_OrderSKUList_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, outFileName);

  return {
    rowsExported,
    fileName: outFileName,
  };
}

/**
 * Generate exact CSV string conforming to RFC 4180 with UTF-8 BOM and formula injection protection
 */
export function generateOrderCsvString(
  items: any[],
  options?: {
    includeSgSku?: boolean;
  }
): string {
  const includeSgSku = options?.includeSgSku ?? false;

  // Row 1: Header Row
  const headerCols: string[] = ORDER_EXCEL_COLUMNS.map((col) => formatCellForCsv(col.header, false));
  if (includeSgSku) {
    headerCols.push(formatCellForCsv(SG_FRUIT_SKU_COLUMN.header, false));
  }
  const headerLine = headerCols.join(',');

  // Row 2: Description Row
  const descCols: string[] = ORDER_EXCEL_COLUMNS.map((col) => formatCellForCsv(col.description, false));
  if (includeSgSku) {
    descCols.push(formatCellForCsv(SG_FRUIT_SKU_COLUMN.description, false));
  }
  const descLine = descCols.join(',');

  // Row 3+: Data Rows
  const dataLines: string[] = [];

  for (const itm of items) {
    let rawObj: Record<string, any> = {};
    if (itm.raw_data) {
      try {
        rawObj = typeof itm.raw_data === 'string' ? JSON.parse(itm.raw_data) : itm.raw_data;
      } catch {
        rawObj = {};
      }
    }

    const rowCells: string[] = [];

    for (const colDef of ORDER_EXCEL_COLUMNS) {
      const val = resolveItemCellValue(itm, rawObj, colDef);
      rowCells.push(formatCellForCsv(val, colDef.isNumeric));
    }

    if (includeSgSku) {
      const sgSkuVal = itm.sg_sku || '';
      rowCells.push(formatCellForCsv(sgSkuVal, false));
    }

    dataLines.push(rowCells.join(','));
  }

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel Thai UTF-8 display compatibility
  return '\uFEFF' + [headerLine, descLine, ...dataLines].join('\r\n');
}

/**
 * Generate and trigger download of an RFC 4180 compliant .csv file
 */
export function exportOrderCsvFile(
  items: any[],
  options?: {
    includeSgSku?: boolean;
    fileName?: string;
  }
) {
  const csvContent = generateOrderCsvString(items, options);
  const dateStr = new Date().toISOString().slice(0, 10);
  const outFileName = options?.fileName || `SG_FRUIT_OrderSKUList_${dateStr}.csv`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    rowsExported: items.length,
    fileName: outFileName,
  };
}
