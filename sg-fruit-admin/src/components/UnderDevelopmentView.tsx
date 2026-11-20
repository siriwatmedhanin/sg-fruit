import React from 'react';
import {
  FolderTree,
  Boxes,
  ShoppingCart,
  ClipboardCheck,
  FileSpreadsheet,
  Download,
  Settings,
  Construction,
} from 'lucide-react';
import type { NavTab } from '../types';

interface UnderDevelopmentViewProps {
  tab: NavTab;
}

export const UnderDevelopmentView: React.FC<UnderDevelopmentViewProps> = ({ tab }) => {
  const meta: Record<
    Exclude<NavTab, 'dashboard' | 'products'>,
    { title: string; desc: string; icon: React.ReactNode; phase: string }
  > = {
    categories: {
      title: 'ระบบจัดการหมวดหมู่สินค้า (Categories Management)',
      desc: 'ฟังก์ชันจัดระเบียบหมวดหมู่ผลไม้ไทย, ผลไม้นำเข้า, ผลไม้ตามฤดูกาล และผักสด พร้อมการเรียงลำดับ (Sort Order)',
      icon: <FolderTree size={36} />,
      phase: 'Step 3B',
    },
    inventory: {
      title: 'ระบบคลังสินค้าและการตัดสต็อก (Inventory & Stock Tracking)',
      desc: 'ฟังก์ชันอัปเดตจำนวนสินค้าคงเหลือแบบ Real-time และการแจ้งเตือนเมื่อสินค้าใกล้หมด',
      icon: <Boxes size={36} />,
      phase: 'Step 3C',
    },
    orders: {
      title: 'ระบบจัดการคำสั่งซื้อ (Orders Management)',
      desc: 'ฟังก์ชันรับออเดอร์จากหน้าร้าน, ตรวจสอบที่อยู่จัดส่ง, อัปเดตสถานะชำระเงิน และประวัติการสั่งซื้อ',
      icon: <ShoppingCart size={36} />,
      phase: 'Step 3D',
    },
    packing: {
      title: 'ระบบงานแพ็กสินค้าสำหรับเจ้าหน้าที่ (Packing Workflow)',
      desc: 'ระบบคิวแพ็กสินค้าและ Checklist สำหรับการจัดเตรียมผลไม้',
      icon: <ClipboardCheck size={36} />,
      phase: 'Step 3D',
    },
    import: {
      title: 'ระบบนำเข้าข้อมูลผ่าน Excel / CSV (Bulk Catalog Import)',
      desc: 'ฟังก์ชันอัปโหลดไฟล์ Excel เพื่อเพิ่มรายการสินค้าและตัวเลือกขนาด/ราคาหลายรายการพร้อมกัน',
      icon: <FileSpreadsheet size={36} />,
      phase: 'Step 3E',
    },
    export: {
      title: 'ระบบส่งออกข้อมูล (Data Export Generator)',
      desc: 'ฟังก์ชันดาวน์โหลดรายงานยอดขาย, รายการสินค้า และประวัติการจัดส่งในรูปแบบ Excel/CSV',
      icon: <Download size={36} />,
      phase: 'Step 3E',
    },
    settings: {
      title: 'การตั้งค่าระบบร้านค้า (Store Settings)',
      desc: 'จัดการข้อมูลการติดต่อ, นโยบายร้านค้า, ช่องทางชำระเงิน และการเชื่อมโยงระบบ Cloudflare Production',
      icon: <Settings size={36} />,
      phase: 'Step 4',
    },
  };

  const item = meta[tab as keyof typeof meta] || {
    title: 'ฟังก์ชันอยู่ระหว่างการพัฒนา',
    desc: 'ระบบยังไม่เปิดให้บริการในรอบ Step 3A เพื่อความปลอดภัยและความถูกต้องของข้อมูลจริง',
    icon: <Construction size={36} />,
    phase: 'ขั้นตอนถัดไป',
  };

  return (
    <div className="card">
      <div className="empty-box">
        <div className="empty-icon-wrap">{item.icon}</div>
        <h2 className="empty-title">{item.title}</h2>
        <span
          className="badge-dev"
          style={{
            margin: '8px 0 16px',
            fontSize: '12px',
            padding: '4px 12px',
            background: 'var(--amber-light)',
            color: 'var(--amber)',
            borderColor: '#fde68a',
          }}
        >
          สถานะ: อยู่ระหว่างการพัฒนา (กำหนดการ: {item.phase})
        </span>
        <p className="empty-desc">{item.desc}</p>
        <div
          style={{
            marginTop: 24,
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--card-bg-soft)',
            border: '1px solid var(--line)',
            fontSize: '12.5px',
            color: 'var(--muted)',
            maxWidth: 480,
          }}
        >
          ℹ️ ในรอบ <strong>Step 3A: Admin Dashboard UI Foundation</strong> ระบบจะทำงานเฉพาะส่วนของ
          <strong> Dashboard</strong> และ <strong>Products (Read-only)</strong> ร่วมกับ Backend จริงเท่านั้น
          โดยไม่สร้างข้อมูลหรือการทำงานจำลองที่ทำให้เข้าใจผิด
        </div>
      </div>
    </div>
  );
};
