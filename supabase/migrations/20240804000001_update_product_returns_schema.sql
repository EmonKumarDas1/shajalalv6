-- Add new columns to product_returns table
ALTER TABLE product_returns
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS return_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;
