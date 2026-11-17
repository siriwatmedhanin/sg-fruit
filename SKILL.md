---
name: mae-chawi-avocado-orchard-scroll
description: Skill และคู่มือสถาปัตยกรรมสำหรับพัฒนาเว็บไซต์ Scrollytelling "Mae Chawi – AVOCADO ORCHARD" (ไร่แม่ฉวี) ด้วย GSAP ScrollTrigger ครอบคลุม Step 1–3 ที่พัฒนาสมบูรณ์แล้ว การตรวจสอบคุณภาพ Asset ในโฟลเดอร์ Pic และโครงสร้างส่งต่อสำหรับพัฒนา Step 4–6 ในเฟสถัดไป
---

# Mae Chawi – AVOCADO ORCHARD (Scrollytelling Skill & Architecture Guide)

เอกสาร Skill นี้สรุปแนวทางการออกแบบ สถาปัตยกรรมโค้ด พิกัดแอนิเมชัน **GSAP ScrollTrigger** สำหรับ **Step 1–3** รายงานการตรวจสอบไฟล์ภาพทั้งหมดใน `Pic/` และโครงสร้างเชื่อมต่อสำหรับพัฒนา **Step 4–6** ต่อเนื่องทันที

---

## 1. ภาพรวมโปรเจกต์ (Project Overview)

- **ชื่อโปรเจกต์:** Mae Chawi – AVOCADO ORCHARD (ไร่แม่ฉวี)
- **โฟลเดอร์หลัก:** `F:\Khet\งานส่วนตัว\mae-chawi-website`
- **ไฟล์หลักที่ใช้งาน:**
  - `index.html` — หน้าเว็บหลักพร้อมระบบ Sticky Scrollytelling (Step 1–3), ส่วนแสดงสถานะ Phase, และส่วนแสดงคอลเลกชันสินค้า
  - `js/gsap.min.js` และ `js/ScrollTrigger.min.js` — ไลบรารี GSAP 3.12.5 และ ScrollTrigger แบบ Local (ทำงานได้แม้ไม่มีอินเทอร์เน็ต)
  - `server.ps1` — สคริปต์รัน Local Web Server บนพอร์ต `8892` (`http://localhost:8892/`)
  - `Pic/` — โฟลเดอร์เก็บไฟล์ภาพ Asset และวิดีโอตัวอย่าง `V.01.mp4`

---

## 2. สถาปัตยกรรม Step 1–3 ด้วย GSAP ScrollTrigger (Phase 1 Completed)

### กฎเหล็กที่ใช้ในการพัฒนา Step 1–3
1. **ผลไม้ลูกเดียวกันตลอดทั้งฉาก (Single Persistent Fruit Element):**
   - ใช้ DOM Element เดียวคือ `#hero-avocado-wrap > img#hero-avocado` (`src="Pic/avocado-whole.png.png"`) ตลอดทั้ง Step 1, Step 2 และ Step 3
   - ไม่มีการสลับไฟล์ภาพผลไม้หรือซ่อน/แสดงผลไม้คนละลูกระหว่างร่วงจากต้นลงสู่เขียง
2. **รักษารูปทรงและสัดส่วนของผลไม้ 100% (Strict Aspect Ratio Preservation):**
   - ขนาดภาพต้นฉบับของ `Pic/avocado-whole.png.png` คือ `2000 × 1695` (`aspect-ratio: 2000 / 1695 ≈ 1.17994`)
   - กำหนด CSS `width: 100%; height: auto; aspect-ratio: 2000 / 1695; object-fit: contain;`
   - ใน GSAP ใช้เฉพาะ `scale` แบบ Uniform (`scaleX === scaleY` ทุกเฟรม) ร่วมกับ `xPercent`, `yPercent`, และ `rotation` เท่านั้น ห้ามใช้การบีบ/ยืด `scaleX` หรือ `scaleY` แยกกันเด็ดขาด
