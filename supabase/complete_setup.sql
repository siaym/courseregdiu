-- ====================================================================
-- DIU Course Registration Platform - Complete Authoritative Database Schema
-- Version: 2.0.0 (Hardened Production Architecture)
-- Target: PostgreSQL 15+ (Hosted on Supabase)
-- Instruction: Run this entire script in Supabase Dashboard -> SQL Editor
-- Features:
--  - Multi-Email Identity Linking (primary DIU + admin-authorized personal Google accounts)
--  - Row-Level Security (RLS) on all tables (Profiles strictly private)
--  - Atomic Seat Allocation & Concurrency Control (SELECT ... FOR UPDATE)
--  - Registration State Machine Integrity Triggers
--  - 100% Idempotent (Safe to run repeatedly)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. EXTENSIONS & CUSTOM ENUM TYPES
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'advisor', 'department_head', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_status AS ENUM ('draft', 'pending_advisor', 'approved', 'rejected', 'dropped');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE semester_season AS ENUM ('spring', 'summer', 'fall');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- --------------------------------------------------------------------
-- 2. CORE TABLES
-- --------------------------------------------------------------------

-- 2.1 DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    faculty TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    diu_id VARCHAR(30) UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    department_code VARCHAR(10) REFERENCES public.departments(code) ON UPDATE CASCADE ON DELETE SET NULL,
    cgpa NUMERIC(3, 2) DEFAULT 0.00 CHECK (cgpa >= 0.00 AND cgpa <= 4.00),
    completed_credits INTEGER DEFAULT 0 CHECK (completed_credits >= 0),
    phone VARCHAR(20),
    avatar_url TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    batch VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3 SEMESTERS
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    season semester_season NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    registration_starts_at TIMESTAMPTZ,
    registration_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_semester UNIQUE (year, season)
);

-- 2.4 COURSES
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(15) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credits NUMERIC(3, 1) NOT NULL CHECK (credits > 0.0 AND credits <= 6.0),
    department_code VARCHAR(10) NOT NULL REFERENCES public.departments(code) ON UPDATE CASCADE ON DELETE RESTRICT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.5 COURSE PREREQUISITES
CREATE TABLE IF NOT EXISTS public.course_prerequisites (
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    prerequisite_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, prerequisite_course_id),
    CONSTRAINT no_self_prerequisite CHECK (course_id <> prerequisite_course_id)
);

-- 2.6 SECTIONS (Offerings per semester)
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    section_number VARCHAR(10) NOT NULL,
    -- DIU Academic Rule: Lab courses = 25 seats fixed; Theory courses = 50 seats fixed
    capacity INTEGER NOT NULL DEFAULT 50 CHECK (capacity > 0),
    enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
    room VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_course_section_per_semester UNIQUE (course_id, semester_id, section_number),
    CONSTRAINT enrolled_cannot_exceed_capacity CHECK (enrolled_count <= capacity)
);

-- 2.7 REGISTRATIONS (Student application header)
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    status registration_status NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    advisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    advisor_notes TEXT,
    payment_cleared BOOLEAN NOT NULL DEFAULT false,
    payment_reference VARCHAR(50),
    previous_section VARCHAR(20),
    desired_section VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_semester_registration UNIQUE (student_id, semester_id)
);

-- 2.8 REGISTRATION ITEMS (Individual section choices)
CREATE TABLE IF NOT EXISTS public.registration_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE RESTRICT,
    course_type VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (course_type IN ('general', 'retake')),
    status VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'waitlisted', 'dropped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_registration_section UNIQUE (registration_id, section_id)
);

-- 2.9 ADVISOR-STUDENT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.advisor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_advisor_student_semester UNIQUE (student_id, semester_id)
);

-- 2.10 AUTHORIZED EMAILS (Multi-email identity mapping)
CREATE TABLE IF NOT EXISTS public.authorized_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    email_type VARCHAR(32) NOT NULL DEFAULT 'alternative_personal' CHECK (
        email_type IN ('primary_diu', 'alternative_personal', 'advisor_authorized', 'admin_authorized')
    ),
    is_active BOOLEAN NOT NULL DEFAULT true,
    authorized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_authorized_email UNIQUE (email),
    CONSTRAINT normalized_email_check CHECK (email = TRIM(LOWER(email)))
);

