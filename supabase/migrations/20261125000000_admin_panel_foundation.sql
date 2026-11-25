-- ============================================================================
-- DIU Course Registration Platform — Admin Panel & Advisor Assignment Schema
-- Migration ID: 20261125000000_admin_panel_foundation.sql
--
-- IMPORTANT: Local migration file only. Review and apply manually after approval.
-- Preserves all existing tables, auth flows, and RLS helper functions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND SEMESTERS WITH METADATA & ARCHIVE SUPPORT
-- ----------------------------------------------------------------------------
ALTER TABLE public.semesters
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Backfill name/code for existing rows only where null
UPDATE public.semesters
SET
    name = COALESCE(name, INITCAP(season::text) || ' ' || year::text),
    code = COALESCE(code, UPPER(LEFT(season::text, 2)) || RIGHT(year::text, 2))
WHERE name IS NULL OR code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_semesters_code_unique
    ON public.semesters (LOWER(TRIM(code)))
    WHERE code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. BATCHES DIRECTORY TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_label TEXT NOT NULL,
    batch_number TEXT,
    department_code VARCHAR(10) REFERENCES public.departments(code) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_label_dept_unique
    ON public.batches (COALESCE(department_code, ''), LOWER(TRIM(batch_label)));

CREATE INDEX IF NOT EXISTS idx_batches_number
    ON public.batches (batch_number)
    WHERE batch_number IS NOT NULL;

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.batches;
CREATE POLICY "Authenticated users can view batches"
    ON public.batches FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage batches" ON public.batches;
CREATE POLICY "Admins can manage batches"
    ON public.batches FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. ADVISOR DIRECTORY PROFILES (Independent of auth.users)
--    Allows importing/creating advisors before Auth login authorization.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advisor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    designation TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    room_number TEXT,
    schedule TEXT,
    department_code VARCHAR(10) REFERENCES public.departments(code) ON DELETE SET NULL,
    employee_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_profiles_email_unique
    ON public.advisor_profiles (LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_advisor_profiles_dept_active
    ON public.advisor_profiles (department_code, is_active);

CREATE INDEX IF NOT EXISTS idx_advisor_profiles_profile_id
    ON public.advisor_profiles (profile_id)
    WHERE profile_id IS NOT NULL;

-- Normalize email on insert/update
CREATE OR REPLACE FUNCTION public.normalize_advisor_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.email := LOWER(TRIM(NEW.email));
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_advisor_profile_email ON public.advisor_profiles;
CREATE TRIGGER trg_normalize_advisor_profile_email
    BEFORE INSERT OR UPDATE ON public.advisor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_advisor_profile_email();

ALTER TABLE public.advisor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and department heads can view advisor profiles" ON public.advisor_profiles;
CREATE POLICY "Admins and department heads can view advisor profiles"
    ON public.advisor_profiles FOR SELECT
    TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'department_head')
        OR profile_id = public.get_current_profile_id()
    );

DROP POLICY IF EXISTS "Admins can manage advisor profiles" ON public.advisor_profiles;
CREATE POLICY "Admins can manage advisor profiles"
    ON public.advisor_profiles FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 4. ADVISOR ROSTER IMPORTS & IMPORT ROWS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advisor_roster_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    worksheet_name TEXT NOT NULL,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    department_code VARCHAR(10) REFERENCES public.departments(code) ON DELETE SET NULL,
    assignment_mode TEXT NOT NULL CHECK (assignment_mode IN ('range', 'batch', 'individual', 'advisors_only')),
    commit_mode TEXT NOT NULL CHECK (commit_mode IN ('add_only', 'update_and_add', 'replace_batches')),
    imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'rolled_back')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roster_imports_semester
    ON public.advisor_roster_imports (semester_id, created_at DESC);

ALTER TABLE public.advisor_roster_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage roster imports" ON public.advisor_roster_imports;
CREATE POLICY "Admins can manage roster imports"
    ON public.advisor_roster_imports FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE TABLE IF NOT EXISTS public.advisor_roster_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL REFERENCES public.advisor_roster_imports(id) ON DELETE CASCADE,
    source_row_number INTEGER NOT NULL,
    semester_code TEXT,
    batch_label TEXT,
    batch_number TEXT,
    serial_number TEXT,
    advisor_name TEXT,
    designation TEXT,
    student_id_range_raw TEXT,
    room_number TEXT,
    schedule TEXT,
    email TEXT,
    phone TEXT,
    validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'warning', 'error', 'duplicate', 'needs_review', 'excluded')),
    warning_details JSONB NOT NULL DEFAULT '[]'::jsonb,
    matched_student_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roster_import_rows_batch
    ON public.advisor_roster_import_rows (import_batch_id, source_row_number);

