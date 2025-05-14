-- Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  hire_date TIMESTAMP WITH TIME ZONE,
  salary NUMERIC,
  payment_frequency TEXT,
  salary_structure JSONB,
  tax_deductions JSONB,
  status TEXT DEFAULT 'active',
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create payrolls table if it doesn't exist
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  payment_date TIMESTAMP WITH TIME ZONE,
  gross_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  payment_frequency TEXT,
  salary_structure JSONB,
  tax_deductions JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  date DATE NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create leave_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable row-level security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
DROP POLICY IF EXISTS "Employees are viewable by authenticated users" ON employees;
CREATE POLICY "Employees are viewable by authenticated users" 
ON employees FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Employees are editable by authenticated users" ON employees;
CREATE POLICY "Employees are editable by authenticated users" 
ON employees FOR UPDATE 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Employees can be inserted by authenticated users" ON employees;
CREATE POLICY "Employees can be inserted by authenticated users" 
ON employees FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Employees can be deleted by authenticated users" ON employees;
CREATE POLICY "Employees can be deleted by authenticated users" 
ON employees FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create policies for payrolls table
DROP POLICY IF EXISTS "Payrolls are viewable by authenticated users" ON payrolls;
CREATE POLICY "Payrolls are viewable by authenticated users" 
ON payrolls FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Payrolls are editable by authenticated users" ON payrolls;
CREATE POLICY "Payrolls are editable by authenticated users" 
ON payrolls FOR UPDATE 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Payrolls can be inserted by authenticated users" ON payrolls;
CREATE POLICY "Payrolls can be inserted by authenticated users" 
ON payrolls FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Payrolls can be deleted by authenticated users" ON payrolls;
CREATE POLICY "Payrolls can be deleted by authenticated users" 
ON payrolls FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create policies for attendance table
DROP POLICY IF EXISTS "Attendance records are viewable by authenticated users" ON attendance;
CREATE POLICY "Attendance records are viewable by authenticated users" 
ON attendance FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Attendance records are editable by authenticated users" ON attendance;
CREATE POLICY "Attendance records are editable by authenticated users" 
ON attendance FOR UPDATE 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Attendance records can be inserted by authenticated users" ON attendance;
CREATE POLICY "Attendance records can be inserted by authenticated users" 
ON attendance FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Attendance records can be deleted by authenticated users" ON attendance;
CREATE POLICY "Attendance records can be deleted by authenticated users" 
ON attendance FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create policies for leave_requests table
DROP POLICY IF EXISTS "Leave requests are viewable by authenticated users" ON leave_requests;
CREATE POLICY "Leave requests are viewable by authenticated users" 
ON leave_requests FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leave requests are editable by authenticated users" ON leave_requests;
CREATE POLICY "Leave requests are editable by authenticated users" 
ON leave_requests FOR UPDATE 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leave requests can be inserted by authenticated users" ON leave_requests;
CREATE POLICY "Leave requests can be inserted by authenticated users" 
ON leave_requests FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leave requests can be deleted by authenticated users" ON leave_requests;
CREATE POLICY "Leave requests can be deleted by authenticated users" 
ON leave_requests FOR DELETE 
USING (auth.role() = 'authenticated');

-- Enable realtime for all tables
DO $$
BEGIN
  -- Check if tables are already in the publication before adding them
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'employees') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE employees;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'payrolls') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payrolls;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leave_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
  END IF;
END
$$;