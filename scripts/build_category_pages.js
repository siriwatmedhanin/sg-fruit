/**
 * SG FRUIT — Generator for 3 Dedicated Category SEO Landing Pages
 * Pages:
 * 1. /seasonal-fruits
 * 2. /imported-produce
 * 3. /fresh-vegetables
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PAGES_DATA = [
  {
    slug: 'seasonal-fruits',
    url: 'https://sg-fruit.siriwatmedhanin.com/seasonal-fruits',
    categoryFilter: 'seasonal-fruits',
    categoryName: 'ผลไม้ไทยและผลไม้ตามฤดูกาล',
    title: 'ผลไม้ไทยและผลไม้ตามฤดูกาล คัดสดจากตลาดไท-ตลาดสี่มุมเมือง | SG FRUIT',
    description: 'สั่งซื้อผลไม้ไทยและผลไม้ตามฤดูกาลออนไลน์ คัดสดใหม่วันต่อวันจากตลาดไท ตลาดสี่มุมเมือง และสวนเกษตรกร อาทิ น้อยหน่าเพชรปากช่อง แก้วมังกรภูเรือ แคนตาลูปสวีท อะโวคาโด ส่งด่วนทั่วไทย รองรับ COD รับประกันเคลม 100%',
    eyebrow: 'SEASONAL SELECTION · ผลไม้ไทยและผลไม้ตามฤดูกาล',
    h1: 'ผลไม้ไทยและผลไม้ตามฤดูกาล คัดสดจากตลาดไท ตลาดสี่มุมเมือง และสวนเกษตรกร',
    intro: 'ความอร่อยของผลไม้ไทยอยู่ที่การได้ทานตรงฤดูกาล SG FRUIT คัดสรรผลไม้สดใหม่แบบวันต่อวันจากแหล่งค้าส่งผักผลไม้ชั้นนำอย่าง ตลาดไท และ ตลาดสี่มุมเมือง ควบคู่กับผลผลิตจากสวนคุณภาพทั่วไทย เพื่อให้ทุกบ้านได้ทานผลไม้เนื้อแน่น หวานฉ่ำ เหมือนเดินไปเลือกคัดเองถึงหน้าแผง โดยไม่ต้องเสียเวลาเดินทาง',
    ctaPrimaryText: 'เลือกซื้อผลไม้ตามฤดูกาลเลย ↗',
    ctaPrimaryLink: '/?category=seasonal-fruits#shop',
    h2_1: 'ผลไม้ไทยตามฤดูกาลยอดนิยมที่เราคัดสรร',
    h3_items: [
      {
        badge: 'ยอดนิยมประจำฤดูกาล',
        title: 'น้อยหน่าเพชรปากช่อง เนื้อเยอะ เมล็ดน้อย',
        desc: 'คัดลูกใหญ่ไซซ์สวย เนื้อเหนียวหนึบ หวานหอมเป็นเอกลักษณ์ จัดส่งแบบดิบพร้อมห่อกันกระแทกทุกลูก เพื่อให้ผลไม้ไม่ช้ำระหว่างทางและสุกนิ่มพอดีเมื่อถึงมือลูกค้า'
      },
      {
        badge: 'หวานฉ่ำคลายร้อน',
        title: 'แก้วมังกรภูเรือ และ แคนตาลูปสายพันธุ์สวีท',
        desc: 'แก้วมังกรภูเรือเนื้อขาวแน่น หวานฉ่ำไม่จืดชืด และแคนตาลูปสายพันธุ์สวีทกลิ่นหอมฟุ้ง เนื้อกรอบหวาน เหมาะสำหรับแช่เย็นทานคลายร้อนได้ทั้งครอบครัว'
      },
      {
        badge: 'สดใหม่ตามรอบสวน',
        title: 'อะโวคาโด ฝรั่งกิมจู มะละกอฮอลแลนด์ และผลไม้ตามรอบเก็บเกี่ยว',
        desc: 'หมุนเวียนผลไม้ไทยสดใหม่ตลอดปี ทั้งอะโวคาโดเนื้อเนียนมัน ฝรั่งกิมจูกรอบหวาน พุทรานมสด กล้วยหอมทอง และเสาวรสไทนุง คัดตามรอบฤดูกาลจริงเพื่อให้ได้รสชาติที่ดีที่สุด'
      }
    ],
    h2_2: 'เคล็ดลับการคัดระดับความสุกและการดูแลผลไม้หลังได้รับ',
    bullets: [
      {
        title: 'คัดระดับความสุกให้เหมาะกับระยะทางขนส่ง:',
        desc: 'ผลไม้บางชนิด เช่น น้อยหน่าหรืออะโวคาโด จะคัดแบบแก่จัดแต่ยังไม่นิ่ม เพื่อป้องกันการกระแทกช้ำระหว่างเดินทางข้ามจังหวัด'
      },
      {
        title: 'การบ่มให้หวานพอดีคำ:',
        desc: 'หากได้รับผลไม้แบบห่ามหรือดิบ ให้วางไว้ที่อุณหภูมิห้องในที่อากาศถ่ายเท 1–3 วัน เมื่อจับดูแล้วนิ่มเล็กน้อยจึงค่อยนำเข้าตู้เย็น'
      },
      {
        title: 'แพ็กกันกระแทกทุกกล่อง:',
        desc: 'ห่อตาข่ายโฟมและจัดเรียงลดช่องว่างภายในกล่อง จัดส่งด่วนทั่วไทย พร้อมรับประกันเคลม 100% หากเสียหายจากการขนส่ง'
      }
    ],
    h2_3: 'คำถามที่พบบ่อยเกี่ยวกับผลไม้ตามฤดูกาล (FAQ)',
    faqs: [
      {
        q: 'สั่งผลไม้ไทยตามฤดูกาลออนไลน์จะช้ำหรือเละระหว่างส่งไหม?',
        a: 'ไม่ต้องกังวลครับ ทีมงานคัดระดับความสุกของผลไม้แต่ละชนิดให้เหมาะกับการขนส่ง พร้อมห่อกันกระแทกทุกลูก และมีนโยบายรับประกันเคลม 100% หากเกิดความเสียหายจากการขนส่ง'
      },
      {
        q: 'ผลไม้ของ SG FRUIT สดแค่ไหน คัดมาจากแหล่งไหน?',
        a: 'เราคัดซื้อผลไม้สดใหม่วันต่อวันจากตลาดไท ตลาดสี่มุมเมือง และสวนเกษตรกรคู่ค้า ไม่เก็บสต็อกค้างเก่า เพื่อให้ได้ผลไม้ที่สดและเก็บไว้ทานต่อได้นานที่สุด'
      },
      {
        q: 'สั่งผลไม้หลายอย่างคละกันในออเดอร์เดียวและเก็บเงินปลายทางได้ไหม?',
        a: 'ได้ครับ สามารถกดเลือกผลไม้ไทย ผลไม้นำเข้า และผักสดลงตะกร้ารวมกันได้ในออเดอร์เดียว รองรับทั้งการโอนเงินผ่านบัญชีและเก็บเงินปลายทาง (COD)'
      }
    ],
    otherCategories: [
      {
        slug: 'imported-produce',
        title: 'ผลไม้นำเข้าและแหล่งคัดสรรตลาดไท-สี่มุมเมือง',
        desc: 'รวบรวมผลไม้นำเข้าและผลไม้คัดเกรดพิเศษจากแหล่งค้าส่งชั้นนำ ผ่านการดูแลอย่างพิถีพิถัน'
      },
      {
        slug: 'fresh-vegetables',
        title: 'ผักสดสะอาดเพื่อสุขภาพ',
        desc: 'ผักสดและชุดสลัดพร้อมสำหรับปรุงอาหารและจัดจานสุขภาพในทุกวันของคุณ'
      }
    ]
  },
  {
    slug: 'imported-produce',
    url: 'https://sg-fruit.siriwatmedhanin.com/imported-produce',
    categoryFilter: 'imported-produce',
    categoryName: 'ผลไม้นำเข้าและแหล่งคัดสรรตลาดไท-สี่มุมเมือง',
    title: 'ผลไม้นำเข้าพรีเมียม คัดเกรดตรงจากตลาดไทและตลาดสี่มุมเมือง | SG FRUIT',
    description: 'รวมผลไม้นำเข้าและวัตถุดิบต่างประเทศเกรดพรีเมียม คัดสดใหม่ทุกวันจากศูนย์ค้าส่งตลาดไทและตลาดสี่มุมเมือง อาทิ มันหวานญี่ปุ่นเบนิฮารุกะแท้ รากบัวนำเข้า พร้อมแพ็กกันกระแทกส่งด่วนทั่วไทย',
    eyebrow: 'PREMIUM IMPORTED · ผลไม้นำเข้าและวัตถุดิบคัดเกรด',
    h1: 'ผลไม้นำเข้าพรีเมียมและวัตถุดิบคัดเกรด ส่งตรงจากแหล่งค้าส่งตลาดไท-ตลาดสี่มุมเมือง',
    intro: 'การเลือกซื้อผลไม้นำเข้าและวัตถุดิบต่างประเทศให้ได้รสชาติแท้และคุ้มค่า ต้องอาศัยความเชี่ยวชาญในการดูล็อตสินค้า SG FRUIT ลงพื้นที่คัดสรรผลไม้นำเข้าและผักนำเข้าเกรดพรีเมียมด้วยตัวเองทุกวัน ณ ตลาดไท และ ตลาดสี่มุมเมือง ซึ่งเป็นศูนย์กลางนำเข้าและกระจายผลไม้ต่างประเทศที่ใหญ่ที่สุดในไทย เพื่อคัดเฉพาะล็อตเข้าใหม่ที่เนื้อแน่น สด และรสชาติตรงปก',
    ctaPrimaryText: 'เลือกซื้อผลไม้นำเข้าคัดเกรดเลย ↗',
    ctaPrimaryLink: '/?category=imported-produce#shop',
    h2_1: 'ไฮไลต์ผลไม้นำเข้าและวัตถุดิบต่างประเทศขายดี',
    h3_items: [
      {
        badge: 'สินค้านำเข้าขายดี',
        title: 'มันหวานญี่ปุ่น เบนิฮารุกะ (Beniharuka) แท้นำเข้า',
        desc: 'ยกลังและแบ่งขายคัดหัวสวย เนื้อสีเหลืองทอง รสหวานฉ่ำธรรมชาติ เนื้อนุ่มหนึบ จะนำไปอบ เผา หรือเข้าหม้อทอดไร้น้ำมันก็หอมหวานอร่อยโดยไม่ต้องปรุงเพิ่ม'
      },
      {
        badge: 'สดกรอบเกรดพรีเมียม',
        title: 'รากบัวนำเข้า เกรดพรีเมียม สดกรอบ',
        desc: 'คัดหัวอวบใหญ่ เนื้อสีขาวนวล กรอบฉ่ำ ไม่ฝาด เหมาะสำหรับนำไปต้มน้ำซุป ตุ๋นกระดูกหมู ผัด หรือทำเมนูของหวานเชื่อม'
      },
      {
        badge: 'หมุนเวียนตามฤดูกาลต่างประเทศ',
        title: 'ผลไม้เมืองหนาวและวัตถุดิบนำเข้าตามฤดูกาล',
        desc: 'คัดสรรผลไม้นำเข้าและวัตถุดิบพรีเมียมหมุนเวียนตามรอบเรือและรอบเครื่องบิน เช่น ฟักทองมินิบอล และผลไม้เมืองหนาวรสหวานกรอบ คัดเช็กสภาพผิวและน้ำหนักจริงก่อนส่งทุกกล่อง'
      }
    ],
    h2_2: 'ข้อดีของการคัดผลไม้นำเข้าจากตลาดไทและตลาดสี่มุมเมืองทุกวัน',
    bullets: [
      {
        title: 'ได้สินค้าล็อตเข้าใหม่เสมอ:',
        desc: 'ตลาดไทและตลาดสี่มุมเมืองมีตู้คอนเทนเนอร์ผลไม้นำเข้าหมุนเวียนเข้าใหม่ตลอดสัปดาห์ ทำให้เราคัดเลือกของสดใหม่ได้ก่อนใคร'
      },
      {
        title: 'เช็กคุณภาพด้วยตาเปล่าทุกชิ้น:',
        desc: 'ทีมงานคัดแยกสินค้าที่มีตำหนิหรือช้ำออกก่อนแพ็ก ไม่สุ่มหยิบส่งแบบยกกล่องโดยไม่ตรวจเช็ก'
      },
      {
        title: 'ราคาคุ้มค่า ส่งตรงถึงหน้าบ้าน:',
        desc: 'ไม่ต้องขับรถฝ่ารถติดไปเดินซื้อเอง แค่กดสั่งผ่านเว็บ SG FRUIT ก็รอรับของเกรดคัดพิเศษถึงหน้าบ้านได้ทั่วไทย'
      }
    ],
    h2_3: 'คำถามที่พบบ่อยเกี่ยวกับผลไม้นำเข้า (FAQ)',
    faqs: [
      {
        q: 'มันหวานญี่ปุ่นเบนิฮารุกะของ SG FRUIT เก็บได้นานกี่วัน?',
        a: 'แนะนำให้เก็บในที่แห้ง อากาศถ่ายเท ไม่โดนแสงแดดโดยตรง หรือแช่ตู้เย็นช่องผัก จะสามารถเก็บความสดและความหวานไว้ได้นานประมาณ 1–2 สัปดาห์ครับ'
      },
      {
        q: 'ผลไม้นำเข้าที่คัดจากตลาดไทและตลาดสี่มุมเมืองต่างจากการซื้อตามห้างอย่างไร?',
        a: 'เราคัดตรงจากรอบสินค้าเข้าใหม่ของแหล่งค้าส่งใหญ่โดยไม่ผ่านการวางโชว์บนชั้นวางนานๆ ทำให้ได้ความสดใหม่ เนื้อแน่น และราคาที่คุ้มค่ากว่าเมื่อเทียบกับคุณภาพและน้ำหนักครับ'
      },
      {
        q: 'หากได้รับผลไม้นำเข้าแล้วพบว่าเน่าเสียด้านในหรือช้ำจากการขนส่ง เคลมได้ไหม?',
        a: 'เคลมได้ 100% ครับ เพียงถ่ายภาพหรือวิดีโอตอนเปิดกล่องแล้วแจ้งแอดมินผ่าน LINE Official Account ของ SG FRUIT ทางร้านพร้อมดูแลเคลมให้ทันที'
      }
    ],
    otherCategories: [
      {
        slug: 'seasonal-fruits',
        title: 'ผลไม้ไทยและผลไม้ตามฤดูกาล',
        desc: 'คัดสรรผลไม้ไทยคุณภาพดีประจำฤดูกาล ส่งมอบความสดใหม่ที่เหมาะกับทุกมื้อของครอบครัว'
      },
      {
        slug: 'fresh-vegetables',
        title: 'ผักสดสะอาดเพื่อสุขภาพ',
        desc: 'ผักสดและชุดสลัดพร้อมสำหรับปรุงอาหารและจัดจานสุขภาพในทุกวันของคุณ'
      }
    ]
  },
  {
    slug: 'fresh-vegetables',
    url: 'https://sg-fruit.siriwatmedhanin.com/fresh-vegetables',
    categoryFilter: 'fresh-vegetables',
    categoryName: 'ผักสดสะอาดเพื่อสุขภาพ',
    title: 'ผักสดสะอาดเพื่อสุขภาพ ผักสลัดและซูเปอร์ฟู้ด คัดสดจากตลาดไท-สี่มุมเมือง | SG FRUIT',
    description: 'ซื้อผักสดออนไลน์และซูเปอร์ฟู้ดเพื่อสุขภาพ คัดสดใหม่ทุกเช้าจากตลาดไทและตลาดสี่มุมเมือง อาทิ บีทรูทสด ผักเคล กะหล่ำปลีม่วง กะหล่ำดาว แรดิช หน่อไม้ฝรั่ง ส่งด่วนทั่วไทย พร้อมรับประกันเคลม 100%',
    eyebrow: 'FRESH VEGETABLES & SUPERFOOD · ผักสดสะอาดเพื่อสุขภาพ',
    h1: 'ผักสดสะอาดเพื่อสุขภาพและซูเปอร์ฟู้ด คัดสดใหม่ทุกวันจากตลาดไท-ตลาดสี่มุมเมือง',
    intro: 'จุดเริ่มต้นของมื้ออาหารสุขภาพดีคือวัตถุดิบที่สดและสะอาด SG FRUIT คัดสรรผักสด ผักเมืองหนาว และผักซูเปอร์ฟู้ดแบบวันต่อวันจากแหล่งรวมผักสดชั้นนำอย่าง ตลาดไท และ ตลาดสี่มุมเมือง ตอบโจทย์ทั้งสายทำน้ำผักผลไม้สกัดเย็น คนทานอาหารคลีน สายคีโต ไปจนถึงครัวเรือนที่อยากได้ผักสดใบสวยกรอบอร่อยส่งตรงถึงบ้าน',
    ctaPrimaryText: 'เลือกซื้อผักสดเพื่อสุขภาพเลย ↗',
    ctaPrimaryLink: '/?category=fresh-vegetables#shop',
    h2_1: 'หมวดผักสดเพื่อสุขภาพและซูเปอร์ฟู้ดยอดนิยม',
    h3_items: [
      {
        badge: 'สายปั่น & สกัดเย็น',
        title: 'บีทรูทสด และ แรดิช สำหรับสายปั่นและสกัดเย็น',
        desc: 'บีทรูทสดเนื้อแข็งสีแดงสด ปลูกในไทย คัดหัวแน่นไม่ฝ่อ เหมาะสำหรับคั้นน้ำสกัดเย็น ปั่นสมูทตี้ หรืออบทานคู่สลัด พร้อมแรดิชสดกรอบสีสวยเพิ่มสีสันให้จานอาหาร'
      },
      {
        badge: 'ไฟเบอร์สูง ต้านอนุมูลอิสระ',
        title: 'ผักเคล (Kale), กะหล่ำปลีม่วง และ กะหล่ำดาว (Brussels Sprouts)',
        desc: 'กลุ่มผักตระกูลกะหล่ำและซูเปอร์ฟู้ดไฟเบอร์สูง คัดใบเขียวสด หัวแน่น ไม่เหี่ยวช้ำ เหมาะทั้งทำสลัดสด อบน้ำมันมะกอก หรือผัดคลีน'
      },
      {
        badge: 'ผักสดประจำครัวเรือน',
        title: 'ผักสดทำอาหารประจำบ้านและผักเมืองหนาว',
        desc: 'ครบครันทั้งหน่อไม้ฝรั่ง เบบี้แครอท บร็อกโคลี แตงกวาญี่ปุ่น ผักกาดขาวลุย ดอกกะหล่ำ กระเจี๊ยบเขียว และกระชายขาว คัดใหม่ทุกเช้าเพื่อให้ได้ความกรอบหวานตามธรรมชาติ'
      }
    ],
    h2_2: 'วิธีเก็บผักสดให้กรอบนานและคงคุณค่าสารอาหาร',
    bullets: [
      {
        title: 'จัดการความชื้นก่อนแช่เย็น:',
        desc: 'เมื่อได้รับผักสด ให้ผึ่งลมเล็กน้อยหากมีไอน้ำเกาะ จากนั้นห่อด้วยกระดาษทิชชู่ซับน้ำแล้วใส่ถุงซิปล็อกหรือกล่องปิดฝาแช่ช่องผัก จะช่วยยืดความกรอบได้นานขึ้น'
      },
      {
        title: 'ล้างเฉพาะส่วนที่จะทาน:',
        desc: 'ผักใบอย่างผักเคลหรือผักสลัด ควรล้างน้ำให้สะอาดเฉพาะปริมาณที่จะปรุงในแต่ละมื้อ เพื่อไม่ให้ใบช้ำหรือเน่าง่าย'
      },
      {
        title: 'แยกเก็บผักหัวกับผักใบ:',
        desc: 'ผักหัวอย่างบีทรูท แครอท หรือกะหล่ำปลี เก็บได้นานกว่าผักใบ แนะนำให้แยกถุงเก็บเพื่อรักษาความสดได้เต็มที่'
      }
    ],
    h2_3: 'คำถามที่พบบ่อยเกี่ยวกับการสั่งผักสดออนไลน์ (FAQ)',
    faqs: [
      {
        q: 'สั่งผักสดออนไลน์ส่งต่างจังหวัด ผักจะเหี่ยวหรือเน่าไหม?',
        a: 'เราคัดผักสดรอบใหม่ล่าสุดจากตลาดไทและตลาดสี่มุมเมืองในวันที่จัดส่ง พร้อมแพ็กแบบระบายอากาศและกันกระแทกให้เหมาะกับผักแต่ละชนิด จัดส่งด่วนทั่วไทย หากเสียหายจากการขนส่งรับประกันเคลม 100% ครับ'
      },
      {
        q: 'มีผักสำหรับทำน้ำผักผลไม้ปั่นหรือสกัดเย็นครบไหม?',
        a: 'ครบเลยครับ เรามีทั้งบีทรูทสด ผักเคล เบบี้แครอท กะหล่ำปลีม่วง แรดิช รวมถึงผลไม้สดอย่างฝรั่ง แคนตาลูป และเสาวรส สามารถกดสั่งรวมในตะกร้าเดียวกันได้เลย'
      },
      {
        q: 'ต้องการสั่งผักสดจำนวนมากสำหรับร้านอาหารหรือใช้ประจำได้ไหม?',
        a: 'ได้ครับ สามารถกดสั่งผ่านหน้าเว็บ SG FRUIT ได้ทันที หรือทักสอบถามราคาและรอบส่งประจำผ่าน LINE Official Account ของทางร้านได้เลยครับ'
      }
    ],
    otherCategories: [
      {
        slug: 'seasonal-fruits',
        title: 'ผลไม้ไทยและผลไม้ตามฤดูกาล',
        desc: 'คัดสรรผลไม้ไทยคุณภาพดีประจำฤดูกาล ส่งมอบความสดใหม่ที่เหมาะกับทุกมื้อของครอบครัว'
      },
      {
        slug: 'imported-produce',
        title: 'ผลไม้นำเข้าและแหล่งคัดสรรตลาดไท-สี่มุมเมือง',
        desc: 'รวบรวมผลไม้นำเข้าและผลไม้คัดเกรดพิเศษจากแหล่งค้าส่งชั้นนำ ผ่านการดูแลอย่างพิถีพิถัน'
      }
    ]
  }
];

function generateHtml(page) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a
      }
    }))
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'หน้าแรก',
        item: 'https://sg-fruit.siriwatmedhanin.com/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'เกี่ยวกับ SG FRUIT',
        item: 'https://sg-fruit.siriwatmedhanin.com/#about'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: page.categoryName,
        item: page.url
      }
    ]
  };

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#f7f5e9" />
  <title>${page.title}</title>
  <meta name="description" content="${page.description}" />
  <link rel="canonical" href="${page.url}" />

  <!-- Open Graph / Facebook / LINE -->
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="th_TH" />
  <meta property="og:site_name" content="SG FRUIT โดย บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด" />
  <meta property="og:url" content="${page.url}" />
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:image" content="https://sg-fruit.siriwatmedhanin.com/Pic/sg-fruit-logo.webp" />
  <meta property="og:image:secure_url" content="https://sg-fruit.siriwatmedhanin.com/Pic/sg-fruit-logo.webp" />
  <meta property="og:image:type" content="image/webp" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:image:alt" content="SG FRUIT - ${page.categoryName}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.title}" />
  <meta name="twitter:description" content="${page.description}" />
  <meta name="twitter:image" content="https://sg-fruit.siriwatmedhanin.com/Pic/sg-fruit-logo.webp" />

  <!-- JSON-LD Structured Data: BreadcrumbList -->
  <script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
  </script>

  <!-- JSON-LD Structured Data: FAQPage -->
  <script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Noto+Sans+Thai:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />

  <style>
    :root {
      --ink: #183526;
      --ink-soft: #355844;
      --muted: #5c7265;
      --cream-1: #f7f5e9;
      --cream-2: #f4efe0;
      --cream-3: #f8eed9;
      --sage: #739938;
      --forest: #214d34;
      --forest-dark: #163623;
      --wood: #9e6b43;
      --line: rgba(24, 53, 38, 0.11);
      --card-bg: #fffef9;
      --header-h: 78px;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--cream-1);
      color: var(--ink);
      font-family: "Plus Jakarta Sans", "Noto Sans Thai", Tahoma, sans-serif;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    button, a, input, select { font: inherit; color: inherit; }
    button { cursor: pointer; }
    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
      outline: 3px solid var(--sage);
      outline-offset: 3px;
    }

    /* HEADER & NAV */
    .header {
      height: var(--header-h);
      position: fixed;
      z-index: 120;
      left: 0;
      right: 0;
      top: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 clamp(18px, 4vw, 64px);
      border-bottom: 1px solid var(--line);
      background: rgba(247, 245, 233, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .brand {
      display: flex;
      align-items: center;
      text-decoration: none;
      gap: 12px;
      flex-shrink: 0;
    }
    .brand-mark {
      width: 48px;
      height: 48px;
      background: transparent;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 50%;
      display: block;
    }
    .brand-name {
      display: block;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.05em;
      line-height: 1;
      color: var(--forest);
    }
    .brand-sub {
      display: block;
      font-size: 11px;
      color: var(--muted);
      letter-spacing: 0.08em;
      margin-top: 3px;
    }
    .nav {
      display: flex;
      align-items: center;
      gap: clamp(14px, 1.8vw, 24px);
    }
    .nav-link {
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      color: var(--ink-soft);
      padding: 8px 12px;
      border-radius: 999px;
      white-space: nowrap;
      transition: color 0.2s, background 0.2s;
    }
    .nav-link:hover, .nav-link.is-active {
      color: var(--forest);
      background: rgba(115, 153, 56, 0.12);
    }
    .nav-cart-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      border: 1px solid rgba(33, 77, 52, 0.25);
      background: var(--forest);
      color: #fff;
      font-weight: 700;
      font-size: 13.5px;
      transition: background 0.2s, transform 0.15s;
    }
    .nav-cart-btn:hover {
      background: var(--forest-dark);
      transform: translateY(-1px);
    }
    .cart-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: #e6b88a;
      color: #183526;
      font-size: 11px;
      font-weight: 800;
    }
    .nav-admin-divider {
      width: 1px;
      height: 24px;
      background: rgba(33, 77, 52, 0.18);
      margin: 0 2px;
      flex-shrink: 0;
    }
    .nav-admin-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(33, 77, 52, 0.2);
      background: rgba(255, 255, 255, 0.6);
      color: var(--ink-soft);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
    }
    .nav-admin-btn:hover {
      background: #ffffff;
      color: var(--forest);
      border-color: var(--forest);
    }
    .mobile-menu-toggle {
      display: none;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: 1px solid rgba(33, 77, 52, 0.2);
      background: #fff;
      color: var(--forest);
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    /* MOBILE NAV DRAWER */
    .mobile-nav-drawer {
      display: none;
      position: fixed;
      top: var(--header-h);
      left: 0;
      right: 0;
      z-index: 119;
      background: rgba(247, 245, 233, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--line);
      padding: 14px 20px 20px;
      box-shadow: 0 16px 32px rgba(24, 53, 38, 0.12);
      flex-direction: column;
      gap: 6px;
    }
    .mobile-nav-drawer.is-open { display: flex; }
    .mobile-nav-drawer a, .mobile-nav-drawer button {
      text-align: left;
      padding: 11px 14px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      color: var(--ink);
      border: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mobile-nav-drawer a:hover, .mobile-nav-drawer button:hover {
      background: rgba(115, 153, 56, 0.14);
    }
    .mobile-drawer-divider {
      height: 1px;
      background: var(--line);
      margin: 6px 0;
    }

    /* SEO LANDING MAIN LAYOUT */
    .seo-page-main {
      padding-top: calc(var(--header-h) + 20px);
      min-height: 100vh;
    }

    /* BREADCRUMBS */
    .seo-breadcrumb-bar {
      max-width: 1120px;
      margin: 0 auto;
      padding: 12px 24px;
    }
    .seo-breadcrumb-list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 13.5px;
      color: var(--muted);
    }
    .seo-breadcrumb-item a {
      color: var(--muted);
      text-decoration: none;
      transition: color 0.15s;
    }
    .seo-breadcrumb-item a:hover {
      color: var(--forest);
      text-decoration: underline;
    }
    .seo-breadcrumb-item.is-current {
      color: var(--forest);
      font-weight: 700;
    }
    .seo-breadcrumb-sep {
      color: rgba(33, 77, 52, 0.35);
      font-size: 12px;
    }

    /* HERO SECTION */
    .seo-hero {
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px 24px 48px;
    }
    .seo-hero-card {
      background: linear-gradient(135deg, #fffef9 0%, #fdfbf3 100%);
      border: 1px solid rgba(33, 77, 52, 0.12);
      border-radius: 28px;
      padding: clamp(28px, 5vw, 56px);
      box-shadow: 0 12px 36px rgba(33, 77, 52, 0.05);
      position: relative;
      overflow: hidden;
    }
    .seo-hero-card::after {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 240px;
      height: 240px;
      background: radial-gradient(circle, rgba(115, 153, 56, 0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .seo-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(115, 153, 56, 0.14);
      color: var(--forest);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 18px;
      text-transform: uppercase;
    }
    .seo-title {
      font-family: "Cormorant Garamond", Georgia, "Noto Sans Thai", serif;
      font-size: clamp(32px, 4.4vw, 48px);
      line-height: 1.25;
      font-weight: 700;
      color: var(--forest);
      margin: 0 0 20px;
      letter-spacing: -0.01em;
    }
    .seo-intro {
      font-size: clamp(16px, 1.8vw, 18px);
      line-height: 1.85;
      color: var(--ink-soft);
      margin: 0 0 32px;
      max-width: 900px;
    }
    .seo-hero-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn-primary-cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--forest);
      color: #fff;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 999px;
      box-shadow: 0 8px 24px rgba(33, 77, 52, 0.22);
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    }
    .btn-primary-cta:hover {
      background: var(--forest-dark);
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(33, 77, 52, 0.3);
    }
    .btn-secondary-outline {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: var(--forest);
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 13px 26px;
      border-radius: 999px;
      border: 1.5px solid rgba(33, 77, 52, 0.3);
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }
    .btn-secondary-outline:hover {
      background: rgba(33, 77, 52, 0.06);
      border-color: var(--forest);
      transform: translateY(-1px);
    }

    /* SECTION CONTAINERS */
    .seo-section {
      max-width: 1120px;
      margin: 0 auto;
      padding: 36px 24px;
    }
    .seo-section-header {
      margin-bottom: 28px;
    }
    .seo-section-title {
      font-size: clamp(24px, 3vw, 32px);
      font-weight: 800;
      color: var(--forest);
      margin: 0 0 8px;
      line-height: 1.35;
    }
    .seo-section-sub {
      font-size: 15px;
      color: var(--muted);
      margin: 0;
    }

    /* H3 CARDS GRID */
    .seo-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .seo-feature-card {
      background: #fffef9;
      border: 1px solid rgba(33, 77, 52, 0.11);
      border-radius: 22px;
      padding: 28px 24px;
      transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
      display: flex;
      flex-direction: column;
    }
    .seo-feature-card:hover {
      transform: translateY(-4px);
      border-color: rgba(33, 77, 52, 0.28);
      box-shadow: 0 16px 36px rgba(33, 77, 52, 0.08);
    }
    .seo-card-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 11px;
      font-weight: 800;
      color: #739938;
      background: rgba(115, 153, 56, 0.12);
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 14px;
    }
    .seo-card-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--ink);
      margin: 0 0 10px;
      line-height: 1.45;
    }
    .seo-card-desc {
      font-size: 14.5px;
      line-height: 1.75;
      color: var(--muted);
      margin: 0;
      flex: 1;
    }

    /* TIPS BULLET CARDS */
    .seo-tips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }
    .seo-tip-card {
      background: var(--cream-2);
      border: 1px solid rgba(33, 77, 52, 0.12);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .seo-tip-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--forest);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .seo-tip-content strong {
      display: block;
      font-size: 16px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .seo-tip-content p {
      font-size: 14px;
      line-height: 1.65;
      color: var(--muted);
      margin: 0;
    }

    /* FAQ ACCORDION */
    .seo-faq-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .faq-item {
      background: #fffef9;
      border: 1px solid rgba(33, 77, 52, 0.12);
      border-radius: 18px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .faq-item[open] {
      border-color: rgba(33, 77, 52, 0.28);
      box-shadow: 0 8px 24px rgba(33, 77, 52, 0.06);
    }
    .faq-question {
      padding: 20px 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 16.5px;
      font-weight: 700;
      color: var(--forest);
      list-style: none;
      user-select: none;
    }
    .faq-question::-webkit-details-marker { display: none; }
    .faq-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(33, 77, 52, 0.08);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--forest);
      flex-shrink: 0;
      transition: transform 0.2s;
    }
    .faq-item[open] .faq-icon {
      transform: rotate(180deg);
      background: var(--forest);
      color: #fff;
    }
    .faq-answer {
      padding: 0 24px 22px;
      font-size: 15px;
      line-height: 1.8;
      color: var(--ink-soft);
      border-top: 1px solid rgba(33, 77, 52, 0.06);
      margin-top: -4px;
      padding-top: 16px;
    }

    /* BOTTOM CTA BANNER */
    .seo-cta-banner {
      background: linear-gradient(135deg, #1b432c 0%, #153824 100%);
      color: #fff;
      border-radius: 28px;
      padding: clamp(36px, 6vw, 64px) 32px;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 48px rgba(21, 56, 36, 0.28);
      margin: 20px 0 36px;
    }
    .seo-cta-banner h2 {
      font-family: "Cormorant Garamond", Georgia, "Noto Sans Thai", serif;
      font-size: clamp(28px, 4vw, 40px);
      font-weight: 700;
      margin: 0 0 14px;
      color: #fff;
    }
    .seo-cta-banner p {
      font-size: clamp(15px, 1.8vw, 17px);
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.85);
      max-width: 680px;
      margin: 0 auto 30px;
    }
    .seo-cta-banner .btn-primary-cta {
      background: #e6b88a;
      color: #183526;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .seo-cta-banner .btn-primary-cta:hover {
      background: #f0caa2;
      transform: translateY(-2px);
    }
    .seo-cta-banner .btn-secondary-outline {
      color: #fff;
      border-color: rgba(255, 255, 255, 0.45);
    }
    .seo-cta-banner .btn-secondary-outline:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: #fff;
    }

    /* OTHER CATEGORIES GRID */
    .seo-other-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    .about-pillar {
      display: block;
      text-decoration: none;
      background: var(--cream-1);
      border: 1px solid rgba(33, 77, 52, 0.10);
      border-radius: 20px;
      padding: 20px 22px;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      color: inherit;
    }
    .about-pillar:hover, .about-pillar:focus-visible {
      transform: translateY(-2px);
      border-color: rgba(33, 77, 52, 0.28);
      box-shadow: 0 8px 20px rgba(33, 77, 52, 0.08);
      outline: none;
    }
    .about-pillar strong {
      display: block;
      font-size: 16px;
      color: var(--ink);
      margin-bottom: 6px;
      transition: color 0.2s ease;
    }
    .about-pillar:hover strong {
      color: var(--forest);
    }
    .about-pillar span {
      display: block;
      font-size: 13.5px;
      color: var(--muted);
      line-height: 1.6;
    }
    .about-pillar-more {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--forest);
      margin-top: 10px;
      transition: transform 0.2s ease;
    }
    .about-pillar:hover .about-pillar-more {
      transform: translateX(3px);
    }

    /* FOOTER */
    .site-footer {
      background: #142e20;
      color: rgba(255, 255, 255, 0.82);
      padding: 56px clamp(18px, 4vw, 64px) 28px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin-top: 48px;
    }
    .footer-grid {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1.3fr;
      gap: clamp(24px, 3.5vw, 48px);
      padding-bottom: 40px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .footer-brand strong {
      display: block;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 26px;
      color: #fff;
    }
    .footer-brand-th {
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }
    .footer-brand-group {
      display: block;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }
    .footer-desc {
      font-size: 13.5px;
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
    .footer-col h4 {
      font-size: 14.5px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 16px;
      letter-spacing: 0.04em;
    }
    .footer-links {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .footer-links a, .footer-links button {
      color: rgba(255, 255, 255, 0.75);
      text-decoration: none;
      font-size: 13.5px;
      background: transparent;
      border: 0;
      padding: 0;
      text-align: left;
      cursor: pointer;
      transition: color 0.15s;
    }
    .footer-links a:hover, .footer-links button:hover {
      color: #fff;
    }
    .footer-contact-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .footer-contact-item {
      font-size: 13.5px;
    }
    .contact-label {
      display: block;
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.55);
      margin-bottom: 2px;
    }
    .contact-value {
      color: #fff;
      text-decoration: none;
      font-weight: 600;
    }
    .footer-contact-item small {
      display: block;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 3px;
    }
    .footer-corp-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: rgba(255, 255, 255, 0.75);
      text-decoration: none;
      transition: color 0.15s;
    }
    .footer-corp-link:hover { color: #fff; }
    .social-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.15s, border-color 0.15s;
    }
    .social-pill-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .social-pill-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .footer-bottom {
      max-width: 1200px;
      margin: 24px auto 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.55);
      flex-wrap: wrap;
      gap: 12px;
    }
    .footer-corp-link-muted {
      color: rgba(255, 255, 255, 0.75);
      text-decoration: none;
    }
    .footer-corp-link-muted:hover { color: #fff; }
    .footer-policies {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-policy-btn {
      background: transparent;
      border: 0;
      color: rgba(255, 255, 255, 0.65);
      font-size: 12.5px;
      padding: 0;
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s;
    }
    .footer-policy-btn:hover { color: #fff; }

    /* CART DRAWER & MODALS */
    .cart-drawer {
      position: fixed;
      inset: 0;
      z-index: 220;
      pointer-events: none;
      visibility: hidden;
      transition: visibility 0.3s;
    }
    .cart-drawer.is-open {
      pointer-events: auto;
      visibility: visible;
    }
    .cart-drawer-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 34, 23, 0.48);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .cart-drawer.is-open .cart-drawer-backdrop { opacity: 1; }
    .cart-drawer-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(100vw, 440px);
      background: var(--cream-1);
      border-left: 1px solid var(--line);
      box-shadow: -20px 0 50px rgba(15, 34, 23, 0.22);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .cart-drawer.is-open .cart-drawer-panel { transform: translateX(0); }
    .cart-drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fffef9;
    }
    .cart-drawer-title {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cart-drawer-close {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(33, 77, 52, 0.16);
      background: #fff;
      color: var(--ink-soft);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .cart-drawer-trust-note {
      padding: 10px 20px;
      background: #eef5e4;
      border-bottom: 1px solid rgba(33, 77, 52, 0.08);
      font-size: 12px;
      color: var(--forest);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .cart-trust-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cart-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
    }
    .cart-drawer-items {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .cart-drawer-empty {
      text-align: center;
      padding: 40px 10px;
      color: var(--muted);
    }
    .cart-drawer-empty-icon {
      margin-bottom: 12px;
      color: rgba(33, 77, 52, 0.3);
    }
    .cart-drawer-footer {
      padding: 18px 24px 22px;
      border-top: 1px solid var(--line);
      background: #fffef9;
    }
    .cart-summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .cart-summary-row.is-total {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      margin-bottom: 16px;
    }
    .cart-footer-actions {
      display: flex;
      gap: 10px;
    }
    .cart-clear-btn {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(33, 77, 52, 0.18);
      background: #fff;
      color: var(--ink-soft);
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .cart-checkout-btn {
      flex: 1;
      padding: 12px 18px;
      border-radius: 14px;
      border: 0;
      background: var(--forest);
      color: #fff;
      font-weight: 700;
      font-size: 14.5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    /* MODAL OVERLAYS */
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 230;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      pointer-events: none;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.25s, visibility 0.25s;
    }
    .modal-overlay.is-open,
    .modal-overlay.is-active {
      pointer-events: auto;
      visibility: visible;
      opacity: 1;
    }
    .modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 34, 23, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      opacity: 0;
      transition: opacity 0.25s;
    }
    .modal-overlay.is-open .modal-backdrop,
    .modal-overlay.is-active .modal-backdrop {
      opacity: 1;
    }
    .modal-dialog {
      position: relative;
      z-index: 2;
      width: min(100%, 760px);
      max-height: 90svh;
      overflow-y: auto;
      background: #fffef9;
      border: 1px solid rgba(33, 77, 52, 0.16);
      border-radius: 28px;
      padding: clamp(22px, 3.5vw, 36px);
      box-shadow: 0 24px 64px rgba(15, 34, 23, 0.28);
      transform: translateY(16px) scale(0.98);
      opacity: 0;
      transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .modal-overlay.is-open .modal-dialog,
    .modal-overlay.is-active .modal-dialog {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .modal-close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(33, 77, 52, 0.16);
      background: #fff;
      color: var(--ink-soft);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
    }
    .toast {
      position: fixed;
      bottom: 26px;
      left: 50%;
      transform: translate(-50%, 30px);
      background: #1c4630;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.5;
      padding: 12px 22px;
      border-radius: 999px;
      box-shadow: 0 16px 40px rgba(15, 34, 23, 0.35);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.25s ease, opacity 0.25s ease;
      z-index: 300;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      max-width: min(90vw, 520px);
      text-align: center;
    }
    .toast .ui-icon {
      color: #bbf77b;
      width: 16px;
      height: 16px;
    }
    .toast.show {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    /* CHECKOUT & ORDER SUMMARY FORM */
    .checkout-form-section {
      background: #fff;
      border: 1px solid rgba(33, 77, 52, 0.12);
      border-radius: 18px;
      padding: 18px 20px;
      margin-bottom: 16px;
    }
    .checkout-section-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--forest);
      margin: 0 0 14px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checkout-section-title svg {
      width: 18px;
      height: 18px;
      stroke: var(--forest);
      flex-shrink: 0;
    }
    .checkout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .checkout-grid { grid-template-columns: 1fr; }
    }
    .checkout-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
    }
    .checkout-field.is-full { grid-column: 1 / -1; }
    .checkout-label {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ink);
    }
    .checkout-label .required {
      color: #dc2626;
      margin-left: 2px;
    }
    .checkout-input,
    .checkout-textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid rgba(33, 77, 52, 0.18);
      border-radius: 10px;
      font-size: 13.5px;
      font-family: inherit;
      color: var(--ink);
      background: var(--cream-1);
      transition: border-color 0.18s, box-shadow 0.18s, background-color 0.18s;
      box-sizing: border-box;
    }
    .checkout-input:focus,
    .checkout-textarea:focus {
      outline: none;
      border-color: var(--forest);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(33, 77, 52, 0.12);
    }
    .checkout-input.is-invalid,
    .checkout-textarea.is-invalid {
      border-color: #dc2626 !important;
      background: #fef2f2 !important;
    }
    .thai-address-dropdown {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      right: 0;
      z-index: 999;
      background: #ffffff;
      border: 1.5px solid #22c55e;
      border-radius: 12px;
      box-shadow: 0 12px 28px rgba(22, 101, 52, 0.18);
      max-height: 240px;
      overflow-y: auto;
      padding: 4px;
      animation: thaiAddressFadeIn 0.15s ease-out;
      -webkit-overflow-scrolling: touch;
    }
    @keyframes thaiAddressFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .thai-address-dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      color: var(--ink);
      transition: background 0.12s ease, color 0.12s ease;
      border-bottom: 1px solid #f1f5f9;
      user-select: none;
      -webkit-user-select: none;
    }
    .thai-address-dropdown-item:last-child { border-bottom: none; }
    .thai-address-dropdown-item:hover,
    .thai-address-dropdown-item:focus {
      background: #f0fdf4;
      color: #15803d;
      outline: none;
    }
    .thai-address-item-crumbs {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 2px;
      line-height: 1.4;
      min-width: 0;
    }
    .thai-address-crumb-district {
      font-weight: 700;
      color: var(--ink);
    }
    .thai-address-dropdown-item:hover .thai-address-crumb-district,
    .thai-address-dropdown-item:focus .thai-address-crumb-district {
      color: #15803d;
    }
    .thai-address-crumb-sep {
      color: #94a3b8;
      font-size: 12px;
      margin: 0 4px;
      font-weight: 600;
    }
    .thai-address-item-postal {
      font-weight: 800;
      font-size: 13px;
      color: var(--forest);
      background: #eef5e4;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .checkout-payment-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .payment-option-card {
      border: 1.5px solid rgba(33, 77, 52, 0.16);
      border-radius: 14px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #fffef9;
      position: relative;
    }
    .payment-option-card:hover:not(.is-disabled) {
      border-color: var(--forest);
      background: #f7faf4;
    }
    .payment-option-card.is-selected {
      border-color: var(--forest);
      background: #f3f8ee;
      box-shadow: 0 4px 14px rgba(33, 77, 52, 0.08);
    }
    .payment-option-card.is-disabled {
      opacity: 0.65;
      cursor: not-allowed;
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .payment-option-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .payment-option-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .payment-radio-custom {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .payment-option-card.is-selected .payment-radio-custom {
      border-color: var(--forest);
    }
    .payment-radio-custom::after {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--forest);
      transform: scale(0);
      transition: transform 0.15s;
    }
    .payment-option-card.is-selected .payment-radio-custom::after {
      transform: scale(1);
    }
    .payment-option-name {
      font-size: 14px;
      font-weight: 800;
      color: var(--ink);
    }
    .payment-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .payment-badge.is-green {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .payment-badge.is-gray {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .payment-option-desc {
      font-size: 12px;
      color: var(--muted);
      margin-top: 6px;
      padding-left: 28px;
      line-height: 1.5;
    }
    .payment-discount-highlight {
      color: #15803d;
      font-weight: 800;
    }
    .checkout-cod-alert {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-left: 4px solid #eab308;
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 12px;
      color: #713f12;
    }
    .checkout-cod-alert-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      color: #854d0e;
      margin-bottom: 8px;
    }
    .checkout-cod-alert ul {
      margin: 0;
      padding-left: 20px;
      font-size: 11.5px;
      line-height: 1.6;
    }
    .checkout-cod-checkbox-wrap {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 12px;
      padding: 12px 14px;
      background: #fff;
      border: 1.5px dashed #ca8a04;
      border-radius: 10px;
      cursor: pointer;
    }
    .checkout-cod-checkbox-wrap input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--forest);
      margin-top: 2px;
      flex-shrink: 0;
    }
    .checkout-bank-details {
      margin-top: 12px;
      padding: 14px 16px;
      background: #ffffff;
      border: 1.5px solid #bbf7d0;
      border-radius: 12px;
      font-size: 13px;
    }
    .checkout-btn-confirm {
      width: 100%;
      padding: 16px 24px;
      border-radius: 14px;
      border: 0;
      background: var(--forest);
      color: #fff;
      font-weight: 800;
      font-size: 16px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(33, 77, 52, 0.25);
      transition: all 0.2s;
    }
    .checkout-btn-confirm:hover:not(:disabled) {
      background: var(--forest-dark);
      transform: translateY(-1px);
    }
    .checkout-btn-confirm:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* RESPONSIVE */
    @media (max-width: 992px) {
      .footer-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 768px) {
      .nav-link, .nav-admin-divider, .nav-admin-btn { display: none; }
      .mobile-menu-toggle { display: inline-flex; }
      .seo-hero-card { padding: 28px 20px; }
      .seo-hero-actions { flex-direction: column; align-items: stretch; }
      .btn-primary-cta, .btn-secondary-outline { justify-content: center; width: 100%; }
      .footer-grid { grid-template-columns: 1fr; gap: 32px; }
      .footer-bottom { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>

  <!-- HEADER & NAVBAR -->
  <header class="header">
    <a class="brand" href="/" aria-label="SG FRUIT เอสจี ผลไม้ตามฤดูกาล หน้าแรก">
      <span class="brand-mark" aria-hidden="true">
        <img class="brand-logo-img" src="/Pic/sg-fruit-logo.webp" alt="SG FRUIT Logo" width="48" height="48" onerror="this.onerror=null;this.src='/Pic/sg-fruit-logo.png';" />
      </span>
      <span>
        <span class="brand-name">SG FRUIT</span>
        <span class="brand-sub">เอสจี ผลไม้ตามฤดูกาล</span>
      </span>
    </a>

    <nav class="nav" aria-label="เมนูหลัก">
      <a class="nav-link" href="/">หน้าแรก</a>
      <a class="nav-link" href="/#shop">เลือกซื้อสินค้า</a>
      <a class="nav-link" href="/#story">เรื่องราวความสด</a>
      <a class="nav-link is-active" href="/#about">เกี่ยวกับ SG FRUIT</a>
      <a class="nav-link" href="/#contact">ติดต่อเรา</a>
      <a class="nav-link" href="/#track" id="nav-track-link">เช็กสถานะ</a>
      <button type="button" class="nav-cart-btn" data-open-cart aria-label="เปิดตะกร้าสินค้า">
        <svg class="ui-icon nav-cart-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 11-1 9"/>
          <path d="m19 11-4-7"/>
          <path d="M2 11h20"/>
          <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/>
          <path d="M4.5 15.5h15"/>
          <path d="m5 11 4-7"/>
          <path d="m9 11 1 9"/>
        </svg>
        <span>ตะกร้าสินค้า</span>
        <span class="cart-count-badge" data-cart-count>0</span>
      </button>
      <div class="nav-admin-divider" aria-hidden="true"></div>
      <a href="https://staging-admin.siriwatmedhanin.com" target="_blank" rel="noopener noreferrer" class="nav-admin-btn" aria-label="เข้าสู่ระบบหลังบ้านสำหรับแอดมิน">
        <svg class="ui-icon nav-admin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>แอดมิน</span>
      </a>
      <button type="button" class="mobile-menu-toggle" id="mobile-menu-toggle" aria-expanded="false" aria-controls="mobile-nav-drawer" aria-label="เปิดเมนูนำทาง">
        <svg class="ui-icon menu-icon-bars" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="4" x2="20" y1="12" y2="12"/>
          <line x1="4" x2="20" y1="6" y2="6"/>
          <line x1="4" x2="20" y1="18" y2="18"/>
        </svg>
        <svg class="ui-icon menu-icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: none;">
          <path d="M18 6 6 18"/>
          <path d="m6 6 12 12"/>
        </svg>
      </button>
    </nav>
  </header>

  <!-- MOBILE NAV DRAWER -->
  <div class="mobile-nav-drawer" id="mobile-nav-drawer" aria-label="เมนูมือถือ">
    <a href="/"><span>หน้าแรก</span> ↗</a>
    <a href="/#shop"><span>เลือกซื้อสินค้า</span> ↗</a>
    <a href="/#story"><span>เรื่องราวความสด</span> ↗</a>
    <a href="/#about"><span>เกี่ยวกับ SG FRUIT</span> ↗</a>
    <a href="/#contact"><span>ติดต่อเรา</span> ↗</a>
    <a href="/#track" id="mobile-track-link"><span>เช็กสถานะออเดอร์</span> ↗</a>
    <button type="button" data-open-cart>
      <span>เปิดตะกร้าสินค้า</span>
      <span class="cart-count-badge" data-cart-count>0</span>
    </button>
    <div class="mobile-drawer-divider" aria-hidden="true"></div>
    <a href="https://staging-admin.siriwatmedhanin.com" target="_blank" rel="noopener noreferrer" class="mobile-admin-link" aria-label="เข้าสู่ระบบหลังบ้านสำหรับแอดมิน">
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        แอดมิน (เข้าสู่ระบบหลังบ้าน)
      </span>
      <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
    </a>
  </div>

  <!-- MAIN SEO CONTENT -->
  <main class="seo-page-main">
    <!-- Breadcrumb Bar -->
    <nav class="seo-breadcrumb-bar" aria-label="Breadcrumb">
      <ol class="seo-breadcrumb-list">
        <li class="seo-breadcrumb-item"><a href="/">หน้าแรก</a></li>
        <li class="seo-breadcrumb-sep" aria-hidden="true">&gt;</li>
        <li class="seo-breadcrumb-item"><a href="/#about">เกี่ยวกับ SG FRUIT</a></li>
        <li class="seo-breadcrumb-sep" aria-hidden="true">&gt;</li>
        <li class="seo-breadcrumb-item is-current" aria-current="page">${page.categoryName}</li>
      </ol>
    </nav>

    <!-- Hero Section -->
    <section class="seo-hero">
      <div class="seo-hero-card">
        <span class="seo-eyebrow">${page.eyebrow}</span>
        <h1 class="seo-title">${page.h1}</h1>
        <p class="seo-intro">${page.intro}</p>
        <div class="seo-hero-actions">
          <a href="${page.ctaPrimaryLink}" class="btn-primary-cta">${page.ctaPrimaryText}</a>
          <a href="/?category=all#shop" class="btn-secondary-outline">ดูผักและผลไม้ทั้งหมด</a>
        </div>
      </div>
    </section>

    <!-- H2 (1) Popular / Highlighted Items -->
    <section class="seo-section">
      <div class="seo-section-header">
        <h2 class="seo-section-title">${page.h2_1}</h2>
        <p class="seo-section-sub">คัดสรรคุณภาพสดใหม่วันต่อวัน จากแหล่งปลูกชั้นนำและศูนย์ค้าส่งใหญ่ระดับประเทศ</p>
      </div>
      <div class="seo-cards-grid">
        ${page.h3_items.map(item => `
        <article class="seo-feature-card">
          <span class="seo-card-badge">${item.badge}</span>
          <h3 class="seo-card-title">${item.title}</h3>
          <p class="seo-card-desc">${item.desc}</p>
        </article>
        `).join('')}
      </div>
    </section>

    <!-- H2 (2) Tips / Quality Guarantee -->
    <section class="seo-section">
      <div class="seo-section-header">
        <h2 class="seo-section-title">${page.h2_2}</h2>
        <p class="seo-section-sub">คำแนะนำการดูแลและการันตีความสดจากสวนสู่มือคุณด้วยความใส่ใจ</p>
      </div>
      <div class="seo-tips-grid">
        ${page.bullets.map(b => `
        <div class="seo-tip-card">
          <div class="seo-tip-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <div class="seo-tip-content">
            <strong>${b.title}</strong>
            <p>${b.desc}</p>
          </div>
        </div>
        `).join('')}
      </div>
    </section>

    <!-- H2 (3) FAQ Section -->
    <section class="seo-section">
      <div class="seo-section-header">
        <h2 class="seo-section-title">${page.h2_3}</h2>
        <p class="seo-section-sub">ข้อสงสัยยอดนิยมเกี่ยวกับการเลือกซื้อ การจัดส่ง และการรับประกันเคลมสินค้า 100%</p>
      </div>
      <div class="seo-faq-list">
        ${page.faqs.map(faq => `
        <details class="faq-item">
          <summary class="faq-question">
            <span>${faq.q}</span>
            <span class="faq-icon" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </summary>
          <div class="faq-answer">
            <p>${faq.a}</p>
          </div>
        </details>
        `).join('')}
      </div>
    </section>

    <!-- Bottom CTA Banner -->
    <section class="seo-section">
      <div class="seo-cta-banner">
        <h2>พร้อมสัมผัสความสดใหม่ส่งตรงถึงบ้านคุณแล้ววันนี้</h2>
        <p>สั่งซื้อง่ายผ่านระบบออนไลน์ รองรับทั้งการโอนชำระเงินและเก็บเงินปลายทาง (COD) แพ็กกันกระแทกอย่างดี รับประกันเคลม 100%</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
          <a href="${page.ctaPrimaryLink}" class="btn-primary-cta">${page.ctaPrimaryText}</a>
          <a href="/?category=all#shop" class="btn-secondary-outline">ดูผักและผลไม้ทั้งหมด</a>
        </div>
      </div>
    </section>

    <!-- Internal Linking: Explore Other Categories -->
    <section class="seo-section">
      <div class="seo-section-header">
        <h2 class="seo-section-title" style="font-size: 22px;">สำรวจหมวดหมู่อื่นๆ ของ SG FRUIT</h2>
        <p class="seo-section-sub">เลือกชมผลไม้และผักสดเพื่อสุขภาพหมวดหมู่อื่นที่เราคัดสรรมาเพื่อคุณ</p>
      </div>
      <div class="seo-other-grid">
        ${page.otherCategories.map(other => `
        <a href="/${other.slug}" class="about-pillar" title="อ่านรายละเอียด ${other.title}">
          <strong>${other.title}</strong>
          <span>${other.desc}</span>
          <span class="about-pillar-more">อ่านรายละเอียดเพิ่มเติม →</span>
        </a>
        `).join('')}
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer id="contact" class="site-footer" aria-label="ข้อมูลติดต่อและส่วนท้ายเว็บไซต์ SG FRUIT">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <span class="brand-mark footer-brand-mark" aria-hidden="true">
            <img class="brand-logo-img" src="/Pic/sg-fruit-logo.webp" alt="SG FRUIT Logo" width="52" height="52" onerror="this.onerror=null;this.src='/Pic/sg-fruit-logo.png';" />
          </span>
          <div>
            <strong>SG FRUIT</strong>
            <span class="footer-brand-th">เอสจี ผลไม้ตามฤดูกาล</span>
            <span class="footer-brand-group">A Brand by Siriwatmedhanin Group</span>
          </div>
        </div>
        <p class="footer-desc">
          คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ
        </p>
      </div>

      <div class="footer-col">
        <h4>หมวดหมู่สินค้า</h4>
        <ul class="footer-links">
          <li><a href="/?category=all#shop">สินค้าทั้งหมด</a></li>
          <li><a href="/seasonal-fruits">ผลไม้ไทยและผลไม้ตามฤดูกาล</a></li>
          <li><a href="/imported-produce">ผลไม้นำเข้าพรีเมียม</a></li>
          <li><a href="/fresh-vegetables">ผักสดสะอาดเพื่อสุขภาพ</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>เกี่ยวกับร้าน</h4>
        <ul class="footer-links">
          <li><a href="/">หน้าแรก</a></li>
          <li><a href="/#shop">เลือกซื้อสินค้า</a></li>
          <li><a href="/#story">เรื่องราวความสด</a></li>
          <li><a href="/#about">เกี่ยวกับ SG FRUIT</a></li>
          <li><a href="/#faq">คำถามที่พบบ่อย (FAQ)</a></li>
          <li><button type="button" data-open-cart>เปิดตะกร้าสินค้า</button></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>ติดต่อ &amp; ช่องทางทางการ</h4>
        <ul class="footer-contact-list">
          <li class="footer-contact-item">
            <span class="contact-label">อีเมลติดต่อ:</span>
            <a href="mailto:contact@siriwatmedhanin.com" class="contact-value">contact@siriwatmedhanin.com</a>
            <small>
              <a href="https://siriwatmedhanin.com" target="_blank" rel="noopener noreferrer" class="footer-corp-link" aria-label="เยี่ยมชมเว็บไซต์ บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด">
                <span>บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด</span>
                <span class="footer-corp-arrow" aria-hidden="true">↗</span>
              </a>
            </small>
          </li>
          <li class="footer-contact-item">
            <span class="contact-label">LINE Official:</span>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
              <a href="https://line.me/R/ti/p/@934wscfl" target="_blank" rel="noopener noreferrer" class="social-pill-btn" aria-label="เพิ่มเพื่อน LINE Official Account SG FRUIT" id="footer-line-btn">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="width:14px;height:14px;flex-shrink:0;" aria-hidden="true"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                <span>SG FRUIT</span>
              </a>
            </div>
            <small>สั่งซื้อด่วน สอบถามผลไม้ตามฤดูกาล</small>
          </li>
          <li class="footer-contact-item">
            <span class="contact-label">ฝ่ายบริการลูกค้า:</span>
            <a href="tel:0919098902" class="contact-value">091-909-8902</a>
            <small>เวลาทำการ จันทร์–เสาร์ 08:00 - 18:00 น.</small>
          </li>
          <li class="footer-contact-item">
            <span class="contact-label">ช่องทางโซเชียลทางการ:</span>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
              <a href="https://www.facebook.com/share/1E7H4sXEYz/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" class="social-pill-btn" aria-label="Facebook Page SG FRUIT">
                <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span>Facebook</span>
              </a>
              <a href="https://www.tiktok.com/@sg_fruit?_r=1&_t=ZS-9BaDvzLju8y" target="_blank" rel="noopener noreferrer" class="social-pill-btn" aria-label="TikTok Shop SG FRUIT">
                <svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                <span>TikTok Shop</span>
              </a>
            </div>
            <small>อัปเดตผลไม้เข้าใหม่และโปรโมชันพิเศษ</small>
          </li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <div>© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by <a href="https://siriwatmedhanin.com" target="_blank" rel="noopener noreferrer" class="footer-corp-link-muted" aria-label="เยี่ยมชมเว็บไซต์ บริษัท ศิริวัตร์เมธานินท์ กรุ๊ป จำกัด (Siriwatmedhanin Group)">Siriwatmedhanin Group ↗</a>)</div>
      <div class="footer-policies">
        <button type="button" class="footer-policy-btn" id="policy-shipping-btn">นโยบายการจัดส่ง &amp; การรับประกันเคลมสินค้า</button>
        <span class="footer-policy-sep" aria-hidden="true">·</span>
        <button type="button" class="footer-policy-btn" id="policy-privacy-btn">นโยบายความเป็นส่วนตัว</button>
      </div>
    </div>
  </footer>

  <!-- SHOPPING CART DRAWER -->
  <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" aria-hidden="true">
    <div class="cart-drawer-backdrop"></div>
    <div class="cart-drawer-panel">
      <header class="cart-drawer-header">
        <h3 class="cart-drawer-title" id="cart-drawer-title">
          <span>ตะกร้าสินค้า SG FRUIT</span>
          <span class="cart-count-badge" data-cart-count>0</span>
        </h3>
        <button type="button" class="cart-drawer-close" id="cart-drawer-close" aria-label="ปิดตะกร้าสินค้า">
          <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      </header>
      <div class="cart-drawer-trust-note">
        <div class="cart-trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <span>รับประกันเคลม 100% หากผลไม้เสียหายจากการขนส่ง</span>
        </div>
        <div class="cart-trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="1" y="6" rx="2"/><path d="M17 9h4l3 3v4a2 2 0 0 1-2 2h-1"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
          <span>แพ็กกันกระแทกอย่างดี · จัดส่งรวดเร็วทั่วไทย</span>
        </div>
      </div>
      <div class="cart-drawer-body">
        <div class="cart-drawer-items" id="cart-drawer-items"></div>
        <div class="cart-drawer-empty" id="cart-drawer-empty">
          <h4>ยังไม่มีสินค้าในตะกร้า</h4>
          <p>เลือกชมผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดได้ในหน้าร้านค้า</p>
          <a href="/#shop" class="btn-primary-cta" style="margin-top:12px;font-size:13.5px;padding:10px 20px;">เลือกซื้อสินค้า ↗</a>
        </div>
      </div>
      <footer class="cart-drawer-footer" id="cart-drawer-footer" hidden>
        <div class="cart-summary-row">
          <span>จำนวนสินค้าที่เลือก</span>
          <span id="cart-total-items-label">0 รายการ</span>
        </div>
        <div class="cart-summary-row is-total">
          <span>ยอดรวมสินค้า</span>
          <strong id="cart-subtotal-value">฿0</strong>
        </div>
        <div class="cart-footer-actions">
          <button type="button" class="cart-clear-btn" id="cart-clear-btn">ล้างตะกร้า</button>
          <button type="button" class="cart-checkout-btn" id="cart-checkout-demo-btn">
            <span>ดำเนินการสั่งซื้อ (Checkout)</span> ↗
          </button>
        </div>
      </footer>
    </div>
  </aside>

  <!-- PRODUCT DETAIL MODAL -->
  <div class="modal-overlay" id="product-modal" role="dialog" aria-modal="true" aria-label="รายละเอียดสินค้า" aria-hidden="true">
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <button type="button" class="modal-close-btn" id="product-modal-close" aria-label="ปิดหน้าต่างรายละเอียดสินค้า">✕</button>
      <div id="product-modal-body"></div>
    </div>
  </div>

  <!-- ORDER SUMMARY MODAL -->
  <div class="modal-overlay" id="order-summary-modal" role="dialog" aria-modal="true" aria-labelledby="order-summary-title" aria-hidden="true">
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <button type="button" class="modal-close-btn" id="order-summary-close" aria-label="ปิดหน้าสรุปรายการ">✕</button>
      <h3 id="order-summary-title" style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: var(--forest);">ขั้นตอนการสั่งซื้อและชำระเงิน (Checkout)</h3>
      <div id="order-summary-body"></div>
      <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
        <button type="button" class="btn-primary-cta" id="order-summary-back-btn">
          <span>กลับไปแก้ไขตะกร้า / เลือกสินค้าต่อ</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ORDER TRACKING MODAL -->
  <div class="modal-overlay" id="order-tracking-modal" role="dialog" aria-modal="true" aria-labelledby="order-tracking-title" aria-hidden="true">
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <button type="button" class="modal-close-btn" id="order-tracking-close" aria-label="ปิดหน้าต่างติดตามคำสั่งซื้อ">✕</button>
      <div style="margin-bottom: 16px;">
        <h3 id="order-tracking-title" style="margin: 0 0 4px; font-size: 21px; font-weight: 800; color: var(--forest);">ติดตามสถานะคำสั่งซื้อ (Order Tracking)</h3>
        <p style="margin: 0; font-size: 13px; color: var(--muted);">ตรวจสอบสถานะการแพ็กและเลขพัสดุได้ทันทีโดยไม่ต้องเข้าสู่ระบบ</p>
      </div>
      <div id="order-tracking-body"></div>
    </div>
  </div>

  <!-- POLICY INFO MODAL -->
  <div class="modal-overlay" id="policy-modal" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title" aria-hidden="true">
    <div class="modal-backdrop" id="policy-modal-backdrop"></div>
    <div class="modal-dialog policy-modal-card">
      <button type="button" class="modal-close-btn" id="policy-modal-close" aria-label="ปิดหน้าต่าง">✕</button>
      <header class="modal-header" style="margin-bottom: 16px; padding-right: 40px;">
        <h3 class="modal-title" id="policy-modal-title" style="font-size: 20px; font-weight: 700; color: var(--forest); margin: 0;">นโยบายและการรับประกัน SG FRUIT</h3>
      </header>
      <div class="modal-body policy-modal-body" id="policy-modal-content"></div>
    </div>
  </div>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <!-- Scripts -->
  <script src="/js/products-data.js?v=20261123-v12"></script>
  <script src="/js/api-adapter.js?v=20261123-v12"></script>
  <script src="/js/site-profile.js?v=20261123-v12"></script>
  <script src="/js/thai-address.js?v=20261123-v12"></script>
  <script src="/js/shop-cart.js?v=20261123-v12"></script>

  <script>
    // Mobile navigation toggle
    (() => {
      const btn = document.getElementById('mobile-menu-toggle');
      const drawer = document.getElementById('mobile-nav-drawer');
      if (btn && drawer) {
        btn.addEventListener('click', () => {
          const isOpen = drawer.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          const bars = btn.querySelector('.menu-icon-bars');
          const close = btn.querySelector('.menu-icon-close');
          if (bars && close) {
            bars.style.display = isOpen ? 'none' : 'inline-block';
            close.style.display = isOpen ? 'inline-block' : 'none';
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

function build() {
  console.log('Generating 3 Dedicated Category SEO Landing Pages...');

  for (const page of PAGES_DATA) {
    const html = generateHtml(page);

    // 1. Write <slug>.html at root (Cloudflare Pages automatically serves this cleanly at /<slug> with HTTP 200)
    const rootHtmlPath = path.join(ROOT_DIR, `${page.slug}.html`);
    fs.writeFileSync(rootHtmlPath, html, 'utf8');
    console.log(`[OK] Created ${page.slug}.html`);
  }

  console.log('Category SEO pages generated successfully.\n');
}

build();
