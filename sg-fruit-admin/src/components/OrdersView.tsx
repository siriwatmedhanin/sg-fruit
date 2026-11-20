import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  FileSpreadsheet,
  Download,
  Eye,
  Printer,
  RefreshCw,
  ShoppingBag,
  Package,
  Boxes,
  AlertCircle,
  X,
} from 'lucide-react';
import type { AuthRole, OrderRow, OrderItemDetail, PackingSlipData } from '../types';
import {
  fetchOrderList,
  fetchOrderDetail,
  fetchPackingSlip,
  deductOrderStock,
  reverseOrderStock,
  resolveImageUrl,
} from '../services/api';
import { ImportExcelModal } from './ImportExcelModal';
import { ExportExcelModal } from './ExportExcelModal';
import { PackingSlipModal } from './PackingSlipModal';

interface OrdersViewProps {
  role: AuthRole;
  onRefreshStats?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ role, onRefreshStats }) => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packingFilter, setPackingFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected orders for export
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [slipData, setSlipData] = useState<PackingSlipData | null>(null);
  const [fullSlipUrl, setFullSlipUrl] = useState<string | null>(null);

  // Order Detail Drawer/Modal
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItemDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deductLoading, setDeductLoading] = useState(false);

  const handleConfirmDeduct = async () => {
    if (!detailOrder) return;
    if (!window.confirm(`ยืนยันการตัดสต็อกสินค้าสำหรับคำสั่งซื้อ ${detailOrder.order_no} หรือไม่?`)) return;
    setDeductLoading(true);
    try {
      const res = await deductOrderStock(role, detailOrder.id);
      alert(res.message || 'ตัดสต็อกสินค้าตามคำสั่งซื้อสำเร็จ');
      handleOpenDetail(detailOrder.id);
      loadOrders();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถตัดสต็อกได้');
    } finally {
      setDeductLoading(false);
    }
  };

  const handleReverseDeduct = async () => {
    if (!detailOrder) return;
    if (!window.confirm(`ยืนยันการยกเลิกการตัดสต็อกและคืนสินค้าเข้าคลังหรือไม่?`)) return;
    setDeductLoading(true);
    try {
      const res = await reverseOrderStock(role, detailOrder.id);
      alert(res.message || 'ยกเลิกการตัดสต็อกสำเร็จ');
      handleOpenDetail(detailOrder.id);
      loadOrders();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถยกเลิกการตัดสต็อกได้');
    } finally {
      setDeductLoading(false);
    }
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrderList(role, {
        q: searchTerm,
        status: statusFilter,
        packing_status: packingFilter,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 100,
      });

      if (res.ok) {
        setOrders(res.data as OrderRow[]);
        setTotal(res.total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายการคำสั่งซื้อได้');
    } finally {
      setLoading(false);
    }
  }, [role, searchTerm, statusFilter, packingFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenDetail = async (ord: OrderRow) => {
    setDetailOrder(ord);
    setDetailLoading(true);
    try {
      const res = await fetchOrderDetail(role, ord.id);
      if (res.ok && res.data) {
        setDetailItems(res.data.items || []);
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถโหลดรายละเอียดออเดอร์ได้');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenPackingSlip = async (orderId: string) => {
    try {
      const res = await fetchPackingSlip(role, orderId);
      if (res.ok && res.data) {
        setSlipData(res.data);
        setIsSlipModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถดึงข้อมูลใบแพ็กสินค้าได้');
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  const getPackingBadge = (status: string) => {
    switch (status) {
      case 'packed':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#D1FAE5', color: '#065F46', fontSize: '11.5px', fontWeight: 600 }}>
            แพ็กเสร็จแล้ว
          </span>
        );
      case 'packing':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontSize: '11.5px', fontWeight: 600 }}>
            กำลังแพ็ก
          </span>
        );
      default:
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#475569', fontSize: '11.5px', fontWeight: 600 }}>
            รอแพ็ก
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--ink)' }}>
            จัดการคำสั่งซื้อ (Orders Management)
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            จัดการคำสั่งซื้อจากหน้าเว็บ (SG_Web) และช่องทางอื่น — รวม {total.toLocaleString()} ออเดอร์
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadOrders}
            title="รีเฟรชข้อมูลคำสั่งซื้อ"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} strokeWidth={1.75} /> รีเฟรช
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsExportModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={15} strokeWidth={1.75} /> ส่งออก Excel
          </button>
          {role === 'admin' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsImportModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FileSpreadsheet size={16} strokeWidth={1.75} /> นำเข้า Excel
            </button>
          )}
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'var(--surface-subtle)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search
            size={16}
            strokeWidth={1.75}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: '36px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)' }}
            placeholder="ค้นหา Order ID, ผู้รับ, เบอร์โทร, Tracking ID, สินค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="input-control"
            style={{ fontSize: '13px', width: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}
            value={packingFilter}
            onChange={(e) => setPackingFilter(e.target.value)}
          >
            <option value="all">สถานะแพ็กทั้งหมด</option>
            <option value="unpacked">รอแพ็ก (Unpacked)</option>
            <option value="packing">กำลังแพ็ก (Packing)</option>
            <option value="packed">แพ็กเสร็จแล้ว (Packed)</option>
          </select>

          <select
            className="input-control"
            style={{ fontSize: '13px', width: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">สถานะออเดอร์ทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="packed">แพ็กแล้ว</option>
            <option value="shipped">จัดส่งแล้ว</option>
          </select>

          <input
            type="date"
            className="input-control"
            style={{ fontSize: '12.5px', width: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="ตั้งแต่วันที่"
          />
          <input
            type="date"
            className="input-control"
            style={{ fontSize: '12.5px', width: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="ถึงวันที่"
          />
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="banner-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ORDERS TABLE */}
      <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', width: '36px' }}>
                <input
                  type="checkbox"
                  checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={{ padding: '10px 12px' }}>Order ID (แพลตฟอร์ม)</th>
              <th style={{ padding: '10px 12px' }}>ผู้รับสินค้า / ที่อยู่</th>
              <th style={{ padding: '10px 12px' }}>ช่องทาง</th>
              <th style={{ padding: '10px 12px' }}>สถานะ / การชำระเงิน</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>รายการสินค้า</th>
              {role === 'admin' && <th style={{ padding: '10px 12px', textAlign: 'right' }}>ยอดรวม</th>}
              <th style={{ padding: '10px 12px' }}>Tracking ID</th>
              <th style={{ padding: '10px 12px' }}>สถานะแพ็ก</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={role === 'admin' ? 10 : 9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  กำลังโหลดข้อมูลคำสั่งซื้อ...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={role === 'admin' ? 10 : 9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={36} strokeWidth={1.75} style={{ color: 'var(--border)', margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>ยังไม่มีข้อมูลคำสั่งซื้อ</p>
                  <span style={{ fontSize: '12px' }}>
                    {role === 'admin' ? 'คำสั่งซื้อจากหน้าเว็บ (SG_Web) หรือการนำเข้า Excel จะปรากฏที่นี่' : 'ยังไม่มีคำสั่งซื้อที่ส่งเข้ามา'}
                  </span>
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(ord.id)}
                      onChange={() => toggleSelectOrder(ord.id)}
                    />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{ord.platform_order_id}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {ord.platform_created_at ? ord.platform_created_at.slice(0, 16) : new Date(ord.created_at).toLocaleDateString('th-TH')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{ord.recipient_name || 'ไม่ระบุชื่อ'}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {ord.recipient_phone ? ord.recipient_phone : ''} {ord.province ? `• ${ord.province}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: (ord.platform === 'SG_Web' || ord.platform === 'storefront') ? '#ECFDF5' : '#F1F5F9',
                        color: (ord.platform === 'SG_Web' || ord.platform === 'storefront') ? '#047857' : '#334155',
                        border: `1px solid ${(ord.platform === 'SG_Web' || ord.platform === 'storefront') ? '#A7F3D0' : '#CBD5E1'}`,
                        fontSize: '11.5px',
                        fontWeight: 600,
                      }}
                    >
                      {(ord.platform === 'SG_Web' || ord.platform === 'storefront') ? '🌐 SG_Web' : 'TikTok Shop'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: ord.payment_method?.includes('โอน') ? '#15803d' : '#334155',
                        }}
                      >
                        {ord.payment_method || (ord.platform === 'SG_Web' || ord.platform === 'storefront' ? 'โอนเงินผ่านบัญชีธนาคาร' : 'TikTok Shop')}
                      </span>
                      {ord.slip_url ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => setFullSlipUrl(resolveImageUrl(ord.slip_url))}
                            style={{
                              border: '1px solid #86EFAC',
                              background: '#F0FDF4',
                              borderRadius: '4px',
                              padding: '2px 7px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#166534',
                              fontSize: '11px',
                              fontWeight: 600,
                              marginTop: '2px',
                            }}
                            title="คลิกดูสลิปโอนเงิน"
                          >
                            🧾 ดูสลิป
                          </button>
                        </div>
                      ) : (
                        ord.payment_method?.includes('โอน') && (
                          <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>(ยังไม่มีสลิป)</span>
                        )
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <strong style={{ color: '#2563EB' }}>{ord.items_count} รายการ</strong>
                    {ord.packed_items_count > 0 && (
                      <div style={{ fontSize: '11px', color: '#059669' }}>
                        (แพ็กแล้ว {ord.packed_items_count}/{ord.items_count})
                      </div>
                    )}
                  </td>
                  {role === 'admin' && (
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      ฿{Number(ord.total_amount || 0).toLocaleString()}
                    </td>
                  )}
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px' }}>
                    {ord.tracking_id ? (
                      <div>
                        <strong>{ord.tracking_id}</strong>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{ord.shipping_provider_name}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {getPackingBadge(ord.packing_status)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => handleOpenDetail(ord)}
                        title="ดูรายละเอียดสินค้าในออเดอร์"
                      >
                        <Eye size={14} /> ดู
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => handleOpenPackingSlip(ord.id)}
                        title="พิมพ์ใบแพ็กสินค้า"
                      >
                        <Printer size={14} /> ใบแพ็ก
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ORDER DETAIL MODAL */}
      {detailOrder && (
        <div className="modal-backdrop" onClick={() => setDetailOrder(null)} role="dialog" aria-modal="true">
          <div
            className="modal-content"
            style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} style={{ color: 'var(--brand-green)' }} />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                  รายละเอียดคำสั่งซื้อ: {detailOrder.platform_order_id}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setDetailOrder(null)} aria-label="ปิด">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ORDER SUMMARY CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
                <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>ข้อมูลผู้รับ</span>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{detailOrder.recipient_name || detailOrder.customer_name || '-'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{detailOrder.recipient_phone || detailOrder.customer_phone || '-'}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>ช่องทางชำระเงิน</span>
                  <div style={{ fontWeight: 600, marginTop: '2px', color: detailOrder.payment_method?.includes('โอน') ? '#15803d' : 'var(--ink)' }}>
                    {detailOrder.payment_method || ((detailOrder.platform === 'SG_Web' || detailOrder.platform === 'storefront') ? 'โอนเงินผ่านบัญชีธนาคาร' : 'TikTok Shop')}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ยอดสุทธิ: ฿{Number(detailOrder.total_amount || 0).toLocaleString()} {detailOrder.discount_amount ? `(ส่วนลด ฿${detailOrder.discount_amount})` : ''}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>สถานะการแพ็ก & จัดส่ง</span>
                  <div style={{ marginTop: '4px' }}>{getPackingBadge(detailOrder.packing_status)}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {detailOrder.delivery_option || detailOrder.shipping_provider_name || 'จัดส่งด่วนแบบปกติ'}
                  </div>
                </div>
              </div>

              {/* FULL SHIPPING ADDRESS CARD */}
              <div style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>ที่อยู่จัดส่งสินค้า</span>
                <div style={{ marginTop: '4px', lineHeight: 1.5, color: 'var(--ink)' }}>
                  {detailOrder.detail_address ? (
                    `${detailOrder.detail_address} ต.${detailOrder.subdistrict || ''} อ.${detailOrder.district || ''} จ.${detailOrder.province || ''} ${detailOrder.zipcode || ''}`
                  ) : (
                    detailOrder.customer_address || '-'
                  )}
                </div>
                {detailOrder.buyer_message && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#B45309', background: '#FEF3C7', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                    <strong>หมายเหตุถึงขนส่ง:</strong> {detailOrder.buyer_message}
                  </div>
                )}
              </div>

              {/* BANK TRANSFER SLIP PREVIEW CARD (R2) */}
              {detailOrder.slip_url && (
                <div style={{ padding: '14px 16px', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                      🧾 หลักฐานสลิปการโอนเงิน (Cloudflare R2)
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '11px', background: '#fff' }}
                      onClick={() => window.open(resolveImageUrl(detailOrder.slip_url), '_blank')}
                    >
                      เปิดภาพขนาดเต็มในแท็บใหม่
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                      src={resolveImageUrl(detailOrder.slip_url)}
                      alt="สลิปโอนเงิน"
                      style={{
                        width: '90px',
                        height: '90px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1.5px solid #86EFAC',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                      }}
                      onClick={() => setFullSlipUrl(resolveImageUrl(detailOrder.slip_url))}
                      title="คลิกเพื่อดูสลิปขนาดเต็ม"
                    />
                    <div style={{ fontSize: '12.5px', color: '#166534' }}>
                      <div style={{ fontWeight: 600 }}>แนบสลิปเรียบร้อยแล้ว (คลิกที่รูปเพื่อขยาย)</div>
                      <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '4px' }}>
                        ไฟล์ที่บันทึก: <code style={{ fontSize: '10.5px' }}>{detailOrder.slip_url}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STOCK DEDUCTION WORKFLOW (STEP 5) */}
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: detailOrder.stock_deducted_status === 'deducted' ? '#E8F5E9' : '#FFF3E0',
                  border: `1px solid ${detailOrder.stock_deducted_status === 'deducted' ? '#C8E6C9' : '#FFE0B2'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Boxes size={20} color={detailOrder.stock_deducted_status === 'deducted' ? '#2E7D32' : '#E65100'} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: detailOrder.stock_deducted_status === 'deducted' ? '#2E7D32' : '#E65100' }}>
                      สถานะตัดสต็อก: {detailOrder.stock_deducted_status === 'deducted' ? 'ตัดสต็อกเรียบร้อยแล้ว' : 'ยังไม่ได้ตัดสต็อก (รอการยืนยัน)'}
                    </div>
                    {detailOrder.stock_deducted_at && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        ตัดเมื่อ: {new Date(detailOrder.stock_deducted_at).toLocaleString('th-TH')} โดย {detailOrder.stock_deducted_by}
                      </div>
                    )}
                  </div>
                </div>
                {role === 'admin' && (
                  <div>
                    {detailOrder.stock_deducted_status !== 'deducted' ? (
                      <button
                        type="button"
                        disabled={deductLoading}
                        onClick={handleConfirmDeduct}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2D5A27',
                          color: '#FFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {deductLoading ? 'กำลังตัดสต็อก...' : 'ยืนยันตัดสต็อกคำสั่งซื้อ'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={deductLoading}
                        onClick={handleReverseDeduct}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CCC',
                          background: '#FFF',
                          color: '#C62828',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {deductLoading ? 'กำลังยกเลิก...' : 'ยกเลิกการตัดสต็อก (คืนของ)'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ITEMS TABLE (STRICT ONE ROW PER EXCEL LINE) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '14px' }}>รายการสินค้าในออเดอร์ (แยกบรรทัดตรงตาม Excel):</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    รวม {detailItems.length} รายการ
                  </span>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '30px' }}>#</th>
                        <th style={{ padding: '8px 10px', width: '50px' }}>รูป</th>
                        <th style={{ padding: '8px 10px' }}>ชื่อสินค้า</th>
                        <th style={{ padding: '8px 10px' }}>ตัวเลือก/หน่วย</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>จำนวน</th>
                        <th style={{ padding: '8px 10px' }}>Seller SKU</th>
                        <th style={{ padding: '8px 10px' }}>SG SKU</th>
                        {role === 'admin' && <th style={{ padding: '8px 10px', textAlign: 'right' }}>ราคา</th>}
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>สถานะแพ็ก</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailLoading ? (
                        <tr>
                          <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            กำลังโหลดรายการสินค้า...
                          </td>
                        </tr>
                      ) : (
                        detailItems.map((itm, idx) => (
                          <tr key={itm.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px' }}>
                              {itm.thumbnail_url ? (
                                <img
                                  src={itm.thumbnail_url}
                                  alt={itm.product_name}
                                  style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
                                />
                              ) : (
                                <div style={{ width: '38px', height: '38px', background: 'var(--surface-subtle)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                  <Package size={16} />
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ fontWeight: 600 }}>{itm.product_name}</div>
                              {itm.source_row_number > 0 && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  แถว Excel: {itm.source_row_number}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px' }}>{itm.variation || '-'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--brand-green)' }}>
                              {itm.quantity}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11.5px' }}>
                              {itm.seller_sku || '-'}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--brand-green)' }}>
                              {itm.sg_sku || '-'}
                            </td>
                            {role === 'admin' && (
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                ฿{Number(itm.subtotal || 0).toLocaleString()}
                              </td>
                            )}
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {itm.item_packing_status === 'packed' ? (
                                <span style={{ color: '#059669', fontWeight: 600 }}>✓ แพ็กแล้ว</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>รอแพ็ก</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleOpenPackingSlip(detailOrder.id)}
              >
                <Printer size={15} /> พิมพ์ใบแพ็กสินค้านี้
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setDetailOrder(null)}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ImportExcelModal
        role={role}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          loadOrders();
          if (onRefreshStats) onRefreshStats();
        }}
      />

      <ExportExcelModal
        role={role}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedOrderIds={selectedOrderIds}
      />

      <PackingSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        data={slipData}
      />

      {/* FULL SLIP IMAGE VIEWER MODAL */}
      {fullSlipUrl && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setFullSlipUrl(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              background: '#ffffff',
              borderRadius: '10px',
              padding: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                หลักฐานการโอนเงิน (สลิป)
              </span>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setFullSlipUrl(null)}
                style={{ padding: '4px' }}
                aria-label="ปิด"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={fullSlipUrl}
              alt="สลิปโอนเงินขนาดเต็ม"
              style={{
                maxWidth: '85vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
