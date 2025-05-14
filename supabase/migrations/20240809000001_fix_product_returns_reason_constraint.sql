-- Make return_reason column nullable in product_returns table
ALTER TABLE product_returns ALTER COLUMN reason DROP NOT NULL;