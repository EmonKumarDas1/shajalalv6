-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL,
  shop_id UUID REFERENCES shops(id),
  customer_name TEXT,
  customer_phone TEXT,
  total_amount DECIMAL NOT NULL,
  advance_payment DECIMAL NOT NULL DEFAULT 0,
  remaining_amount DECIMAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create invoice_items table for products in each invoice
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for invoices and invoice_items tables
alter publication supabase_realtime add table invoices;
alter publication supabase_realtime add table invoice_items;
