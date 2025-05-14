-- Check if invoice_id column exists in products table, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'invoice_id') THEN
    ALTER TABLE products ADD COLUMN invoice_id UUID REFERENCES invoices(id);
  END IF;
END $$;

-- Refresh the schema cache to ensure all columns are recognized
COMMENT ON TABLE products IS 'Products table with invoice relationship';

-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE products;
