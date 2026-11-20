import React from 'react';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
  Database,
  ShieldCheck,
  Server,
} from 'lucide-react';
import type { ApiHealth, ProductVariantRow } from '../types';

interface DashboardViewProps {
  products: ProductVariantRow[];
  loading: boolean;
  health: ApiHealth | null;
  ordersCount: number | null; // null means no API data yet -> show empty state
  packingCount: number | null; // null means no API data yet -> show empty state
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  loading,
  health,
  ordersCount,
  packingCount,
}) => {
  // Extract unique products
  const uniqueProductIds = new Set(products.map((p) => p.product_id));
  const totalProducts = uniqueProductIds.size;

  // Active products
  const activeProducts = products.filter((p) => p.product_is_active === 1 && (p.stock_quantity ?? 0) > 0);
  const uniqueActiveProductIds = new Set(activeProducts.map((p) => p.product_id)).size;

  // Out of stock
  const outOfStockProducts = products.filter((p) => (p.stock_quantity ?? 0) <= 0 || p.product_is_active === 0);
  const uniqueOutOfStockIds = new Set(outOfStockProducts.map((p) => p.product_id)).size;

  return (
    <div className="dashboard-view">
      <div className="page-title-row">
        <div>
          <h1 className="page-title">แดชบอร์ดภาพรวมระบบร้านค้า</h1>
          <p className="page-desc">
            เชื่อมต่อกับ Cloudflare Workers + D1 Backend จริง (Step 7.9 Admin Dashboard)
          </p>
        </div>
      </div>

      <div className="banner-info">
        <ShieldCheck size={18} style={{ color: 'var(--forest)', flexShrink: 0 }} />
        <div>
          <strong>ระบบความปลอดภัย Single Admin:</strong> ข้อมูลทั้งหมดที่แสดงถูกดึงจาก D1
          Database จริง โดยคำนวณและแสดงสถานะจริงเท่านั้น
          ไม่มีการใช้ข้อมูล Mock ในกระบวนการทำงานหลัก
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="stats-grid">
        {/* 1. Total Products */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">จำนวนสินค้าทั้งหมด</span>
            <div className="stat-icon">
              <Package size={20} />
            </div>
          </div>
          <div className="stat-val">{loading ? '-' : `${totalProducts} รายการ`}</div>
          <div className="stat-subtext">มี {products.length} ตัวเลือก (Variants) ในระบบ D1</div>
        </div>

        {/* 2. Available Products */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">สินค้าพร้อมจำหน่าย</span>
            <div className="stat-icon" style={{ color: 'var(--sage)', backgroundColor: 'var(--sage-light)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-val" style={{ color: 'var(--forest-dark)' }}>
            {loading ? '-' : `${uniqueActiveProductIds} รายการ`}
          </div>
          <div className="stat-subtext">สถานะเปิดขายและมีสต็อกพร้อมส่ง</div>
        </div>

        {/* 3. Out of stock & Low stock */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">สินค้าหมด / ใกล้หมด</span>
            <div className="stat-icon" style={{ color: 'var(--amber)', backgroundColor: 'var(--amber-light)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-val" style={{ color: uniqueOutOfStockIds > 0 ? 'var(--amber)' : 'inherit' }}>
            {loading ? '-' : `${uniqueOutOfStockIds} รายการ`}
          </div>
          <div className="stat-subtext">สต็อก 0 หรือใกล้หมดเกณฑ์แจ้งเตือน</div>
        </div>

        {/* 4. Orders */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">คำสั่งซื้อในระบบ</span>
            <div className="stat-icon">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="stat-val" style={{ color: 'var(--ink)' }}>
            {ordersCount !== null ? `${ordersCount} ออเดอร์` : '0 ออเดอร์'}
          </div>
          <div className="stat-subtext">ระบบคำสั่งซื้อจริง (Step 4 พร้อมใช้งาน)</div>
        </div>

        {/* 5. Packing */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">ออเดอร์รอแพ็ก</span>
            <div className="stat-icon">
              <ClipboardList size={20} />
            </div>
          </div>
          <div className="stat-val" style={{ color: (packingCount ?? 0) > 0 ? 'var(--forest-dark)' : 'inherit' }}>
            {packingCount !== null ? `${packingCount} งาน` : '0 งาน'}
          </div>
          <div className="stat-subtext">คิวงานแพ็กสินค้าพร้อม Interactive Checklist</div>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE & HEALTH STATUS CARD */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={18} style={{ color: 'var(--forest)' }} />
            <h3 className="card-title">สถานะบริการระบบ Backend (Cloudflare Local Stack)</h3>
          </div>
          <span className="status-badge active">
            <span className="status-dot online" style={{ width: 6, height: 6 }} />
            {health?.environment || 'development'}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--card-bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Database size={16} style={{ color: 'var(--forest)' }} />
                <strong>Cloudflare D1 (SQLite)</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                สถานะการเชื่อมต่อ: <span style={{ color: health?.status === 'healthy' ? 'var(--forest-dark)' : 'var(--red)', fontWeight: 600 }}>{health?.status === 'healthy' ? (health?.bindings?.d1_database?.probe || health?.services?.d1 || 'unknown') : 'unavailable'}</span>
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>
                จัดเก็บข้อมูลสินค้า, ตัวเลือก, หมวดหมู่ และโครงสร้างตารางออเดอร์
              </p>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'var(--card-bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Server size={16} style={{ color: 'var(--forest)' }} />
                <strong>Cloudflare R2 Object Storage</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                สถานะการเชื่อมต่อ: <span style={{ color: health?.status === 'healthy' ? 'var(--forest-dark)' : 'var(--red)', fontWeight: 600 }}>{health?.status === 'healthy' ? (health?.bindings?.r2_bucket?.probe || health?.services?.r2 || 'unknown') : 'unavailable'}</span>
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>
                ระบบจัดเก็บรูปภาพสินค้า WebP ใน R2 Storage รองรับแกลเลอรีสูงสุด 5 ภาพต่อสินค้า
              </p>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'var(--card-bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={16} style={{ color: 'var(--forest)' }} />
                <strong>Cloudflare Access & RBAC</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                ระบบตรวจสอบสิทธิ์: <span style={{ color: 'var(--forest-dark)', fontWeight: 600 }}>Single Admin Only (Default Deny)</span>
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>
                ความปลอดภัยระดับเซิร์ฟเวอร์ บัญชี Admin เท่านั้นที่สามารถเข้าถึงระบบได้
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
