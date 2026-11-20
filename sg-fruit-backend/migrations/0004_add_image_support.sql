-- SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Thumbnail Key & Image Metadata Support
-- Migration: 0004_add_image_support.sql

ALTER TABLE products ADD COLUMN thumbnail_key TEXT;
ALTER TABLE products ADD COLUMN image_meta TEXT;
