-- Create salary_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Add salary_payments to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'salary_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE salary_payments;
  END IF;
END
$$;

-- Add RLS policies for salary_payments
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- Policy for selecting salary_payments (all users can view)
DROP POLICY IF EXISTS "Users can view all salary payments" ON salary_payments;
CREATE POLICY "Users can view all salary payments"
  ON salary_payments
  FOR SELECT
  USING (true);

-- Policy for inserting salary_payments (all authenticated users)
DROP POLICY IF EXISTS "Users can insert salary payments" ON salary_payments;
CREATE POLICY "Users can insert salary payments"
  ON salary_payments
  FOR INSERT
  WITH CHECK (true);

-- Policy for updating salary_payments (all authenticated users)
DROP POLICY IF EXISTS "Users can update salary payments" ON salary_payments;
CREATE POLICY "Users can update salary payments"
  ON salary_payments
  FOR UPDATE
  USING (true);

-- Add a new column to track if salary is paid in the current month
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_salary_payment TIMESTAMP WITH TIME ZONE;
