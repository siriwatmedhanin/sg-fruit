---
name: mae-chawi-avocado-scroll-step1-to-5
description: Skill documentation and implementation reference for Mae Chawi – AVOCADO ORCHARD scrollytelling website (Step 1–5 with GSAP ScrollTrigger, ready for Step 6)
---

# Mae Chawi – AVOCADO ORCHARD (Scrollytelling Skill · Step 1–5)

เอกสาร Skill นี้บันทึกโครงสร้างสถาปัตยกรรม พิกัดเลเยอร์ และการตั้งค่า **GSAP + ScrollTrigger** ของโปรเจกต์ **Mae Chawi – AVOCADO ORCHARD** (`F:\Khet\งานส่วนตัว\mae-chawi-website\index.html`) สำหรับ **Step 1–5** พร้อมจุดเชื่อมต่อสำหรับ **Step 6**

---

## 1. ข้อมูล Checkpoint สำรอง (Step 1–3 Baseline)

ก่อนเริ่มพัฒนา Step 4–5 ได้ทำการสำรองเวอร์ชัน **Step 1–3** ที่ผ่านการอนุมัติแล้วไว้ดังนี้:
- **Git Commit**: `31d7ba7` (`Checkpoint: Completed and approved Step 1-3 before adding Step 4-5`)
- **Git Tag**: `v1.0-step1-3`
- **Backup Files**:
  - `F:\Khet\งานส่วนตัว\mae-chawi-website\checkpoints\index.step1-3.checkpoint.html`
  - `F:\Khet\งานส่วนตัว\mae-chawi-website\checkpoints\SKILL.step1-3.checkpoint.md`

---

## 2. รายการไฟล์ Asset ที่ตรวจสอบและใช้งานจริง (Step 1–5)

| ไฟล์ใน `Pic/` | ขนาดจริง (px) | สัดส่วน | การใช้งานในโปรเจกต์ |
| :--- | :--- | :--- | :--- |
| `Pic/avocado-tree.png.png` | `2000 × 2000` | `1 : 1` | ต้นอะโวคาโดใน Step 1–2 (`#avocado-tree-img`) |
| `Pic/avocado-stem.png` | `36 × 136` | `9 : 34` | ขั้วกิ่งไม้จริงที่สกัดจากภาพต้นไม้ เชื่อมท้องกิ่งเข้ากับขั้วบนสุดของลูกอะโวคาโด (`#hero-stem`) |
| `Pic/avocado-whole.png.png` | `2000 × 1695` | `1.18 : 1` | ลูกอะโวคาโดลูกหลักลูกเดียวกันตลอด Step 1–3 และช่วงซูมต้น Step 4 (`#hero-avocado`) |
| `Pic/cutting-board.png.png` (`cutting-board.png`) | `2000 × 1333` | `1.50 : 1` | เขียงไม้ธรรมชาติใน Step 3, Step 4B (รองรับผลผ่าครึ่ง) และ Step 5 (รองรับชิ้นสไลซ์) (`#cutting-board-img`) |
| `Pic/hand-cutting.png` (`hand-cutting.png.png`) | `2000 × 1523` | `1.313 : 1` | ภาพมุมสูงมือกำลังใช้มีดผ่าอะโวคาโดบนเขียง พร้อมมะนาว พริกหวานสีเหลือง และมะเขือเทศราชินีในถ้วย (`#hand-cutting-img` ใน Step 4A) |
| `Pic/avocado-halves.png` (`avocado-halves.png.png`) | `2000 × 1538` | `1.30 : 1` | อะโวคาโดผ่าครึ่ง 2 ซีก (ซีกซ้ายมีเมล็ด `X=16.6%..48.4%`, ซีกขวาไร้เมล็ด `X=51.6%..83.4%`) ใช้แยกซีกอย่างนุ่มนวลใน Step 4B |
| `Pic/avocado-slices-on-board2.png` (`avocado-slices-on-board2.png.png`) | `2000 × 1116` | `1.792 : 1` | อะโวคาโดหั่นสไลซ์เรียง 3 กลุ่มบนพื้นโปร่งใส วางทับบนเขียงไม้ `#board-layer` ใน Step 5 อย่างต่อเนื่องไม่กระพริบ |
| `Pic/avocado-slices.png.png` (`avocado-slices.png`) | `2000 × 2000` | `1 : 1` | ใช้ในการ์ดสินค้า Collection ด้านล่าง |
| `Pic/salad-plate.png.png` | `2000 × 2000` | `1 : 1` | **ยังไม่เปิดใช้งานใน Step 1–5** (เตรียมไว้สำหรับ Step 6 เท่านั้น) |

