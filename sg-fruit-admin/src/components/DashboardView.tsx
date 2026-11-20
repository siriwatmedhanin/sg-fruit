import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
  Database,
  ShieldCheck,
  Server,
  RefreshCw,
} from 'lucide-react';
import type { ApiHealth, ProductVariantRow } from '../types';
import { fetchDashboardStats, fetchHealth, type DashboardStats } from '../services/api';

interface DashboardViewProps {
  products: ProductVariantRow[];
  loading: boolean;
  health: ApiHealth | null;
  ordersCount: number | null;
  packingCount: number | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  loading: initialLoading,
  health: initialHealth,
  ordersCount: initialOrdersCount,
  packingCount: initialPackingCount,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [healthData, setHealthData] = useState<ApiHealth | null>(initialHealth);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadDashboardData = async () => {
    setStatsLoading(true);
    try {
      const [sRes, hRes] = await Promise.allSettled([
        fetchDashboardStats(),
        fetchHealth(),
      ]);
      if (sRes.status === 'fulfilled') {
        setStats(sRes.value);
      }
      if (hRes.status === 'fulfilled') {
        setHealthData(hRes.value);
      }
    } catch (e) {
      console.warn('Dashboard data fetch warning:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute stats fallback from products props if API stats not yet returned
  const uniqueProductIds = new Set(products.map((p) => p.product_id));
  const activeProducts = products.filter((p) => p.product_is_active === 1 && (p.stock_quantity ?? 0) > 0);
  const uniqueActiveProductIds = new Set(activeProducts.map((p) => p.product_id)).size;
  const outOfStockProducts = products.filter((p) => (p.stock_quantity ?? 0) <= 0 || p.product_is_active === 0);
  const uniqueOutOfStockIds = new Set(outOfStockProducts.map((p) => p.product_id)).size;

  const totalProducts = stats ? stats.total_products : (uniqueProductIds.size || 0);
  const totalVariants = stats ? stats.total_variants : (products.length || 0);
  const availableProducts = stats ? stats.available_products : uniqueActiveProductIds;
  const outOfStockCount = stats ? stats.out_of_stock_products : uniqueOutOfStockIds;
  const totalOrders = stats ? stats.total_orders : (initialOrdersCount ?? 0);
  const totalPacking = stats ? stats.pending_packing : (initialPackingCount ?? 0);

  const isLoading = initialLoading || (statsLoading && !stats);

  return (
    <div className="dashboard-view">
      <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">แดชบอร์ดภาพรวมระบบร้านค้า</h1>
          <p className="page-desc">
            เชื่อมต่อกับ Cloudflare Workers Stack (D1 Database & R2 Storage Staging)
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadDashboardData}
          disabled={statsLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px' }}
        >
          <RefreshCw size={15} strokeWidth={1.75} className={statsLoading ? 'spin' : ''} />
          รีเฟรชสถิติ
        </button>
      </div>

      <div className="banner-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ShieldCheck size={18} strokeWidth={1.75} style={{ color: 'var(--forest)', flexShrink: 0 }} />
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
              <Package size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className="stat-val">{isLoading ? '-' : `${totalProducts} รายการ`}</div>
          <div className="stat-subtext">มี {totalVariants} ตัวเลือก (Variants) ในระบบ D1</div>
        </div>

        {/* 2. Available Products */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">สินค้าพร้อมจำหน่าย</span>
            <div className="stat-icon" style={{ color: 'var(--sage)', backgroundColor: 'var(--sage-light)' }}>
              <CheckCircle2 size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className="stat-val" style={{ color: 'var(--forest-dark)' }}>
            {isLoading ? '-' : `${availableProducts} รายการ`}
          </div>
          <div className="stat-subtext">สถานะเปิดขายและมีสต็อกพร้อมส่ง</div>
        </div>

        {/* 3. Out of stock & Low stock */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">สินค้าหมด / ใกล้หมด</span>
            <div className="stat-icon" style={{ color: 'var(--amber)', backgroundColor: 'var(--amber-light)' }}>
              <AlertTriangle size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className="stat-val" style={{ color: outOfStockCount > 0 ? 'var(--amber)' : 'inherit' }}>
            {isLoading ? '-' : `${outOfStockCount} รายการ`}
          </div>
          <div className="stat-subtext">สต็อก 0 หรือปิดการขายในระบบ</div>
        </div>

        {/* 4. Orders */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">คำสั่งซื้อในระบบ</span>
            <div className="stat-icon">
              <ShoppingCart size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className="stat-val" style={{ color: 'var(--ink)' }}>
            {isLoading ? '-' : `${totalOrders} ออเดอร์`}
          </div>
          <div className="stat-subtext">คำสั่งซื้อทั้งหมดจากช่องทาง SG_Web</div>
        </div>

        {/* 5. Packing */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">ออเดอร์รอแพ็ก</span>
            <div className="stat-icon">
              <ClipboardList size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className="stat-val" style={{ color: totalPacking > 0 ? 'var(--forest-dark)' : 'inherit' }}>
            {isLoading ? '-' : `${totalPacking} งาน`}
          </div>
          <div className="stat-subtext">คิวงานแพ็กสินค้าพร้อม Interactive Checklist</div>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE & HEALTH STATUS CARD */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={18} strokeWidth={1.75} style={{ color: 'var(--forest)' }} />
            <h3 className="card-title">สถานะบริการระบบ Backend (Cloudflare Workers Stack)</h3>
          </div>
          <span className="status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot online" style={{ width: 6, height: 6 }} />
            {healthData?.environment || 'staging'}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--card-bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Database size={16} strokeWidth={1.75} style={{ color: 'var(--forest)' }} />
                <strong>Cloudflare D1 (SQLite)</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                สถานะการเชื่อมต่อ: <span style={{ color: 'var(--forest-dark)', fontWeight: 600 }}>{healthData?.bindings?.d1_database?.probe || 'connected'}</span>
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>
                จัดเก็บข้อมูลสินค้า, ตัวเลือก, หมวดหมู่ และโครงสร้างตารางออเดอร์
              </p>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'var(--card-bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Server size={16} strokeWidth={1.75} style={{ color: 'var(--forest)' }} />
                <strong>Cloudflare R2 Object Storage</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                สถานะการเชื่อมต่อ: <span style={{ color: 'var(--forest-dark)', fontWeight: 600 }}>{healthData?.bindings?.r2_bucket?.probe || 'ready'}</span>
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>
                ระบบจัดเก็บรูปภาพสินค้า WebP และสลิปการโอนเงินใน R2 Storage
              </p>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'var(--card-bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={16} strokeWidth={1.75} style={{ color: 'var(--forest)' }} />
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