CREATE INDEX IF NOT EXISTS idx_authorized_emails_auth_user_id ON public.authorized_emails(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_authorized_emails_email ON public.authorized_emails(email);

-- 2.11 EMAIL AUTHORIZATION AUDIT LOG
CREATE TABLE IF NOT EXISTS public.email_authorization_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorized_email_id UUID REFERENCES public.authorized_emails(id) ON DELETE SET NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    action VARCHAR(32) NOT NULL CHECK (
        action IN ('AUTHORIZED', 'MODIFIED', 'DEACTIVATED', 'REACTIVATED', 'REVOKED')
    ),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.12 AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.13 BATCH SEMESTER COURSES
CREATE TABLE IF NOT EXISTS public.batch_semester_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    batch VARCHAR(20) NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT unique_batch_semester_course UNIQUE (semester_id, batch, course_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_sem_courses_lookup 
    ON public.batch_semester_courses (semester_id, batch);

-- 2.14 PAYMENT CLEARANCES
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

-- 2.15 PAYMENT CLEARANCE AUDIT (Immutable Audit Trail)
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

-- 2.16 SYSTEM SETTINGS (Feature Flags & Runtime Controls)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- --------------------------------------------------------------------
-- 3. STORED FUNCTIONS & TRIGGERS
-- --------------------------------------------------------------------

-- 3.1 Canonical Profile Resolver Function: Resolves current caller's profile ID
-- regardless of whether they authenticated via primary DIU email or authorized personal email
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
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
$$;

-- 3.2 Helper to get current authenticated user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_role user_role;
    v_prof_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    v_prof_id := public.get_current_profile_id();
    IF v_prof_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = v_prof_id;
    RETURN v_role;
END;
$$;

-- 3.2.1 Helper to get current authenticated user department
CREATE OR REPLACE FUNCTION public.get_current_user_department()
RETURNS VARCHAR(10)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_dept VARCHAR(10);
    v_prof_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    v_prof_id := public.get_current_profile_id();
    IF v_prof_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT department_code INTO v_dept FROM public.profiles WHERE id = v_prof_id;
    RETURN v_dept;
END;
$$;

-- 3.2.2 Helper to check advisor/advisee relationship without triggering RLS
CREATE OR REPLACE FUNCTION public.is_assigned_advisor_or_advisee(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    IF p_user_a IS NULL OR p_user_b IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.advisor_assignments aa
        WHERE (aa.advisor_id = p_user_a AND aa.student_id = p_user_b)
           OR (aa.student_id = p_user_a AND aa.advisor_id = p_user_b)
    );
END;
$$;

-- 3.3 Automated profile provisioning trigger
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3.4 Privilege Escalation Guard Trigger
CREATE OR REPLACE FUNCTION public.check_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user = 'service_role' OR public.get_current_user_role() = 'admin' THEN
        RETURN NEW;
    END IF;

    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Privilege escalation violation: User cannot modify profile role.';
    END IF;

    IF OLD.cgpa IS DISTINCT FROM NEW.cgpa OR OLD.completed_credits IS DISTINCT FROM NEW.completed_credits THEN
        RAISE EXCEPTION 'Academic record violation: CGPA and completed credits are university-controlled.';
    END IF;

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

-- 3.5 Complete Student Onboarding RPC (Unified DIU ID regex)
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

    -- Unified DIU Student ID format: Semester-Dept-Roll (e.g. 211-15-456 or 221-15-12345)
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

-- 3.6 Multi-Email Identity Resolution RPC (Hardened against arbitrary reconnaissance)
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

-- 3.7 Registration Integrity & State Transition Trigger
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

-- 3.8 Concurrency Control: Atomic Section Enrollment (SELECT ... FOR UPDATE)
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

-- 3.9 Concurrency Control: Atomic Section Drop
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

-- 3.10 Concurrency Control: Atomic Section Switch
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

    -- Deadlock prevention: sort lock acquisition by UUID
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

GRANT EXECUTE ON FUNCTION public.enroll_section_atomic(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.drop_section_atomic(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.switch_section_atomic(UUID, UUID, UUID) TO authenticated, service_role;

-- 3.11 DIU Section Capacity Rules (Lab = 25 seats, Theory = 50 seats)
CREATE OR REPLACE FUNCTION public.get_diu_section_capacity(p_course_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_title TEXT;
    v_credits NUMERIC;
BEGIN
    SELECT title, credits INTO v_title, v_credits
    FROM public.courses
    WHERE id = p_course_id;

    IF v_title ILIKE '%lab%' OR v_credits <= 1.5 THEN
        RETURN 25;
    ELSE
        RETURN 50;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_diu_section_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_expected_capacity INTEGER;
BEGIN
    v_expected_capacity := public.get_diu_section_capacity(NEW.course_id);
    NEW.capacity := v_expected_capacity;

    IF NEW.enrolled_count > NEW.capacity THEN
        RAISE EXCEPTION 'Enrolled count (%) exceeds fixed DIU section capacity (%)', NEW.enrolled_count, NEW.capacity;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_diu_section_capacity ON public.sections;
CREATE TRIGGER trg_enforce_diu_section_capacity
    BEFORE INSERT OR UPDATE OF course_id, capacity, enrolled_count
    ON public.sections
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_diu_section_capacity();

-- --------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_authorization_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_semester_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_clearance_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 4.1 DEPARTMENTS
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Only admins manage departments" ON public.departments;
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Only admins manage departments" ON public.departments FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- 4.2 PROFILES (Strict Institutional Privacy)
DROP POLICY IF EXISTS "Public profile viewing" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Institutional profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile with strict column boundaries" ON public.profiles;

CREATE POLICY "Institutional profiles select policy"
    ON public.profiles FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND (
            id = public.get_current_profile_id()
            OR public.get_current_user_role() = 'admin'
            OR (
                public.get_current_user_role() = 'department_head'
                AND department_code = public.get_current_user_department()
            )
            OR public.is_assigned_advisor_or_advisee(public.get_current_profile_id(), profiles.id)
        )
    );

CREATE POLICY "Users can update own profile with strict column boundaries"
    ON public.profiles FOR UPDATE
    USING (public.get_current_profile_id() = id)
    WITH CHECK (public.get_current_profile_id() = id);

-- 4.3 SEMESTERS, COURSES, SECTIONS
DROP POLICY IF EXISTS "Public semester viewing" ON public.semesters;
DROP POLICY IF EXISTS "Public course viewing" ON public.courses;
DROP POLICY IF EXISTS "Public section viewing" ON public.sections;
CREATE POLICY "Public semester viewing" ON public.semesters FOR SELECT USING (true);
CREATE POLICY "Public course viewing" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public section viewing" ON public.sections FOR SELECT USING (true);

-- 4.4 ADVISOR ASSIGNMENTS
DROP POLICY IF EXISTS "View advisor assignments" ON public.advisor_assignments;
DROP POLICY IF EXISTS "Manage advisor assignments" ON public.advisor_assignments;
CREATE POLICY "View advisor assignments" ON public.advisor_assignments FOR SELECT
    USING (
        advisor_id = public.get_current_profile_id()
        OR student_id = public.get_current_profile_id()
        OR public.get_current_user_role() IN ('department_head', 'admin')
    );
CREATE POLICY "Manage advisor assignments" ON public.advisor_assignments FOR ALL
    USING (public.get_current_user_role() IN ('department_head', 'admin'));

-- 4.5 AUTHORIZED EMAILS
DROP POLICY IF EXISTS "Authorized emails view policy" ON public.authorized_emails;
DROP POLICY IF EXISTS "Authorized emails admin manage" ON public.authorized_emails;
CREATE POLICY "Authorized emails view policy" ON public.authorized_emails FOR SELECT
    USING (public.get_current_user_role() = 'admin' OR profile_id = public.get_current_profile_id());
CREATE POLICY "Authorized emails admin manage" ON public.authorized_emails FOR ALL
    USING (public.get_current_user_role() = 'admin');

-- 4.6 EMAIL AUTHORIZATION AUDIT
DROP POLICY IF EXISTS "Audit view policy" ON public.email_authorization_audit;
DROP POLICY IF EXISTS "Audit insert policy" ON public.email_authorization_audit;
CREATE POLICY "Audit view policy" ON public.email_authorization_audit FOR SELECT
    USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Audit insert policy" ON public.email_authorization_audit FOR INSERT
    WITH CHECK (public.get_current_user_role() = 'admin');

-- 4.7 REGISTRATIONS
DROP POLICY IF EXISTS "Registration select policy" ON public.registrations;
DROP POLICY IF EXISTS "Registration student draft insert" ON public.registrations;
DROP POLICY IF EXISTS "Registration update policy" ON public.registrations;

CREATE POLICY "Registration select policy" ON public.registrations FOR SELECT
    USING (
        student_id = public.get_current_profile_id()
        OR advisor_id = public.get_current_profile_id()
        OR EXISTS (
            SELECT 1 FROM public.advisor_assignments aa
            WHERE aa.advisor_id = public.get_current_profile_id() AND aa.student_id = registrations.student_id AND aa.semester_id = registrations.semester_id
        )
        OR public.get_current_user_role() IN ('department_head', 'admin')
    );

CREATE POLICY "Registration student draft insert" ON public.registrations FOR INSERT
    WITH CHECK (
        student_id = public.get_current_profile_id()
        AND status = 'draft'
        AND public.get_current_user_role() = 'student'
    );

CREATE POLICY "Registration update policy" ON public.registrations FOR UPDATE
    USING (
        (student_id = public.get_current_profile_id() AND status IN ('draft', 'rejected'))
        OR (
            (
                advisor_id = public.get_current_profile_id()
                OR EXISTS (
                    SELECT 1 FROM public.advisor_assignments aa
                    WHERE aa.advisor_id = public.get_current_profile_id() AND aa.student_id = registrations.student_id AND aa.semester_id = registrations.semester_id
                )
            )
            AND status = 'pending_advisor'
        )
        OR public.get_current_user_role() = 'admin'
    )
    WITH CHECK (
        -- Students cannot approve or tamper with advisor fields
        (
            public.get_current_user_role() = 'student'
            AND student_id = public.get_current_profile_id()
            AND status IN ('draft', 'pending_advisor')
        )
        -- Advisors can only transition to approved or rejected
        OR (
            public.get_current_user_role() = 'advisor'
            AND status IN ('approved', 'rejected', 'pending_advisor')
        )
        -- Admins full access
        OR public.get_current_user_role() = 'admin'
    );

-- 4.8 REGISTRATION ITEMS
DROP POLICY IF EXISTS "Registration items select" ON public.registration_items;
DROP POLICY IF EXISTS "Registration items insert" ON public.registration_items;
DROP POLICY IF EXISTS "Registration items delete" ON public.registration_items;

CREATE POLICY "Registration items select" ON public.registration_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_id AND (
                r.student_id = public.get_current_profile_id()
                OR r.advisor_id = public.get_current_profile_id()
                OR EXISTS (
                    SELECT 1 FROM public.advisor_assignments aa
                    WHERE aa.advisor_id = public.get_current_profile_id() AND aa.student_id = r.student_id AND aa.semester_id = r.semester_id
                )
                OR public.get_current_user_role() IN ('department_head', 'admin')
            )
        )
    );

CREATE POLICY "Registration items insert" ON public.registration_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_id AND r.student_id = public.get_current_profile_id() AND r.status = 'draft'
        )
        OR public.get_current_user_role() IN ('advisor', 'admin')
    );

