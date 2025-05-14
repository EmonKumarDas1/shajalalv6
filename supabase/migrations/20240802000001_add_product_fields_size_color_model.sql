-- Add size, color, and model fields to products table if they don't exist

DO $$ 
BEGIN
    -- Add size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'size') THEN
        ALTER TABLE products ADD COLUMN size TEXT;
    END IF;
    
    -- Add color column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'color') THEN
        ALTER TABLE products ADD COLUMN color TEXT;
    END IF;
    
    -- Add model column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'model') THEN
        ALTER TABLE products ADD COLUMN model TEXT;
    END IF;
END $$;
