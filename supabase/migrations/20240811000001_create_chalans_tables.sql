-- Create chalans table if it doesn't exist
CREATE TABLE IF NOT EXISTS chalans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chalan_number TEXT NOT NULL UNIQUE,
  shop_id UUID REFERENCES shops(id),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chalan_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS chalan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chalan_id UUID REFERENCES chalans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if invoice_items table exists before adding columns
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoice_items') THEN
    -- Check if discount column doesn't exist before adding it
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'invoice_items' 
                  AND column_name = 'discount') THEN
      ALTER TABLE invoice_items ADD COLUMN discount NUMERIC DEFAULT 0;
    END IF;
    
    -- Check if discount_type column doesn't exist before adding it
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'invoice_items' 
                  AND column_name = 'discount_type') THEN
      ALTER TABLE invoice_items ADD COLUMN discount_type TEXT DEFAULT 'percentage';
    END IF;
    
    -- Check if discount_amount column doesn't exist before adding it
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'invoice_items' 
                  AND column_name = 'discount_amount') THEN
      ALTER TABLE invoice_items ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Enable realtime for chalans and chalan_items
ALTER PUBLICATION supabase_realtime ADD TABLE chalans;
ALTER PUBLICATION supabase_realtime ADD TABLE chalan_items;
