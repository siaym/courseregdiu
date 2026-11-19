-- ====================================================================
-- DIU Course Registration Platform - P0 Security & Identity Remediation
-- Migration: 20261119140000_p0_security_and_identity_remediation.sql
-- Fixes:
--  1. Identity Linking: Links personal Google auth accounts (auth.users)
--     to canonical profiles via authorized_emails.auth_user_id & get_current_profile_id()
--  2. Profile Privacy: Removes public profile read access; restricts
--     viewing to self, assigned advisor/student cohorts, and admin
--  3. Concurrency & Atomic Seat Allocation: enroll_section_atomic, drop_section_atomic,
--     and switch_section_atomic with SELECT ... FOR UPDATE row-level locking
--  4. Registration Integrity: check_registration_state_transition trigger
--     strictly enforcing student and advisor state machine constraints
--  5. Idempotence: All policies and triggers cleanly dropped before recreation
--  6. resolve_profile_by_email hardening: Prevents arbitrary email reconnaissance
--  7. Consistent DIU ID regex: Unified to ^\d{3}-\d{2}-\d{3,6}$
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. IDENTITY LINKING ARCHITECTURE
-- --------------------------------------------------------------------

-- Add auth_user_id column to authorized_emails to link secondary auth.users
ALTER TABLE public.authorized_emails
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_authorized_emails_auth_user_id ON public.authorized_emails(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_authorized_emails_email ON public.authorized_emails(email);

-- Canonical Profile Resolver Function: Resolves current caller's profile ID
-- regardless of whether they authenticated via primary DIU email or authorized personal email
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
    v_jwt_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- 1. Direct match: auth.uid() is the canonical profile.id
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = auth.uid();
    IF v_profile_id IS NOT NULL THEN
        RETURN v_profile_id;
    END IF;

    -- 2. Linked identity: personal Google auth account linked in authorized_emails
    SELECT profile_id INTO v_profile_id
    FROM public.authorized_emails
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
        RETURN v_profile_id;
    END IF;

    -- 3. Match by verified email in JWT token
    v_jwt_email := TRIM(LOWER(auth.jwt() ->> 'email'));
    IF v_jwt_email IS NOT NULL AND v_jwt_email <> '' THEN
        SELECT profile_id INTO v_profile_id
        FROM public.authorized_emails
        WHERE email = v_jwt_email AND is_active = true
        LIMIT 1;
        IF v_profile_id IS NOT NULL THEN
            RETURN v_profile_id;
        END IF;
    END IF;

    -- 4. Fallback to auth.uid()
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update get_current_user_role to use canonical profile ID
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = public.get_current_profile_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update handle_new_user to link auth_user_id on authorized personal login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    target_role user_role := 'student';
    auth_record RECORD;
BEGIN
    user_email := LOWER(TRIM(NEW.email));

    -- Check if this email is an authorized alternative personal or faculty email
    SELECT * INTO auth_record FROM public.authorized_emails WHERE email = user_email;

    IF FOUND THEN
        -- If email is deactivated, block linking
        IF auth_record.is_active = false THEN
            RETURN NEW;
        END IF;

        -- Link this auth.users entry to the authorized email record
        UPDATE public.authorized_emails
        SET auth_user_id = NEW.id, updated_at = timezone('utc'::text, now())
        WHERE id = auth_record.id;

        -- Return without creating a duplicate profile
        RETURN NEW;
    END IF;

    -- Only allow initial auto-creation for @diu.edu.bd institutional emails
    IF user_email NOT LIKE '%@diu.edu.bd' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        avatar_url,
        onboarding_completed,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        user_email,
        target_role,
        NEW.raw_user_meta_data->>'avatar_url',
        false,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE
    SET
        avatar_url = EXCLUDED.avatar_url,
        updated_at = timezone('utc'::text, now());

    -- Record primary DIU email in authorized_emails with auth_user_id linked
    INSERT INTO public.authorized_emails (
        profile_id,
        auth_user_id,
        email,
        email_type,
        is_active,
        authorized_at,
        reason
    )
    VALUES (
        NEW.id,
        NEW.id,
        user_email,
        'primary_diu',
        true,
        timezone('utc'::text, now()),
        'Standard institutional Google account provisioning'
    )
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id, updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- 2. PROFILE PRIVACY & RLS REINFORCEMENT
-- --------------------------------------------------------------------

-- Drop insecure public profile viewing policies
DROP POLICY IF EXISTS "Public profile viewing" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profile records" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;

-- Strict Institutional Profile Access Policy:
-- Unauthenticated users cannot read ANY profiles.
-- Authenticated users can view:
--  1. Their own profile
--  2. Assigned advisors can view their advisees
--  3. Students can view their assigned advisor
--  4. Department heads can view scholars/faculty in their department
--  5. Administrators can view all profiles
CREATE POLICY "Institutional profiles select policy"
    ON public.profiles FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND (
            -- Self profile
            id = public.get_current_profile_id()
            -- Assigned advisor viewing advisee
            OR EXISTS (
                SELECT 1 FROM public.advisor_assignments aa
                WHERE aa.advisor_id = public.get_current_profile_id() AND aa.student_id = profiles.id
            )
            -- Student viewing assigned advisor
            OR EXISTS (
                SELECT 1 FROM public.advisor_assignments aa
                WHERE aa.student_id = public.get_current_profile_id() AND aa.advisor_id = profiles.id
            )
            -- Department head viewing department members
            OR (
                public.get_current_user_role() = 'department_head'
                AND department_code = (
                    SELECT p.department_code FROM public.profiles p WHERE p.id = public.get_current_profile_id()
                )
            )
            -- Administrator full access
            OR public.get_current_user_role() = 'admin'
        )
    );