3. **ระบบพิกัดร่วม `1:1` (`.stage-art`) รองรับทั้ง Desktop และ Mobile:**
   - กล่อง `.stage-art` มี `aspect-ratio: 1 / 1` ทั้งบนจอคอมพิวเตอร์ (`1440×900`) และมือถือ (`390×844`)
   - ทำให้พิกัดเปอร์เซ็นต์ (`left`, `top`, `width`, `xPercent`, `yPercent`) ของต้นไม้ ผลอะโวคาโด และเขียงไม้ สอดคล้องกันทุกขนาดหน้าจอโดยไม่เพี้ยน

### ลำดับเวลา GSAP Timeline (`masterTL`, ระยะเวลา 0 ถึง 100)

| ช่วง Scroll (%) | Step | เหตุการณ์และค่าพารามิเตอร์หลัก |
| :--- | :--- | :--- |
| **0% – 12%** | **Step 1: เปิดหน้าแรกด้วยต้นอะโวคาโด** | `#tree-layer` (`Pic/avocado-tree.png.png`) แสดงเต็มฉาก ลูกอะโวคาโด `#hero-avocado-wrap` ห้อยอยู่ใต้กิ่งด้านซ้ายใน (`left: 29.88%, top: 43.43%, width: 14%`) โดยจุดกึ่งกลางขั้วลูกอะโวคาโด (`48.4% X, 4.6% Y`) เชื่อมต่อพอดีกับขั้วกิ่งภาพถ่ายจริง `#hero-stem` (`Pic/avocado-stem.png` ที่สกัดจากขั้วกิ่งจริงของ `Pic/avocado-tree.png.png`) ใต้ท้องกิ่งสีน้ำตาล (`left: 35.27%, top: 55.90%`) |
| **12% – 68%** | **Step 2: ผลร่วงจากต้นตามแรงโน้มถ่วง** | ลูกอะโวคาโดปลิดออกจากขั้วกิ่ง (`#hero-stem` ดีดตัวกลับเล็กน้อย) เคลื่อนลงด้วยความเร่งโน้มถ่วง (`yPercent: 4 → 132`, `ease: "power2.in"`), เลื่อนเข้าหาแนวกึ่งกลางเขียง (`xPercent: 0 → 109.5`), หมุนตัวเล็กน้อยตามธรรมชาติ (`rotation: 4° → -14° → +15° → -7°`), และปรับขนาดตามมุมกล้อง (`scale: 1.0 → 1.62`) ขณะที่ `#tree-layer` เลื่อนขึ้นด้านบน (`yPercent: 0 → -78`, `autoAlpha: 0`) |
| **50% – 72%** | **Step 3 (ช่วงที่ 1): เข้าสู่ฉากเขียงเปล่า** | `#board-layer` (`Pic/cutting-board.png.png`) เลื่อนขึ้นมารอรับที่กลางฉาก (`yPercent: 36 → 0`, `autoAlpha: 0 → 1`) พร้อมเงาสัมผัส `#avocado-board-shadow` ที่ค่อยๆ เข้มขึ้นเมื่อผลไม้เข้าใกล้พื้นเขียง |
| **72% – 100%** | **Step 3 (ช่วงที่ 2): ตกลงบนเขียงและเด้งเล็กน้อย** | **Impact 1 (72%):** สัมผัสพื้นเขียง (`yPercent: 132`) เขียงยุบตัวรับน้ำหนักเล็กน้อย (`yPercent: 1.4 → 0`)<br>**Bounce 1 (72%–79.5%):** กระดอนขึ้น (`yPercent: 132 → 92`, `rotation: +6°`, `ease: "power2.out"`) เงาบนเขียงจางและขยายออกเล็กน้อย<br>**Impact 2 (86.5%):** ตกลงแตะเขียงครั้งที่ 2 (`yPercent: 132`, `rotation: -3°`, `ease: "power2.in"`)<br>**Micro-Hop & Settle (86.5%–96%):** เด้งเบาๆ อีกครั้ง (`yPercent: 118`) ก่อนหยุดนิ่งสนิทบนเขียง (`yPercent: 132, rotation: 0°`) ที่ **96%–100%** |

