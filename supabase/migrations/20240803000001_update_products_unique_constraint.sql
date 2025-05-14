-- First drop the existing index if it exists
DROP INDEX IF EXISTS products_unique_idx;

-- Then drop the constraint if it exists
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unique_idx;

-- Create a new unique constraint that includes size, color, and model
ALTER TABLE products ADD CONSTRAINT products_unique_idx UNIQUE (name, supplier_id, watt, buying_price, size, color, model);
