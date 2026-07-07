-- Phase 9: Delivery Confirmation Code (Chowdeck-style escrow release)
-- Apply once in the Supabase SQL editor. Idempotent.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code_attempts INTEGER NOT NULL DEFAULT 0;
