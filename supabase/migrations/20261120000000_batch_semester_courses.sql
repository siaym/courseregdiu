-- ============================================================================
-- Migration: 20261120000000_batch_semester_courses.sql
-- Description: Batch and Semester Course Configuration Schema with RLS
-- ============================================================================

-- 1. Create batch_semester_courses table
CREATE TABLE IF NOT EXISTS public.batch_semester_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    batch VARCHAR(20) NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT unique_batch_semester_course UNIQUE (semester_id, batch, course_id)
);

-- Index for rapid lookup by semester and batch
CREATE INDEX IF NOT EXISTS idx_batch_sem_courses_lookup 
    ON public.batch_semester_courses (semester_id, batch);

-- Enable Row Level Security
ALTER TABLE public.batch_semester_courses ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies
-- Admins have full access
CREATE POLICY "Admins have full access to batch_semester_courses"
    ON public.batch_semester_courses
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

-- Advisors and Department Heads can view all batch configurations
CREATE POLICY "Faculty can view all batch_semester_courses"
    ON public.batch_semester_courses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = public.get_current_profile_id()
              AND profiles.role IN ('advisor', 'department_head')
        )
    );

-- Students can view courses configured for their assigned batch in active semesters
CREATE POLICY "Students can view courses for their own batch"
    ON public.batch_semester_courses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = public.get_current_profile_id()
              AND profiles.batch = batch_semester_courses.batch
        )
    );

COMMENT ON TABLE public.batch_semester_courses IS 'Defines fixed course offerings configured per student intake batch and semester.';