---

## 3. สถาปัตยกรรม GSAP ScrollTrigger Timeline (Step 1–5 = `180` Timeline Units)

- ความสูงของ `<section id="story" class="story">` ปรับเป็น **`712svh`** (Desktop) และ **`660svh`** (Mobile) เพื่อคงความเร็วการเลื่อนต่อ 1 หน่วยเวลาของ Step 1–3 (`0..100`) ให้เหมือนเดิมทุกประการ
- ใช้ `scrub: 0.55` และ `invalidateOnRefresh: true` รองรับการเลื่อนลงและเลื่อนย้อนกลับ (`100% -> 0%`) ได้อย่างแม่นยำ

### ลำดับเวลาใน `masterTL` (`0` ถึง `180`)

1. **Step 1 — เปิดหน้าแรกด้วยต้นอะโวคาโด (`t = 0 .. 12`, Scroll `0% .. 10%`) — *ไม่เปลี่ยนแปลงจาก v1.0***
   - `#tree-layer` แสดงต้นอะโวคาโดพร้อม `#hero-stem` (`Pic/avocado-stem.png`) และ `#hero-avocado-wrap` ห้อยอยู่ใต้ท้องกิ่ง
   - ลูกอะโวคาโดแกว่งตัวเบาๆ ก่อนปลิดออกจากขั้ว

2. **Step 2 — ลูกอะโวคาโดร่วงตามแรงโน้มถ่วง (`t = 12 .. 68`, Scroll `10% .. 34%`) — *ไม่เปลี่ยนแปลงจาก v1.0***
   - `#tree-layer` เลื่อนขึ้นด้านบน (`yPercent: -78`, `autoAlpha: 0`)
   - `#hero-avocado-wrap` เคลื่อนที่ด้วยความเร่งโน้มถ่วง (`power2.in`) หมุนตัวเล็กน้อย (`-14° -> +15° -> -7°`)

3. **Step 3 — ตกลงบนเขียงและเด้งเล็กน้อย (`t = 50 .. 100`, Scroll `34% .. 56%`) — *ไม่เปลี่ยนแปลงจาก v1.0***
   - `#board-layer` เลื่อนขึ้นมารองรับที่ `t = 50..68`
   - `#hero-avocado-wrap` ตกกระทบผิวเขียงที่ `t = 72` และเด้ง 2 จังหวะ (`72 -> 79.5 -> 86.5 -> 91 -> 96`) ก่อนหยุดนิ่งบนเขียง

