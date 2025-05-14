-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  hire_date TIMESTAMP WITH TIME ZONE,
  salary NUMERIC,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable realtime
alter publication supabase_realtime add table employees;
