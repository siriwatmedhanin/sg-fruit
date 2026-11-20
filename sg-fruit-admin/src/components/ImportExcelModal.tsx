import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  History,
} from 'lucide-react';
import type { AuthRole, OrderImportBatchItem } from '../types';
import { parseOrderExcelFile, type ParseResult } from '../utils/excelEngine';
import {
  checkDuplicateImport,
  importOrdersPayload,
  fetchImportBatches,
} from '../services/api';

interface ImportExcelModalProps {
  role: AuthRole;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  role,
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [existingBatch, setExistingBatch] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importReport, setImportReport] = useState<{
    batch_id: string;
    orders_imported: number;
    items_imported: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [batches, setBatches] = useState<OrderImportBatchItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load batch history
  useEffect(() => {
    if (isOpen) {
      fetchImportBatches(role)
        .then((res) => {
          if (res.ok) setBatches(res.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setParseResult(null);
    setIsDuplicate(false);
    setExistingBatch(null);
    setImportReport(null);
    setParsing(true);

    try {
      const parsed = await parseOrderExcelFile(selectedFile);
      setParseResult(parsed);

      if (parsed.ok) {
        // Check duplicate hash via backend
        const dupRes = await checkDuplicateImport(role, parsed.fileHash, parsed.fileName);
        if (dupRes.is_duplicate) {
          setIsDuplicate(true);
          setExistingBatch(dupRes.existing_batch);
        }
      } else {
        setError(parsed.error || 'ไม่สามารถประมวลผลไฟล์ได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !parseResult.ok) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await importOrdersPayload(role, {
        batch: {
          file_name: parseResult.fileName,
          file_hash: parseResult.fileHash,
          file_size: parseResult.fileSize,
          sheet_name: parseResult.sheetName || 'OrderSKUList',
          total_rows: parseResult.totalRows,
          imported_orders_count: parseResult.ordersCount,
          imported_items_count: parseResult.itemsCount,
        },
        orders: parseResult.ordersPayload,
        items: parseResult.itemsPayload,
      });

      if (res.ok && res.data) {
        setImportReport(res.data);
        onImportSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'การนำเข้าล้มเหลว');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={22} style={{ color: 'var(--brand-green)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              นำเข้าคำสั่งซื้อจาก Excel (TikTok Shop OrderSKUList)
            </h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TOP TABS: IMPORT / HISTORY */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <button
              type="button"
              className={`btn ${!showHistory ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '13px', padding: '6px 14px' }}
              onClick={() => setShowHistory(false)}
            >
              <Upload size={16} /> นำเข้าไฟล์ใหม่
            </button>
            <button
              type="button"
              className={`btn ${showHistory ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '13px', padding: '6px 14px' }}
              onClick={() => setShowHistory(true)}
            >
              <History size={16} /> ประวัติการนำเข้า ({batches.length})
            </button>
          </div>

          {!showHistory ? (
            <>
              {/* FILE UPLOAD DROP AREA */}
              {!importReport && (
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '28px',
                    textAlign: 'center',
                    background: 'var(--surface-subtle)',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('excel-file-input')?.click()}
                >
                  <FileSpreadsheet size={40} style={{ color: 'var(--brand-green)', marginBottom: '8px' }} />
                  <p style={{ fontWeight: 600, margin: '4px 0', fontSize: '15px' }}>
                    {file ? file.name : 'คลิกเพื่อเลือกไฟล์ Excel (.xlsx)'}
                  </p>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    รองรับเฉพาะแผ่นงานชื่อ <strong>OrderSKUList</strong> และ 65 คอลัมน์ตามไฟล์แพลตฟอร์ม
                  </span>
                  <input
                    id="excel-file-input"
                    type="file"
                    accept=".xlsx"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {/* PARSING SPINNER */}
              {parsing && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  กำลังตรวจสอบโครงสร้างไฟล์และคำนวณจำนวนแถว...
                </div>
              )}

              {/* ERROR ALERT */}
              {error && (
                <div className="banner-error">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>ข้อผิดพลาดในการตรวจสอบไฟล์:</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px' }}>{error}</p>
                  </div>
                </div>
              )}

              {/* DUPLICATE WARNING */}
              {isDuplicate && existingBatch && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    color: '#92400E',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>คำเตือน: ตรวจพบไฟล์ที่เคยนำเข้าแล้ว (Duplicate File Fingerprint)</strong>
                    <p style={{ margin: '4px 0 0 0' }}>
                      ไฟล์นี้เคยถูกนำเข้าแล้วเมื่อ{' '}
                      {new Date(existingBatch.created_at).toLocaleString('th-TH')} โดย{' '}
                      {existingBatch.imported_by || 'ผู้ดูแลระบบ'} (มี {existingBatch.imported_orders_count} ออเดอร์ /{' '}
                      {existingBatch.imported_items_count} รายการสินค้า)
                    </p>
                    <span style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      ⚠️ หากท่านยืนยันนำเข้าซ้ำ ระบบจะอัปเดตข้อมูลและไม่สร้างออเดอร์ทับซ้อน
                    </span>
                  </div>
                </div>
              )}

              {/* PREVIEW STATS */}
              {parseResult && parseResult.ok && !importReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>จำนวนแถวข้อมูลทั้งหมด</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--brand-green)' }}>
                        {parseResult.totalRows.toLocaleString()} แถว
                      </h4>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>จำนวนออเดอร์ (Orders)</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--ink)' }}>
                        {parseResult.ordersCount.toLocaleString()} ออเดอร์
                      </h4>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>รายการสินค้า (Order Items)</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#2563EB' }}>
                        {parseResult.itemsCount.toLocaleString()} รายการ
                      </h4>
                    </div>
                  </div>

                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', background: '#F8FAFC', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    🔒 <strong>กฎสำคัญ:</strong> ระบบจัดเก็บแบบ <strong>1 แถวใน Excel = 1 Order Item ในระบบ</strong> โดยไม่มีการรวมยอดสินค้าข้ามออเดอร์ และไม่มีการคำนวณจำนวนซื้อแทนผู้ใช้
                  </div>

                  {/* PREVIEW TABLE (SAMPLE 5 ROWS) */}
                  <div>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                      ตัวอย่างข้อมูล 5 รายการแรกที่จะนำเข้า:
                    </h5>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px' }}>แถว Excel</th>
                            <th style={{ padding: '8px 10px' }}>Order ID</th>
                            <th style={{ padding: '8px 10px' }}>ชื่อสินค้า</th>
                            <th style={{ padding: '8px 10px' }}>ตัวเลือก (Variation)</th>
                            <th style={{ padding: '8px 10px' }}>จำนวน</th>
                            <th style={{ padding: '8px 10px' }}>ยอดเงิน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.previewItems.map((itm, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>แถว {itm.source_row_number}</td>
                              <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{itm.platform_order_id}</td>
                              <td style={{ padding: '8px 10px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {itm.product_name}
                              </td>
                              <td style={{ padding: '8px 10px' }}>{itm.variation || '-'}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{itm.quantity}</td>
                              <td style={{ padding: '8px 10px' }}>฿{Number(itm.subtotal).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUCCESS REPORT */}
              {importReport && (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: '#ECFDF5',
                    border: '1px solid #10B981',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <CheckCircle2 size={44} style={{ color: '#059669', margin: '0 auto 12px auto' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#065F46' }}>
                    นำเข้าคำสั่งซื้อสำเร็จสมบูรณ์!
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#047857' }}>
                    บันทึกข้อมูลเข้าสู่ฐานข้อมูล D1 Local เรียบร้อยแล้ว
                  </p>
                  <div style={{ display: 'inline-flex', gap: '20px', textAlign: 'left', background: '#FFFFFF', padding: '12px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid #A7F3D0' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>รุ่นนำเข้า (Batch ID)</span>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>{importReport.batch_id}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>จำนวนออเดอร์</span>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brand-green)' }}>{importReport.orders_imported} ออเดอร์</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>จำนวนรายการสินค้า</span>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#2563EB' }}>{importReport.items_imported} รายการ</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* BATCH HISTORY VIEW */
            <div>
              <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600 }}>
                ประวัติการนำเข้าไฟล์ Excel ({batches.length} รายการ):
              </h5>
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>วันที่และเวลา</th>
                      <th style={{ padding: '8px 10px' }}>ชื่อไฟล์</th>
                      <th style={{ padding: '8px 10px' }}>ออเดอร์</th>
                      <th style={{ padding: '8px 10px' }}>รายการสินค้า</th>
                      <th style={{ padding: '8px 10px' }}>สถานะ</th>
                      <th style={{ padding: '8px 10px' }}>ผู้นำเข้า</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          ยังไม่มีประวัติการนำเข้า
                        </td>
                      </tr>
                    ) : (
                      batches.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 10px' }}>{new Date(b.created_at).toLocaleString('th-TH')}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 500 }}>{b.file_name}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--brand-green)', fontWeight: 600 }}>{b.imported_orders_count}</td>
                          <td style={{ padding: '8px 10px', color: '#2563EB', fontWeight: 600 }}>{b.imported_items_count}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#D1FAE5', color: '#065F46', fontSize: '11px', fontWeight: 600 }}>
                              {b.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{b.imported_by || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {importReport ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
          </button>
          {!showHistory && !importReport && parseResult && parseResult.ok && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={handleConfirmImport}
            >
              {submitting ? 'กำลังบันทึกลงฐานข้อมูล...' : `ยืนยันนำเข้า ${parseResult.itemsCount} รายการ`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
