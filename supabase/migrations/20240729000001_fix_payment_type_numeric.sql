-- First check if the payment_type column exists in payrolls table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payrolls' AND column_name = 'payment_type'
    ) THEN
        -- Alter the column type to numeric if it exists
        ALTER TABLE payrolls ALTER COLUMN payment_type TYPE numeric USING payment_type::numeric;
        -- Add comment to document what the numeric values represent
        COMMENT ON COLUMN payrolls.payment_type IS '1 = automated, 2 = manual';
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE payrolls ADD COLUMN payment_type numeric;
        -- Add comment to document what the numeric values represent
        COMMENT ON COLUMN payrolls.payment_type IS '1 = automated, 2 = manual';
    END IF;

    -- Do the same for salary_payments table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salary_payments' AND column_name = 'payment_type'
    ) THEN
        -- Alter the column type to numeric if it exists
        ALTER TABLE salary_payments ALTER COLUMN payment_type TYPE numeric USING payment_type::numeric;
        -- Add comment to document what the numeric values represent
        COMMENT ON COLUMN salary_payments.payment_type IS '1 = automated, 2 = manual';
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE salary_payments ADD COLUMN payment_type numeric;
        -- Add comment to document what the numeric values represent
        COMMENT ON COLUMN salary_payments.payment_type IS '1 = automated, 2 = manual';
    END IF;
END
$$;
