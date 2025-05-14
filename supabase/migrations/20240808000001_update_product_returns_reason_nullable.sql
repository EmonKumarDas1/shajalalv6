-- Make return_reason column nullable in product_returns table
DO $$ 
BEGIN
    ALTER TABLE product_returns ALTER COLUMN return_reason DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        -- Column might already be nullable or table might not exist
        NULL;
END $$;