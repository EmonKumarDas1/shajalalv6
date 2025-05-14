-- Add a flag to identify outer products in invoice_items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_outer_product BOOLEAN DEFAULT FALSE;

-- Update existing records where product_id is null to be marked as outer products
UPDATE invoice_items SET is_outer_product = TRUE WHERE product_id IS NULL;

-- Add buying_price column to store the cost of outer products
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS buying_price NUMERIC(10, 2) DEFAULT 0;

-- Enable realtime for this table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;
