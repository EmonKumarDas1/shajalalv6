-- Fix the invoices table schema by adding supplier_id and shop_id if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'supplier_id') THEN
    ALTER TABLE invoices ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'shop_id') THEN
    ALTER TABLE invoices ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
END $$;
