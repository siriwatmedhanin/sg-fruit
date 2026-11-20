# SG FRUIT Backend Foundation (Cloudflare Workers + D1 + R2 + Access)

โครงสร้างระบบ Backend สำหรับแบรนด์ **SG FRUIT (เอสจี ผลไม้ตามฤดูกาล)**
พัฒนาบน Serverless Edge Platform ของ Cloudflare เพื่อความเร็วสูง ความปลอดภัย และประหยัดค่าใช้จ่าย

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

* **Runtime:** Cloudflare Workers (Edge Serverless)
* **Framework:** Hono (TypeScript-native, Ultra-fast, zero-overhead)
* **Database:** Cloudflare D1 (Serverless Distributed SQLite)
* **Storage:** Cloudflare R2 (S3-Compatible Object Storage สำหรับรูปภาพ)
* **Security & Auth:** Cloudflare Access (Zero Trust Authentication & RBAC)

---

## 2. โครงสร้างโฟลเดอร์ (Folder Structure)

```text
backend/
├── src/
│   ├── index.ts               # Worker Entry Point & Route Assembly
│   ├── routes/
│   │   ├── health.ts          # GET /api/health (System status & bindings check)
│   │   ├── public.ts          # Public Storefront API (Sanitized: SKU stripped)
│   │   └── admin.ts           # Protected Admin & Staff Endpoints
│   ├── middleware/
│   │   ├── auth.ts            # Cloudflare Access JWT validation & RBAC
│   │   ├── cors.ts            # CORS Preflight & Origin checking
│   │   └── error.ts           # Standardized JSON Error Handler
│   └── types/
│       └── env.ts             # TypeScript Bindings, Entities, Models & Auth
├── migrations/
│   └── 0001_initial_schema.sql # D1 Initial Schema (Categories, Products, Variants, Orders)
├── tests/
│   └── schema.test.sql        # Database test script verifying non-unique SKU rule
├── wrangler.jsonc             # Cloudflare Wrangler Configuration
├── package.json               # Dependencies & NPM Scripts
├── tsconfig.json              # TypeScript Configuration
├── .dev.vars.example          # Local Environment Variables Template
├── .gitignore                 # Git ignore for Wrangler, state & secrets
└── README.md                  # เอกสารคู่มือระบบ
```

---

## 3. กฎธุรกิจสำคัญ (Critical Business Rules)

### กฎข้อกำหนด SKU ของ SG FRUIT:
1. **SKU คือหน่วยขายที่กรอกเองได้**: เช่น `"1 โล"`, `"2 โล"`, `"1 ชุด"`, `"1 แท่ง"`, `"500 กรัม"`
2. **SKU ซ้ำกันได้ (Non-Unique)**: ผลไม้ต่างชนิดสามารถใช้ SKU `"1 โล"` เหมือนกันได้ จึง **ห้ามใส่ UNIQUE Constraint บน SKU** เด็ดขาด
3. **รหัสระบุตัวตนภายในคือ `id`**: ฐานข้อมูลใช้ Primary Key เป็น `id` (UUID/ULID) ไม่ใช้ SKU เป็น Key
4. **SKU ห้ามเปิดเผยใน Public API**: API ฝั่งหน้าบ้าน (Storefront) จะตัดฟิลด์ SKU และ Cost Price ออก เพื่อความปลอดภัยและความสะอาดของข้อมูล

---

## 4. แผนผัง API Routes

### Public Endpoints (สำหรับหน้าร้าน Storefront):
* `GET /api/health` — ตรวจสอบสถานะการทำงานของ Worker และ Bindings
* `GET /api/categories` — รายการหมวดหมู่สินค้า
* `GET /api/products` — รายการสินค้าพร้อมตัวเลือก (ตัด SKU และต้นทุนออก)
* `GET /api/products/:id` — รายละเอียดสินค้าเดี่ยว

### Admin & Staff Endpoints (ปกป้องด้วย Cloudflare Access):
* `GET / POST / PUT /api/admin/products` — จัดการข้อมูลสินค้า, ตัวเลือก, ราคา และ SKU (Admin Only)
* `GET /api/admin/inventory` — ตรวจสอบและอัปเดตสต็อกสินค้า (Admin Only)
* `GET / PATCH /api/admin/orders` — รายการคำสั่งซื้อและสถานะ (Admin + Packing Staff)
* `GET / POST /api/admin/packing` — รายการแพ็กสินค้าและยืนยันการแพ็ก (Admin + Packing Staff)
* `POST /api/admin/import` — นำเข้าข้อมูลสินค้าจาก Excel / CSV (Admin Only)
* `GET /api/admin/export` — ส่งออกข้อมูลออเดอร์และรายงานเป็น Excel (Admin + Packing Staff)
* `POST /api/admin/images` — อัปโหลดและประมวลผลรูปภาพเข้า R2 Bucket (Admin Only)

---

## 5. การติดตั้งและทดสอบในเครื่อง (Local Setup)

เมื่อติดตั้ง Node.js และ NPM บนเครื่องเรียบร้อยแล้ว:

```bash
# 1. เข้าสู่โฟลเดอร์ backend
cd backend

# 2. ติดตั้ง Dependencies
npm install

# 3. คัดลอก Environment Variables
cp .dev.vars.example .dev.vars

# 4. ทดสอบรัน Local Worker Server (ผ่าน Wrangler)
npm run dev

# 5. รัน D1 Migration บน Local Database
npm run db:migrate:local
```

---

## 6. แนวทางการประมวลผลรูปภาพ (R2 Image Optimization)

* รูปสินค้าหลัก (Main Image): สูงสุดไม่เกิน 1600px
* รูปขนาดย่อ (Thumbnail): 400–600px
* รูปแบบที่แนะนำ: WebP คุณภาพเริ่มต้น ~85%
* รูปทั้งหมดจะประมวลผลในฝั่ง Local/Admin ก่อนส่งขึ้น R2 เพื่อลดภาระและประหยัดพื้นที่จัดเก็บ
