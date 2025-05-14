-- Add product details columns to invoice_items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_barcode TEXT;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_watt NUMERIC;

-- Enable realtime for the table
alter publication supabase_realtime add table invoice_items;