---

## 3. รายงานการตรวจสอบ Asset ในโฟลเดอร์ `Pic/` (Asset Audit Report)

จากการตรวจสอบไฟล์ทั้งหมดใน `F:\Khet\งานส่วนตัว\mae-chawi-website\Pic` พบรายละเอียดดังนี้:

### 3.1 ไฟล์ที่ใช้ใน Step 1–3 (ตรวจสอบแล้ว ใช้งานได้สมบูรณ์)
1. **`Pic/avocado-tree.png.png`** (`2000 × 2000 px`, PNG พื้นหลังโปร่งใส `Format32bppArgb`)
   - **ข้อสังเกต:** ชื่อไฟล์มีนามสกุลซ้ำ `.png.png` และในภาพมีผลอะโวคาโดติดอยู่บนต้นแล้ว 8 ลูก การวาง `#hero-avocado` จึงวางในช่องว่างใต้กิ่งซ้ายใน (`x ≈ 36.5%, y ≈ 61%`) พร้อมวาดขั้วกิ่งเชื่อม เพื่อให้เวลาผลร่วงลงมาใน Step 2 ไม่มีภาพผลซ้อนอยู่ข้างหลัง
2. **`Pic/avocado-whole.png.png`** (`2000 × 1695 px`, PNG พื้นหลังโปร่งใส `Format32bppArgb`)
   - **ข้อสังเกต:** ชื่อไฟล์มี `.png.png` ขอบเขตเนื้อภาพจริงอยู่ที่ `minX=21.8%, maxX=77.2%, minY=3.1%, maxY=95.3%` รูปทรงและพื้นผิวคมชัด ใช้เป็นผลหลักลูกเดียวตลอด Step 1–3
3. **`Pic/cutting-board.png.png`** (`2000 × 1333 px`, PNG พื้นหลังโปร่งใส `Format32bppArgb`)
   - **ข้อสังเกต:** ชื่อไฟล์มี `.png.png` เป็นเขียงไม้มุมมอง 3/4 พื้นหลังโปร่งใสสมบูรณ์ ใช้ใน Step 3

### 3.2 ข้อสังเกตและข้อควรระวังของ Asset อื่นๆ สำหรับ Step 4–6
1. **`Pic/avocados-branch-isolated-transparent-background.png`** (`2000 × 2000 px`, PNG โปร่งใส)
   - **ข้อควรระวัง:** ขอบด้านบนและด้านซ้ายของใบไม้ถูกตัดชิดขอบภาพ (`minX=0, minY=0`) หากนำไปวางลอยๆ กลางหน้าจอจะเห็นรอยตัดตรง ต้องวางชิดขอบบน/ขอบขวาของจอเท่านั้น
2. **`Pic/avocado-halves.png.png`** (`2000 × 1538 px`, PNG โปร่งใส)
   - **ข้อควรระวัง:** มีอะโวคาโดทั้ง 2 ซีก (ซีกซ้ายมีเมล็ด และซีกขวาไม่มีเมล็ด) อยู่ในไฟล์เดียวกัน เมื่อพัฒนา Step 4 (แยกซีกซ้าย-ขวา) ให้ใช้ CSS `clip-path: inset(0 50% 0 0)` สำหรับซีกซ้าย และ `clip-path: inset(0 0 0 50%)` สำหรับซีกขวา เพื่อแยกแอนิเมชันแต่ละซีกโดยไม่ทำให้สัดส่วนภาพเพี้ยน
