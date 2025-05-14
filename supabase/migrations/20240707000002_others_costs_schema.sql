-- Create others_costs table
CREATE TABLE IF NOT EXISTS others_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable realtime
alter publication supabase_realtime add table others_costs;