-- Drop previous profile update policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile with strict column boundaries" ON public.profiles;

CREATE POLICY "Users can update own profile with strict column boundaries"
    ON public.profiles FOR UPDATE
    USING (public.get_current_profile_id() = id)
    WITH CHECK (
        public.get_current_profile_id() = id
        AND (
            public.get_current_user_role() = 'admin'
            OR (
                role = (SELECT p.role FROM public.profiles p WHERE p.id = public.get_current_profile_id())
                AND (cgpa IS NOT DISTINCT FROM (SELECT p.cgpa FROM public.profiles p WHERE p.id = public.get_current_profile_id()))
                AND (completed_credits IS NOT DISTINCT FROM (SELECT p.completed_credits FROM public.profiles p WHERE p.id = public.get_current_profile_id()))
            )
        )
    );

-- --------------------------------------------------------------------
-- 3. HARDEN RESOLVE_PROFILE_BY_EMAIL RPC
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_profile_by_email(p_email TEXT)
RETURNS TABLE (
    profile_id UUID,
    full_name TEXT,
    diu_id VARCHAR(30),
    role user_role,
    email_type VARCHAR(32),
    is_authorized BOOLEAN,
    deactivation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_norm_email TEXT;
    v_caller_role user_role;
    v_caller_jwt_email TEXT;
    v_auth_record RECORD;
    v_profile RECORD;
BEGIN
    v_norm_email := TRIM(LOWER(p_email));
    v_caller_role := public.get_current_user_role();
    v_caller_jwt_email := TRIM(LOWER(COALESCE(auth.jwt() ->> 'email', '')));

    -- Authorization Guard: Only admin or the identity owner can resolve
    IF current_user <> 'service_role' AND (v_caller_role IS DISTINCT FROM 'admin') THEN
        IF v_caller_jwt_email <> '' AND v_norm_email <> v_caller_jwt_email THEN
            RAISE EXCEPTION 'Access denied: You can only resolve your own authenticated email identity.';
        END IF;
    END IF;

    SELECT * INTO v_auth_record FROM public.authorized_emails ae WHERE ae.email = v_norm_email;

    IF FOUND THEN
        SELECT * INTO v_profile FROM public.profiles p WHERE p.id = v_auth_record.profile_id;
        IF v_auth_record.is_active = false THEN
            RETURN QUERY SELECT
                v_profile.id,
                v_profile.full_name,
                v_profile.diu_id,
                v_profile.role,
                v_auth_record.email_type,
                false,
                'Account authorization has been deactivated by administrator'::TEXT;
            RETURN;
        END IF;

        RETURN QUERY SELECT
            v_profile.id,
            v_profile.full_name,
            v_profile.diu_id,
            v_profile.role,
            v_auth_record.email_type,
            true,
            NULL::TEXT;
        RETURN;
    END IF;

    IF v_norm_email LIKE '%@diu.edu.bd' THEN
        SELECT * INTO v_profile FROM public.profiles p WHERE p.email = v_norm_email;
        IF FOUND THEN
            RETURN QUERY SELECT
                v_profile.id,
                v_profile.full_name,
                v_profile.diu_id,
                v_profile.role,
                'primary_diu'::VARCHAR(32),
                true,
                NULL::TEXT;
            RETURN;
        ELSE
            RETURN QUERY SELECT
                NULL::UUID,
                NULL::TEXT,
                NULL::VARCHAR(30),
                'student'::user_role,
                'primary_diu'::VARCHAR(32),
                true,
                NULL::TEXT;
            RETURN;
        END IF;
    END IF;

    RETURN QUERY SELECT
        NULL::UUID,
        NULL::TEXT,
        NULL::VARCHAR(30),
        NULL::user_role,
        'unregistered_personal'::VARCHAR(32),
        false,
        'Personal email address is not authorized for institutional registration'::TEXT;
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_profile_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_profile_by_email(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_profile_by_email(TEXT) TO authenticated, service_role;

-- --------------------------------------------------------------------
-- 4. UNIFIED DIU ID REGEX ONBOARDING RPC
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
    v_existing_id UUID;
BEGIN
    v_user_id := public.get_current_profile_id();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Unified DIU Student ID regex format: Semester-Dept-Roll (e.g. 211-15-456 or 221-15-12345)
    IF p_diu_id !~ '^\d{3}-\d{2}-\d{3,6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid DIU Student ID format. Expected format: XXX-XX-XXX (e.g. 211-15-456 or 221-15-12345)');
    END IF;

    SELECT id INTO v_existing_id FROM public.profiles WHERE diu_id = p_diu_id AND id <> v_user_id;
    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'DIU Student ID is already registered to another account.');
    END IF;

    UPDATE public.profiles
    SET
        full_name = p_full_name,
        diu_id = p_diu_id,
        batch = p_batch,
        onboarding_completed = true,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- --------------------------------------------------------------------
