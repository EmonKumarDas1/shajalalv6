-- Create supplier_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id),
  amount DECIMAL NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE supplier_payments;
