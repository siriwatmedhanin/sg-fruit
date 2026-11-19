---
name: sg-fruit-master
description: Master architectural blueprint, technical reference, execution state, business rules, and step-by-step roadmap for SG FRUIT (เอสจี ผลไม้ตามฤดูกาล). Covers Storefront (Mae Chawi scrollytelling + 5x2 product grid + 5-image gallery + cart + anti-stale API adapter), Backend (Cloudflare Workers, D1 SQLite, R2 WebP, Access JWT, RBAC, 65-column Excel engine, inventory ledger), and Admin Dashboard (React 18, Vite, TypeScript). Use whenever continuing development, testing, staging, or production deployment for SG FRUIT.
---

# SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Master Skill & Production Playbook

เอกสาร Master Skill นี้เป็น **พิมพ์เขียวสถาปัตยกรรม (Master Architecture Blueprint) และคู่มือการทำงานแบบครบวงจร (Production Playbook)** สำหรับระบบ **SG FRUIT (เอสจี ผลไม้ตามฤดูกาล)** จัดทำขึ้นเพื่อบันทึกสถานะการพัฒนา กฎเกณฑ์ทางธุรกิจ พิกัดเรขาคณิต แผนผังฐานข้อมูล การทดสอบความปลอดภัย และขั้นตอนการทำงานถัดไป เพื่อให้ผู้พัฒนาหรือ Agent สามารถเข้ามาทำงานต่อได้ทันทีอย่างไร้รอยต่อ

---

## 1. ข้อมูลภาพรวมและโครงสร้างโปรเจกต์ (Ecosystem Overview)

ระบบ SG FRUIT ประกอบด้วย 3 โปรเจกต์หลักที่ทำงานประสานกัน และ 1 คลังเก็บสำรองข้อมูล:

```
F:\Khet\งานส่วนตัว\
├── mae-chawi-website\          # [STOREFRONT] หน้าร้านและเรื่องเล่าคุณแม่ฉวี (Vanilla JS, GSAP, Responsive Grid, Cart)
│   ├── index.html              # หน้าหลัก (Scrollytelling Step 1-6 + 5x2 Product Grid + Drawer Cart)
│   ├── js\
│   │   ├── api-adapter.js      # ตัวเชื่อมต่อ API หน้าร้าน (Strict Hostname Lock, Anti-Stale Pricing)
│   │   ├── shop-cart.js        # ระบบจัดการตะกร้าสินค้า, แกลเลอรีรูป 5 รูป, และ Order Summary Demo
│   │   └── products-data.js    # ฐานข้อมูลสินค้าจำลองสำหรับ Static Mode
│   ├── Pic\                    # คลังรูปภาพต้นฉบับ, ฉากเรื่องเล่า, โลโก้ และชิ้นส่วนอะโวคาโด
│   ├── server.ps1              # Local Web Server (TCP Port 8892)
│   └── CNAME                   # sg-fruit.siriwatmedhanin.com (GitHub Pages ผ่าน Cloudflare Proxy)
│
├── sg-fruit-backend\           # [BACKEND API] เซิร์ฟเวอร์ API ไร้เซิร์ฟเวอร์ (Cloudflare Workers + Hono)
│   ├── src\
│   │   ├── index.ts            # Entry Point, Global Middleware, Mounting Routes (/health, /api/*)
│   │   ├── middleware\auth.ts  # Zero Trust RS256 JWT Verification (Web Crypto API) + Strict RBAC
│   │   ├── routes\
│   │   │   ├── public.ts       # Public API (/api/products, /api/categories, /api/images/*)
│   │   │   ├── admin.ts        # Admin Protected Routes (Products CRUD, Gallery, Cleanup Queue)
│   │   │   ├── orders.ts       # TikTok Shop 65-column Excel Import/Export, Packing Queue & Slips
│   │   │   └── inventory.ts    # Inventory Ledger, Stock In/Out, Adjust, Damage, Return, Audit Trail
│   │   └── services\           # imageProcessor, storageCleanup, excelEngine
│   ├── migrations\             # Cloudflare D1 SQLite Migrations (0001 ถึง 0008 + seed_production_catalog)
│   └── wrangler.jsonc          # คอนฟิก Cloudflare Workers, D1, R2, Custom Domain, Staging/Prod Envs
│
├── sg-fruit-admin\             # [ADMIN SPA] แผงควบคุมระบบบริหารจัดการร้านค้า (React 18 + TypeScript + Vite)
│   ├── src\
│   │   ├── App.tsx             # Main App, Navigation Tabs, RBAC Role Switcher
│   │   ├── components\         # ProductsView, ProductModal (Gallery 5 รูป), OrdersView, PackingView,
│   │   │                       # InventoryView, ImportExcelModal, ExportExcelModal, PackingSlipModal
│   │   └── services\api.ts     # Frontend API Client (รองรับทั้ง Dev Role Header และ CF Access Credentials)
│   └── vite.config.ts          # Vite Configuration
│
└── sg-fruit-backups\           # [BACKUPS] ที่จัดเก็บสแนปช็อตสำรองโค้ดและฐานข้อมูลในแต่ละขั้นตอนสำคัญ
    ├── pre-step7-gate-backup\  # สแนปช็อตก่อนเริ่ม Step 7 Release Gate
    └── pre-release-step7-backup\ # สแนปช็อตสมบูรณ์ของ Step 7 Release
```