ALTER TABLE public.advisor_roster_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage roster import rows" ON public.advisor_roster_import_rows;
CREATE POLICY "Admins can manage roster import rows"
    ON public.advisor_roster_import_rows FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 5. EXTEND ADVISOR ASSIGNMENTS & ADD ASSIGNMENT HISTORY
-- ----------------------------------------------------------------------------
ALTER TABLE public.advisor_assignments
    ALTER COLUMN advisor_id DROP NOT NULL;

ALTER TABLE public.advisor_assignments
    ADD COLUMN IF NOT EXISTS advisor_profile_id UUID REFERENCES public.advisor_profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS assignment_source TEXT NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS assignment_rule_type TEXT NOT NULL DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS source_range_raw TEXT,
    ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.advisor_roster_imports(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_advisor_assignments_has_advisor'
    ) THEN
        ALTER TABLE public.advisor_assignments
            ADD CONSTRAINT chk_advisor_assignments_has_advisor
            CHECK (advisor_id IS NOT NULL OR advisor_profile_id IS NOT NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_advisor_assignments_student_semester
    ON public.advisor_assignments (student_id, semester_id, is_active);

CREATE INDEX IF NOT EXISTS idx_advisor_assignments_advisor_profile
    ON public.advisor_assignments (advisor_profile_id, semester_id, is_active)
    WHERE advisor_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_assignments_advisor_id
    ON public.advisor_assignments (advisor_id, semester_id, is_active)
    WHERE advisor_id IS NOT NULL;

-- Update RLS on advisor_assignments so linked advisor_profiles & students can read safely
DROP POLICY IF EXISTS "Advisors can view their own student assignments" ON public.advisor_assignments;
DROP POLICY IF EXISTS "Advisors and students can view relevant advisor assignments" ON public.advisor_assignments;
CREATE POLICY "Advisors and students can view relevant advisor assignments"
    ON public.advisor_assignments FOR SELECT
    TO authenticated
    USING (
        student_id = public.get_current_profile_id()
        OR advisor_id = public.get_current_profile_id()
        OR advisor_profile_id IN (
            SELECT ap.id FROM public.advisor_profiles ap
            WHERE ap.profile_id = public.get_current_profile_id()
        )
        OR public.get_current_user_role() IN ('department_head', 'admin')
    );

DROP POLICY IF EXISTS "Only admins and department heads can manage advisor assignments" ON public.advisor_assignments;
DROP POLICY IF EXISTS "Only admins can manage advisor assignments" ON public.advisor_assignments;
CREATE POLICY "Only admins can manage advisor assignments"
    ON public.advisor_assignments FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- Immutable Advisor Assignment History
CREATE TABLE IF NOT EXISTS public.advisor_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.advisor_assignments(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    previous_advisor_profile_id UUID REFERENCES public.advisor_profiles(id) ON DELETE SET NULL,
    new_advisor_profile_id UUID REFERENCES public.advisor_profiles(id) ON DELETE SET NULL,
    previous_advisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    new_advisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('ASSIGNED', 'REASSIGNED', 'UNASSIGNED', 'CONFLICT_RESOLVED')),
    assignment_source TEXT NOT NULL DEFAULT 'manual',
    assignment_rule_type TEXT NOT NULL DEFAULT 'individual',
    source_range_raw TEXT,
    import_batch_id UUID REFERENCES public.advisor_roster_imports(id) ON DELETE SET NULL,
    reason TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_advisor_assignment_history_student
    ON public.advisor_assignment_history (student_id, semester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advisor_assignment_history_advisor
    ON public.advisor_assignment_history (new_advisor_profile_id, created_at DESC)
    WHERE new_advisor_profile_id IS NOT NULL;

ALTER TABLE public.advisor_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and department heads can view assignment history" ON public.advisor_assignment_history;
CREATE POLICY "Admins and department heads can view assignment history"
    ON public.advisor_assignment_history FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'department_head'));

