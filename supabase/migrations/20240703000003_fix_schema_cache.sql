-- Force a refresh of the schema cache by altering the invoices table

-- First ensure the columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'supplier_id') THEN
    ALTER TABLE invoices ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'shop_id') THEN
    ALTER TABLE invoices ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
END $$;

-- Force a schema cache refresh by altering the table
ALTER TABLE invoices ALTER COLUMN supplier_id SET DATA TYPE UUID;
ALTER TABLE invoices ALTER COLUMN shop_id SET DATA TYPE UUID;

-- Ensure the foreign key constraints are properly set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'invoices' 
    AND ccu.table_name = 'suppliers' AND ccu.column_name = 'id'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_supplier_id_fkey;
    ALTER TABLE invoices ADD CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'invoices' 
    AND ccu.table_name = 'shops' AND ccu.column_name = 'id'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_shop_id_fkey;
    ALTER TABLE invoices ADD CONSTRAINT invoices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id);
  END IF;
END $$;