---

## 2. พอร์ตและคำสั่งรันระบบทดสอบ Local (Local Development Ports)

เมื่อเปิดเครื่องทำงานต่อ ให้เปิดเซอร์วิสทั้ง 3 ส่วนด้วยคำสั่งต่อไปนี้:

| บริการ (Service) | พอร์ต (Local Port) | คำสั่งที่ใช้รัน (Startup Command) | ที่อยู่ไดเรกทอรี (Working Directory) |
| :--- | :---: | :--- | :--- |
| **Storefront Website** | `http://localhost:8892` | `powershell -ExecutionPolicy Bypass -File "server.ps1"` | `F:\Khet\งานส่วนตัว\mae-chawi-website` |
| **Backend Workers API** | `http://127.0.0.1:8787` | `npx wrangler dev` | `F:\Khet\งานส่วนตัว\sg-fruit-backend` |
| **Admin Dashboard SPA** | `http://localhost:5173` | `npm run dev` | `F:\Khet\งานส่วนตัว\sg-fruit-admin` |

---

## 3. กฎเหล็กทางธุรกิจและข้อกำหนดความปลอดภัย (Non-Negotiable Business Rules)

1. **กฎ SKU คือข้อความหน่วยขาย (Rule: SKU is Sales Unit Text):**
   - รหัส SKU ในระบบ SG FRUIT **ไม่ใช่ Machine Code (เช่น ห้ามใช้ SG001, SG002 เด็ดขาด)**
   - SKU ต้องเป็นข้อความหน่วยขายภาษาไทยที่มนุษย์อ่านเข้าใจ เช่น `'1 โล'`, `'2 โล'`, `'2 ลูก'`, `'4 ลูก'`, `'แพ็ก 250 กรัม'`
   - SKU สามารถซ้ำกันข้ามสินค้าและข้ามรายการได้ (Non-Unique SKU) และการระบุเอกลักษณ์ภายในจะใช้ `id` (UUID/ULID) เสมอ
2. **กฎ 1 แถวใน Excel = 1 รายการคำสั่งซื้อ (Rule: No SKU Aggregation):**
   - ในการนำเข้าไฟล์ TikTok Shop (ชีต `OrderSKUList` รูปแบบ 65 คอลัมน์) สินค้าที่มี SKU เดียวกันในออเดอร์เดียวกัน **ต้องไม่ถูกยุบรวมแถวเด็ดขาด** (1 Excel Row = 1 Order Item ใน D1)
