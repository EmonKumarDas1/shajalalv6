-- Add product_id column to product_returns table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'product_returns'
        AND column_name = 'product_id'
    ) THEN
        ALTER TABLE product_returns ADD COLUMN product_id UUID REFERENCES products(id);
    END IF;
END $$;