import React from 'react';
import { Menu, Shield, User } from 'lucide-react';
import type { AuthRole, NavTab } from '../types';

interface HeaderProps {
  currentTab: NavTab;
  role: AuthRole;
  onChangeRole: (newRole: AuthRole) => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  role,
  onChangeRole,
  onOpenMobileMenu,
}) => {
  const tabTitles: Record<NavTab, string> = {
    dashboard: 'แดชบอร์ดภาพรวม',
    products: 'รายการสินค้า (Read-only)',
    categories: 'จัดการหมวดหมู่สินค้า',
    inventory: 'ตรวจสอบคลังสินค้า',
    orders: 'รายการคำสั่งซื้อ',
    packing: 'ระบบจัดเตรียมและแพ็กสินค้า',
    import: 'นำเข้าข้อมูลสินค้าผ่าน Excel',
    export: 'ส่งออกข้อมูลสินค้าและออเดอร์',
    settings: 'การตั้งค่าระบบร้านค้า',
  };

  return (
    <header className="header">
      <div className="header-left">
        <button
          type="button"
          className="menu-toggle-btn"
          onClick={onOpenMobileMenu}
          aria-label="เปิดเมนูนำทาง"
        >
          <Menu size={20} />
        </button>
        <div className="breadcrumbs">
          <span>SG FRUIT Admin</span>
          <span>/</span>
          <span className="breadcrumbs-current">{tabTitles[currentTab]}</span>
        </div>
      </div>

      <div className="header-right">
        {import.meta.env.DEV && (
          <div className="env-tag" title="ทำงานในโหมดจำลอง Workers + D1 ภายในเครื่อง">
            <span className="status-dot online" style={{ width: 6, height: 6 }} />
            <span>Local Dev Mode</span>
          </div>
        )}

        {import.meta.env.DEV && (
          <div className="role-switcher-wrap" title="สลับสิทธิ์เพื่อทดสอบ RBAC & Backend Auth">
            <Shield size={14} style={{ color: 'var(--forest)' }} />
            <span className="role-label">สิทธิ์ทดสอบ:</span>
            <select
              className="role-select"
              value={role}
              onChange={(e) => onChangeRole(e.target.value as AuthRole)}
              aria-label="เลือกสิทธิ์ผู้ใช้งานสำหรับการทดสอบ"
            >
              <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              <option value="unauthenticated">Unauthenticated (ไม่มีสิทธิ์ / Default Deny)</option>
            </select>
            <User size={14} style={{ color: 'var(--muted)', marginLeft: 4 }} />
          </div>
        )}
      </div>
    </header>
  );
};