3. **กฎจำกัดรูปภาพแกลเลอรีสูงสุด 5 รูป (Rule: Max 5 Images per Product):**
   - สินค้าแต่ละรายการมีรูปภาพได้ไม่เกิน 5 รูป โดยถูกบังคับใช้ตั้งแต่ระดับฐานข้อมูลผ่าน D1 Trigger `trg_max_5_product_images`
   - ต้องมีรูปหลักเพียงรูปเดียวในเวลาใดเวลาหนึ่ง คุ้มครองด้วย Partial Unique Index `uq_product_primary_image`
4. **กฎขอบเขตระบบสั่งซื้อหน้าร้าน (Rule: Checkout Scope):**
   - หน้าร้านในปัจจุบันเป็น **Catalog + Order Summary Demo เท่านั้น** (`openOrderSummaryModal()`)
   - ยังไม่มี Payment Gateway จริง และยังไม่มีระบบบันทึกออเดอร์จากลูกค้าออนไลน์ (งานส่วนนี้จัดเป็น Out-of-Scope สำหรับ Step 7 และจะพัฒนาใน Step 8+)
5. **กฎการป้องกันราคาเก่าเมื่อ API ขัดข้อง (Rule: Anti-Stale Pricing Guard):**
   - บน Production Domain หากระบบเปิดใช้ `production_api` แล้ว API ขัดข้อง ตัว Adapter จะปรับสถานะเป็น `isDegraded = true` และ `canOrder = false` ทันทีเพื่อระงับการสั่งซื้อ ป้องกันไม่ให้นำราคาเก่าใน Static Catalog มารับออเดอร์แบบเงียบ ๆ
6. **กฎการบังคับสิทธิ์ RBAC ผ่าน Backend (Rule: Strict Backend RBAC):**
   - สิทธิ์ Admin: บริหารสินค้า, ราคาทุน, แกลเลอรี, นำเข้า Excel, ปรับยอดคลังสินค้า, สั่งล้าง R2
   - สิทธิ์ Packing Staff: ดูรายการออเดอร์, คิวแพ็ก, พิมพ์ใบจัดของ, ส่งออก Excel จัดส่ง **ห้ามแก้ไขสินค้า ราคา รูปภาพ หรือปรับยอดสต็อกเด็ดขาด (Backend ปฏิเสธด้วย HTTP 403 ทันที)**
7. **กฎความปลอดภัยระหว่างพัฒนา (Rule: No Unapproved Remote Changes):**
   - ห้าม Push หรือ Merge เข้า `main` บน Git จนกว่าจะได้รับความเห็นชอบ
   - ห้ามแก้ไข DNS ของโดเมนจริง และห้ามนำข้อมูลทดสอบขึ้น Remote Database

---

## 4. แผนผังฐานข้อมูล Cloudflare D1 (Schema & Migrations Reference)

ลำดับการรัน Migration ทั้งหมดใน `sg-fruit-backend/migrations/`:

```
0001_initial_schema.sql           -> categories, products, product_variants, orders, order_items
0002_seed_catalog.sql             -> ข้อมูลหมวดหมู่และสินค้าตัวอย่างเริ่มต้น
0003_add_product_status_and_en.sql -> เพิ่ม status ('draft','active','inactive','archived') และ name_en
0004_add_image_support.sql        -> เพิ่ม thumbnail_key, image_meta ใน products
0005_product_gallery.sql          -> ตาราง product_images (Max 5 images trigger)
0006_storage_cleanup_queue.sql    -> ตาราง storage_cleanup_queue และ partial unique index รูปหลัก
0007_order_data_foundation.sql    -> ตาราง order_import_batches, ฟิลด์ 65 คอลัมน์ใน orders & order_items
0008_inventory_management.sql     -> ตาราง inventory_movements, ฟิลด์สต็อกและการตัดสต็อกออเดอร์
seed_production_catalog.sql       -> ข้อมูลแคตตาล็อกสินค้าจริง 15 รายการ (Upsert แบบ ON CONFLICT DO UPDATE)
```

