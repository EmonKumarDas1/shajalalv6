CREATE TABLE IF NOT EXISTS product_returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10,2) NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  return_reason TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  return_id UUID REFERENCES product_returns(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  condition TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

alter publication supabase_realtime add table product_returns;
alter publication supabase_realtime add table return_items;