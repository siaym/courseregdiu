-- ====================================================================
-- DIU Course Registration Platform - P0 Security Remediation Migration
-- Migration ID: 20261119110000_security_remediation_p0.sql
-- Fixes:
--  1. Advisor-Student Authoritative Assignment table
--  2. Profile privilege escalation prevention (RLS & row-level trigger)
--  3. Database uniqueness enforcement on DIU Student ID
--  4. Authoritative complete_student_onboarding security definer function
--  5. Hardened registrations RLS: draft-only student insert, state-constrained updates
--  6. Advisor registration access strictly isolated to assigned students
--  7. Registration items modification restricted to draft or assigned advisor review
--  8. Audit logs injection locked down against arbitrary user writes
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ADVISOR-STUDENT ASSIGNMENTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advisor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_advisor_student_semester UNIQUE (student_id, semester_id)
);

ALTER TABLE public.advisor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their own student assignments"
    ON public.advisor_assignments FOR SELECT
    USING (
        advisor_id = auth.uid()
        OR public.get_current_user_role() IN ('department_head', 'admin')
    );

CREATE POLICY "Only admins and department heads can manage advisor assignments"
    ON public.advisor_assignments FOR ALL
    USING (public.get_current_user_role() IN ('department_head', 'admin'))
    WITH CHECK (public.get_current_user_role() IN ('department_head', 'admin'));

-- --------------------------------------------------------------------
-- 2. PROFILE PRIVILEGE ESCALATION PREVENTION & UNIQUE DIU ID
-- --------------------------------------------------------------------
-- Ensure DIU Student ID uniqueness in database layer
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_profile_diu_id'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT unique_profile_diu_id UNIQUE (diu_id);
    END IF;
END $$;

-- Drop previous overly permissive profile update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create hardened profile update policy restricting column modifications
CREATE POLICY "Users can update own profile with strict column boundaries"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (
            -- Admins can update any profile column
            public.get_current_user_role() = 'admin'
            -- Normal users cannot alter their role, CGPA, or completed credits
            OR (
                role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
                AND (cgpa IS NOT DISTINCT FROM (SELECT p.cgpa FROM public.profiles p WHERE p.id = auth.uid()))
                AND (completed_credits IS NOT DISTINCT FROM (SELECT p.completed_credits FROM public.profiles p WHERE p.id = auth.uid()))
            )
        )
    );

-- Row-level trigger strictly prohibiting privilege escalation attempts
CREATE OR REPLACE FUNCTION public.check_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Service role and admin are exempted from column restrictions
    IF current_user = 'service_role' OR public.get_current_user_role() = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Non-admin users cannot alter their assigned role
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Privilege escalation violation: User cannot modify profile role.';
    END IF;

    -- Non-admin users cannot modify their CGPA or completed credits
    IF OLD.cgpa IS DISTINCT FROM NEW.cgpa OR OLD.completed_credits IS DISTINCT FROM NEW.completed_credits THEN
        RAISE EXCEPTION 'Academic record violation: CGPA and completed credits are university-controlled.';
    END IF;

    -- Once onboarded, students cannot re-assign or alter their official student ID
    IF OLD.onboarding_completed = true AND OLD.diu_id IS DISTINCT FROM NEW.diu_id THEN
        RAISE EXCEPTION 'Identity violation: Verified DIU Student ID cannot be modified without Registrar approval.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_check_profile_privilege_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_privilege_escalation();

-- --------------------------------------------------------------------
-- 3. AUTHORITATIVE ONBOARDING COMPLETION DATABASE FUNCTION
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
    p_full_name TEXT,
    p_diu_id TEXT,
    p_batch TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_existing_profile public.profiles%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_existing_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile does not exist.';
    END IF;

    -- Validate DIU ID convention syntax: Semester-Dept-Roll (e.g. 211-15-456 or 221-15-12345)
    IF NOT p_diu_id ~ '^\d{3}-\d{2}-\d{3,6}$' THEN
        RAISE EXCEPTION 'Invalid DIU Student ID syntax format. Expected format: XXX-XX-XXXXX';
    END IF;

    -- Authoritative database uniqueness check
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE diu_id = p_diu_id AND id <> v_user_id
    ) THEN
        RAISE EXCEPTION 'DIU Student ID % is already registered to another scholar.', p_diu_id;
    END IF;

    -- Update profile securely
    UPDATE public.profiles
    SET
        full_name = p_full_name,
        diu_id = p_diu_id,
        batch = p_batch,
        onboarding_completed = true,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'full_name', p_full_name,
        'diu_id', p_diu_id,
        'batch', p_batch
    );
