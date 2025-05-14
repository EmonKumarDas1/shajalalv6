-- Add new columns to suppliers table if they don't exist
DO $$
BEGIN
    -- Check if contact column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'suppliers' 
                  AND column_name = 'contact') THEN
        ALTER TABLE suppliers ADD COLUMN contact TEXT;
    END IF;

    -- Check if email column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'suppliers' 
                  AND column_name = 'email') THEN
        ALTER TABLE suppliers ADD COLUMN email TEXT;
    END IF;

    -- Check if phone column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'suppliers' 
                  AND column_name = 'phone') THEN
        ALTER TABLE suppliers ADD COLUMN phone TEXT;
    END IF;

    -- Check if address column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'suppliers' 
                  AND column_name = 'address') THEN
        ALTER TABLE suppliers ADD COLUMN address TEXT;
    END IF;

    -- Check if notes column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'suppliers' 
                  AND column_name = 'notes') THEN
        ALTER TABLE suppliers ADD COLUMN notes TEXT;
    END IF;
END
$$;

-- Create supplier_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id),
  amount DECIMAL NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Add publication for realtime
alter publication supabase_realtime add table supplier_payments;
