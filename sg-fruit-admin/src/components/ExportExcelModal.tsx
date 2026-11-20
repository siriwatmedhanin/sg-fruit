import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { AuthRole } from '../types';
import { fetchExportData } from '../services/api';
import { exportOrderExcelFile, exportOrderCsvFile } from '../utils/excelEngine';

interface ExportExcelModalProps {
  role: AuthRole;
  isOpen: boolean;
  onClose: () => void;
  selectedOrderIds?: string[];
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  role,
  isOpen,
  onClose,
  selectedOrderIds = [],
}) => {
  const [scope, setScope] = useState<'all' | 'selected' | 'filtered'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packingFilter, setPackingFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeSgSku, setIncludeSgSku] = useState(true);
  const [fileFormat, setFileFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const [loading, setLoading] = useState(false);
  const [previewRowCount, setPreviewRowCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<{ rows: number; fileName: string } | null>(null);

  // Preview count when filters change
  useEffect(() => {
    if (!isOpen) return;

    let orderIdsParam = '';
    if (scope === 'selected' && selectedOrderIds.length > 0) {
      orderIdsParam = selectedOrderIds.join(',');
    }

    setLoading(true);
    fetchExportData(role, {
      status: scope === 'filtered' ? statusFilter : 'all',
      packing_status: scope === 'filtered' ? packingFilter : 'all',
      date_from: scope === 'filtered' ? dateFrom : '',
      date_to: scope === 'filtered' ? dateTo : '',
      order_ids: orderIdsParam,
    })
      .then((res) => {
        if (res.ok) {
          setPreviewRowCount(res.total_rows);
        }
      })
      .catch((err) => {
        setError(err.message || 'ไม่สามารถคำนวณจำนวนแถวได้');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, scope, statusFilter, packingFilter, dateFrom, dateTo, selectedOrderIds, role]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccessReport(null);

    let orderIdsParam = '';
    if (scope === 'selected' && selectedOrderIds.length > 0) {
      orderIdsParam = selectedOrderIds.join(',');
    }

    try {
      const res = await fetchExportData(role, {
        status: scope === 'filtered' ? statusFilter : 'all',
        packing_status: scope === 'filtered' ? packingFilter : 'all',
        date_from: scope === 'filtered' ? dateFrom : '',
        date_to: scope === 'filtered' ? dateTo : '',
        order_ids: orderIdsParam,
      });

      if (!res.ok || !res.data || res.data.length === 0) {
        setError('ไม่มีรายการสินค้าที่ตรงกับเงื่อนไขสำหรับการส่งออก');
        setLoading(false);
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = fileFormat === 'csv'
        ? `SG_FRUIT_OrderSKUList_${dateStr}.csv`
        : `SG_FRUIT_OrderSKUList_${dateStr}.xlsx`;

      const result = fileFormat === 'csv'
        ? exportOrderCsvFile(res.data, {
            includeSgSku,
            fileName,
          })
        : exportOrderExcelFile(res.data, {
            includeSgSku,
            fileName,
          });

      setSuccessReport({
        rows: result.rowsExported,
        fileName: result.fileName,
      });
    } catch (err: any) {
      setError(err.message || 'การส่งออกไฟล์ล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={22} style={{ color: 'var(--brand-green)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              ส่งออกคำสั่งซื้อ (Export Orders: .xlsx / .csv)
            </h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* FORMAT INFO BANNER */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              fontSize: '12.5px',
            }}
          >
            📋 <strong>รูปแบบไฟล์:</strong> แผ่นงาน <strong>OrderSKUList</strong> ตรงตาม 65 คอลัมน์ต้นฉบับ (A:BM)
            โดยแยก <strong>1 แถวต่อ 1 Order Item อย่างเคร่งครัด</strong> ไม่มีการรวมยอดสินค้าข้ามออเดอร์
          </div>

          {/* FORMAT SELECTION */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13.5px', marginBottom: '8px' }}>
              รูปแบบไฟล์ที่ต้องการ (File Format):
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="export-file-format"
                  checked={fileFormat === 'xlsx'}
                  onChange={() => setFileFormat('xlsx')}
                />
                <span>Microsoft Excel (.xlsx) — รองรับ AutoSum & สูตร</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="export-file-format"
                  checked={fileFormat === 'csv'}
                  onChange={() => setFileFormat('csv')}
                />
                <span>CSV (.csv) — UTF-8 BOM & RFC 4180</span>
              </label>
            </div>
          </div>

          {/* SCOPE SELECTION */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13.5px', marginBottom: '8px' }}>
              ขอบเขตข้อมูลที่ต้องการส่งออก:
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                />
                ออเดอร์ทั้งหมดในระบบ
              </label>

              {selectedOrderIds.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="export-scope"
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                  />
                  เฉพาะออเดอร์ที่เลือก ({selectedOrderIds.length})
                </label>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                />
                กรองตามเงื่อนไข
              </label>
            </div>
          </div>

          {/* FILTERS */}
          {scope === 'filtered' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '14px',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, marginBottom: '4px' }}>
                  สถานะการแพ็ก:
                </label>
                <select
                  className="input-control"
                  style={{ fontSize: '13px' }}
                  value={packingFilter}
                  onChange={(e) => setPackingFilter(e.target.value)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="unpacked">รอแพ็ก (Unpacked)</option>
                  <option value="packing">กำลังแพ็ก (Packing)</option>
                  <option value="packed">แพ็กเสร็จแล้ว (Packed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, marginBottom: '4px' }}>
                  สถานะคำสั่งซื้อ:
                </label>
                <select
                  className="input-control"
                  style={{ fontSize: '13px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="confirmed">ยืนยันแล้ว</option>
                  <option value="packed">แพ็กแล้ว</option>
                  <option value="shipped">จัดส่งแล้ว</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, marginBottom: '4px' }}>
                  ตั้งแต่วันที่:
                </label>
                <input
                  type="date"
                  className="input-control"
                  style={{ fontSize: '13px' }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, marginBottom: '4px' }}>
                  ถึงวันที่:
                </label>
                <input
                  type="date"
                  className="input-control"
                  style={{ fontSize: '13px' }}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* SG FRUIT SKU COLUMN 66 OPTION */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSgSku}
                onChange={(e) => setIncludeSgSku(e.target.checked)}
              />
              <span>
                เพิ่มคอลัมน์ที่ 66: <strong>SG FRUIT SKU (หน่วยขายภายใน)</strong> ต่อท้ายคอลัมน์เดิม 65 คอลัมน์
              </span>
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginLeft: '22px' }}>
              (ไม่กระทบคอลัมน์ Seller SKU หรือโครงสร้างเดิมของแพลตฟอร์ม)
            </span>
          </div>

          {/* PREVIEW COUNT */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>จำนวนรายการสินค้าที่จะส่งออก:</span>
            <strong style={{ fontSize: '16px', color: 'var(--brand-green)' }}>
              {previewRowCount !== null ? `${previewRowCount.toLocaleString()} รายการ (แถว)` : 'กำลังคำนวณ...'}
            </strong>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="banner-error">
              <AlertCircle size={18} />
              <span style={{ fontSize: '13px' }}>{error}</span>
            </div>
          )}

          {/* SUCCESS BANNER */}
          {successReport && (
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                background: '#ECFDF5',
                border: '1px solid #10B981',
                color: '#065F46',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={24} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                <strong>ดาวน์โหลดไฟล์สำเร็จ!</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px' }}>
                  ไฟล์ <strong>{successReport.fileName}</strong> ({successReport.rows.toLocaleString()} แถว) ได้ถูกสร้างและส่งไปยังอุปกรณ์ของท่านแล้ว
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {successReport ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || previewRowCount === 0}
            onClick={handleExport}
          >
            <Download size={16} />
            {loading ? 'กำลังส่งออก...' : fileFormat === 'csv' ? 'ดาวน์โหลดไฟล์ CSV (.csv)' : 'ดาวน์โหลดไฟล์ Excel (.xlsx)'}
          </button>
        </div>
      </div>
    </div>
  );
};
