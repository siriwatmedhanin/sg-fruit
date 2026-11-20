import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import type { AuthRole, StockMovementRecord, StockMovementType } from '../types';
import { fetchStockMovements } from '../services/api';

interface StockHistoryModalProps {
  role: AuthRole;
  variantId?: string | null;
  productName?: string | null;
  sku?: string | null;
  onClose: () => void;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  role,
  variantId,
  productName,
  sku,
  onClose,
}) => {
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStockMovements(role, {
        variant_id: variantId || undefined,
        movement_type: typeFilter || undefined,
        page,
        limit: 25,
      });
      if (res.ok) {
        setMovements(res.data);
        setTotalPages(res.total_pages);
        setTotalCount(res.total);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดประวัติการเคลื่อนไหวสต็อกได้');
    } finally {
      setLoading(false);
    }
  }, [role, variantId, typeFilter, page]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  // Badge styler for movement types
  const renderMovementBadge = (type: StockMovementType) => {
    switch (type) {
      case 'STOCK_IN':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#E8F5E9', color: '#2E7D32', fontSize: '11.5px', fontWeight: 600 }}>
            รับเข้า (Stock In)
          </span>
        );
      case 'STOCK_OUT':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#E3F2FD', color: '#1565C0', fontSize: '11.5px', fontWeight: 600 }}>
            เบิกออก (Stock Out)
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#FFF3E0', color: '#E65100', fontSize: '11.5px', fontWeight: 600 }}>
            ปรับยอด (Adjustment)
          </span>
        );
      case 'DAMAGE':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#FFEBEE', color: '#C62828', fontSize: '11.5px', fontWeight: 600 }}>
            เสียหาย (Damage)
          </span>
        );
      case 'RETURN':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#F3E5F5', color: '#6A1B9A', fontSize: '11.5px', fontWeight: 600 }}>
            สินค้าคืน (Return)
          </span>
        );
      case 'ORDER_DEDUCTION':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#EDE7F6', color: '#4527A0', fontSize: '11.5px', fontWeight: 600 }}>
            ตัดสต็อกออเดอร์
          </span>
        );
      case 'OPENING_BALANCE':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#ECEFF1', color: '#455A64', fontSize: '11.5px', fontWeight: 600 }}>
            ยอดตั้งต้น (Opening)
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.product_name?.toLowerCase().includes(s) ||
      m.sku?.toLowerCase().includes(s) ||
      m.reason?.toLowerCase().includes(s) ||
      m.reference_id?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '96%', maxHeight: '90vh', padding: '0', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--cream-light, #FDFBF7)',
            borderBottom: '1px solid var(--border-soft, #E5DEC9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={22} color="#2D5A27" />
            <div>
              <h3 style={{ margin: 0, fontSize: '17.5px', fontWeight: 700, color: 'var(--ink, #2D3A2F)' }}>
                {variantId ? `ประวัติการเคลื่อนไหวสต็อก: ${productName || ''} (${sku || ''})` : 'ประวัติการเคลื่อนไหวสต็อกทั้งหมด (Stock Movement Ledger)'}
              </h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#666' }}>
                บันทึกประวัติการปรับปรุงสต็อกแบบ Real-time (Audit Trail ไม่สามารถลบหรือแก้ไขย้อนหลังได้)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            padding: '12px 24px',
            background: '#FAF6EE',
            borderBottom: '1px solid #E5DEC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '220px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
              <input
                type="text"
                placeholder="ค้นหาสินค้า, SKU, หมายเหตุ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CCC',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="#666" />
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CCC',
                  fontSize: '13px',
                  background: '#FFF',
                }}
              >
                <option value="">ทุกประเภทการเคลื่อนไหว</option>
                <option value="STOCK_IN">รับสินค้าเข้า (Stock In)</option>
                <option value="STOCK_OUT">เบิกสินค้าออก (Stock Out)</option>
                <option value="ADJUSTMENT">ปรับยอด (Adjustment)</option>
                <option value="DAMAGE">สินค้าเสียหาย (Damage)</option>
                <option value="RETURN">สินค้าคืน (Return)</option>
                <option value="ORDER_DEDUCTION">ตัดสต็อกออเดอร์</option>
                <option value="OPENING_BALANCE">ยอดตั้งต้น</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>
              ทั้งหมด <strong>{totalCount}</strong> รายการ
            </span>
            <button
              type="button"
              onClick={loadMovements}
              style={{
                background: '#FFF',
                border: '1px solid #CCC',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12.5px',
              }}
            >
              <RefreshCw size={14} /> รีเฟรช
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div style={{ flex: '1', overflowY: 'auto', padding: '16px 24px' }}>
          {error && (
            <div style={{ padding: '12px', borderRadius: '6px', background: '#FFEBEE', color: '#C62828', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              กำลังโหลดข้อมูลประวัติการเคลื่อนไหว...
            </div>
          ) : filteredMovements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              ไม่พบประวัติการเคลื่อนไหวสต็อกตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <table className="admin-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px' }}>วัน-เวลา</th>
                  {!variantId && <th style={{ textAlign: 'left', padding: '10px' }}>สินค้า / SKU</th>}
                  <th style={{ textAlign: 'left', padding: '10px' }}>ประเภท</th>
                  <th style={{ textAlign: 'center', padding: '10px' }}>การเปลี่ยนแปลง</th>
                  <th style={{ textAlign: 'center', padding: '10px' }}>ก่อน → หลัง</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>สาเหตุ / หมายเหตุ</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((m) => (
                  <tr key={m.id}>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap', color: '#555' }}>
                      {new Date(m.created_at).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    {!variantId && (
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 600, color: '#2D3A2F' }}>{m.product_name}</div>
                        <div style={{ fontSize: '11.5px', color: '#777' }}>SKU: {m.sku}</div>
                      </td>
                    )}
                    <td style={{ padding: '10px' }}>{renderMovementBadge(m.movement_type)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '13.5px',
                          color: m.quantity_change > 0 ? '#2E7D32' : m.quantity_change < 0 ? '#C62828' : '#666',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        {m.quantity_change > 0 ? (
                          <>
                            <ArrowUpRight size={14} /> +{m.quantity_change}
                          </>
                        ) : m.quantity_change < 0 ? (
                          <>
                            <ArrowDownRight size={14} /> {m.quantity_change}
                          </>
                        ) : (
                          '0'
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#555' }}>
                      {m.quantity_before} → <strong>{m.quantity_after}</strong>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div>{m.reason || '-'}</div>
                      {m.note && <div style={{ fontSize: '11.5px', color: '#888' }}>{m.note}</div>}
                      {m.reference_id && (
                        <div style={{ fontSize: '11px', color: '#1565C0', marginTop: '2px' }}>
                          Ref: {m.reference_id}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                      {m.created_by}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer & Pagination */}
        <div
          style={{
            padding: '12px 24px',
            background: '#FAF6EE',
            borderTop: '1px solid #E5DEC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#666' }}>
            หน้า {page} จาก {totalPages || 1}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                background: page <= 1 ? '#EEE' : '#FFF',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                background: page >= totalPages ? '#EEE' : '#FFF',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