### คำสั่งทดสอบฐานข้อมูล SQLite สะอาด (Clean Test Verification)
สามารถรันสคริปต์ทดสอบความถูกต้องของ Foreign Keys และ Triggers ทั้งหมดได้ด้วยคำสั่ง:
```powershell
& "C:\Program Files\nodejs\node.exe" "C:\Users\user\.gemini\antigravity\brain\a64e862e-6ef7-4734-a789-db3e8a56e570\scratch\test_clean_d1_migration.js"
```

---

## 5. ตารางตัวอย่างแคตตาล็อกสินค้าจริง 15 รายการ (Candidate Production Catalog)

ตารางนี้จัดเตรียมไว้ใน `migrations/seed_production_catalog.sql` พร้อมสำหรับการนำขึ้น D1 Production เมื่อได้รับอนุมัติ:

| ID | ชื่อสินค้าภาษาไทย | หมวดหมู่ | รหัสตัวเลือก | หน่วยขาย / SKU | ราคาขาย (THB) | ราคาทุน (THB) | สต็อกตั้งต้น | จุดแจ้งเตือน | สถานะ |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `sg-001` | อะโวคาโดฮาส | ผลไม้นำเข้า | `var-001` | **2 ลูก** | 159 | 100 | 20 | 5 | Active |
| `sg-002` | มะม่วงน้ำดอกไม้ | ผลไม้ไทย | `var-002` | **1 โล** | 129 | 80 | 25 | 5 | Active |
| `sg-003` | มังคุด | ผลไม้ไทย | `var-003` | **1 โล** | 139 | 90 | 20 | 5 | Active |
| `sg-004` | ลำไย | ผลไม้ไทย | `var-004` | **1 โล** | 89 | 55 | 30 | 5 | Active |
| `sg-005` | แอปเปิลฟูจิ | ผลไม้นำเข้า | `var-005` | **4 ลูก** | 129 | 80 | 25 | 5 | Active |
| `sg-006` | องุ่นเขียวไร้เมล็ด | ผลไม้นำเข้า | `var-006` | **1 แพ็ก** | 199 | 130 | 15 | 5 | Active |
| `sg-007` | เชอร์รีนำเข้า | ผลไม้นำเข้า | `var-007` | **250 กรัม** | 299 | 200 | 15 | 5 | Active |
| `sg-008` | ส้มแมนดาริน | ผลไม้นำเข้า | `var-008` | **1 ถุง** | 159 | 100 | 20 | 5 | Active |
| `sg-009` | บรอกโคลี | ผักสด | `var-009` | **1 หัว** | 79 | 45 | 18 | 5 | Active |
| `sg-010` | กะหล่ำดอก | ผักสด | `var-010` | **1 หัว** | 69 | 40 | 20 | 5 | Active |
| `sg-011` | แครอต | ผักสด | `var-011` | **500 กรัม** | 49 | 30 | 25 | 5 | Active |
| `sg-012` | ผักสลัดรวม | ผักสด | `var-012` | **1 แพ็ก** | 69 | 40 | 20 | 5 | Active |
| `sg-013` | สตรอว์เบอร์รีนำเข้า | ผลไม้นำเข้า | `var-013` | **กล่อง 250 กรัม** | 259 | 170 | 15 | 5 | Active |
| `sg-014` | ส้มโอทับทิมสยาม | ผลไม้ไทย | `var-014` | **1 ลูก** | 149 | 95 | 18 | 5 | Active |
| `sg-015` | มะเขือเทศเชอร์รีหวาน | ผักสด | `var-015` | **แพ็ก 250 กรัม** | 59 | 35 | 30 | 5 | Active |