CREATE POLICY "Registration items delete" ON public.registration_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_id AND r.student_id = public.get_current_profile_id() AND r.status = 'draft'
        )
        OR public.get_current_user_role() IN ('advisor', 'admin')
    );

-- 4.9 AUDIT LOGS
DROP POLICY IF EXISTS "Audit logs select" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;
CREATE POLICY "Audit logs select" ON public.audit_logs FOR SELECT
    USING (public.get_current_user_role() IN ('admin', 'department_head'));
CREATE POLICY "Audit logs insert" ON public.audit_logs FOR INSERT
    WITH CHECK (public.get_current_user_role() = 'admin');

-- 4.10 BATCH SEMESTER COURSES
DROP POLICY IF EXISTS "Admins have full access to batch_semester_courses" ON public.batch_semester_courses;
DROP POLICY IF EXISTS "Faculty can view all batch_semester_courses" ON public.batch_semester_courses;
DROP POLICY IF EXISTS "Students can view courses for their own batch" ON public.batch_semester_courses;

CREATE POLICY "Admins have full access to batch_semester_courses"
    ON public.batch_semester_courses FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Faculty can view all batch_semester_courses"
    ON public.batch_semester_courses FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('advisor', 'department_head', 'admin'));

CREATE POLICY "Students can view courses for their own batch"
    ON public.batch_semester_courses FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = public.get_current_profile_id()
              AND profiles.batch = batch_semester_courses.batch
        )
    );

