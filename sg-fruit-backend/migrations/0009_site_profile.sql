-- Migration: 0009_site_profile.sql
-- Description: Site profile and store settings management (Singleton row id='default')

CREATE TABLE IF NOT EXISTS site_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  -- Brand
  site_name TEXT NOT NULL DEFAULT 'SG FRUIT',
  site_name_th TEXT NOT NULL DEFAULT 'เอสจี ผลไม้ตามฤดูกาล',
  tagline TEXT DEFAULT 'A Brand by Siriwatmedhanin Group',
  description TEXT DEFAULT 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  -- Order & Contact
  line_oa_id TEXT NOT NULL DEFAULT '@sgfruit',
  line_oa_url TEXT NOT NULL DEFAULT 'https://line.me/R/ti/p/@sgfruit',
  phone TEXT DEFAULT '08x-xxx-xxxx',
  email TEXT DEFAULT 'contact@siriwatmedhanin.com',
  address TEXT DEFAULT 'เชียงใหม่ ประเทศไทย',
  business_hours TEXT DEFAULT 'เปิดบริการทุกวัน 08:00 - 18:00 น.',
  -- Social & Marketplaces
  facebook_url TEXT DEFAULT 'https://facebook.com/sgfruit.th',
  tiktok_url TEXT DEFAULT '',
  instagram_url TEXT DEFAULT 'https://instagram.com/sgfruit.th',
  shopee_url TEXT DEFAULT '',
  lazada_url TEXT DEFAULT '',
  -- Announcement Bar
  announcement_enabled INTEGER NOT NULL DEFAULT 0,
  announcement_text TEXT DEFAULT 'ต้อนรับฤดูกาลผลไม้สดใหม่ ส่งตรงถึงบ้านคุณ สอบถามผลไม้เข้าใหม่ทาง LINE: @sgfruit',
  announcement_link TEXT DEFAULT 'https://line.me/R/ti/p/@sgfruit',
  -- Footer
  footer_about TEXT DEFAULT 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
  footer_copyright TEXT DEFAULT '© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by Siriwatmedhanin Group)',
  -- SEO & Sharing
  seo_title TEXT DEFAULT 'SG FRUIT | เอสจี ผลไม้ตามฤดูกาล — Shop the Season',
  seo_description TEXT DEFAULT 'SG FRUIT – เอสจี ผลไม้ตามฤดูกาล | เลือกช้อปผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด คัดสรรความสดเพื่อทุกวันของคุณ (A Brand by Siriwatmedhanin Group)',
  og_image_url TEXT DEFAULT '',
  -- Extensible Store Info
  extra_info_json TEXT DEFAULT '{"delivery_policy":"จัดส่งผ่านรถควบคุมอุณหภูมิและขนส่งด่วนมาตรฐาน","freshness_guarantee":"รับประกันความสดใหม่ หากเสียหายระหว่างจัดส่งเคลมได้ 100%"}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT DEFAULT 'system-seed'
);

-- Seed initial singleton record
INSERT OR IGNORE INTO site_profile (
  id, site_name, site_name_th, tagline, description, logo_url, favicon_url,
  line_oa_id, line_oa_url, phone, email, address, business_hours,
  facebook_url, tiktok_url, instagram_url, shopee_url, lazada_url,
  announcement_enabled, announcement_text, announcement_link,
  footer_about, footer_copyright, seo_title, seo_description, og_image_url,
  extra_info_json, updated_at, updated_by
) VALUES (
  'default',
  'SG FRUIT',
  'เอสจี ผลไม้ตามฤดูกาล',
  'A Brand by Siriwatmedhanin Group',
  'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
  '',
  '',
  '@sgfruit',
  'https://line.me/R/ti/p/@sgfruit',
  '08x-xxx-xxxx',
  'contact@siriwatmedhanin.com',
  'เชียงใหม่ ประเทศไทย',
  'เปิดบริการทุกวัน 08:00 - 18:00 น.',
  'https://facebook.com/sgfruit.th',
  '',
  'https://instagram.com/sgfruit.th',
  '',
  '',
  0,
  'ต้อนรับฤดูกาลผลไม้สดใหม่ ส่งตรงถึงบ้านคุณ สอบถามผลไม้เข้าใหม่ทาง LINE: @sgfruit',
  'https://line.me/R/ti/p/@sgfruit',
  'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
  '© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by Siriwatmedhanin Group)',
  'SG FRUIT | เอสจี ผลไม้ตามฤดูกาล — Shop the Season',
  'SG FRUIT – เอสจี ผลไม้ตามฤดูกาล | เลือกช้อปผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด คัดสรรความสดเพื่อทุกวันของคุณ (A Brand by Siriwatmedhanin Group)',
  '',
  '{"delivery_policy":"จัดส่งผ่านรถควบคุมอุณหภูมิและขนส่งด่วนมาตรฐาน","freshness_guarantee":"รับประกันความสดใหม่ หากเสียหายระหว่างจัดส่งเคลมได้ 100%"}',
  datetime('now'),
  'system-seed'
);
