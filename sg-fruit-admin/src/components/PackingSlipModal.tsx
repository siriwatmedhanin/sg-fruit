import React from 'react';
import { X, Printer, MapPin, Phone, Truck } from 'lucide-react';
import type { PackingSlipData } from '../types';

interface PackingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PackingSlipData | null;
}

export const PackingSlipModal: React.FC<PackingSlipModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const { order, items, printed_at } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content packing-slip-modal"
        style={{ maxWidth: '750px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL ACTIONS BAR (HIDDEN IN PRINT) */}
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={20} style={{ color: 'var(--brand-green)' }} />
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
              ใบจัดของและแพ็กสินค้า (Packing Slip)
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ fontSize: '13px', padding: '6px 14px' }}>
              <Printer size={16} /> สั่งพิมพ์ (Print)
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="ปิด">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE SLIP BODY */}
        <div className="printable-slip-area" style={{ padding: '24px', background: '#FFFFFF', color: '#111827', fontFamily: 'sans-serif' }}>
          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#166534' }}>
                SG FRUIT (เอสจี ผลไม้ตามฤดูกาล)
              </h2>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>
                ใบแพ็กสินค้าและตรวจนับออเดอร์ (Packing Slip)
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>
                {order.order_no || order.platform_order_id}
              </div>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>
                พิมพ์เมื่อ: {new Date(printed_at).toLocaleString('th-TH')}
              </span>
            </div>
          </div>

          {/* META INFO GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '18px', fontSize: '13px' }}>
            {/* RECIPIENT & ADDRESS */}
            <div style={{ border: '1px solid #E5E7EB', padding: '12px', borderRadius: '4px', background: '#F9FAFB' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={15} /> ข้อมูลผู้รับสินค้า:
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{order.recipient_name || 'ไม่ระบุชื่อ'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Phone size={13} /> {order.recipient_phone || '-'}
              </div>
              <div style={{ marginTop: '6px', color: '#374151', lineHeight: '1.4' }}>
                {order.detail_address || ''} {order.subdistrict || ''} {order.district || ''} {order.province || ''} {order.zipcode || ''}
              </div>
            </div>

            {/* LOGISTICS & PLATFORM */}
            <div style={{ border: '1px solid #E5E7EB', padding: '12px', borderRadius: '4px', background: '#F9FAFB' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Truck size={15} /> ข้อมูลจัดส่ง:
              </div>
              <div><strong>แพลตฟอร์ม:</strong> TikTok Shop</div>
              <div><strong>Order ID:</strong> <span style={{ fontFamily: 'monospace' }}>{order.platform_order_id}</span></div>
              <div><strong>ขนส่ง:</strong> {order.shipping_provider_name || 'J&T Express'}</div>
              <div><strong>Tracking ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{order.tracking_id || 'ยังไม่มี Tracking'}</span></div>
              {order.platform_created_at && (
                <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px' }}>
                  สั่งซื้อเมื่อ: {order.platform_created_at}
                </div>
              )}
            </div>
          </div>

          {/* BUYER / SELLER NOTES */}
          {(order.buyer_message || order.seller_note) && (
            <div style={{ border: '1px dashed #D97706', padding: '8px 12px', background: '#FFFBEB', borderRadius: '4px', marginBottom: '16px', fontSize: '12px', color: '#92400E' }}>
              {order.buyer_message && <div><strong>ข้อความจากลูกค้า:</strong> {order.buyer_message}</div>}
              {order.seller_note && <div><strong>หมายเหตุผู้ขาย:</strong> {order.seller_note}</div>}
            </div>
          )}

          {/* ITEMS CHECKLIST TABLE */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '13.5px' }}>รายการสินค้าที่ต้องจัดส่ง (แยกแถวตรงตามออเดอร์ต้นฉบับ):</strong>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>รวม {items.length} รายการ</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F3F4F6', borderTop: '1px solid #D1D5DB', borderBottom: '2px solid #9CA3AF', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', width: '38px', textAlign: 'center' }}>ตรวจ</th>
                  <th style={{ padding: '8px 6px', width: '32px' }}>#</th>
                  <th style={{ padding: '8px 10px' }}>ชื่อสินค้าและรายละเอียด</th>
                  <th style={{ padding: '8px 10px', width: '120px' }}>ตัวเลือก/หน่วย</th>
                  <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center' }}>จำนวน</th>
                  <th style={{ padding: '8px 10px', width: '110px' }}>SKU / รหัสสินค้า</th>
                </tr>
              </thead>
              <tbody>
                {items.map((itm, idx) => (
                  <tr key={itm.id || idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ width: '18px', height: '18px', border: '1.5px solid #374151', borderRadius: '2px', display: 'inline-block' }}></div>
                    </td>
                    <td style={{ padding: '8px 6px', color: '#6B7280', fontSize: '12px' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600 }}>{itm.product_name}</div>
                      {itm.source_row_number > 0 && (
                        <span style={{ fontSize: '10.5px', color: '#9CA3AF' }}>แถว Excel: {itm.source_row_number}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{itm.variation || '-'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: '14px', color: '#166534' }}>
                      {itm.quantity}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', fontFamily: 'monospace' }}>
                      {itm.sg_sku ? (
                        <div><strong style={{ color: '#166534' }}>{itm.sg_sku}</strong></div>
                      ) : null}
                      <span style={{ color: '#6B7280' }}>{itm.seller_sku || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SIGNATURE / PACKER VERIFICATION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: '16px', marginTop: '20px', fontSize: '12px' }}>
            <div>
              <div>สถานะการแพ็ก: <strong>{order.packing_status === 'packed' ? 'แพ็กเสร็จแล้ว' : 'อยู่ระหว่างจัดของ'}</strong></div>
              <div style={{ marginTop: '4px', color: '#6B7280' }}>* ห้ามรวมยอดสินค้าข้ามออเดอร์เด็ดขาด</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '160px', borderBottom: '1px solid #111827', marginBottom: '4px' }}></div>
              <span>ลายเซ็นผู้จัดของ / ผู้ตรวจนับ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