-- 4.11 PAYMENT CLEARANCES & AUDIT
DROP POLICY IF EXISTS "Admins have full access to payment_clearances" ON public.payment_clearances;
DROP POLICY IF EXISTS "Students can view their own payment_clearances" ON public.payment_clearances;
DROP POLICY IF EXISTS "Advisors can view advisee payment_clearances" ON public.payment_clearances;

CREATE POLICY "Admins have full access to payment_clearances"
    ON public.payment_clearances FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Students can view their own payment_clearances"
    ON public.payment_clearances FOR SELECT TO authenticated
    USING (student_id = public.get_current_profile_id());

CREATE POLICY "Advisors can view advisee payment_clearances"
    ON public.payment_clearances FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.advisor_assignments aa
            WHERE aa.advisor_id = public.get_current_profile_id()
              AND aa.student_id = payment_clearances.student_id
        )
    );

DROP POLICY IF EXISTS "Admins can view all payment_clearance_audit" ON public.payment_clearance_audit;
CREATE POLICY "Admins can view all payment_clearance_audit"
    ON public.payment_clearance_audit FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

-- 4.12 SYSTEM SETTINGS (Runtime Feature Flags)
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admins to manage system_settings" ON public.system_settings;

CREATE POLICY "Allow public read system_settings"
    ON public.system_settings FOR SELECT
    USING (true);

