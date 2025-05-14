-- Check if invoice_items table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  supplier_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  product_name TEXT,
  barcode TEXT,
  watt NUMERIC,
  discount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  discount_amount NUMERIC DEFAULT 0
);

-- Enable realtime for invoice_items if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'invoice_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;
  END IF;
END $$;
