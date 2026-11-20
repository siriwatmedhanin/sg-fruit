import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  RefreshCw,
  Package,
  CheckSquare,
  Square,
  X,
  AlertCircle,
} from 'lucide-react';
import type { AuthRole, OrderRow, OrderItemDetail, PackingSlipData } from '../types';
import {
  fetchOrderList,
  fetchOrderDetail,
  updateOrderPackingStatus,
  updateItemPackingStatus,
  fetchPackingSlip,
} from '../services/api';
import { PackingSlipModal } from './PackingSlipModal';

interface PackingViewProps {
  role: AuthRole;
  onRefreshStats?: () => void;
}

export const PackingView: React.FC<PackingViewProps> = ({ role, onRefreshStats }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'packed'>('pending');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Active packing order modal
  const [packingOrder, setPackingOrder] = useState<OrderRow | null>(null);
  const [packingItems, setPackingItems] = useState<OrderItemDetail[]>([]);
  const [packingNotes, setPackingNotes] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Packing slip modal
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [slipData, setSlipData] = useState<PackingSlipData | null>(null);

  const loadPackingOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const packingStatusFilter = activeTab === 'pending' ? 'unpacked' : 'packed';
      const res = await fetchOrderList(role, {
        q: searchTerm,
        packing_status: packingStatusFilter,
        limit: 100,
      });

      if (res.ok) {
        setOrders(res.data as OrderRow[]);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดคิวงานแพ็กสินค้าได้');
    } finally {
      setLoading(false);
    }
  }, [role, activeTab, searchTerm]);

  useEffect(() => {
    loadPackingOrders();
  }, [loadPackingOrders]);

  const handleOpenPackingModal = async (ord: OrderRow) => {
    setPackingOrder(ord);
    setPackingNotes('');
    setModalLoading(true);
    try {
      const res = await fetchOrderDetail(role, ord.id);
      if (res.ok && res.data) {
        setPackingItems(res.data.items || []);
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถโหลดรายการสินค้าเพื่อแพ็กได้');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleItemCheck = async (item: OrderItemDetail) => {
    const newStatus = item.item_packing_status === 'packed' ? 'unpacked' : 'packed';
    try {
      const res = await updateItemPackingStatus(role, item.id, newStatus, newStatus === 'packed' ? item.quantity : 0);
      if (res.ok) {
        setPackingItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, item_packing_status: newStatus } : it))
        );
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปเดตรายการสินค้าได้');
    }
  };

  const handleMarkOrderPacked = async (orderId: string) => {
    try {
      const res = await updateOrderPackingStatus(role, orderId, 'packed', packingNotes);
      if (res.ok) {
        setPackingOrder(null);
        loadPackingOrders();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถยืนยันแพ็กสินค้าได้');
    }
  };

  const handleOpenPackingSlip = async (orderId: string) => {
    try {
      const res = await fetchPackingSlip(role, orderId);
      if (res.ok && res.data) {
        setSlipData(res.data);
        setIsSlipOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถเปิดใบแพ็กสินค้าได้');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--ink)' }}>
            งานจัดของและแพ็กสินค้า (Packing Operations)
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            คิวการจัดเตรียมสินค้าและตรวจนับสำหรับพนักงานแพ็กของ
          </span>
        </div>

        <button type="button" className="btn btn-secondary" onClick={loadPackingOrders}>
          <RefreshCw size={15} /> รีเฟรชคิวงาน
        </button>
      </div>

      {error && (
        <div className="banner-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* UNIFIED PACKING OPERATIONS CARD */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* TOOLBAR: TABS & SEARCH */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
            background: '#FAFBFB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* TABS */}
          <div style={{ display: 'inline-flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              style={{
                border: 'none',
                background: activeTab === 'pending' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'pending' ? '#1B4332' : '#64748B',
                fontWeight: activeTab === 'pending' ? 700 : 500,
                fontSize: '13px',
                padding: '7px 16px',
                borderRadius: '7px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={15} strokeWidth={activeTab === 'pending' ? 2 : 1.75} style={{ color: activeTab === 'pending' ? '#1B4332' : '#64748B' }} />
              รอจัดของ / กำลังแพ็ก
            </button>
            <button
              type="button"
              style={{
                border: 'none',
                background: activeTab === 'packed' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'packed' ? '#1B4332' : '#64748B',
                fontWeight: activeTab === 'packed' ? 700 : 500,
                fontSize: '13px',
                padding: '7px 16px',
                borderRadius: '7px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'packed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setActiveTab('packed')}
            >
              <CheckCircle2 size={15} strokeWidth={activeTab === 'packed' ? 2 : 1.75} style={{ color: activeTab === 'packed' ? '#10B981' : '#64748B' }} />
              แพ็กเสร็จแล้ว
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div style={{ flex: '1 1 280px', maxWidth: '380px', minWidth: '240px', position: 'relative' }}>
            <Search
              size={16}
              strokeWidth={1.75}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input-control"
              style={{
                height: '38px',
                paddingLeft: '36px',
                paddingRight: searchTerm ? '32px' : '12px',
                fontSize: '13px',
                borderRadius: '9px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                width: '100%',
              }}
              placeholder="ค้นหา Order ID, ผู้รับ, Tracking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: '#E2E8F0',
                  color: '#64748B',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title="ล้างคำค้นหา"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* QUEUE TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Order ID (แพลตฟอร์ม)</th>
              <th style={{ padding: '10px 12px' }}>ผู้รับและที่อยู่จัดส่ง</th>
              <th style={{ padding: '10px 12px' }}>ขนส่ง / Tracking ID</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>จำนวนสินค้า</th>
              <th style={{ padding: '10px 12px' }}>สถานะการแพ็ก</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  กำลังโหลดคิวงานแพ็ก...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={36} style={{ color: '#10B981', margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {activeTab === 'pending' ? 'ไม่มีออเดอร์ค้างรอแพ็กในขณะนี้' : 'ยังไม่มีรายการที่แพ็กเสร็จ'}
                  </p>
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{ord.platform_order_id}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      สั่งซื้อ: {ord.platform_created_at ? ord.platform_created_at.slice(0, 16) : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{ord.recipient_name || 'ไม่ระบุชื่อ'}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {ord.recipient_phone ? ord.recipient_phone : ''} • {ord.province || ''}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{ord.tracking_id || '-'}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ord.shipping_provider_name}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <strong style={{ color: '#2563EB', fontSize: '14px' }}>{ord.items_count} รายการ</strong>
                    {ord.packed_items_count > 0 && (
                      <div style={{ fontSize: '11px', color: '#059669' }}>
                        (แพ็กแล้ว {ord.packed_items_count}/{ord.items_count})
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {ord.packing_status === 'packed' ? (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#D1FAE5', color: '#065F46', fontSize: '11.5px', fontWeight: 600 }}>
                        แพ็กเสร็จแล้ว
                      </span>
                    ) : ord.packing_status === 'packing' ? (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontSize: '11.5px', fontWeight: 600 }}>
                        กำลังแพ็ก
                      </span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#475569', fontSize: '11.5px', fontWeight: 600 }}>
                        รอแพ็ก
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => handleOpenPackingModal(ord)}
                      >
                        <ClipboardCheck size={14} /> ตรวจและแพ็ก
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => handleOpenPackingSlip(ord.id)}
                        title="พิมพ์ใบแพ็ก"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* INTERACTIVE PACKING CHECKLIST MODAL */}
      {packingOrder && (
        <div className="modal-backdrop" onClick={() => setPackingOrder(null)} role="dialog" aria-modal="true">
          <div
            className="modal-content"
            style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardCheck size={20} style={{ color: 'var(--brand-green)' }} />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                  ตรวจนับและแพ็กสินค้า: {packingOrder.platform_order_id}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setPackingOrder(null)} aria-label="ปิด">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* RECIPIENT SUMMARY */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                <div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>ผู้รับสินค้า:</span>
                  <div style={{ fontWeight: 600 }}>{packingOrder.recipient_name} ({packingOrder.recipient_phone})</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {packingOrder.detail_address} {packingOrder.province} {packingOrder.zipcode}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>การจัดส่ง:</span>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{packingOrder.tracking_id || 'ยังไม่มี Tracking'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{packingOrder.shipping_provider_name}</div>
                </div>
              </div>

              {/* CHECKLIST ITEMS */}
              <div>
                <strong style={{ fontSize: '13.5px', display: 'block', marginBottom: '8px' }}>
                  รายการสินค้าที่ต้องบรรจุลงกล่อง (คลิกช่องหน้าชื่อเมื่อตรวจนับแล้ว):
                </strong>

                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>ตรวจ</th>
                        <th style={{ padding: '8px 10px', width: '45px' }}>รูป</th>
                        <th style={{ padding: '8px 10px' }}>ชื่อสินค้า</th>
                        <th style={{ padding: '8px 10px' }}>ตัวเลือก/หน่วย</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>จำนวน</th>
                        <th style={{ padding: '8px 10px' }}>SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalLoading ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            กำลังโหลดรายการสินค้า...
                          </td>
                        </tr>
                      ) : (
                        packingItems.map((itm) => {
                          const isChecked = itm.item_packing_status === 'packed';
                          return (
                            <tr
                              key={itm.id}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                background: isChecked ? '#F0FDF4' : 'transparent',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleToggleItemCheck(itm)}
                            >
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {isChecked ? (
                                  <CheckSquare size={18} style={{ color: '#16A34A' }} />
                                ) : (
                                  <Square size={18} style={{ color: 'var(--text-muted)' }} />
                                )}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                {itm.thumbnail_url ? (
                                  <img
                                    src={itm.thumbnail_url}
                                    alt={itm.product_name}
                                    style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
                                  />
                                ) : (
                                  <div style={{ width: '36px', height: '36px', background: 'var(--surface-subtle)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Package size={16} />
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ fontWeight: 600, textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? 'var(--text-muted)' : 'var(--ink)' }}>
                                  {itm.product_name}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px' }}>{itm.variation || '-'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: '15px', color: 'var(--brand-green)' }}>
                                {itm.quantity}
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', fontFamily: 'monospace' }}>
                                {itm.sg_sku ? <strong>{itm.sg_sku}</strong> : (itm.seller_sku || '-')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PACKING NOTES INPUT */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, marginBottom: '4px' }}>
                  หมายเหตุการแพ็ก (ถ้ามี):
                </label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="เช่น กล่องผลไม้คัดพิเศษ, สภาพกล่องเรียบร้อย..."
                  value={packingNotes}
                  onChange={(e) => setPackingNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleOpenPackingSlip(packingOrder.id)}
              >
                <Printer size={15} /> พิมพ์ใบแพ็กสินค้านี้
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPackingOrder(null)}>
                  ปิด
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleMarkOrderPacked(packingOrder.id)}
                >
                  <CheckCircle2 size={16} /> ยืนยันแพ็กเสร็จสมบูรณ์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PACKING SLIP MODAL */}
      <PackingSlipModal
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        data={slipData}
      />
    </div>
  );
};
