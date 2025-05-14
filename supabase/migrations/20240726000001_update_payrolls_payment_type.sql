-- Add payment_type column to payrolls table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payrolls' AND column_name = 'payment_type') THEN
        ALTER TABLE payrolls ADD COLUMN payment_type VARCHAR(50);
    END IF;
END$$;

-- Add payment_type column to salary_payments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'salary_payments' AND column_name = 'payment_type') THEN
        ALTER TABLE salary_payments ADD COLUMN payment_type VARCHAR(50);
    END IF;
END$$;