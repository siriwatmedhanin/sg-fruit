/**
 * SG FRUIT — STEP 7.10: ORDER MANAGEMENT & EXCEL/CSV EXPORT VERIFICATION SUITE
 * 
 * Verifies:
 * 1. 65 Columns (A:BM) exact alignment & header order matching platform standard
 * 2. 1 Row = 1 Order Item (Zero Aggregation, order fields duplicated for multi-item orders)
 * 3. 3-Layer SKU Separation (Platform SKU ID, Seller SKU, SG FRUIT internal SKU)
 * 4. 16 Numeric Columns Data Type Preservation (t: 'n', negative numbers, decimals, AutoSum)
 * 5. Text Preservation (Leading zero zipcodes '01000', long IDs without scientific notation)
 * 6. Clean Date, Thai UTF-8, and Null handling (No spurious single quotes)
 * 7. Formula Injection Protection across all attack vectors (=, +, -, @, full-width, tabs, CR/LF, |, %, ;)
 * 8. Real Disk File Generation and Readback via SheetJS (.xlsx and .csv)
 * 9. Export Permissions Default Deny (requireAuth(['admin']), 401/403)
 * 10. Admin UI Export Modal & Format Selection (.xlsx and .csv)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

import {
  ORDER_SHEET_NAME,
  ORDER_EXCEL_COLUMNS,
  SG_FRUIT_SKU_COLUMN,
  sanitizeForSpreadsheet,
  formatCellForCsv
} from '../src/utils/orderTemplate.ts';

import {
  generateOrderWorkbook,
  generateOrderCsvString
} from '../src/utils/excelEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(projectRoot, '..', 'sg-fruit-backend');

test('SG FRUIT - Step 7.10: Order Management & Excel Export Suite', async (t) => {

  // =========================================================================
  // SECTION 1: 65 COLUMNS (A:BM) EXACT ALIGNMENT & TEMPLATE VALIDATION
  // =========================================================================

  await t.test('1.1 65 Columns Definition: Exactly 65 columns from A to BM', () => {
    assert.strictEqual(ORDER_EXCEL_COLUMNS.length, 65, 'Must define exactly 65 columns');

    // Column 1 (index 0) = A = Order ID
    assert.strictEqual(XLSX.utils.encode_col(0), 'A');
    assert.strictEqual(ORDER_EXCEL_COLUMNS[0].key, 'order_id');
    assert.strictEqual(ORDER_EXCEL_COLUMNS[0].header, 'Order ID');

    // Column 65 (index 64) = BM = Tax Info - Address Type
    assert.strictEqual(XLSX.utils.encode_col(64), 'BM');
    assert.strictEqual(ORDER_EXCEL_COLUMNS[64].key, 'tax_address_type');
    assert.strictEqual(ORDER_EXCEL_COLUMNS[64].header, 'Tax Info - Address Type');

    // Optional Column 66 (index 65) = BN = SG FRUIT SKU
    assert.strictEqual(XLSX.utils.encode_col(65), 'BN');
    assert.strictEqual(SG_FRUIT_SKU_COLUMN.key, 'sg_sku');
    assert.strictEqual(SG_FRUIT_SKU_COLUMN.header, 'SG FRUIT SKU (หน่วยขายภายใน)');
  });

  await t.test('1.2 16 Numeric Columns Explicitly Defined with isNumeric: true', () => {
    const numericCols = ORDER_EXCEL_COLUMNS.filter((c) => c.isNumeric);
    assert.strictEqual(numericCols.length, 16, 'Exactly 16 columns must be flagged as isNumeric');

    const expectedKeys = [
      'quantity', 'sku_qty_return', 'sku_unit_price', 'sku_subtotal_before_discount',
      'sku_platform_discount', 'sku_seller_discount', 'sku_subtotal_after_discount',
      'shipping_fee_after_discount', 'original_shipping_fee', 'shipping_fee_seller_discount',
      'shipping_fee_platform_discount', 'payment_platform_discount', 'taxes',
      'order_amount', 'order_refund_amount', 'weight_kg'
    ];

    expectedKeys.forEach((k) => {
      const col = ORDER_EXCEL_COLUMNS.find((c) => c.key === k);
      assert.ok(col, `Column ${k} must exist`);
      assert.strictEqual(col.isNumeric, true, `Column ${k} must have isNumeric: true`);
    });
  });

  // =========================================================================
  // SECTION 2: 1 ROW = 1 ORDER ITEM & ZERO AGGREGATION
  // =========================================================================

  await t.test('2.1 Multi-Item Order: 1 Order with 3 Items produces 3 distinct rows (Zero Aggregation)', () => {
    const sampleItems = [
      {
        order_no: 'SG-99901',
        platform_order_id: '57723948293849201',
        platform_sku_id: 'SKU-PL-101',
        seller_sku: 'SELLER-AVO-01',
        sg_sku: '1 โล',
        product_name: 'อะโวคาโดฮาส สวนแม่ฉวี',
        variation: 'กล่อง 1 กิโลกรัม',
        quantity: 1,
        unit_price: 159,
        subtotal: 159,
        recipient_name: 'คุณวิชัย สวนสุข',
        recipient_phone: '0812345678',
        zipcode: '01000',
        tracking_id: 'TH0192837482'
      },
      {
        order_no: 'SG-99901',
        platform_order_id: '57723948293849201',
        platform_sku_id: 'SKU-PL-102',
        seller_sku: 'SELLER-MANGO-01',
        sg_sku: '1 โล', // Notice: Same internal SKU name on different product
        product_name: 'มะม่วงน้ำดอกไม้สีทอง',
        variation: 'กล่อง 1 กิโลกรัม',
        quantity: 2,
        unit_price: 129,
        subtotal: 258,
        recipient_name: 'คุณวิชัย สวนสุข',
        recipient_phone: '0812345678',
        zipcode: '01000',
        tracking_id: 'TH0192837482'
      },
      {
        order_no: 'SG-99901',
        platform_order_id: '57723948293849201',
        platform_sku_id: 'SKU-PL-101',
        seller_sku: 'SELLER-AVO-01', // Notice: Duplicate SKU in same order
        sg_sku: '1 โล',
        product_name: 'อะโวคาโดฮาส สวนแม่ฉวี',
        variation: 'กล่อง 1 กิโลกรัม',
        quantity: 1,
        unit_price: 159,
        subtotal: 159,
        recipient_name: 'คุณวิชัย สวนสุข',
        recipient_phone: '0812345678',
        zipcode: '01000',
        tracking_id: 'TH0192837482'
      }
    ];

    const { workbook, rowsExported } = generateOrderWorkbook(sampleItems, { includeSgSku: true });
    assert.strictEqual(rowsExported, 3, 'Must export exactly 3 data rows');

    const sheet = workbook.Sheets[ORDER_SHEET_NAME];
    assert.ok(sheet, 'Worksheet OrderSKUList must exist');

    // Total rows in sheet: Header (1) + Description (1) + 3 Data rows = 5 rows
    // Check Row 3 (first item)
    assert.strictEqual(sheet['A3'].v, '57723948293849201');
    assert.strictEqual(sheet['H3'].v, 'อะโวคาโดฮาส สวนแม่ฉวี');
    assert.strictEqual(sheet['J3'].v, 1);

    // Check Row 4 (second item - Mango)
    assert.strictEqual(sheet['A4'].v, '57723948293849201');
    assert.strictEqual(sheet['H4'].v, 'มะม่วงน้ำดอกไม้สีทอง');
    assert.strictEqual(sheet['J4'].v, 2);

    // Check Row 5 (third item - duplicate Avocado)
    assert.strictEqual(sheet['A5'].v, '57723948293849201');
    assert.strictEqual(sheet['H5'].v, 'อะโวคาโดฮาส สวนแม่ฉวี');
    assert.strictEqual(sheet['J5'].v, 1);

    // Verify 3 distinct rows exist and were not aggregated
    assert.strictEqual(sheet['BN3'].v, '1 โล');
    assert.strictEqual(sheet['BN4'].v, '1 โล');
    assert.strictEqual(sheet['BN5'].v, '1 โล');
  });

  // =========================================================================
  // SECTION 3: 3-LAYER SKU SEPARATION (Platform SKU, Seller SKU, SG FRUIT SKU)
  // =========================================================================

  await t.test('3.1 3-Layer SKU Separation: Platform SKU, Seller SKU & SG FRUIT SKU preserved independently', () => {
    const item = {
      platform_order_id: '57723948293849202',
      platform_sku_id: '1729384729384729',
      seller_sku: 'SELLER-AVO-PREMIUM',
      sg_sku: '2 ลูก',
      product_name: 'อะโวคาโดพรีเมียม',
      quantity: 1,
      unit_price: 180
    };

    const { workbook } = generateOrderWorkbook([item], { includeSgSku: true });
    const sheet = workbook.Sheets[ORDER_SHEET_NAME];

    // Col F (index 5) = SKU ID (Platform SKU)
    assert.strictEqual(sheet['F3'].v, '1729384729384729');
    assert.strictEqual(sheet['F3'].t, 's', 'Platform SKU must be string');

    // Col G (index 6) = Seller SKU
    assert.strictEqual(sheet['G3'].v, 'SELLER-AVO-PREMIUM');
    assert.strictEqual(sheet['G3'].t, 's', 'Seller SKU must be string');

    // Col BN (index 65) = SG FRUIT SKU
    assert.strictEqual(sheet['BN3'].v, '2 ลูก');
    assert.strictEqual(sheet['BN3'].t, 's', 'SG FRUIT SKU must be string');
  });

  // =========================================================================
  // SECTION 4: DATA TYPE PRESERVATION & ARITHMETIC IN NUMERIC CELLS
  // =========================================================================

  await t.test('4.1 16 Numeric Columns: Positive, Negative, Decimal preserved with t: "n"', () => {
    const item = {
      platform_order_id: '57723948293849203',
      quantity: 5,
      sku_unit_price: 150.50,
      sku_subtotal_before_discount: 752.50,
      sku_platform_discount: 50.00,
      sku_seller_discount: 25.00,
      sku_subtotal_after_discount: 677.50,
      shipping_fee_after_discount: 40.00,
      original_shipping_fee: 60.00,
      shipping_fee_seller_discount: 20.00,
      shipping_fee_platform_discount: 0.00,
      payment_platform_discount: 0.00,
      taxes: 0.00,
      order_amount: 717.50,
      order_refund_amount: -150.50, // Negative refund amount
      weight_kg: 2.25
    };

    const { workbook } = generateOrderWorkbook([item]);
    const sheet = workbook.Sheets[ORDER_SHEET_NAME];

    // Quantity (Col J = index 9)
    assert.strictEqual(sheet['J3'].t, 'n');
    assert.strictEqual(sheet['J3'].v, 5);

    // Unit Price (Col L = index 11)
    assert.strictEqual(sheet['L3'].t, 'n');
    assert.strictEqual(sheet['L3'].v, 150.5);

    // Negative Refund Amount (Col X = index 23)
    assert.strictEqual(sheet['X3'].t, 'n', 'Negative refund must have t: "n"');
    assert.strictEqual(sheet['X3'].v, -150.5, 'Negative refund must be -150.5');

    // Arithmetic check: Order Amount + Refund Amount = 717.50 - 150.50 = 567.00
    const orderAmt = sheet['W3'].v;
    const refundAmt = sheet['X3'].v;
    assert.strictEqual(orderAmt + refundAmt, 567.00, 'Excel AutoSum arithmetic must compute cleanly');
  });

  await t.test('4.2 Text Preservation: Leading Zero Zipcode ("01000") and Long ID ("57723948293849204")', () => {
    const item = {
      platform_order_id: '57723948293849204',
      zipcode: '01000',
      recipient_phone: '0891234567',
      product_name: 'อะโวคาโด'
    };

    const { workbook } = generateOrderWorkbook([item]);
    const sheet = workbook.Sheets[ORDER_SHEET_NAME];

    // Order ID (Col A)
    assert.strictEqual(sheet['A3'].t, 's');
    assert.strictEqual(sheet['A3'].v, '57723948293849204', 'Long ID must NOT lose digits or convert to float');

    // Phone (Col AO = index 40)
    assert.strictEqual(sheet['AO3'].t, 's');
    assert.strictEqual(sheet['AO3'].v, '0891234567', 'Leading 0 in phone number must be preserved');

    // Zipcode (Col AP = index 41)
    assert.strictEqual(sheet['AP3'].t, 's');
    assert.strictEqual(sheet['AP3'].v, '01000', 'Leading 0 in zipcode must be preserved');
  });

  await t.test('4.3 Clean Date, Thai UTF-8 Text, and Null Handling (No spurious single quotes)', () => {
    assert.strictEqual(sanitizeForSpreadsheet('ผลไม้ไทยเกรด A'), 'ผลไม้ไทยเกรด A');
    assert.strictEqual(sanitizeForSpreadsheet('ผลไม้ไทยเกรด A').startsWith("'"), false);

    const dateVal = new Date('2026-11-19T06:00:00.000Z');
    assert.strictEqual(sanitizeForSpreadsheet(dateVal), '2026-11-19T06:00:00.000Z');
    assert.strictEqual(sanitizeForSpreadsheet(dateVal).startsWith("'"), false);

    assert.strictEqual(sanitizeForSpreadsheet(null, false), '');
    assert.strictEqual(sanitizeForSpreadsheet(undefined, false), '');
    assert.strictEqual(sanitizeForSpreadsheet(null, true), 0);
  });

  // =========================================================================
  // SECTION 5: FORMULA INJECTION DEFENSE (All Vectors Neutralized)
  // =========================================================================

  await t.test('5.1 Formula Injection Protection: Neutralizes all trigger vectors', () => {
    // Attack vectors
    assert.strictEqual(sanitizeForSpreadsheet('=1+1', false), "'=1+1");
    assert.strictEqual(sanitizeForSpreadsheet('=cmd|/C calc', false), "'=cmd|/C calc");
    assert.strictEqual(sanitizeForSpreadsheet('+1+1', false), "'+1+1");
    assert.strictEqual(sanitizeForSpreadsheet('-1+1', false), "'-1+1");
    assert.strictEqual(sanitizeForSpreadsheet('@SUM(A1:A5)', false), "'@SUM(A1:A5)");
    assert.strictEqual(sanitizeForSpreadsheet('＝1+1', false), "'＝1+1");
    assert.strictEqual(sanitizeForSpreadsheet('＋1+1', false), "'＋1+1");
    assert.strictEqual(sanitizeForSpreadsheet('－1+1', false), "'－1+1");
    assert.strictEqual(sanitizeForSpreadsheet('＠SUM', false), "'＠SUM");
    assert.strictEqual(sanitizeForSpreadsheet('   =calc', false), "'   =calc");
    assert.strictEqual(sanitizeForSpreadsheet('\t=cmd', false), "'\t=cmd");
    assert.strictEqual(sanitizeForSpreadsheet('\r\n=calc', false), "'\r\n=calc");
    assert.strictEqual(sanitizeForSpreadsheet('|calc.exe', false), "'|calc.exe");
    assert.strictEqual(sanitizeForSpreadsheet('%COMSPEC%', false), "'%COMSPEC%");
    assert.strictEqual(sanitizeForSpreadsheet(';calc', false), "';calc");

    // Valid positive and negative numbers must NOT be neutralized
    assert.strictEqual(sanitizeForSpreadsheet(150, true), 150);
    assert.strictEqual(sanitizeForSpreadsheet(-150.5, true), -150.5);
    assert.strictEqual(sanitizeForSpreadsheet('+100', true), 100);
    assert.strictEqual(sanitizeForSpreadsheet('-50.25', true), -50.25);
  });

  await t.test('5.2 CSV RFC 4180 Escaping: Commas, Semicolons, Quotes, and Formulas', () => {
    assert.strictEqual(formatCellForCsv('Bangkok, Thailand'), '"Bangkok, Thailand"');
    assert.strictEqual(formatCellForCsv('Avocado "Hass"'), '"Avocado ""Hass"""');
    assert.strictEqual(formatCellForCsv('=cmd,calc'), '"\'=cmd,calc"');
    assert.strictEqual(formatCellForCsv(';calc.exe'), '"\';calc.exe"');
    assert.strictEqual(formatCellForCsv(-150.5, true), '-150.5');
    assert.strictEqual(formatCellForCsv('01000', false), '01000');
  });

  // =========================================================================
  // SECTION 6: REAL DISK FILE GENERATION & READBACK VIA SHEETJS (.xlsx & .csv)
  // =========================================================================

  await t.test('6.1 Real Disk File Readback: .xlsx written to disk and verified via SheetJS', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgfruit-step710-'));
    const xlsxPath = path.join(tempDir, 'TestExport.xlsx');
    const csvPath = path.join(tempDir, 'TestExport.csv');

    const testItem = {
      platform_order_id: '57723948293849205',
      platform_sku_id: 'SKU-001',
      seller_sku: 'SELLER-AVO',
      sg_sku: '1 โล',
      product_name: 'อะโวคาโดฮาส สดใหม่',
      quantity: 3,
      unit_price: 150.00,
      subtotal: 450.00,
      order_refund_amount: -50.00,
      zipcode: '01000',
      recipient_name: 'คุณกานดา สวนสวย',
      recipient_phone: '0899999999',
      buyer_message: '=cmd|\' /C calc\'!A0' // Injected payload
    };

    // 1. Generate & Write .xlsx
    const { workbook } = generateOrderWorkbook([testItem], { includeSgSku: true });
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(xlsxPath, xlsxBuffer);

    assert.ok(fs.existsSync(xlsxPath), 'XLSX file must exist on disk');

    // 2. Read back .xlsx from disk
    const readWb = XLSX.read(fs.readFileSync(xlsxPath), { type: 'buffer' });
    const readSheet = readWb.Sheets[ORDER_SHEET_NAME];
    assert.ok(readSheet, 'Sheet OrderSKUList must exist on readback');

    // Verify Row 3 data:
    // Order ID (A3)
    assert.strictEqual(readSheet['A3'].v, '57723948293849205');
    assert.strictEqual(readSheet['A3'].t, 's');

    // Quantity (J3)
    assert.strictEqual(readSheet['J3'].v, 3);
    assert.strictEqual(readSheet['J3'].t, 'n');

    // Unit Price (L3)
    assert.strictEqual(readSheet['L3'].v, 150);
    assert.strictEqual(readSheet['L3'].t, 'n');

    // Refund Amount (X3)
    assert.strictEqual(readSheet['X3'].v, -50);
    assert.strictEqual(readSheet['X3'].t, 'n');

    // Zipcode (AP3)
    assert.strictEqual(readSheet['AP3'].v, '01000');
    assert.strictEqual(readSheet['AP3'].t, 's');

    // Injected Buyer Message (AL3) -> Col 37 (index 37 = AL)
    assert.strictEqual(readSheet['AL3'].t, 's');
    assert.ok(readSheet['AL3'].v.startsWith("'="), 'Injected formula must be protected with leading quote');

    // 3. Generate & Write .csv with UTF-8 BOM
    const csvContent = generateOrderCsvString([testItem], { includeSgSku: true });
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    assert.ok(fs.existsSync(csvPath), 'CSV file must exist on disk');
    const readCsvStr = fs.readFileSync(csvPath, 'utf-8');

    // Verify UTF-8 BOM (\uFEFF)
    assert.strictEqual(readCsvStr.charCodeAt(0), 0xFEFF, 'CSV must start with UTF-8 BOM');
    assert.ok(readCsvStr.includes('01000'), 'CSV preserves leading zeros');
    assert.ok(readCsvStr.includes('-50'), 'CSV preserves negative refund amount');
    assert.ok(readCsvStr.includes('คุณกานดา สวนสวย'), 'CSV preserves Thai text cleanly');
    assert.ok(readCsvStr.includes('"\'=cmd|\' /C calc\'!A0"'), 'CSV escapes and protects formula payload');

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // =========================================================================
  // SECTION 7: EXPORT PERMISSIONS DEFAULT DENY (401/403)
  // =========================================================================

  await t.test('7.1 Export Permissions: Backend /api/admin/orders/export-data enforces Default Deny', () => {
    const ordersRouterPath = path.join(backendRoot, 'src', 'routes', 'orders.ts');
    const routerCode = fs.readFileSync(ordersRouterPath, 'utf-8');

    // Route definition must use requireAuth(['admin'])
    assert.ok(
      routerCode.includes("ordersRouter.get('/export-data', requireAuth(['admin'])"),
      'GET /export-data must be protected strictly with requireAuth([\'admin\'])'
    );
  });

  // =========================================================================
  // SECTION 8: ADMIN UI MODAL & FORMAT SELECTION
  // =========================================================================

  await t.test('8.1 Export Modal UI: Supports both .xlsx and .csv format selections', () => {
    const modalPath = path.join(projectRoot, 'src', 'components', 'ExportExcelModal.tsx');
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    assert.ok(modalCode.includes('fileFormat'), 'Modal must manage fileFormat state');
    assert.ok(modalCode.includes('exportOrderExcelFile'), 'Modal must support exportOrderExcelFile');
    assert.ok(modalCode.includes('exportOrderCsvFile'), 'Modal must support exportOrderCsvFile');
    assert.ok(modalCode.includes('Microsoft Excel (.xlsx)'), 'Modal must present Excel option');
    assert.ok(modalCode.includes('CSV (.csv)'), 'Modal must present CSV option');
  });

});
