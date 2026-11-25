-- ============================================================================
-- DIU Course Registration Platform — CSE Curriculum & Master Course Catalog
-- Migration ID: 20261125010000_cse_curriculum_catalog.sql
--
-- IMPORTANT: Local migration file only. Review and apply manually after approval.
-- Preserves existing tables, registration history, and RLS security boundaries.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND MASTER COURSES TABLE FOR VARIANTS, CATEGORIES, AND CREDIT SPLIT
-- ----------------------------------------------------------------------------
ALTER TABLE public.courses
    DROP CONSTRAINT IF EXISTS courses_code_key;

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'CORE',
    ADD COLUMN IF NOT EXISTS theory_credits NUMERIC(3, 1),
    ADD COLUMN IF NOT EXISTS lab_credits NUMERIC(3, 1),
    ADD COLUMN IF NOT EXISTS specialization_group TEXT,
    ADD COLUMN IF NOT EXISTS variant TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_category') THEN
        ALTER TABLE public.courses
            ADD CONSTRAINT chk_courses_category
            CHECK (category IN ('CORE', 'GENERAL_EDUCATION', 'PROJECT', 'COMMON_ELECTIVE', 'SPECIALIZATION_ELECTIVE'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_specialization_group') THEN
        ALTER TABLE public.courses
            ADD CONSTRAINT chk_courses_specialization_group
            CHECK (
                specialization_group IS NULL OR specialization_group IN (
                    'ARTIFICIAL_INTELLIGENCE',
                    'SOFTWARE_DEVELOPMENT',
                    'NETWORK_AND_COMMUNICATION',
                    'ALGORITHMS',
                    'EMBEDDED_SYSTEMS_AND_ROBOTICS'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_credit_non_negative') THEN
        ALTER TABLE public.courses
            ADD CONSTRAINT chk_courses_credit_non_negative
            CHECK (
                (theory_credits IS NULL OR theory_credits >= 0)
                AND (lab_credits IS NULL OR lab_credits >= 0)
                AND credits > 0
            );
    END IF;
END $$;

-- Allow legitimate variants (e.g. CSE-499 Title Defense / Phase-I / Phase-II) while preventing duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_code_variant_unique
    ON public.courses (UPPER(TRIM(code)), COALESCE(LOWER(TRIM(variant)), ''));

CREATE INDEX IF NOT EXISTS idx_courses_code_search ON public.courses (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_courses_title_search ON public.courses (LOWER(title));
CREATE INDEX IF NOT EXISTS idx_courses_category_active ON public.courses (category, is_active);
CREATE INDEX IF NOT EXISTS idx_courses_specialization ON public.courses (specialization_group) WHERE specialization_group IS NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can view courses" ON public.courses;
CREATE POLICY "Authenticated users can view courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses"
    ON public.courses FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 2. SEMESTER COURSE OFFERINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semester_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_semester_course UNIQUE (semester_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_semester_courses_lookup
    ON public.semester_courses (semester_id, is_active);

ALTER TABLE public.semester_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view semester courses" ON public.semester_courses;
CREATE POLICY "Authenticated users can view semester courses"
    ON public.semester_courses FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage semester courses" ON public.semester_courses;
CREATE POLICY "Admins can manage semester courses"
    ON public.semester_courses FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. EXTEND BATCH SEMESTER COURSES
-- ----------------------------------------------------------------------------
ALTER TABLE public.batch_semester_courses
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ----------------------------------------------------------------------------
-- 4. SPECIALIZATION OFFERINGS (Configurable per Semester & Batch)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.specialization_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    batch VARCHAR(20) NOT NULL,
    specialization_group TEXT NOT NULL CHECK (
        specialization_group IN (
            'ARTIFICIAL_INTELLIGENCE',
            'SOFTWARE_DEVELOPMENT',
            'NETWORK_AND_COMMUNICATION',
            'ALGORITHMS',
            'EMBEDDED_SYSTEMS_AND_ROBOTICS'
        )
    ),
    required_courses INTEGER CHECK (required_courses IS NULL OR required_courses > 0),
    required_credits NUMERIC(4, 1) CHECK (required_credits IS NULL OR required_credits > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_specialization_offering UNIQUE (semester_id, batch, specialization_group)
);

CREATE INDEX IF NOT EXISTS idx_specialization_offerings_lookup
    ON public.specialization_offerings (semester_id, batch, is_active);

ALTER TABLE public.specialization_offerings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view specialization offerings" ON public.specialization_offerings;
CREATE POLICY "Authenticated users can view specialization offerings"
    ON public.specialization_offerings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage specialization offerings" ON public.specialization_offerings;
CREATE POLICY "Admins can manage specialization offerings"
    ON public.specialization_offerings FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 5. COURSE IMPORT HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    source_worksheet TEXT,
    imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    imported_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.course_import_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage course import history" ON public.course_import_history;
CREATE POLICY "Admins can manage course import history"
    ON public.course_import_history FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 6. REGISTRATION ITEMS HISTORICAL SNAPSHOTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.registration_items
    ALTER COLUMN section_id DROP NOT NULL;

ALTER TABLE public.registration_items
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS course_code_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS course_title_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS credits_snapshot NUMERIC(3, 1),
    ADD COLUMN IF NOT EXISTS category_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'general' CHECK (classification IN ('general', 'retake'));

CREATE INDEX IF NOT EXISTS idx_registration_items_course_id
    ON public.registration_items (course_id)
    WHERE course_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. SCHEMA GRANTS
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialization_offerings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_import_history TO authenticated;
