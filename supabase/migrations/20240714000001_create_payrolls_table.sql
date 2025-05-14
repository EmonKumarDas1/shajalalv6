-- Create payrolls table if it doesn't exist
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  period VARCHAR(50) DEFAULT 'Monthly',
  status VARCHAR(50) DEFAULT 'Completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
DROP POLICY IF EXISTS "Public payrolls access" ON payrolls;
CREATE POLICY "Public payrolls access"
ON payrolls FOR ALL
USING (true);

-- Enable realtime
alter publication supabase_realtime add table payrolls;