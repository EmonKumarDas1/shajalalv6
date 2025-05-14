-- Migration script to fix database relationships

-- Ensure products table has supplier_id column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
    ALTER TABLE products ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
  END IF;
END $$;

-- Ensure invoice_items table has is_outer_product column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'is_outer_product') THEN
    ALTER TABLE invoice_items ADD COLUMN is_outer_product BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Ensure invoice_items table has buying_price column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'buying_price') THEN
    ALTER TABLE invoice_items ADD COLUMN buying_price NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;
