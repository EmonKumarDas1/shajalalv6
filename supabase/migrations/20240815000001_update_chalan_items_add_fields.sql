-- Add additional fields to chalan_items table if they don't exist
DO $$
BEGIN
    -- Add watt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chalan_items' AND column_name = 'watt') THEN
        ALTER TABLE chalan_items ADD COLUMN watt TEXT;
    END IF;

    -- Add color column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chalan_items' AND column_name = 'color') THEN
        ALTER TABLE chalan_items ADD COLUMN color TEXT;
    END IF;

    -- Add model column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chalan_items' AND column_name = 'model') THEN
        ALTER TABLE chalan_items ADD COLUMN model TEXT;
    END IF;

    -- Add price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chalan_items' AND column_name = 'price') THEN
        ALTER TABLE chalan_items ADD COLUMN price NUMERIC(10, 2);
    END IF;

    -- Add company column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chalan_items' AND column_name = 'company') THEN
        ALTER TABLE chalan_items ADD COLUMN company TEXT;
    END IF;
END
$$;