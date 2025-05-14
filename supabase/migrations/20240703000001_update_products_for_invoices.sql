-- Add invoice_id to products table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'invoice_id') THEN
    ALTER TABLE products ADD COLUMN invoice_id UUID REFERENCES invoices(id);
  END IF;
END $$;

-- Make sure the invoices table has the correct structure
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    CREATE TABLE invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_number TEXT NOT NULL,
      total_amount NUMERIC NOT NULL DEFAULT 0,
      advance_payment NUMERIC NOT NULL DEFAULT 0,
      remaining_amount NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid',
      supplier_id UUID REFERENCES suppliers(id),
      shop_id UUID REFERENCES shops(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Add realtime for invoices
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
