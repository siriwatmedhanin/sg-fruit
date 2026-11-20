/**
 * SG FRUIT — Automated Test Suite: Excel Formula Integrity & Data Preservation
 * Validates:
 * 1. Formula Injection Mitigation (RFC 4180 & spreadsheet formula protection)
 *    - Standard formula symbols: =, +, -, @
 *    - Full-width characters: ＝ (\uFF1D), ＋ (\uFF0B), － (\uFF0D), ＠ (\uFF20)
 *    - Leading whitespace, tabs (\t), line breaks (\n, \r)
 *    - Pipe (|), percent (%), and semicolon (;) prefixes
 *    - Null / undefined handling
 * 2. Data Type Preservation
 *    - Numeric fields: Positive/negative integers and floats preserved as true JavaScript numbers (t: 'n')
 *    - Text fields: Postal codes with leading zero preserved as string (t: 's')
 *    - Date fields: Date objects and ISO strings preserved without spurious quotes
 *    - Thai Unicode text integrity preserved without corruption
 *    - Normal text: NEVER receives spurious single quotes; displays cleanly
 * 3. End-to-End Workbook Generation & Readback (Actual .xlsx and .csv disk files)
 *    - SheetJS .xlsx written to disk and read back with XLSX.readFile
 *    - RFC 4180 .csv written to disk and read back
 *    - Verifies cell types and mathematical evaluation capabilities
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as XLSX from 'xlsx';
import {
  ORDER_EXCEL_COLUMNS,
  sanitizeForSpreadsheet,
  formatCellForCsv
} from '../src/utils/orderTemplate';

test('SG FRUIT - Excel Formula Integrity & Data Preservation Suite', async (t) => {

  // =========================================================================
  // SUB-SUITE 1: Formula Injection Sanitization (Text Fields)
  // =========================================================================
  await t.test('1. Standard Formula Characters on Text Fields', () => {
    // 1.1 Equal sign
    assert.equal(sanitizeForSpreadsheet('=cmd|/C calc'), "'=cmd|/C calc");
    assert.equal(sanitizeForSpreadsheet('=1+1'), "'=1+1");
    assert.equal(sanitizeForSpreadsheet('=SUM(A1:B10)'), "'=SUM(A1:B10)");

    // 1.2 Plus sign on text field
    assert.equal(sanitizeForSpreadsheet('+1234', false), "'+1234");
    assert.equal(sanitizeForSpreadsheet('+cmd|/C calc'), "'+cmd|/C calc");

    // 1.3 Minus sign on text field
    assert.equal(sanitizeForSpreadsheet('-500', false), "'-500");
    assert.equal(sanitizeForSpreadsheet('-cmd|/C calc'), "'-cmd|/C calc");

    // 1.4 At sign
    assert.equal(sanitizeForSpreadsheet('@SUM(A1:A10)'), "'@SUM(A1:A10)");
  });

  await t.test('2. Full-Width Formula Characters (Unicode ＝, ＋, －, ＠)', () => {
    // 2.1 Full-width Equal (＝)
    assert.equal(sanitizeForSpreadsheet('＝1+1'), "'＝1+1");
    assert.equal(sanitizeForSpreadsheet('\uFF1Dcmd|/C calc'), "'\uFF1Dcmd|/C calc");

    // 2.2 Full-width Plus (＋) on text field
    assert.equal(sanitizeForSpreadsheet('＋100', false), "'＋100");

    // 2.3 Full-width Minus (－) on text field
    assert.equal(sanitizeForSpreadsheet('－50', false), "'－50");

    // 2.4 Full-width At (＠)
    assert.equal(sanitizeForSpreadsheet('＠SUM(A1:B10)'), "'＠SUM(A1:B10)");
  });

  await t.test('3. Leading Whitespace, Tab, and Newline Evasion Vectors', () => {
    // 3.1 Leading spaces before formula
    assert.equal(sanitizeForSpreadsheet('   =SUM(A1)'), "'   =SUM(A1)");
    assert.equal(sanitizeForSpreadsheet('  +100', false), "'  +100");

    // 3.2 Tab (\t) prefix
    assert.equal(sanitizeForSpreadsheet('\t=1+1'), "'\t=1+1");
    assert.equal(sanitizeForSpreadsheet('\t@SUM(A1)'), "'\t@SUM(A1)");

    // 3.3 Newline (\n) prefix
    assert.equal(sanitizeForSpreadsheet('\n=cmd|/C calc'), "'\n=cmd|/C calc");

    // 3.4 Carriage Return (\r) prefix
    assert.equal(sanitizeForSpreadsheet('\r=1+1'), "'\r=1+1");
    assert.equal(sanitizeForSpreadsheet('\r\n=1+1'), "'\r\n=1+1");
  });

  await t.test('4. Pipe (|), Percent (%), and Semicolon (;) Prefix Vectors', () => {
    // 4.1 Pipe prefix
    assert.equal(sanitizeForSpreadsheet('|cmd.exe /c calc'), "'|cmd.exe /c calc");

    // 4.2 Percent prefix (environment variable expansion)
    assert.equal(sanitizeForSpreadsheet('%COMSPEC% /c calc'), "'%COMSPEC% /c calc");

    // 4.3 Semicolon prefix (command chaining / separator breakout)
    assert.equal(sanitizeForSpreadsheet(';cmd.exe'), "';cmd.exe");
    assert.equal(sanitizeForSpreadsheet('  ;calc.exe'), "'  ;calc.exe");
  });

  // =========================================================================
  // SUB-SUITE 2: Numeric Data Type Preservation (isNumeric = true)
  // =========================================================================
  await t.test('5. Numeric Fields: Positive, Negative, Decimal & Zero Preservation', () => {
    // 5.1 Positive numbers (number input)
    assert.strictEqual(sanitizeForSpreadsheet(150, true), 150);
    assert.strictEqual(sanitizeForSpreadsheet(150.5, true), 150.5);

    // 5.2 Negative numbers (number input) - MUST NOT be prefixed with quote!
    assert.strictEqual(sanitizeForSpreadsheet(-1, true), -1);
    assert.strictEqual(sanitizeForSpreadsheet(-150.5, true), -150.5);
    assert.strictEqual(typeof sanitizeForSpreadsheet(-150.5, true), 'number');

    // 5.3 Zero
    assert.strictEqual(sanitizeForSpreadsheet(0, true), 0);

    // 5.4 String numbers parsed to true numbers when isNumeric = true
    assert.strictEqual(sanitizeForSpreadsheet('250', true), 250);
    assert.strictEqual(sanitizeForSpreadsheet('-150.50', true), -150.5);
    assert.strictEqual(typeof sanitizeForSpreadsheet('-150.50', true), 'number');
    assert.strictEqual(sanitizeForSpreadsheet('0.00', true), 0);

    // 5.5 Formula attack disguised in numeric field -> Escaped as string with single quote
    assert.strictEqual(sanitizeForSpreadsheet('=SUM(A1:A5)', true), "'=SUM(A1:A5)");
    assert.strictEqual(sanitizeForSpreadsheet('+1+1', true), "'+1+1");
  });

  // =========================================================================
  // SUB-SUITE 3: Text, Null & Date Preservation
  // =========================================================================
  await t.test('6. Text Fields: Postal Code Leading Zeros, Dates, Nulls, Thai Text', () => {
    // 6.1 Postal code with leading zero MUST remain string
    assert.strictEqual(sanitizeForSpreadsheet('01000', false), '01000');
    assert.strictEqual(typeof sanitizeForSpreadsheet('01000', false), 'string');

    // 6.2 Thai Unicode text preservation (NEVER prepends quote to normal text)
    const thaiText = 'ผลไม้สดเกรดพรีเมียม สวนแม่ฉวี เชียงใหม่ (อะโวคาโด)';
    assert.strictEqual(sanitizeForSpreadsheet(thaiText), thaiText);
    assert.strictEqual(sanitizeForSpreadsheet(thaiText).startsWith("'"), false);

    // 6.3 Date preservation (Date object & string format)
    const dateObj = new Date('2026-11-19T04:00:00.000Z');
    assert.strictEqual(sanitizeForSpreadsheet(dateObj), '2026-11-19T04:00:00.000Z');
    assert.strictEqual(sanitizeForSpreadsheet(dateObj).startsWith("'"), false);

    const dateStr = '2026-11-19 10:45:00';
    assert.strictEqual(sanitizeForSpreadsheet(dateStr), dateStr);
    assert.strictEqual(sanitizeForSpreadsheet(dateStr).startsWith("'"), false);

    // 6.4 Null and undefined handling
    assert.strictEqual(sanitizeForSpreadsheet(null, false), '');
    assert.strictEqual(sanitizeForSpreadsheet(undefined, false), '');
    assert.strictEqual(sanitizeForSpreadsheet(null, true), 0);
    assert.strictEqual(sanitizeForSpreadsheet(undefined, true), 0);

    // 6.5 Safe alphanumeric strings
    assert.strictEqual(sanitizeForSpreadsheet('AVO-HASS-2PCS'), 'AVO-HASS-2PCS');
    assert.strictEqual(sanitizeForSpreadsheet('AVO-HASS-2PCS').startsWith("'"), false);
  });

  // =========================================================================
  // SUB-SUITE 4: CSV RFC 4180 Escaping & Delimiter Defense
  // =========================================================================
  await t.test('7. CSV RFC 4180 Escaping & Delimiter Defense', () => {
    // 7.1 Text with comma escaped with double quotes
    assert.equal(formatCellForCsv('Bangkok, Thailand'), '"Bangkok, Thailand"');

    // 7.2 Text with quotes escaped as double double-quotes
    assert.equal(formatCellForCsv('Avocado "Hass" Premium'), '"Avocado ""Hass"" Premium"');

    // 7.3 Formula in CSV gets both formula quote and CSV quotes
    assert.equal(formatCellForCsv('=cmd,calc'), '"\'=cmd,calc"');

    // 7.4 Semicolon in CSV escaped with quotes
    assert.equal(formatCellForCsv('item;subitem'), '"item;subitem"');

    // 7.5 Semicolon formula in CSV
    assert.equal(formatCellForCsv(';cmd.exe'), '"\';cmd.exe"');

    // 7.6 Numeric value in CSV
    assert.equal(formatCellForCsv(-150.5, true), '-150.5');
    assert.equal(formatCellForCsv(250, true), '250');
  });

  // =========================================================================
  // SUB-SUITE 5: End-to-End Disk File Generation & Readback (.xlsx & .csv)
  // =========================================================================
  await t.test('8. Full Disk XLSX & CSV Generation and Readback Verification', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgfruit-excel-test-'));
    const xlsxFilePath = path.join(tempDir, 'TestOrderExport.xlsx');
    const csvFilePath = path.join(tempDir, 'TestOrderExport.csv');

    // Matrix simulating exact export structure
    const headers = ['Order ID', 'Recipient', 'Zipcode', 'Quantity', 'Unit Price', 'Refund Amount', 'Date', 'Note'];
    const descriptions = ['ID', 'Name', 'Postcode', 'Qty', 'Price', 'Refund', 'Created', 'Notes'];

    const testRows = [
      // Row 1: Normal valid business data (Clean display, negative refund, date, leading zero zipcode)
      [
        sanitizeForSpreadsheet('ORD-001', false),
        sanitizeForSpreadsheet('คุณสมชาย สวนผลไม้', false), // Normal text -> NO quote
        sanitizeForSpreadsheet('05000', false), // Postal code -> string '05000'
        sanitizeForSpreadsheet(2, true), // Number -> 2
        sanitizeForSpreadsheet(159.5, true), // Number -> 159.5
        sanitizeForSpreadsheet(-50.0, true), // Negative Number -> -50
        sanitizeForSpreadsheet(new Date('2026-11-19T08:00:00.000Z'), false), // Date -> ISO string
        sanitizeForSpreadsheet('สั่งผลไม้ปกติ', false) // Normal text -> NO quote
      ],
      // Row 2: Formula injection attack row (Malicious inputs neutralized with quote)
      [
        sanitizeForSpreadsheet('ORD-002', false),
        sanitizeForSpreadsheet('=cmd|/C calc', false), // Attack 1: Equal
        sanitizeForSpreadsheet('\t@SUM(A1:B2)', false), // Attack 2: Tab + At
        sanitizeForSpreadsheet(1, true),
        sanitizeForSpreadsheet(120, true),
        sanitizeForSpreadsheet(0, true),
        sanitizeForSpreadsheet(null, false), // Null -> empty string
        sanitizeForSpreadsheet('＝1+1 full-width', false) // Attack 3: Full-width
      ],
      // Row 3: Additional attack vectors (Semicolon, pipe, percent)
      [
        sanitizeForSpreadsheet('ORD-003', false),
        sanitizeForSpreadsheet(';calc.exe', false), // Attack 4: Semicolon
        sanitizeForSpreadsheet('|powershell.exe', false), // Attack 5: Pipe
        sanitizeForSpreadsheet('5', true), // Numeric string -> 5
        sanitizeForSpreadsheet(300, true),
        sanitizeForSpreadsheet(-10.5, true), // Negative decimal -> -10.5
        sanitizeForSpreadsheet('2026-11-19', false),
        sanitizeForSpreadsheet('%COMSPEC%', false) // Attack 6: Percent
      ]
    ];

    const aoa = [headers, descriptions, ...testRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Apply explicit types as done in excelEngine
    const colTypes = [
      { isText: true, isNumeric: false },
      { isText: false, isNumeric: false },
      { isText: true, isNumeric: false }, // Zipcode (isText: true)
      { isText: false, isNumeric: true },  // Quantity (isNumeric: true)
      { isText: false, isNumeric: true },  // Unit Price (isNumeric: true)
      { isText: false, isNumeric: true },  // Refund Amount (isNumeric: true)
      { isText: false, isNumeric: false }, // Date
      { isText: false, isNumeric: false }  // Notes
    ];

    colTypes.forEach((colDef, cIdx) => {
      for (let r = 2; r < aoa.length; r++) {
        const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
        const cell = ws[cellRef];
        if (!cell) continue;

        if (colDef.isText) {
          cell.t = 's';
          cell.v = String(cell.v ?? '');
        } else if (colDef.isNumeric) {
          if (typeof cell.v === 'number' && !isNaN(cell.v)) {
            cell.t = 'n';
          } else if (typeof cell.v === 'string' && cell.v !== '' && !isNaN(Number(cell.v))) {
            cell.t = 'n';
            cell.v = Number(cell.v);
          }
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OrderSKUList');

    // 1. Write actual XLSX file to disk
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(xlsxFilePath, xlsxBuffer);
    assert.ok(fs.existsSync(xlsxFilePath), 'XLSX file must be successfully written to disk');

    // 2. Read back XLSX file from disk
    const diskBuffer = fs.readFileSync(xlsxFilePath);
    const readWb = XLSX.read(diskBuffer, { type: 'buffer' });
    const readSheet = readWb.Sheets['OrderSKUList'];
    assert.ok(readSheet, 'OrderSKUList sheet must exist on disk readback');

    // Verify Row 1 (Normal Data):
    // Recipient (B3): Normal text -> clean, NO quote prefix
    const normalTextCell = readSheet[XLSX.utils.encode_cell({ r: 2, c: 1 })];
    assert.equal(normalTextCell.t, 's');
    assert.equal(normalTextCell.v, 'คุณสมชาย สวนผลไม้');
    assert.equal(normalTextCell.v.startsWith("'"), false, 'Normal text must not contain spurious single quote');

    // Zipcode (C3): must be string '05000'
    const zipCell = readSheet[XLSX.utils.encode_cell({ r: 2, c: 2 })];
    assert.equal(zipCell.t, 's', 'Zipcode cell type must be string');
    assert.equal(zipCell.v, '05000', 'Leading zero in zipcode must be preserved');

    // Unit Price (E3): must be number 159.5
    const priceCell = readSheet[XLSX.utils.encode_cell({ r: 2, c: 4 })];
    assert.equal(priceCell.t, 'n', 'Price cell type must be number');
    assert.equal(priceCell.v, 159.5, 'Price value must be 159.5');

    // Refund Amount (F3): must be number -50
    const refundCell = readSheet[XLSX.utils.encode_cell({ r: 2, c: 5 })];
    assert.equal(refundCell.t, 'n', 'Negative refund cell type must be number');
    assert.equal(refundCell.v, -50, 'Negative refund value must be -50');

    // Arithmetic test: 159.5 + (-50) = 109.5
    assert.equal(priceCell.v + refundCell.v, 109.5, 'Excel arithmetic on numeric cells must succeed');

    // Date (G3): Clean ISO date string, NO quote
    const dateCell = readSheet[XLSX.utils.encode_cell({ r: 2, c: 6 })];
    assert.equal(dateCell.t, 's');
    assert.equal(dateCell.v, '2026-11-19T08:00:00.000Z');
    assert.equal(dateCell.v.startsWith("'"), false, 'Date string must not have single quote');

    // Verify Row 2 (Formula Attack Sanitization):
    const attack1Cell = readSheet[XLSX.utils.encode_cell({ r: 3, c: 1 })];
    assert.equal(attack1Cell.t, 's');
    assert.ok(attack1Cell.v.startsWith("'="), 'Formula = must be prepended with quote');

    const attack2Cell = readSheet[XLSX.utils.encode_cell({ r: 3, c: 2 })];
    assert.equal(attack2Cell.t, 's');
    assert.ok(attack2Cell.v.startsWith("'\t@"), 'Formula \t@ must be prepended with quote');

    const attack3Cell = readSheet[XLSX.utils.encode_cell({ r: 3, c: 7 })];
    assert.equal(attack3Cell.t, 's');
    assert.ok(attack3Cell.v.startsWith("'＝"), 'Formula full-width ＝ must be prepended with quote');

    // Verify Row 3 (Semicolon, Pipe, Percent Attacks):
    const attack4Cell = readSheet[XLSX.utils.encode_cell({ r: 4, c: 1 })];
    assert.ok(attack4Cell.v.startsWith("';"), 'Semicolon attack must be prepended with quote');

    const attack5Cell = readSheet[XLSX.utils.encode_cell({ r: 4, c: 2 })];
    assert.ok(attack5Cell.v.startsWith("'|"), 'Pipe attack must be prepended with quote');

    const attack6Cell = readSheet[XLSX.utils.encode_cell({ r: 4, c: 7 })];
    assert.ok(attack6Cell.v.startsWith("'%"), 'Percent attack must be prepended with quote');

    // 3. Write actual CSV file to disk & read back
    const csvContent = [headers, descriptions, ...testRows]
      .map((row) => row.map((cell, idx) => formatCellForCsv(cell, colTypes[idx]?.isNumeric)).join(','))
      .join('\r\n');
    fs.writeFileSync(csvFilePath, csvContent, 'utf8');

    assert.ok(fs.existsSync(csvFilePath), 'CSV file must be successfully written to disk');
    const readCsv = fs.readFileSync(csvFilePath, 'utf8');
    assert.ok(readCsv.includes('05000'), 'CSV preserves leading zeros');
    assert.ok(readCsv.includes('-50'), 'CSV preserves negative refund');
    assert.ok(readCsv.includes('"\'=cmd|/C calc"'), 'CSV preserves neutralized formula quote');
    assert.ok(readCsv.includes('"\';calc.exe"'), 'CSV preserves neutralized semicolon quote');

    // Clean up temporary disk files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // =========================================================================
  // SUB-SUITE 6: Verification of 16 Designated Numeric Columns in Template
  // =========================================================================
  await t.test('9. Order Column Definition: 16 Numeric Columns Correctly Flagged', () => {
    const numericCols = ORDER_EXCEL_COLUMNS.filter((c) => c.isNumeric);
    assert.equal(numericCols.length, 16, 'Exactly 16 columns must be flagged as isNumeric');

    const expectedNumericKeys = [
      'quantity',
      'sku_qty_return',
      'sku_unit_price',
      'sku_subtotal_before_discount',
      'sku_platform_discount',
      'sku_seller_discount',
      'sku_subtotal_after_discount',
      'shipping_fee_after_discount',
      'original_shipping_fee',
      'shipping_fee_seller_discount',
      'shipping_fee_platform_discount',
      'payment_platform_discount',
      'taxes',
      'order_amount',
      'order_refund_amount',
      'weight_kg'
    ];

    expectedNumericKeys.forEach((key) => {
      const col = ORDER_EXCEL_COLUMNS.find((c) => c.key === key);
      assert.ok(col, `Column ${key} must exist`);
      assert.strictEqual(col.isNumeric, true, `Column ${key} must have isNumeric: true`);
    });
  });
});