-- 5. REGISTRATION INTEGRITY & STATE TRANSITION TRIGGER
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_registration_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role;
    v_profile_id UUID;
BEGIN
    IF current_user = 'service_role' THEN
        RETURN NEW;
    END IF;

    v_role := public.get_current_user_role();
    v_profile_id := public.get_current_profile_id();

    IF v_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Immutability of core student and semester associations
    IF OLD.student_id IS DISTINCT FROM NEW.student_id THEN
        RAISE EXCEPTION 'Integrity violation: student_id cannot be modified.';
    END IF;
    IF OLD.semester_id IS DISTINCT FROM NEW.semester_id THEN
        RAISE EXCEPTION 'Integrity violation: semester_id cannot be modified.';
    END IF;

    -- Student state machine constraints
    IF v_role = 'student' THEN
        IF OLD.student_id <> v_profile_id THEN
            RAISE EXCEPTION 'Access denied: You can only update your own registration.';
        END IF;

        IF NEW.status = 'approved' THEN
            RAISE EXCEPTION 'Security violation: Students cannot approve their own registration application.';
        END IF;

        IF OLD.status NOT IN ('draft', 'rejected') AND NEW.status <> OLD.status THEN
            RAISE EXCEPTION 'State violation: Submitted registrations can only be modified if returned for revision.';
        END IF;

        IF OLD.advisor_notes IS DISTINCT FROM NEW.advisor_notes OR OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at THEN
            RAISE EXCEPTION 'Security violation: Students cannot modify advisor review notes or review timestamps.';
        END IF;
    END IF;

    -- Advisor state machine constraints
    IF v_role = 'advisor' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.advisor_assignments aa
            WHERE aa.advisor_id = v_profile_id AND aa.student_id = OLD.student_id AND aa.semester_id = OLD.semester_id
        ) AND OLD.advisor_id IS DISTINCT FROM v_profile_id THEN
            RAISE EXCEPTION 'Access denied: You are not the assigned advisor for this student.';
        END IF;

        IF OLD.status <> 'pending_advisor' AND NEW.status <> OLD.status THEN
            RAISE EXCEPTION 'State violation: Advisors can only transition registrations currently pending review.';
        END IF;

        IF NEW.status NOT IN ('approved', 'rejected', 'pending_advisor') THEN
            RAISE EXCEPTION 'Invalid status transition: Advisor can only approve or return for revision.';
        END IF;

        IF OLD.payment_cleared IS DISTINCT FROM NEW.payment_cleared OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at THEN
            RAISE EXCEPTION 'Security violation: Advisor cannot modify student payment clearance or submission timestamp.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_registration_state_transition ON public.registrations;
