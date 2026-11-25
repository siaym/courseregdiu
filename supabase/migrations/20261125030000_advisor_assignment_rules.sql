-- ============================================================================
-- DIU Course Registration Platform — Centralized Advisor Assignment Rules
-- Migration ID: 20261125030000_advisor_assignment_rules.sql
--
-- IMPORTANT: Local migration file only. Review and apply manually after approval.
-- Separates unique advisor identity (advisor_profiles) from multiple assignment
-- rules (batches, ID prefixes, ID ranges, entire-batch, and individual rules).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.advisor_assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_profile_id UUID NOT NULL REFERENCES public.advisor_profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    batch TEXT NOT NULL,
    student_id_prefix TEXT,
    start_student_id TEXT,
    end_student_id TEXT,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('id_range', 'individual_student', 'entire_batch')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT NOT NULL DEFAULT 'manual',
    import_batch_id UUID REFERENCES public.advisor_roster_imports(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Prevent exact duplicate rule entries for the same advisor/semester/batch/range
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_rules_unique_entry
    ON public.advisor_assignment_rules (
        advisor_profile_id,
        semester_id,
        LOWER(TRIM(batch)),
        assignment_type,
        COALESCE(start_student_id, ''),
        COALESCE(end_student_id, ''),
        COALESCE(student_id::text, '')
    );

CREATE INDEX IF NOT EXISTS idx_advisor_rules_advisor_sem
    ON public.advisor_assignment_rules (advisor_profile_id, semester_id, is_active);

CREATE INDEX IF NOT EXISTS idx_advisor_rules_sem_batch
    ON public.advisor_assignment_rules (semester_id, LOWER(TRIM(batch)), is_active);

ALTER TABLE public.advisor_assignment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and department heads can view advisor assignment rules" ON public.advisor_assignment_rules;
CREATE POLICY "Admins and department heads can view advisor assignment rules"
    ON public.advisor_assignment_rules FOR SELECT
    TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'department_head')
        OR advisor_profile_id IN (
            SELECT ap.id FROM public.advisor_profiles ap
            WHERE ap.profile_id = public.get_current_profile_id()
        )
    );

DROP POLICY IF EXISTS "Admins can manage advisor assignment rules" ON public.advisor_assignment_rules;
CREATE POLICY "Admins can manage advisor assignment rules"
    ON public.advisor_assignment_rules FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_assignment_rules TO authenticated;