3. **`Pic/human-hand-with-kitchen-knife-isolated-white.png`** (`2000 × 1075 px`, PNG โปร่งใส) และ **`Pic/sleek-stainless-steel-chef39s-knife-icon-representing-culinary-precision-cooking-excellence.png`** (`2000 × 1121 px`, PNG โปร่งใส)
   - พื้นหลังโปร่งใสจริง สามารถนำมาใช้ใน Step 4 (จังหวะมีดผ่าผลอะโวคาโดบนเขียง) ได้ทันที
4. **`Pic/avocado-slices.png.png`** (`2000 × 2000 px`), **`Pic/sliced-avocado-sections-isolated.png`** (`2000 × 1116 px`), และ **`Pic/top-view-fresh-delicious-avocado-slices-isolated-light-green.png`** (`2000 × 1386 px`)
   - พื้นหลังโปร่งใสทั้งหมด เหมาะสำหรับ Step 5–6 (การเรียงสไลซ์และเทลงจานสลัด)
5. **`Pic/salad-plate.png.png`** (`2000 × 1333 px`, PNG โปร่งใส)
   - เป็นชามสลัดไม้ที่ยังไม่มีชิ้นอะโวคาโดวางอยู่ด้านบน เหมาะสำหรับใช้เป็นจานเป้าหมายใน Step 6
6. **ไฟล์ `.jpg` ขนาดใหญ่ 3 ไฟล์ (`hand-cutting.jpg`, `hand-pouring.jpg`, `top-view-female-hands-...-blue.jpg`)**
   - **ข้อควรระวัง:** เป็นภาพถ่าย JPG ที่มีพื้นหลังทึบ (สีฟ้า/เทาเข้ม) และขนาดไฟล์ใหญ่ (9.5 MB – 22.2 MB) ไม่ควรนำมาซ้อนเป็น Sprite ในฉากแอนิเมชันโปร่งใสโดยไม่ไดคัทพื้นหลังออกก่อน

---

## 4. แนวทางเชื่อมต่อ Step 4–6 ในขั้นตอนถัดไป (Phase 2 Handoff Guide)

ในไฟล์ `index.html` ได้เตรียมสถานะส่งต่อไว้ที่ตัวแปรส่วนกลาง `window.MAE_CHAWI_STAGE_STATE` และ DOM container `#phase-2-stage-hook`:

```javascript
// พิกัดสุดท้ายของผลอะโวคาโด (#hero-avocado-wrap) เมื่อจบ Step 3 บนเขียงไม้:
window.MAE_CHAWI_STAGE_STATE.step3FinalState = {
  xPercent: 109.5,
  yPercent: 132.0,
  scale: 1.62,
  rotation: 0
};
```

เมื่อต้องการพัฒนา **Step 4–6** ต่อจาก Step 3:
1. **Step 4 (มีดผ่าและแยกเป็น 2 ซีกบนเขียง):**
   - เคลื่อน `Pic/human-hand-with-kitchen-knife-isolated-white.png` หรือมีดเข้าหาพิกัด `(54.5%, 66%)` ของ `.stage-art`
   - ในจังหวะที่คมมีดผ่านกลางผล ให้ซ่อน `#hero-avocado-wrap` (`autoAlpha: 0`) พร้อมแสดงเลเยอร์ซีกซ้ายและซีกขวาจาก `Pic/avocado-halves.png.png` แยกออกจากกันบนเขียง
2. **Step 5 (หั่นเป็นชิ้นสไลซ์บนเขียง):**
   - เปลี่ยนจากผลผ่าซีกเป็นชิ้นสไลซ์ (`Pic/sliced-avocado-sections-isolated.png` / `Pic/avocado-slices.png.png`) บนเขียง
3. **Step 6 (เทสไลซ์ลงจานสลัด):**
   - เลื่อนเขียงขึ้นด้านบน/เอียงเล็กน้อย และนำ `Pic/salad-plate.png.png` เข้ามารองรับด้านล่าง พร้อมแอนิเมตชิ้นสไลซ์จาก `Pic/top-view-fresh-delicious-avocado-slices-isolated-light-green.png` ลงสู่จานสลัด