---

## 6. สรุปผลการทดสอบระบบ (Full Regression Test Suite)

สคริปต์ทดสอบ `scratch/test_step7_release_readiness.js` ผ่านการทดสอบ 29 ข้อ โดยมีผลสรุปดังนี้:
- **Backend Health & Uptime:** PASS (HTTP 200 healthy, D1 connected, R2 ready)
- **Zero Trust JWT & Local Mock Isolation:** PASS (ปฏิเสธ 401 เมื่อไม่มี Token, บล็อกบทบาทปลอม)
- **Role-Based Access Control (RBAC):** PASS (Packing Staff ถูกบล็อกจากการแก้สินค้า 403 Forbidden)
- **Product & 5-Image Gallery:** PASS (อัปโหลด WebP, Reorder, Primary Flag, ทริกเกอร์บล็อกรูปที่ 6)
- **Inventory & Audit Trail Ledger:** PASS (บันทึก Ledger ครบ, ตรวจสอบสต็อกไม่ติดลบ)
- **TikTok Shop 65-Column Import & Export:** PASS (ตรวจจับไฟล์ซ้ำผ่าน SHA-256, ไม่มี SKU Aggregation)
- **Storefront 5×2 Grid & Modal Gallery:** PASS (จัดวาง Desktop 5x2, รองรับ Touch Swipe และปุ่มลูกศร)
- **Cinematic Scrollytelling Step 1–6:** PASS (เรื่องเล่าคุณแม่ฉวี 6 ขั้นตอนและผลอะโวคาโดทำงานไร้รอยต่อ)
- **Checkout Scope Evaluation:** NOT TESTED (Catalog + Order Summary Demo เท่านั้น ตามขอบเขตที่ตกลงไว้)

---

## 7. สิ่งที่ต้องทำต่อเมื่อกลับมาพรุ่งนี้ (Next Actions When Resuming)

เมื่อผู้ใช้กลับมาทำงานต่อ ให้ดำเนินงานตามลำดับขั้นตอนดังนี้:

1. **ขออนุมัติรายการสินค้า 15 รายการ (User Catalog Approval):**
   - สอบถามผู้ใช้เพื่อยืนยันชื่อสินค้า ราคาขาย และหน่วยขายใน [หัวข้อที่ 5](#5-ตารางตัวอย่างแคตตาล็อกสินค้าจริง-15-รายการ-candidate-production-catalog)
2. **เตรียมข้อมูล Cloudflare Remote Credentials:**
   - ผู้ใช้สร้างฐานข้อมูล D1 และ R2 Bucket บน Cloudflare Dash:
     - `npx wrangler d1 create sg-fruit-db-staging`
     - `npx wrangler r2 bucket create sg-fruit-products-staging`
   - นำ Database ID ที่ได้มาอัปเดตลงใน `sg-fruit-backend/wrangler.jsonc` แทนที่ `REPLACE_WITH_STAGING_D1_ID`
   - กำหนดค่า `CF_ACCESS_TEAM_NAME` และ `CF_ACCESS_AUD` ใน Environment Variables
3. **เริ่มต้นขั้นตอน Staging Release:**
   - Deploy Backend ไปยัง Staging: `npx wrangler deploy --env staging`
   - รัน Migration บน Staging D1: `npx wrangler d1 migrations apply sg-fruit-db-staging --remote`
   - รัน Seed บน Staging D1: `npx wrangler d1 execute sg-fruit-db-staging --remote --file=migrations/seed_production_catalog.sql`
   - ทดสอบ Admin Dashboard และ Storefront กับระบบ Staging จริง
4. **เตรียมการเปิดตัว Production (เมื่อ Staging ผ่าน 100%):**
   - ดำเนินการขั้นตอนเดียวกันบน Production Environment
   - สลับ Storefront เป็น `production_api` โหมดอย่างปลอดภัย
