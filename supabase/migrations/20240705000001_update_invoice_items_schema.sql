-- Add supplier_name column to invoice_items table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'supplier_name') THEN
    ALTER TABLE invoice_items ADD COLUMN supplier_name TEXT;
  END IF;
END $$;

-- Refresh schema cache
COMMENT ON TABLE invoice_items IS 'Invoice items with supplier information';
