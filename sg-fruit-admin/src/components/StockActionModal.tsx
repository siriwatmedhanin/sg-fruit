import React, { useState } from 'react';
import {
  X,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  AlertTriangle,
  RotateCcw,
  BellRing,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { AuthRole, InventoryItem } from '../types';
import {
  stockIn,
  stockOut,
  adjustStock,
  recordDamage,
  returnStock,
  updateThreshold,
} from '../services/api';

interface StockActionModalProps {
  item: InventoryItem | null;
  role: AuthRole;
  onClose: () => void;
  onSuccess: () => void;
}

type ActionTab = 'stock_in' | 'stock_out' | 'adjustment' | 'damage' | 'return' | 'threshold';

export const StockActionModal: React.FC<StockActionModalProps> = ({
  item,
  role,
  onClose,
  onSuccess,
}) => {
  if (!item) return null;

  const [activeTab, setActiveTab] = useState<ActionTab>('stock_in');
  const [quantity, setQuantity] = useState<number>(1);
  const [actualQuantity, setActualQuantity] = useState<number>(item.stock_quantity);
  const [threshold, setThreshold] = useState<number>(item.low_stock_threshold || 10);
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  // Preset reasons
  const stockInPresets = ['รับสินค้าเข้าประจำวัน', 'สั่งซื้อผลไม้เพิ่มพิเศษ', 'รับผลไม้หน้าสวน', 'อื่นๆ'];
  const stockOutPresets = ['เบิกส่งขายหน้าร้าน', 'นำไปแปรรูป/ชิม', 'แจกลูกค้าตัวอย่าง', 'อื่นๆ'];
  const adjustPresets = ['ตรวจนับสต็อกประจำสัปดาห์', 'ตรวจนับสต็อกสิ้นเดือน', 'แก้ไขข้อผิดพลาดการบันทึก', 'อื่นๆ'];
  const damagePresets = ['ผลไม้เน่าเสีย', 'ช้ำระหว่างขนส่ง', 'เปลือกแตก/แมลงเจาะ', 'หมดอายุ', 'อื่นๆ'];
  const returnPresets = ['ลูกค้าไม่รับพัสดุ สินค้ายังสมบูรณ์', 'พัสดุตีกลับตรวจรับแล้ว', 'ลูกค้ายกเลิกคำสั่งซื้อ', 'อื่นๆ'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('คุณไม่มีสิทธิ์ดำเนินการจัดการสต็อก (เฉพาะผู้ดูแลระบบเท่านั้น)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idempotencyKey = `manual-${activeTab}-${item.variant_id}-${Date.now()}`;

      if (activeTab === 'stock_in') {
        if (!quantity || quantity <= 0) throw new Error('กรุณาระบุจำนวนรับเข้ามากกว่า 0');
        const res = await stockIn(role, {
          variant_id: item.variant_id,
          quantity,
          reason: reason || 'รับสินค้าเข้าคลัง',
          note,
          idempotency_key: idempotencyKey,
        });
        setSuccessMessage(res.message || 'รับเข้าสินค้าสำเร็จ');
      } else if (activeTab === 'stock_out') {
        if (!quantity || quantity <= 0) throw new Error('กรุณาระบุจำนวนเบิกออกมากกว่า 0');
        if (quantity > item.stock_quantity) {
          throw new Error(`ยอดคงเหลือไม่เพียงพอ (คงเหลือ ${item.stock_quantity} หน่วย)`);
        }
        const res = await stockOut(role, {
          variant_id: item.variant_id,
          quantity,
          reason: reason || 'เบิกสินค้าออก',
          note,
          idempotency_key: idempotencyKey,
        });
        setSuccessMessage(res.message || 'เบิกสินค้าสำเร็จ');
      } else if (activeTab === 'adjustment') {
        if (actualQuantity < 0) throw new Error('ยอดตรวจนับจริงต้องไม่ติดลบ');
        const res = await adjustStock(role, {
          variant_id: item.variant_id,
          actual_quantity: actualQuantity,
          reason: reason || 'ตรวจนับสต็อกจริง',
          note,
          idempotency_key: idempotencyKey,
        });
        setSuccessMessage(res.message || 'ปรับยอดสต็อกสำเร็จ');
      } else if (activeTab === 'damage') {
        if (!quantity || quantity <= 0) throw new Error('กรุณาระบุจำนวนเสียหายมากกว่า 0');
        if (quantity > item.stock_quantity) {
          throw new Error(`ยอดคงเหลือไม่เพียงพอ (คงเหลือ ${item.stock_quantity} หน่วย)`);
        }
        const res = await recordDamage(role, {
          variant_id: item.variant_id,
          quantity,
          reason: reason || 'ผลไม้เสียหาย',
          note,
          idempotency_key: idempotencyKey,
        });
        setSuccessMessage(res.message || 'บันทึกสินค้าเสียหายสำเร็จ');
      } else if (activeTab === 'return') {
        if (!quantity || quantity <= 0) throw new Error('กรุณาระบุจำนวนคืนมากกว่า 0');
        const res = await returnStock(role, {
          variant_id: item.variant_id,
          quantity,
          reason: reason || 'สินค้าคืนตรวจรับแล้ว',
          note,
          idempotency_key: idempotencyKey,
        });
        setSuccessMessage(res.message || 'รับคืนสินค้าเข้าสต็อกสำเร็จ');
      } else if (activeTab === 'threshold') {
        if (threshold < 0) throw new Error('เกณฑ์แจ้งเตือนต้องไม่ติดลบ');
        const res = await updateThreshold(role, item.variant_id, threshold);
        setSuccessMessage(res.message || 'อัปเดตเกณฑ์แจ้งเตือนสำเร็จ');
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกสต็อก');
    } finally {
      setLoading(false);
    }
  };

  // Preview calculations
  let calculatedAfter = item.stock_quantity;
  if (activeTab === 'stock_in' || activeTab === 'return') {
    calculatedAfter = item.stock_quantity + (Number(quantity) || 0);
  } else if (activeTab === 'stock_out' || activeTab === 'damage') {
    calculatedAfter = item.stock_quantity - (Number(quantity) || 0);
  } else if (activeTab === 'adjustment') {
    calculatedAfter = Number(actualQuantity) || 0;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '95%', padding: '0', overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'var(--cream-light, #FDFBF7)',
            borderBottom: '1px solid var(--border-soft, #E5DEC9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#E8F5E9',
                color: '#2E7D32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
              }}
            >
              📦
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink, #2D3A2F)' }}>
                จัดการสต็อกสินค้า
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                {item.product_name} • SKU: <strong>{item.sku}</strong> ({item.unit})
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

        {/* Tab Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            background: '#F5F1E8',
            borderBottom: '1px solid #E5DEC9',
            padding: '4px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab('stock_in'); setError(null); }}
            style={{
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: activeTab === 'stock_in' ? 700 : 500,
              background: activeTab === 'stock_in' ? '#fff' : 'transparent',
              color: activeTab === 'stock_in' ? '#2E7D32' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <PackagePlus size={16} />
            รับเข้า
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('stock_out'); setError(null); }}
            style={{
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: activeTab === 'stock_out' ? 700 : 500,
              background: activeTab === 'stock_out' ? '#fff' : 'transparent',
              color: activeTab === 'stock_out' ? '#1565C0' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <PackageMinus size={16} />
            เบิกออก
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('adjustment'); setError(null); }}
            style={{
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: activeTab === 'adjustment' ? 700 : 500,
              background: activeTab === 'adjustment' ? '#fff' : 'transparent',
              color: activeTab === 'adjustment' ? '#E65100' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <SlidersHorizontal size={16} />
            ปรับยอด
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('damage'); setError(null); }}
            style={{
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: activeTab === 'damage' ? 700 : 500,
              background: activeTab === 'damage' ? '#fff' : 'transparent',
              color: activeTab === 'damage' ? '#C62828' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <AlertTriangle size={16} />
            เสียหาย
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('return'); setError(null); }}
            style={{
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: activeTab === 'return' ? 700 : 500,
              background: activeTab === 'return' ? '#fff' : 'transparent',
              color: activeTab === 'return' ? '#6A1B9A' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={16} />
            สินค้าคืน
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('threshold'); setError(null); }}
            style={{
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: activeTab === 'threshold' ? 700 : 500,
              background: activeTab === 'threshold' ? '#fff' : 'transparent',
              color: activeTab === 'threshold' ? '#455A64' : '#555',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <BellRing size={16} />
            เตือนขั้นต่ำ
          </button>
        </div>

        {/* Current Stock Banner */}
        <div
          style={{
            padding: '12px 24px',
            background: '#FAF6EE',
            borderBottom: '1px solid #E5DEC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '13px', color: '#666' }}>ยอดคงเหลือเดิม:</span>
            <strong style={{ marginLeft: '6px', fontSize: '16px', color: '#2D3A2F' }}>
              {item.stock_quantity} {item.unit}
            </strong>
          </div>
          {activeTab !== 'threshold' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRight size={16} color="#888" />
              <span style={{ fontSize: '13px', color: '#666' }}>ยอดคงเหลือใหม่:</span>
              <strong
                style={{
                  fontSize: '16px',
                  color: calculatedAfter < 0 ? '#C62828' : '#2E7D32',
                }}
              >
                {calculatedAfter} {item.unit}
              </strong>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#FFEBEE',
                color: '#C62828',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13.5px',
              }}
            >
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#E8F5E9',
                color: '#2E7D32',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13.5px',
              }}
            >
              <CheckCircle2 size={18} />
              {successMessage}
            </div>
          )}

          {/* QUANTITY INPUT */}
          {activeTab !== 'adjustment' && activeTab !== 'threshold' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>
                จำนวน {activeTab === 'stock_in' ? 'รับเข้า' : activeTab === 'stock_out' ? 'เบิกออก' : activeTab === 'damage' ? 'เสียหาย' : 'คืนเข้าสต็อก'} ({item.unit}) <span style={{ color: '#C62828' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max={activeTab === 'stock_out' || activeTab === 'damage' ? item.stock_quantity : undefined}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CCC',
                  fontSize: '15px',
                }}
              />
            </div>
          )}

          {/* ADJUSTMENT ACTUAL COUNT */}
          {activeTab === 'adjustment' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>
                ยอดตรวจนับได้จริง ({item.unit}) <span style={{ color: '#C62828' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CCC',
                  fontSize: '15px',
                }}
              />
              <div style={{ fontSize: '12.5px', color: '#666', marginTop: '4px' }}>
                ส่วนต่างสต็อก: {actualQuantity - item.stock_quantity > 0 ? '+' : ''}
                {actualQuantity - item.stock_quantity} {item.unit}
              </div>
            </div>
          )}

          {/* THRESHOLD INPUT */}
          {activeTab === 'threshold' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>
                จำนวนแจ้งเตือนสต็อกขั้นต่ำ (Low Stock Threshold) <span style={{ color: '#C62828' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CCC',
                  fontSize: '15px',
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                เมื่อสต็อกคงเหลือเท่ากับหรือน้อยกว่าจำนวนนี้ ระบบจะแสดงสถานะ "ใกล้หมด (Low Stock)"
              </p>
            </div>
          )}

          {/* REASON PRESETS & INPUT */}
          {activeTab !== 'threshold' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>
                สาเหตุ / เหตุผล
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {(activeTab === 'stock_in'
                  ? stockInPresets
                  : activeTab === 'stock_out'
                  ? stockOutPresets
                  : activeTab === 'adjustment'
                  ? adjustPresets
                  : activeTab === 'damage'
                  ? damagePresets
                  : returnPresets
                ).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setReason(p === 'อื่นๆ' ? '' : p)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: reason === p ? '1px solid #2E7D32' : '1px solid #DDD',
                      background: reason === p ? '#E8F5E9' : '#FFF',
                      color: reason === p ? '#2E7D32' : '#555',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="ระบุสาเหตุหรือเลือกจากตัวเลือกด้านบน"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CCC',
                  fontSize: '14px',
                }}
              />
            </div>
          )}

          {/* NOTE */}
          {activeTab !== 'threshold' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows={2}
                placeholder="รายละเอียดเพิ่มเติมสำหรับ Audit Trail..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CCC',
                  fontSize: '13.5px',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
              />
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 16px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                background: '#FFF',
                color: '#555',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || calculatedAfter < 0}
              style={{
                padding: '9px 20px',
                borderRadius: '6px',
                border: 'none',
                background: calculatedAfter < 0 ? '#999' : '#2D5A27',
                color: '#FFF',
                cursor: calculatedAfter < 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
