-- ====================================================================
-- DIU Course Registration Platform - Student Onboarding Migration
-- Adds onboarding tracking and batch identifier to profiles
-- ====================================================================

-- 1. Add onboarding_completed and batch columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS batch VARCHAR(20);

-- 2. Add payment declaration tracking for course registration
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS payment_cleared BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(50);

-- 3. Comments for documentation integrity
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Tracks whether a first-time student has completed profile confirmation (Full Name, Student ID, Batch).';
COMMENT ON COLUMN public.profiles.batch IS 'DIU academic intake batch e.g. 60th Batch.';
COMMENT ON COLUMN public.registrations.payment_cleared IS 'Indicates whether the student has satisfied minimum tuition fee clearance for advising.';
