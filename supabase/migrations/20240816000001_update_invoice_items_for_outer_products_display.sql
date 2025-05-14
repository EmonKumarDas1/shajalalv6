-- Add fields to invoice_items table to better support outer products
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_outer_product BOOLEAN DEFAULT false;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS buying_price NUMERIC(10, 2) DEFAULT 0;

-- Make sure we have realtime enabled for invoice_items
alter publication supabase_realtime add table invoice_items;