4. **Step 4 — ผ่าอะโวคาโด (`t = 100 .. 150`, Scroll `56% .. 83%`)**
   - **Sub-step 4A (`t = 100 .. 113`)**: ค่อยๆ ซูมเข้าหาลูกอะโวคาโดบนเขียง (`#board-layer` ขยายสู่ `scale: 1.16`, `#hero-avocado-wrap` ขยายสู่ `scale: 1.92`) ก่อน Crossfade อย่างนุ่มนวลเข้าสู่ `#hand-cutting-layer` (`Pic/hand-cutting.png`)
   - **Sub-step 4B (`t = 113 .. 123`)**: แสดงฉากมุมสูง `Pic/hand-cutting.png` พร้อมมะนาว พริกหวานสีเหลือง และมะเขือเทศราชินีในถ้วยครบถ้วน โดยใช้เป็นฉากเปลี่ยนภาพอย่างนุ่มนวล (`scale: 1.0 -> 1.025`) ไม่บิดภาพมือหรือมีด และไม่แกล้งขยับมือเทียม
   - **Sub-step 4C (`t = 123 .. 150`)**: เปลี่ยนจาก `Pic/hand-cutting.png` กลับสู่ `#board-layer` พร้อม `#halves-layer` (`Pic/avocado-halves.png`) ที่แยกเป็น 2 เลเยอร์ย่อยด้วย `clip-path: inset(0 50% 0 0)` (`#avocado-half-left`) และ `clip-path: inset(0 0 0 50%)` (`#avocado-half-right`)
   - เมื่อเลื่อน Scroll ช่วง `t = 129 .. 147` ทั้งสองซีกจะค่อยๆ แยกออกจากกันอย่างนุ่มนวล (`xPercent: 8.5 -> -4.2, rotation: 2° -> -6.5°` และ `xPercent: -8.5 -> +4.2, rotation: -2° -> +6.5°`)
   - **เทคนิคสำคัญป้องกันรอยต่อเงา (Drop-Shadow Seam Prevention)**: กำหนด `filter: drop-shadow(...)` ไว้ที่ Container แม่ (`.halves-layer` และ `.slices-layer`) แทนการใส่บน `<img>` ที่มี `clip-path` เพื่อให้เบราว์เซอร์ตัด `clip-path` บนพื้นหลังโปร่งใส (`alpha = 0`) ก่อนคำนวณเงา

5. **Step 5 — อะโวคาโดสไลซ์บนเขียง (`t = 150 .. 180`, Scroll `83% .. 100%`)**
   - รักษา `#board-layer` ให้แสดงผลต่อเนื่อง (`autoAlpha: 1` ตลอดตั้งแต่ Step 4C ถึงจบ Step 5) จึงไม่เกิดอาการกระพริบ (Zero Flicker)
   - Crossfade อย่างนุ่มนวลจาก `#halves-layer` (`autoAlpha: 1 -> 0`) เข้าสู่ `#slices-layer` (`Pic/avocado-slices-on-board2.png`, `autoAlpha: 0 -> 1`)
   - ชิ้นสไลซ์ทั้ง 3 กลุ่ม (`#slices-group-left`, `#slices-group-center`, `#slices-group-right`) ค่อยๆ คลี่ตัวเข้าตำแหน่งนิ่งบนเขียงในช่วง `t = 152 .. 168` และคงภาพไว้จนถึง `t = 180` (`100%`) เพื่อเตรียมส่งต่อเข้าสู่ **Step 6**

---

## 4. จุดเชื่อมต่อสำหรับพัฒนาต่อ Step 6 ในรอบถัดไป

ใน `index.html` ได้เตรียม Hook และ State สำหรับต่อยอดสู่ **Step 6 (จัดเสิร์ฟลงจานสลัด)** ไว้ที่:
- **DOM Placeholder**: `<div class="step-6-stage-hook" id="step-6-stage-hook" data-phase="step-6-prepared" data-slices-selector="#slices-layer" data-board-selector="#board-layer" aria-hidden="true"></div>`
- **Global State Object**: `window.MAE_CHAWI_STAGE_STATE`
  - `step5FinalState`: `{ boardVisible: true, slicesVisible: true, slicesRotation: -8 }`
- ในรอบถัดไปสามารถขยายความยาว Timeline ต่อจาก `t = 180` เพื่อนำชิ้นอะโวคาโดสไลซ์จาก `#slices-layer` บน `#board-layer` เคลื่อนเข้าสู่ฉากจานสลัด (`Pic/salad-plate.png.png`) ได้ทันทีโดยไม่ต้องแก้ไขโค้ดของ Step 1–5
