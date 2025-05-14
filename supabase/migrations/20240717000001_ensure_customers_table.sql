-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);

-- Enable row level security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy for full access
DROP POLICY IF EXISTS "Full access to customers";
CREATE POLICY "Full access to customers"
  ON customers
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
