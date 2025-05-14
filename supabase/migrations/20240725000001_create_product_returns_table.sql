-- Create product returns table
CREATE TABLE IF NOT EXISTS product_returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  return_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  return_reason VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create return items table
CREATE TABLE IF NOT EXISTS return_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  return_id UUID REFERENCES product_returns(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  return_reason VARCHAR(255),
  condition VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add realtime
ALTER publication supabase_realtime ADD TABLE product_returns;
ALTER publication supabase_realtime ADD TABLE return_items;