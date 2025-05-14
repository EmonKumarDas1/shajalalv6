-- Make return_reason column nullable in product_returns table
ALTER TABLE product_returns ALTER COLUMN reason DROP NOT NULL;

-- Also make sure other potentially problematic columns are nullable
ALTER TABLE product_returns ALTER COLUMN admin_notes DROP NOT NULL;
ALTER TABLE product_returns ALTER COLUMN payment_method DROP NOT NULL;

-- Set default values for these columns to prevent null constraint violations
ALTER TABLE product_returns ALTER COLUMN reason SET DEFAULT '';
ALTER TABLE product_returns ALTER COLUMN admin_notes SET DEFAULT '';
ALTER TABLE product_returns ALTER COLUMN payment_method SET DEFAULT 'none';