-- SG FRUIT — Order Slip & Discount Extension
-- Migration: 0010_order_slip_and_discount.sql

ALTER TABLE orders ADD COLUMN slip_url TEXT;
ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0;