END;
$$;

-- --------------------------------------------------------------------
-- 4. HARDENED REGISTRATIONS & REGISTRATION ITEMS RLS POLICIES
-- --------------------------------------------------------------------
-- Drop legacy overly permissive registration policies
DROP POLICY IF EXISTS "Advisors and Admins can view student registrations" ON public.registrations;
DROP POLICY IF EXISTS "Students can create draft registrations for themselves" ON public.registrations;
DROP POLICY IF EXISTS "Students can update their own draft registrations" ON public.registrations;
DROP POLICY IF EXISTS "Advisors can update registrations under review" ON public.registrations;

-- 4.1 Department heads and admins can inspect all registrations
CREATE POLICY "Admins and Dept Heads can view all registrations"
    ON public.registrations FOR SELECT
    USING (public.get_current_user_role() IN ('department_head', 'admin'));

-- 4.2 Advisors can ONLY view registrations of their specifically assigned students
CREATE POLICY "Advisors can view assigned student registrations"
    ON public.registrations FOR SELECT
    USING (
        public.get_current_user_role() = 'advisor'
        AND (
            advisor_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.advisor_assignments aa
                WHERE aa.advisor_id = auth.uid()
                AND aa.student_id = registrations.student_id
                AND aa.semester_id = registrations.semester_id
            )
        )
    );

-- 4.3 Students can only insert registrations in 'draft' status
CREATE POLICY "Students can only insert draft registrations"
    ON public.registrations FOR INSERT
    WITH CHECK (
        auth.uid() = student_id
        AND status = 'draft'
    );

-- 4.4 Students can update their draft registration, or submit it to pending_advisor
CREATE POLICY "Students can update their own draft registrations"
    ON public.registrations FOR UPDATE
    USING (auth.uid() = student_id AND status = 'draft')
    WITH CHECK (
        auth.uid() = student_id
        AND status IN ('draft', 'pending_advisor')
    );

-- 4.5 Advisors can only update applications assigned to them that are currently in pending_advisor status
CREATE POLICY "Advisors can update assigned pending registrations"
    ON public.registrations FOR UPDATE
    USING (
        public.get_current_user_role() = 'advisor'
        AND (
            advisor_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.advisor_assignments aa
                WHERE aa.advisor_id = auth.uid()
                AND aa.student_id = registrations.student_id
                AND aa.semester_id = registrations.semester_id
            )
        )
        AND status = 'pending_advisor'
    )
    WITH CHECK (
        public.get_current_user_role() = 'advisor'
        AND status IN ('approved', 'rejected', 'pending_advisor')
    );

-- 4.6 Registration items modification: students only when draft
DROP POLICY IF EXISTS "Students can modify items in draft registrations" ON public.registration_items;

CREATE POLICY "Students can modify items only in draft registrations"
    ON public.registration_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_items.registration_id
            AND r.student_id = auth.uid()
            AND r.status = 'draft'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_items.registration_id
            AND r.student_id = auth.uid()
            AND r.status = 'draft'
        )
    );

-- 4.7 Assigned advisors can reassign sections on pending applications
CREATE POLICY "Assigned advisors can reassign sections on pending applications"
    ON public.registration_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_items.registration_id
            AND r.status = 'pending_advisor'
            AND (
                r.advisor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.advisor_assignments aa
                    WHERE aa.advisor_id = auth.uid()
                    AND aa.student_id = r.student_id
                    AND aa.semester_id = r.semester_id
                )
            )
        )
    );

-- --------------------------------------------------------------------
-- 5. AUDIT LOGS INJECTION PROTECTION
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Prevent arbitrary user injection of audit logs
CREATE POLICY "Only admins or service role can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_current_user_role() = 'admin'
    );
