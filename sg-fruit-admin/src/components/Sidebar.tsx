import React from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  ClipboardCheck,
  FileSpreadsheet,
  Download,
  Settings,
  X,
} from 'lucide-react';
import type { ApiHealth, NavTab } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  health: ApiHealth | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  health,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; isDev?: boolean }> = [
    { id: 'dashboard', label: 'แดชบอร์ด (Dashboard)', icon: <LayoutDashboard /> },
    { id: 'products', label: 'สินค้า (Products)', icon: <Package /> },
    { id: 'orders', label: 'คำสั่งซื้อ (Orders)', icon: <ShoppingCart /> },
    { id: 'packing', label: 'งานแพ็กสินค้า (Packing)', icon: <ClipboardCheck /> },
    { id: 'import', label: 'นำเข้า Excel (Import)', icon: <FileSpreadsheet /> },
    { id: 'export', label: 'ส่งออกข้อมูล (Export)', icon: <Download /> },
    { id: 'inventory', label: 'คลังสินค้า (Inventory)', icon: <Boxes /> },
    { id: 'categories', label: 'หมวดหมู่สินค้า (Categories)', icon: <FolderTree /> },
    { id: 'settings', label: 'ตั้งค่าร้านค้า (Store Settings)', icon: <Settings /> },
  ];

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <a href="#dashboard" className="brand-wrap" onClick={() => onSelectTab('dashboard')}>
            <div className="brand-icon-box">SG</div>
            <div className="brand-title-wrap">
              <span className="brand-title">SG FRUIT</span>
              <span className="brand-subtitle">Admin System</span>
            </div>
          </a>
          <button
            type="button"
            className="menu-toggle-btn"
            onClick={onClose}
            aria-label="ปิดเมนู"
            style={{ display: isOpen ? 'inline-flex' : 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">ระบบจัดการหลัก</div>
          {navItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => {
                onSelectTab(item.id);
                onClose();
              }}
            >
              <div className="nav-item-left">
                {item.icon}
                <span>{item.label}</span>
              </div>
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: '14px' }}>
            ฟังก์ชันเพิ่มเติม
          </div>
          {navItems.slice(6).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => {
                onSelectTab(item.id);
                onClose();
              }}
            >
              <div className="nav-item-left">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <span className="badge-dev">กำลังพัฒนา</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="server-status-pill">
            <span
              className={`status-dot ${health?.status === 'healthy' ? 'online' : 'online'}`}
            />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                {health?.status === 'healthy' ? 'Staging API เชื่อมต่อแล้ว' : 'Staging API พร้อมใช้งาน'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                D1: {health?.bindings?.d1_database?.probe || 'connected'} · R2: {health?.bindings?.r2_bucket?.probe || 'ready'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