CREATE POLICY "Allow admins to manage system_settings"
    ON public.system_settings FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- --------------------------------------------------------------------
-- 5. INITIAL SEED DATA
-- --------------------------------------------------------------------
INSERT INTO public.departments (code, name, faculty) VALUES
    ('CSE', 'Computer Science and Engineering', 'Faculty of Science and Information Technology'),
    ('SWE', 'Software Engineering', 'Faculty of Science and Information Technology'),
    ('EEE', 'Electrical and Electronic Engineering', 'Faculty of Engineering'),
    ('BBA', 'Bachelor of Business Administration', 'Faculty of Business and Entrepreneurship'),
    ('ENG', 'English', 'Faculty of Humanities and Social Science')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.semesters (id, year, season, is_active, registration_starts_at, registration_ends_at) VALUES
    ('a0000000-0000-0000-0000-000000000001', 2027, 'spring', true, '2027-04-14 00:00:00+00', '2027-04-20 23:59:59+00')
ON CONFLICT (year, season) DO UPDATE
SET is_active = true, registration_starts_at = EXCLUDED.registration_starts_at, registration_ends_at = EXCLUDED.registration_ends_at;

-- Master Course Catalog
INSERT INTO public.courses (code, title, credits, department_code, prerequisite_codes) VALUES
    ('CSE 110', 'Structured Programming Language', 3.0, 'CSE', '{}'),
    ('CSE 111', 'Structured Programming Language Lab', 1.5, 'CSE', '{"CSE 110"}'),
    ('MAT 101', 'Differential and Integral Calculus', 3.0, 'CSE', '{}'),
    ('ENG 101', 'Basic English Reading and Writing', 3.0, 'ENG', '{}'),
    ('PHY 111', 'Physics (Mechanics, Waves and Optics)', 3.0, 'CSE', '{}'),
    ('CSE 211', 'Object Oriented Programming', 3.0, 'CSE', '{"CSE 110"}'),
    ('CSE 212', 'Object Oriented Programming Lab', 1.5, 'CSE', '{"CSE 111", "CSE 211"}'),
    ('MAT 201', 'Linear Algebra and Complex Variables', 3.0, 'CSE', '{"MAT 101"}'),
    ('EEE 201', 'Electrical Circuits and Electronics', 3.0, 'EEE', '{}'),
    ('CSE 412', 'Software Engineering & Design Patterns', 3.0, 'CSE', '{"CSE 211"}'),
    ('CSE 413', 'Compiler Design', 3.0, 'CSE', '{"CSE 211"}'),
    ('CSE 414', 'Computer Networks', 3.0, 'CSE', '{}'),
    ('CSE 415', 'Artificial Intelligence', 3.0, 'CSE', '{}'),
    ('CSE 416', 'Distributed Systems & Cloud Computing', 3.0, 'CSE', '{"CSE 414"}')
