-- Create product_additions table to track product addition history
CREATE TABLE IF NOT EXISTS product_additions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  addition_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable realtime for product_additions table
ALTER PUBLICATION supabase_realtime ADD TABLE product_additions;

-- Create index on product_id for faster lookups
CREATE INDEX IF NOT EXISTS product_additions_product_id_idx ON product_additions(product_id);

-- Create index on addition_date for faster sorting
CREATE INDEX IF NOT EXISTS product_additions_addition_date_idx ON product_additions(addition_date);

-- Populate initial data from existing products
INSERT INTO product_additions (product_id, quantity, addition_date, created_at)
SELECT id, quantity, created_at, created_at
FROM products;
