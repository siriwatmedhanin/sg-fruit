import React, { useState, useEffect } from 'react';
import {
  X,
  FileBarChart,
  Printer,
  Package,
  AlertTriangle,
  XCircle,
  TrendingDown,
} from 'lucide-react';
import type { AuthRole, InventoryItem, InventorySummary } from '../types';
import { fetchInventory, fetchInventorySummary } from '../services/api';

interface InventoryReportsModalProps {
  role: AuthRole;
  onClose: () => void;
}

type ReportTab = 'current' | 'low_stock' | 'out_of_stock' | 'movements_summary';

export const InventoryReportsModal: React.FC<InventoryReportsModalProps> = ({
  role,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('current');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadReportData() {
      setLoading(true);
      try {
        const [sumRes, invRes] = await Promise.all([
          fetchInventorySummary(role),
          fetchInventory(role, { limit: 100 }),
        ]);
        if (isMounted) {
          if (sumRes.ok) setSummary(sumRes.data);
          if (invRes.ok) setItems(invRes.data);
        }
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReportData();
    return () => { isMounted = false; };
  }, [role]);

  const handlePrint = () => {
    window.print();
  };

  const lowStockItems = items.filter((i) => i.stock_status === 'low_stock');
  const outOfStockItems = items.filter((i) => i.stock_status === 'out_of_stock');

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '980px',
          width: '96%',
          maxHeight: '92vh',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
        }}
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
            <FileBarChart size={24} color="#2D5A27" />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink, #2D3A2F)' }}>
                รายงานสต็อกสินค้า (Inventory Reports)
              </h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#666' }}>
                สรุปภาพรวมและรายงานความเคลื่อนไหวสินค้าของระบบหลังบ้าน SG FRUIT
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                background: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <Printer size={15} /> พิมพ์รายงาน
            </button>
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
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            background: '#F5F1E8',
            borderBottom: '1px solid #E5DEC9',
            padding: '6px 24px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'current' ? 700 : 500,
              background: activeTab === 'current' ? '#FFF' : 'transparent',
              color: activeTab === 'current' ? '#2D5A27' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Package size={16} /> สต็อกคงเหลือปัจจุบัน ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('low_stock')}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'low_stock' ? 700 : 500,
              background: activeTab === 'low_stock' ? '#FFF' : 'transparent',
              color: activeTab === 'low_stock' ? '#E65100' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={16} /> สินค้าใกล้หมด ({lowStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('out_of_stock')}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'out_of_stock' ? 700 : 500,
              background: activeTab === 'out_of_stock' ? '#FFF' : 'transparent',
              color: activeTab === 'out_of_stock' ? '#C62828' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <XCircle size={16} /> สินค้าหมดสต็อก ({outOfStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements_summary')}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'movements_summary' ? 700 : 500,
              background: activeTab === 'movements_summary' ? '#FFF' : 'transparent',
              color: activeTab === 'movements_summary' ? '#1565C0' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <TrendingDown size={16} /> สรุปการเคลื่อนไหวล่าสุด
          </button>
        </div>

        {/* Report Content */}
        <div style={{ flex: '1', overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>กำลังจัดเตรียมรายงาน...</div>
          ) : activeTab === 'current' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div style={{ background: '#FAF6EE', padding: '12px', borderRadius: '8px', border: '1px solid #E5DEC9' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>จำนวน Variants ทั้งหมด</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#2D3A2F' }}>{summary?.total_variants || 0}</div>
                </div>
                <div style={{ background: '#E8F5E9', padding: '12px', borderRadius: '8px', border: '1px solid #C8E6C9' }}>
                  <div style={{ fontSize: '12px', color: '#2E7D32' }}>มีสต็อกปกติ</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#2E7D32' }}>{summary?.in_stock_count || 0}</div>
                </div>
                <div style={{ background: '#FFF3E0', padding: '12px', borderRadius: '8px', border: '1px solid #FFE0B2' }}>
                  <div style={{ fontSize: '12px', color: '#E65100' }}>ใกล้หมด (Low Stock)</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#E65100' }}>{summary?.low_stock_count || 0}</div>
                </div>
                <div style={{ background: '#FFEBEE', padding: '12px', borderRadius: '8px', border: '1px solid #FFCDD2' }}>
                  <div style={{ fontSize: '12px', color: '#C62828' }}>หมดสต็อก (Out)</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#C62828' }}>{summary?.out_of_stock_count || 0}</div>
                </div>
              </div>

              <table className="admin-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>สินค้า</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>หมวดหมู่</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>SKU (หน่วยขาย)</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>ราคาขาย</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>ราคาทุน</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>คงเหลือ</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.variant_id}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{i.product_name}</td>
                      <td style={{ padding: '8px', color: '#666' }}>{i.category_name}</td>
                      <td style={{ padding: '8px' }}>{i.sku}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>฿{i.price.toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>฿{(i.cost_price || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                        {i.stock_quantity} {i.unit}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background:
                              i.stock_status === 'in_stock'
                                ? '#E8F5E9'
                                : i.stock_status === 'low_stock'
                                ? '#FFF3E0'
                                : i.stock_status === 'out_of_stock'
                                ? '#FFEBEE'
                                : '#ECEFF1',
                            color:
                              i.stock_status === 'in_stock'
                                ? '#2E7D32'
                                : i.stock_status === 'low_stock'
                                ? '#E65100'
                                : i.stock_status === 'out_of_stock'
                                ? '#C62828'
                                : '#607D8B',
                          }}
                        >
                          {i.stock_status === 'in_stock'
                            ? 'มีสต็อก'
                            : i.stock_status === 'low_stock'
                            ? 'ใกล้หมด'
                            : i.stock_status === 'out_of_stock'
                            ? 'หมดสต็อก'
                            : 'ปิดขาย'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'low_stock' ? (
            <div>
              <div style={{ marginBottom: '12px', color: '#666', fontSize: '13px' }}>
                รายการสินค้าที่สต็อกคงเหลือน้อยกว่าหรือเท่ากับเกณฑ์แจ้งเตือน (ควรจัดซื้อหรือรับเข้าเพิ่ม):
              </div>
              {lowStockItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#2E7D32' }}>
                  ✓ ไม่มีสินค้าที่ใกล้หมดสต็อกในขณะนี้
                </div>
              ) : (
                <table className="admin-table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>สินค้า</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>SKU</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>คงเหลือ</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>เกณฑ์แจ้งเตือน</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>ขาดอีก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((i) => (
                      <tr key={i.variant_id}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{i.product_name}</td>
                        <td style={{ padding: '8px' }}>{i.sku}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#E65100' }}>
                          {i.stock_quantity} {i.unit}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{i.low_stock_threshold} {i.unit}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#C62828', fontWeight: 600 }}>
                          +{Math.max(0, i.low_stock_threshold - i.stock_quantity)} {i.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : activeTab === 'out_of_stock' ? (
            <div>
              <div style={{ marginBottom: '12px', color: '#666', fontSize: '13px' }}>
                รายการสินค้าที่สต็อกคงเหลือ 0 หรือหมดแล้ว:
              </div>
              {outOfStockItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#2E7D32' }}>
                  ✓ ไม่มีสินค้าที่หมดสต็อกในขณะนี้
                </div>
              ) : (
                <table className="admin-table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>สินค้า</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>หมวดหมู่</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>SKU</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>คงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outOfStockItems.map((i) => (
                      <tr key={i.variant_id}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{i.product_name}</td>
                        <td style={{ padding: '8px', color: '#666' }}>{i.category_name}</td>
                        <td style={{ padding: '8px' }}>{i.sku}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#C62828' }}>
                          0 {i.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', color: '#666', fontSize: '13px' }}>
                รายการเคลื่อนไหวสต็อกล่าสุด 10 รายการ:
              </div>
              <table className="admin-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>วัน-เวลา</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>สินค้า / SKU</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>ประเภท</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>เปลี่ยนแปลง</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>สาเหตุ</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>ผู้บันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.recent_movements || []).map((m) => (
                    <tr key={m.id}>
                      <td style={{ padding: '8px', whiteSpace: 'nowrap', color: '#666' }}>
                        {new Date(m.created_at).toLocaleString('th-TH')}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{m.product_name}</span> ({m.sku})
                      </td>
                      <td style={{ padding: '8px' }}>{m.movement_type}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: m.quantity_change > 0 ? '#2E7D32' : '#C62828' }}>
                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                      </td>
                      <td style={{ padding: '8px', color: '#555' }}>{m.reason || '-'}</td>
                      <td style={{ padding: '8px', color: '#777' }}>{m.created_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