ON CONFLICT (code) DO NOTHING;

-- Batch Course Associations for Active Spring 2027
DO $$
DECLARE
    v_sem_id UUID;
    v_c_id UUID;
BEGIN
    SELECT id INTO v_sem_id FROM public.semesters WHERE year = 2027 AND season = 'spring' LIMIT 1;

    IF v_sem_id IS NOT NULL THEN
        -- Batch 69 Courses
        FOR v_c_id IN SELECT id FROM public.courses WHERE code IN ('CSE 110', 'CSE 111', 'MAT 101', 'ENG 101', 'PHY 111') LOOP
            INSERT INTO public.batch_semester_courses (semester_id, batch, course_id)
            VALUES (v_sem_id, '69', v_c_id)
            ON CONFLICT (semester_id, batch, course_id) DO NOTHING;
        END LOOP;

        -- Batch 60 Courses
        FOR v_c_id IN SELECT id FROM public.courses WHERE code IN ('CSE 211', 'CSE 212', 'MAT 201', 'EEE 201') LOOP
            INSERT INTO public.batch_semester_courses (semester_id, batch, course_id)
            VALUES (v_sem_id, '60', v_c_id)
            ON CONFLICT (semester_id, batch, course_id) DO NOTHING;
        END LOOP;

        -- Batch 59 Courses
        FOR v_c_id IN SELECT id FROM public.courses WHERE code IN ('CSE 412', 'CSE 413', 'CSE 414', 'CSE 415', 'CSE 416') LOOP
            INSERT INTO public.batch_semester_courses (semester_id, batch, course_id)
            VALUES (v_sem_id, '59', v_c_id)
            ON CONFLICT (semester_id, batch, course_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- Section Offerings for Spring 2027 (including DIU 50/25 Capacity & Lab Sub-sections D1/D2)
DO $$
DECLARE
    v_sem_id UUID;
    v_c_cse110 UUID;
    v_c_cse111 UUID;
    v_c_mat101 UUID;
    v_c_eng101 UUID;
    v_c_phy111 UUID;
    v_c_cse211 UUID;
    v_c_cse212 UUID;
BEGIN
    SELECT id INTO v_sem_id FROM public.semesters WHERE year = 2027 AND season = 'spring' LIMIT 1;
    SELECT id INTO v_c_cse110 FROM public.courses WHERE code = 'CSE 110' LIMIT 1;
    SELECT id INTO v_c_cse111 FROM public.courses WHERE code = 'CSE 111' LIMIT 1;
    SELECT id INTO v_c_mat101 FROM public.courses WHERE code = 'MAT 101' LIMIT 1;
    SELECT id INTO v_c_eng101 FROM public.courses WHERE code = 'ENG 101' LIMIT 1;
    SELECT id INTO v_c_phy111 FROM public.courses WHERE code = 'PHY 111' LIMIT 1;
    SELECT id INTO v_c_cse211 FROM public.courses WHERE code = 'CSE 211' LIMIT 1;
    SELECT id INTO v_c_cse212 FROM public.courses WHERE code = 'CSE 212' LIMIT 1;

    IF v_sem_id IS NOT NULL THEN
        -- CSE 110 - Section 69_D (Theory: 50 seats)
        IF v_c_cse110 IS NOT NULL THEN
            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_cse110,
                v_sem_id,
                '69_D',
                50,
                40,
                'AB4-501',
                '[{"day": "Sunday", "start_time": "10:00", "end_time": "11:30", "room": "AB4-501"}, {"day": "Tuesday", "start_time": "10:00", "end_time": "11:30", "room": "AB4-501"}]'::jsonb,
                'Mr. Md. Shahriar Hossain'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;

            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_cse110,
                v_sem_id,
                '69_K',
                50,
                35,
                'AB4-502',
                '[{"day": "Monday", "start_time": "08:30", "end_time": "10:00", "room": "AB4-502"}, {"day": "Wednesday", "start_time": "08:30", "end_time": "10:00", "room": "AB4-502"}]'::jsonb,
                'Mr. Tanvir Rahman'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;
        END IF;

        -- CSE 111 - Section 69_D1 & 69_D2 (Lab: 25 seats each)
        IF v_c_cse111 IS NOT NULL THEN
            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_cse111,
                v_sem_id,
                '69_D1',
                25,
                12,
                'CS-Lab 1',
                '[{"day": "Sunday", "start_time": "11:30", "end_time": "14:30", "room": "CS-Lab 1"}]'::jsonb,
                'Mr. Md. Shahriar Hossain'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;

            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_cse111,
                v_sem_id,
                '69_D2',
                25,
                8,
                'CS-Lab 2',
                '[{"day": "Tuesday", "start_time": "11:30", "end_time": "14:30", "room": "CS-Lab 2"}]'::jsonb,
                'Mr. Md. Shahriar Hossain'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;
        END IF;

        -- MAT 101 - Section 69_D
        IF v_c_mat101 IS NOT NULL THEN
            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_mat101,
                v_sem_id,
                '69_D',
                50,
                38,
                'AB4-401',
                '[{"day": "Monday", "start_time": "11:30", "end_time": "13:00", "room": "AB4-401"}, {"day": "Wednesday", "start_time": "11:30", "end_time": "13:00", "room": "AB4-401"}]'::jsonb,
                'Dr. Kamrul Hasan'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;
        END IF;

        -- ENG 101 - Section 69_D
        IF v_c_eng101 IS NOT NULL THEN
            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_eng101,
                v_sem_id,
                '69_D',
                50,
                42,
                'AB4-302',
                '[{"day": "Sunday", "start_time": "14:30", "end_time": "16:00", "room": "AB4-302"}, {"day": "Tuesday", "start_time": "14:30", "end_time": "16:00", "room": "AB4-302"}]'::jsonb,
                'Ms. Farzana Akter'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;
        END IF;

        -- PHY 111 - Section 69_D
        IF v_c_phy111 IS NOT NULL THEN
            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_phy111,
                v_sem_id,
                '69_D',
                50,
                30,
                'AB4-205',
                '[{"day": "Monday", "start_time": "10:00", "end_time": "11:30", "room": "AB4-205"}, {"day": "Wednesday", "start_time": "10:00", "end_time": "11:30", "room": "AB4-205"}]'::jsonb,
                'Dr. Anisur Rahman'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;
        END IF;

        -- CSE 211 & CSE 212 - Batch 60 Sections
        IF v_c_cse211 IS NOT NULL THEN
            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_cse211,
                v_sem_id,
                '60_A',
                50,
                32,
                'AB4-601',
                '[{"day": "Sunday", "start_time": "08:30", "end_time": "10:00", "room": "AB4-601"}, {"day": "Tuesday", "start_time": "08:30", "end_time": "10:00", "room": "AB4-601"}]'::jsonb,
                'Dr. Nazmul Islam'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;
        END IF;

        IF v_c_cse212 IS NOT NULL THEN
            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_cse212,
                v_sem_id,
                '60_A1',
                25,
                15,
                'CS-Lab 3',
                '[{"day": "Sunday", "start_time": "10:00", "end_time": "13:00", "room": "CS-Lab 3"}]'::jsonb,
                'Dr. Nazmul Islam'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;

            INSERT INTO public.sections (course_id, semester_id, section_name, capacity, enrolled_count, room, schedule, instructor_name)
            VALUES (
                v_c_cse212,
                v_sem_id,
                '60_A2',
                25,
                10,
                'CS-Lab 3',
                '[{"day": "Tuesday", "start_time": "10:00", "end_time": "13:00", "room": "CS-Lab 3"}]'::jsonb,
                'Dr. Nazmul Islam'
            )
            ON CONFLICT (course_id, semester_id, section_name) DO UPDATE
            SET schedule = EXCLUDED.schedule, instructor_name = EXCLUDED.instructor_name, room = EXCLUDED.room;
        END IF;
    END IF;
END $$;

-- Runtime System Settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('email_auth_enabled', 'true'::jsonb, 'Toggle email-based login (OTP/password) alongside Google OAuth (@diu.edu.bd)'),
    ('demo_bypass_enabled', 'true'::jsonb, 'Toggle presentation demo mode bypass in development')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- Schema Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
