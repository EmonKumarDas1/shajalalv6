-- Ensure payment_type column exists and is of type TEXT in payrolls table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'payrolls' AND column_name = 'payment_type') THEN
        ALTER TABLE payrolls ALTER COLUMN payment_type TYPE TEXT;
    ELSE
        ALTER TABLE payrolls ADD COLUMN payment_type TEXT;
    END IF;
END$$;

-- Ensure payment_type column exists and is of type TEXT in salary_payments table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'salary_payments' AND column_name = 'payment_type') THEN
        ALTER TABLE salary_payments ALTER COLUMN payment_type TYPE TEXT;
    ELSE
        ALTER TABLE salary_payments ADD COLUMN payment_type TEXT;
    END IF;
END$$;