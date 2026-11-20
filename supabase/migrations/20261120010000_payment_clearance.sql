-- ============================================================================
-- Migration: 20261120010000_payment_clearance.sql
-- Description: Admin-Managed Tuition Payment Clearance & Audit Architecture
-- ============================================================================

-- 1. Create payment_clearances table
CREATE TABLE IF NOT EXISTS public.payment_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'awaiting_verification' CHECK (status IN ('awaiting_verification', 'cleared', 'not_cleared')),
    reference_code VARCHAR(50),
    notes TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_semester_payment UNIQUE (student_id, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_clearance_student_sem 
    ON public.payment_clearances (student_id, semester_id);

-- 2. Create payment_clearance_audit table (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS public.payment_clearance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_id UUID REFERENCES public.payment_clearances(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_student 
    ON public.payment_clearance_audit (student_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.payment_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_clearance_audit ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for payment_clearances
-- Admins have full access
CREATE POLICY "Admins have full access to payment_clearances"
    ON public.payment_clearances
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = public.get_current_profile_id()
              AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = public.get_current_profile_id()
              AND profiles.role = 'admin'
        )
    );

-- Students can view their own payment clearances
CREATE POLICY "Students can view their own payment_clearances"
    ON public.payment_clearances
    FOR SELECT
    TO authenticated
    USING (
        student_id = public.get_current_profile_id()
    );

-- Advisors can view clearances for assigned advisees
CREATE POLICY "Advisors can view advisee payment_clearances"
    ON public.payment_clearances
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.advisor_assignments aa
            WHERE aa.advisor_id = public.get_current_profile_id()
              AND aa.student_id = payment_clearances.student_id
              AND aa.is_active = true
        )
    );

-- 4. RLS Policies for payment_clearance_audit
-- Admins can view all audit records
CREATE POLICY "Admins can view all payment_clearance_audit"
    ON public.payment_clearance_audit
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = public.get_current_profile_id()
              AND profiles.role = 'admin'
        )
    );

-- Admins can insert audit logs
CREATE POLICY "Admins can insert payment_clearance_audit"
    ON public.payment_clearance_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = public.get_current_profile_id()
              AND profiles.role = 'admin'
        )
    );

COMMENT ON TABLE public.payment_clearances IS 'Authoritative institutional accounts tuition clearance status per student and semester.';
COMMENT ON TABLE public.payment_clearance_audit IS 'Immutable historical audit log of all changes to student tuition payment statuses.';
