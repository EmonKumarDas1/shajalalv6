-- Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Add shop_id, advance_payment, and remaining_amount to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS advance_payment DECIMAL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL DEFAULT 0;

-- Enable realtime for shops table
alter publication supabase_realtime add table shops;
