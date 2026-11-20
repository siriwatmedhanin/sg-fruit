import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { OrdersView } from './components/OrdersView';
import { PackingView } from './components/PackingView';
import { InventoryView } from './views/InventoryView';
import { CategoriesView } from './components/CategoriesView';
import { SiteProfileView } from './components/SiteProfileView';
import { UnderDevelopmentView } from './components/UnderDevelopmentView';
import {
  fetchHealth,
  fetchAdminCategories,
  fetchAdminProducts,
  fetchAdminOrders,
  fetchAdminPacking,
} from './services/api';
import type { ApiHealth, AuthRole, Category, NavTab, ProductVariantRow } from './types';
import { ShieldAlert } from 'lucide-react';
import './styles/admin.css';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [role, setRole] = useState<AuthRole>('admin');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [products, setProducts] = useState<ProductVariantRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [packingCount, setPackingCount] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedMessage, setUnauthorizedMessage] = useState<string | null>(null);

  // Load health check
  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err: any) {
      console.warn('Backend health check failed:', err.message);
      setHealth(null);
    }
  }, []);

  // Load admin data based on role
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorizedMessage(null);

    // If unauthenticated role is chosen, demonstrate 401 rejection from Backend
    if (role === 'unauthenticated') {
      try {
        await fetchAdminProducts(role);
      } catch (err: any) {
        setUnauthorizedMessage(
          'HTTP 401 Unauthorized (AUTH_TOKEN_REQUIRED): ต้องเข้าสู่ระบบผ่าน Cloudflare Access (Production Login ยังไม่พร้อมในเครื่อง)'
        );
        setProducts([]);
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Fetch Categories
      try {
        const catRes = await fetchAdminCategories(role);
        if (catRes.ok && Array.isArray(catRes.data)) {
          setCategories(catRes.data);
        }
      } catch {
        // Fallback categories if categories query fails
      }

      // 2. Fetch Products
      const prodRes = await fetchAdminProducts(role);
      if (prodRes.ok) {
        setProducts(prodRes.data || []);
      }

      // 3. Fetch Orders (to check real data availability)
      try {
        const orderRes = await fetchAdminOrders(role);
        if (orderRes.ok && Array.isArray(orderRes.data)) {
          setOrdersCount(orderRes.data.length);
        } else {
          setOrdersCount(null);
        }
      } catch {
        setOrdersCount(null); // Real data not available -> Empty state
      }

      // 4. Fetch Packing
      try {
        const packRes = await fetchAdminPacking(role);
        if (packRes.ok && Array.isArray(packRes.data)) {
          setPackingCount(packRes.data.length);
        } else {
          setPackingCount(null);
        }
      } catch {
        setPackingCount(null); // Real data not available -> Empty state
      }
    } catch (err: any) {
      if (err.status === 401 || err.code === 'AUTH_TOKEN_REQUIRED' || err.code === 'AUTH_ISSUER_MISMATCH') {
        setUnauthorizedMessage(
          `HTTP 401 Unauthorized: ${err.message || 'ไม่มีสิทธิ์เข้าถึง (ต้องใช้ Cloudflare Access)'}`
        );
      } else if (err.status === 403 || err.code === 'AUTH_INSUFFICIENT_PERMISSIONS') {
        setUnauthorizedMessage(
          `HTTP 403 Forbidden: สิทธิ์ ${role} ไม่เพียงพอสำหรับการจัดการสินค้านี้`
        );
      } else {
        setError(err.message || 'ไม่สามารถติดต่อ Backend ได้');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        health={health}
      />

      {/* MAIN CONTENT AREA */}
      <div className="main-wrapper">
        <Header
          currentTab={currentTab}
          role={role}
          onChangeRole={(newRole) => {
            setRole(newRole);
          }}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="content-body">
          {/* UNAUTHORIZED / 401 / 403 BANNER */}
          {unauthorizedMessage && (
            <div className="banner-error">
              <ShieldAlert size={22} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '14.5px' }}>การปฏิเสธการเข้าถึงจาก Backend:</strong>
                <p style={{ marginTop: 4 }}>{unauthorizedMessage}</p>
                <div
                  style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    color: 'var(--ink)',
                  }}
                >
                  🔒 <strong>หมายเหตุความปลอดภัย:</strong> ในโหมด Production ผู้ใช้งานจะต้องยืนยันตัวตนผ่าน
                  Cloudflare Access (JWT Assertion) และมี Email Domain ที่ได้รับอนุญาตเท่านั้น
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENTS */}
          {currentTab === 'dashboard' && (
            <DashboardView
              products={products}
              loading={loading}
              health={health}
              ordersCount={ordersCount}
              packingCount={packingCount}
            />
          )}

          {currentTab === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              role={role}
              loading={loading}
              error={error}
              onRefresh={loadData}
            />
          )}

          {(currentTab === 'orders' || currentTab === 'import' || currentTab === 'export') && (
            <OrdersView
              role={role}
              onRefreshStats={loadData}
            />
          )}

          {currentTab === 'packing' && (
            <PackingView
              role={role}
              onRefreshStats={loadData}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              role={role}
              categories={categories}
              onRefreshStats={loadData}
            />
          )}

          {currentTab === 'categories' && (
            <CategoriesView
              categories={categories}
              role={role}
              loading={loading}
              error={error}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'settings' && (
            <SiteProfileView
              role={role}
              onRefresh={loadData}
            />
          )}

          {currentTab !== 'dashboard' &&
            currentTab !== 'products' &&
            currentTab !== 'orders' &&
            currentTab !== 'packing' &&
            currentTab !== 'import' &&
            currentTab !== 'export' &&
            currentTab !== 'inventory' &&
            currentTab !== 'categories' &&
            currentTab !== 'settings' && (
              <UnderDevelopmentView tab={currentTab} />
            )}
        </main>
      </div>
    </div>
  );
};
