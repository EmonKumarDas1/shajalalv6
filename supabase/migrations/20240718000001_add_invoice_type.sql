-- Add invoice_type column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'sales' CHECK (invoice_type IN ('sales', 'product_addition'));

-- Update existing invoices based on context
-- Invoices created from BatchProductForm are product_addition
UPDATE invoices SET invoice_type = 'product_addition' WHERE supplier_id IS NOT NULL;

-- Invoices created from SellProductForm are sales
UPDATE invoices SET invoice_type = 'sales' WHERE customer_name IS NOT NULL OR customer_phone IS NOT NULL;

-- Enable realtime for the updated table
alter publication supabase_realtime add table invoices;
