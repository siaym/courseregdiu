-- ==============================================================================
-- Migration: 20261123230000_fix_rls_grants_and_seed_data.sql
-- Description:
--   1. Eliminates PostgreSQL RLS infinite recursion on public.profiles
--      by defining helper functions with SECURITY DEFINER and row_security = off.
--   2. Grants standard PostgREST table permissions to anon, authenticated, service_role.
--   3. Configures public read policies for academic catalog tables and system_settings.
--   4. Seeds active Spring 2027 semester, master courses, batch mappings, and DIU sections.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN CORE RLS HELPER FUNCTIONS (ELIMINATE RECURSION)
-- ------------------------------------------------------------------------------

-- Profile ID Resolver: Resolves current caller's profile ID safely without RLS recursion
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

-- Current User Role Resolver: Resolves caller's role safely without RLS recursion
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

-- Current User Department Resolver: Resolves caller's department safely without RLS recursion
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

-- Advisor/Advisee Relationship Checker: Resolves advisor pairs without triggering RLS
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

-- ------------------------------------------------------------------------------
-- 2. REINFORCE PROFILES ROW-LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Institutional profiles select policy" ON public.profiles;
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

DROP POLICY IF EXISTS "Users can update own profile with strict column boundaries" ON public.profiles;
CREATE POLICY "Users can update own profile with strict column boundaries"
    ON public.profiles FOR UPDATE
    USING (public.get_current_profile_id() = id)
    WITH CHECK (public.get_current_profile_id() = id);

-- ------------------------------------------------------------------------------
-- 3. REINFORCE ADVISOR ASSIGNMENTS ROW-LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Advisors can view their own student assignments" ON public.advisor_assignments;
DROP POLICY IF EXISTS "Users can view their advisor assignments" ON public.advisor_assignments;
CREATE POLICY "Users can view their advisor assignments"
    ON public.advisor_assignments FOR SELECT
    USING (
        advisor_id = public.get_current_profile_id()
        OR student_id = public.get_current_profile_id()
        OR public.get_current_user_role() IN ('department_head', 'admin')
    );

-- ------------------------------------------------------------------------------
-- 4. PUBLIC ACADEMIC CATALOG & SYSTEM SETTINGS ACCESS
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Allow public read departments" ON public.departments;
CREATE POLICY "Allow public read departments"
    ON public.departments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can view semesters" ON public.semesters;
DROP POLICY IF EXISTS "Allow public read semesters" ON public.semesters;
CREATE POLICY "Allow public read semesters"
    ON public.semesters FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Allow public read courses" ON public.courses;
CREATE POLICY "Allow public read courses"
    ON public.courses FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.sections;
DROP POLICY IF EXISTS "Allow public read sections" ON public.sections;
CREATE POLICY "Allow public read sections"
    ON public.sections FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Faculty can view all batch_semester_courses" ON public.batch_semester_courses;
DROP POLICY IF EXISTS "Students can view courses assigned to their batch" ON public.batch_semester_courses;
DROP POLICY IF EXISTS "Allow public read batch_courses" ON public.batch_semester_courses;
CREATE POLICY "Allow public read batch_courses"
    ON public.batch_semester_courses FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
CREATE POLICY "Allow public read system_settings"
    ON public.system_settings FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 5. GRANTS & SCHEMA PRIVILEGES
-- ------------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Allow anon to execute safe SELECT queries (RLS policies strictly filter rows)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ------------------------------------------------------------------------------
-- 6. SEED ESSENTIAL ACADEMIC DATA (SPRING 2027 & DIU CURRICULUM)
-- ------------------------------------------------------------------------------

-- Ensure standard DIU faculties & departments
INSERT INTO public.departments (code, name, faculty) VALUES
    ('CSE', 'Computer Science and Engineering', 'Faculty of Science and Information Technology'),
    ('SWE', 'Software Engineering', 'Faculty of Science and Information Technology'),
    ('EEE', 'Electrical and Electronic Engineering', 'Faculty of Engineering'),
    ('BBA', 'Bachelor of Business Administration', 'Faculty of Business and Entrepreneurship'),
    ('ENG', 'English', 'Faculty of Humanities and Social Science')
ON CONFLICT (code) DO NOTHING;

-- Active Registration Semester: Spring 2027
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

-- Batch Semester Course Associations
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

-- ------------------------------------------------------------------------------
-- 7. RE-VERIFY SYSTEM SETTINGS
-- ------------------------------------------------------------------------------

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('email_auth_enabled', 'true'::jsonb, 'Toggle email-based login (OTP/password) alongside Google OAuth (@diu.edu.bd)'),
    ('demo_bypass_enabled', 'true'::jsonb, 'Toggle presentation demo mode bypass in development')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
