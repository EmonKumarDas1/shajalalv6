-- Add payment_type column to salary_payments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salary_payments' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE salary_payments ADD COLUMN payment_type numeric;
        COMMENT ON COLUMN salary_payments.payment_type IS '1 = automated, 2 = manual';
    END IF;
END
$$;