DROP POLICY IF EXISTS "Admins can insert assignment history" ON public.advisor_assignment_history;
CREATE POLICY "Admins can insert assignment history"
    ON public.advisor_assignment_history FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 6. IMMUTABLE ADMIN AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role user_role,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    reason TEXT,
    before_data JSONB,
    after_data JSONB,
    import_batch_id UUID REFERENCES public.advisor_roster_imports(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
    ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity
    ON public.admin_audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor
    ON public.admin_audit_logs (actor_id, created_at DESC)
    WHERE actor_id IS NOT NULL;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.admin_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 7. SCHEMA PRIVILEGE GRANTS (Immutable enforcement on audit & history tables)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_roster_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_roster_import_rows TO authenticated;
GRANT SELECT, INSERT ON public.advisor_assignment_history TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. TRANSACTIONAL ADMIN RPCs (SECURITY DEFINER, fixed search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_assign_student_advisor(
    p_student_id UUID,
    p_advisor_profile_id UUID,
    p_semester_id UUID,
    p_assignment_source TEXT DEFAULT 'manual',
    p_assignment_rule_type TEXT DEFAULT 'individual',
    p_source_range_raw TEXT DEFAULT NULL,
    p_import_batch_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_advisor_auth_profile_id UUID;
    v_prev_assignment RECORD;
    v_assignment_id UUID;
    v_action TEXT;
BEGIN
    v_actor_id := public.get_current_profile_id();
    v_actor_role := public.get_current_user_role();

    IF v_actor_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Forbidden: Admin role required';
    END IF;

    SELECT profile_id INTO v_advisor_auth_profile_id
    FROM public.advisor_profiles
    WHERE id = p_advisor_profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Advisor profile not found';
    END IF;

    SELECT id, advisor_id, advisor_profile_id, assignment_source, assignment_rule_type
    INTO v_prev_assignment
    FROM public.advisor_assignments
    WHERE student_id = p_student_id AND semester_id = p_semester_id;

    IF FOUND THEN
        v_action := 'REASSIGNED';
        UPDATE public.advisor_assignments
        SET
            advisor_id = v_advisor_auth_profile_id,
            advisor_profile_id = p_advisor_profile_id,
            assignment_source = p_assignment_source,
            assignment_rule_type = p_assignment_rule_type,
            source_range_raw = p_source_range_raw,
            import_batch_id = p_import_batch_id,
            is_active = true,
            updated_by = v_actor_id,
            updated_at = timezone('utc'::text, now()),
            assigned_at = timezone('utc'::text, now())
        WHERE id = v_prev_assignment.id
        RETURNING id INTO v_assignment_id;
    ELSE
        v_action := 'ASSIGNED';
        INSERT INTO public.advisor_assignments (
            advisor_id,
            advisor_profile_id,
            student_id,
            semester_id,
            assignment_source,
            assignment_rule_type,
            source_range_raw,
            import_batch_id,
            is_active,
            updated_by
        ) VALUES (
            v_advisor_auth_profile_id,
            p_advisor_profile_id,
            p_student_id,
            p_semester_id,
            p_assignment_source,
            p_assignment_rule_type,
            p_source_range_raw,
            p_import_batch_id,
            true,
            v_actor_id
        )
        RETURNING id INTO v_assignment_id;
    END IF;

    INSERT INTO public.advisor_assignment_history (
        assignment_id,
        student_id,
        semester_id,
        previous_advisor_profile_id,
        new_advisor_profile_id,
        previous_advisor_id,
        new_advisor_id,
        action,
        assignment_source,
        assignment_rule_type,
        source_range_raw,
        import_batch_id,
        reason,
        actor_id
    ) VALUES (
        v_assignment_id,
        p_student_id,
        p_semester_id,
        v_prev_assignment.advisor_profile_id,
        p_advisor_profile_id,
        v_prev_assignment.advisor_id,
        v_advisor_auth_profile_id,
        v_action,
        p_assignment_source,
        p_assignment_rule_type,
        p_source_range_raw,
        p_import_batch_id,
        p_reason,
        v_actor_id
    );

    INSERT INTO public.admin_audit_logs (
        actor_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        reason,
        before_data,
        after_data,
        import_batch_id
    ) VALUES (
        v_actor_id,
        v_actor_role,
        v_action,
        'advisor_assignment',
        v_assignment_id::text,
        p_reason,
        CASE WHEN v_prev_assignment.id IS NOT NULL THEN jsonb_build_object(
            'advisor_profile_id', v_prev_assignment.advisor_profile_id,
            'advisor_id', v_prev_assignment.advisor_id,
            'assignment_rule_type', v_prev_assignment.assignment_rule_type
        ) ELSE NULL END,
        jsonb_build_object(
            'student_id', p_student_id,
            'semester_id', p_semester_id,
            'advisor_profile_id', p_advisor_profile_id,
            'assignment_source', p_assignment_source,
            'assignment_rule_type', p_assignment_rule_type
        ),
        p_import_batch_id
    );

    RETURN v_assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_student_advisor(UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_student_advisor(UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. FIX handle_new_user() SEARCH_PATH FOR SUPABASE AUTH ADMIN TRIGGER
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.handle_new_user() SET search_path = public;

