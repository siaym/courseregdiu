-- ====================================================================
-- DIU Course Registration Platform - Phase 0 Initial Database Schema
-- Database: PostgreSQL (Supabase) with Row-Level Security (RLS)
-- ====================================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('student', 'advisor', 'department_head', 'admin');
CREATE TYPE registration_status AS ENUM ('draft', 'pending_advisor', 'approved', 'rejected', 'dropped');
CREATE TYPE semester_season AS ENUM ('spring', 'summer', 'fall');

-- 2. DEPARTMENTS
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    faculty TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed core DIU Departments (Reference data)
INSERT INTO public.departments (code, name, faculty) VALUES
    ('CSE', 'Computer Science and Engineering', 'Faculty of Science and Information Technology'),
    ('SWE', 'Software Engineering', 'Faculty of Science and Information Technology'),
    ('EEE', 'Electrical and Electronic Engineering', 'Faculty of Engineering'),
    ('BBA', 'Bachelor of Business Administration', 'Faculty of Business and Entrepreneurship'),
    ('ENG', 'English', 'Faculty of Humanities and Social Science')
ON CONFLICT (code) DO NOTHING;

-- 3. PROFILES (Extends Supabase auth.users)
CREATE TABLE public.profiles (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Helper function to fetch user role safely in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. SEMESTERS
CREATE TABLE public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    season semester_season NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    registration_starts_at TIMESTAMPTZ,
    registration_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_semester UNIQUE (year, season)
);

-- 5. COURSES
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credits NUMERIC(3, 1) NOT NULL CHECK (credits > 0),
    department_code VARCHAR(10) NOT NULL REFERENCES public.departments(code) ON UPDATE CASCADE,
    prerequisite_codes TEXT[] NOT NULL DEFAULT '{}',
    syllabus_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. SECTIONS
CREATE TABLE public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    section_name VARCHAR(10) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 40 CHECK (capacity > 0),
    enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
    room VARCHAR(30),
    schedule JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"day": "Sunday", "start_time": "08:30", "end_time": "10:00"}]
    instructor_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_course_section_per_semester UNIQUE (course_id, semester_id, section_name)
);

-- 7. REGISTRATIONS
CREATE TABLE public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    status registration_status NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    advisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    advisor_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_semester_registration UNIQUE (student_id, semester_id)
);

-- 8. REGISTRATION ITEMS
CREATE TABLE public.registration_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'waitlisted', 'dropped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_registration_section UNIQUE (registration_id, section_id)
);

-- 9. AUDIT LOGS
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Advisors and Admins can view student profiles"
    ON public.profiles FOR SELECT
    USING (public.get_current_user_role() IN ('advisor', 'department_head', 'admin'));

CREATE POLICY "Users can update their own personal details"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Departments Policies
CREATE POLICY "Authenticated users can view departments"
    ON public.departments FOR SELECT
    TO authenticated
    USING (true);

-- Semesters Policies
CREATE POLICY "Authenticated users can view semesters"
    ON public.semesters FOR SELECT
    TO authenticated
    USING (true);

-- Courses Policies
CREATE POLICY "Authenticated users can view courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (true);

-- Sections Policies
CREATE POLICY "Authenticated users can view sections"
    ON public.sections FOR SELECT
    TO authenticated
    USING (true);

-- Registrations Policies
CREATE POLICY "Students can view their own registrations"
    ON public.registrations FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Advisors and Admins can view student registrations"
    ON public.registrations FOR SELECT
    USING (public.get_current_user_role() IN ('advisor', 'department_head', 'admin'));

CREATE POLICY "Students can create draft registrations for themselves"
    ON public.registrations FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own draft registrations"
    ON public.registrations FOR UPDATE
    USING (auth.uid() = student_id AND status = 'draft')
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Advisors can update registrations under review"
    ON public.registrations FOR UPDATE
    USING (public.get_current_user_role() IN ('advisor', 'department_head', 'admin'));

-- Registration Items Policies
CREATE POLICY "Users can view their registration items"
    ON public.registration_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_items.registration_id
            AND (r.student_id = auth.uid() OR public.get_current_user_role() IN ('advisor', 'department_head', 'admin'))
        )
    );

CREATE POLICY "Students can modify items in draft registrations"
    ON public.registration_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_items.registration_id
            AND r.student_id = auth.uid()
            AND r.status = 'draft'
        )
    );

-- Audit Logs Policies
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.get_current_user_role() = 'admin');

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 11. AUTOMATIC PROFILE CREATION TRIGGER ON GOOGLE OAUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    email_domain TEXT;
    user_name TEXT;
    avatar TEXT;
BEGIN
    user_email := NEW.email;
    email_domain := split_part(user_email, '@', 2);
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(user_email, '@', 1));
    avatar := NEW.raw_user_meta_data->>'avatar_url';

    -- Note: Domain validation can also be enforced here in DB layer
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        avatar_url,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        user_email,
        user_name,
        'student',
        avatar,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
