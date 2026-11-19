-- ====================================================================
-- DIU Course Registration Platform - Student Registration Workflow & Schema
-- Migration: 20261119220000_student_registration_workflow.sql
-- Description:
--   1. Adds previous_section and desired_section to public.registrations
--   2. Adds course_type ('general' | 'retake') to public.registration_items
--   3. Adds performance indexes for course search and registration lookups
--   4. RLS policies allowing students to update their draft registration sections
-- ====================================================================

-- 1. REGISTRATIONS TABLE EXTENSIONS
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS previous_section VARCHAR(20),
ADD COLUMN IF NOT EXISTS desired_section VARCHAR(20);

-- 2. REGISTRATION ITEMS TABLE EXTENSIONS
ALTER TABLE public.registration_items
ADD COLUMN IF NOT EXISTS course_type VARCHAR(20) NOT NULL DEFAULT 'general';

-- Add check constraint safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_registration_items_course_type'
    ) THEN
        ALTER TABLE public.registration_items
        ADD CONSTRAINT check_registration_items_course_type
        CHECK (course_type IN ('general', 'retake'));
    END IF;
END $$;

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_registrations_student_semester ON public.registrations(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_registration_items_reg_id ON public.registration_items(registration_id);
CREATE INDEX IF NOT EXISTS idx_courses_code_title ON public.courses(code, title);
CREATE INDEX IF NOT EXISTS idx_sections_course_semester ON public.sections(course_id, semester_id);

-- 4. RLS POLICY VERIFICATION
-- Ensure students can insert/update registration items for their own registrations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Students can manage own registration items" ON public.registration_items;
    CREATE POLICY "Students can manage own registration items"
    ON public.registration_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_items.registration_id
              AND r.student_id = public.get_current_profile_id()
              AND r.status = 'draft'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = registration_items.registration_id
              AND r.student_id = public.get_current_profile_id()
              AND r.status = 'draft'
        )
    );
END $$;