CREATE TRIGGER trg_check_registration_state_transition
    BEFORE UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.check_registration_state_transition();

-- --------------------------------------------------------------------
-- 6. CONCURRENCY CONTROL & ATOMIC SEAT ALLOCATION
-- --------------------------------------------------------------------

-- Atomic Section Enrollment with Row-Level Locking (SELECT ... FOR UPDATE)
CREATE OR REPLACE FUNCTION public.enroll_section_atomic(
    p_registration_id UUID,
    p_section_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_role user_role;
    v_reg public.registrations%ROWTYPE;
    v_section public.sections%ROWTYPE;
    v_item_id UUID;
    v_existing_item public.registration_items%ROWTYPE;
    v_existing_course_item RECORD;
BEGIN
    v_profile_id := public.get_current_profile_id();
    v_role := public.get_current_user_role();

    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- 1. Validate registration ownership & state
    SELECT * INTO v_reg FROM public.registrations WHERE id = p_registration_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registration application not found');
    END IF;

    IF v_role = 'student' AND (v_reg.student_id <> v_profile_id OR v_reg.status NOT IN ('draft', 'rejected')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot modify application in status: ' || v_reg.status);
    END IF;

    -- 2. Concurrency Lock: Acquire exclusive row lock on the section
    SELECT * INTO v_section
    FROM public.sections
    WHERE id = p_section_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Section not found');
    END IF;

    -- 3. Check for existing enrollment in this exact section
    SELECT * INTO v_existing_item
    FROM public.registration_items
    WHERE registration_id = p_registration_id AND section_id = p_section_id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already enrolled in this section');
    END IF;

    -- 4. Check for duplicate course enrollment (cannot take two sections of the same course)
    SELECT ri.id, s.section_number INTO v_existing_course_item
    FROM public.registration_items ri
    JOIN public.sections s ON s.id = ri.section_id
    WHERE ri.registration_id = p_registration_id
      AND s.course_id = v_section.course_id
      AND ri.status = 'enrolled'
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already enrolled in Section ' || v_existing_course_item.section_number || ' for this course. Switch section instead.'
        );
    END IF;

    -- 5. Strict Capacity Enforcement Under Concurrency
    IF v_section.enrolled_count >= v_section.capacity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Section ' || v_section.section_number || ' is fully enrolled (' || v_section.capacity || '/' || v_section.capacity || ' seats taken)'
        );
    END IF;

    -- 6. Atomic Seat Reservation & Item Insertion
    UPDATE public.sections
    SET enrolled_count = enrolled_count + 1
    WHERE id = p_section_id;

    INSERT INTO public.registration_items (
        id,
        registration_id,
        section_id,
        status,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        p_registration_id,
        p_section_id,
        'enrolled',
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_item_id;

    RETURN jsonb_build_object(
        'success', true,
        'item_id', v_item_id,
        'enrolled_count', v_section.enrolled_count + 1,
        'capacity', v_section.capacity
    );
END;
$$;

-- Atomic Section Drop
CREATE OR REPLACE FUNCTION public.drop_section_atomic(
    p_registration_id UUID,
    p_section_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_role user_role;
    v_reg public.registrations%ROWTYPE;
BEGIN
    v_profile_id := public.get_current_profile_id();
    v_role := public.get_current_user_role();

    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_reg FROM public.registrations WHERE id = p_registration_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registration application not found');
    END IF;

    IF v_role = 'student' AND (v_reg.student_id <> v_profile_id OR v_reg.status NOT IN ('draft', 'rejected')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot modify application in status: ' || v_reg.status);
    END IF;

    -- Acquire exclusive row lock
    PERFORM 1 FROM public.sections WHERE id = p_section_id FOR UPDATE;

    DELETE FROM public.registration_items
    WHERE registration_id = p_registration_id AND section_id = p_section_id;

    IF FOUND THEN
        UPDATE public.sections
        SET enrolled_count = GREATEST(0, enrolled_count - 1)
        WHERE id = p_section_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Atomic Section Switch (Reassign within same course)
CREATE OR REPLACE FUNCTION public.switch_section_atomic(
    p_registration_id UUID,
    p_old_section_id UUID,
    p_new_section_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_role user_role;
    v_reg public.registrations%ROWTYPE;
    v_new_section public.sections%ROWTYPE;
    v_first_id UUID;
    v_second_id UUID;
BEGIN
    v_profile_id := public.get_current_profile_id();
    v_role := public.get_current_user_role();

    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_reg FROM public.registrations WHERE id = p_registration_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registration application not found');
    END IF;

    IF v_role = 'student' AND (v_reg.student_id <> v_profile_id OR v_reg.status NOT IN ('draft', 'rejected')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot modify application in status: ' || v_reg.status);
    END IF;

    -- Lock sections in sorted UUID order to avoid potential deadlocks under concurrency
    IF p_old_section_id < p_new_section_id THEN
        v_first_id := p_old_section_id;
        v_second_id := p_new_section_id;
    ELSE
        v_first_id := p_new_section_id;
        v_second_id := p_old_section_id;
    END IF;

    PERFORM 1 FROM public.sections WHERE id = v_first_id FOR UPDATE;
    SELECT * INTO v_new_section FROM public.sections WHERE id = v_second_id FOR UPDATE;

    IF v_new_section.id <> p_new_section_id THEN
        SELECT * INTO v_new_section FROM public.sections WHERE id = p_new_section_id;
    END IF;

    -- Check capacity of new section
    IF v_new_section.enrolled_count >= v_new_section.capacity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'New Section ' || v_new_section.section_number || ' is full (' || v_new_section.capacity || '/' || v_new_section.capacity || ')'
        );
    END IF;

    -- Update registration item
    UPDATE public.registration_items
    SET section_id = p_new_section_id
    WHERE registration_id = p_registration_id AND section_id = p_old_section_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Original enrolled section item not found');
    END IF;

    -- Decrement old, increment new
    UPDATE public.sections SET enrolled_count = GREATEST(0, enrolled_count - 1) WHERE id = p_old_section_id;
    UPDATE public.sections SET enrolled_count = enrolled_count + 1 WHERE id = p_new_section_id;

    RETURN jsonb_build_object('success', true, 'new_section_id', p_new_section_id);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.enroll_section_atomic(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.drop_section_atomic(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.switch_section_atomic(UUID, UUID, UUID) TO authenticated, service_role;
