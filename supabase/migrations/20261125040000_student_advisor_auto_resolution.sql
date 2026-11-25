-- ============================================================================
-- DIU Course Registration Platform — Student Advisor Auto-Resolution from Rules
-- Migration ID: 20261125040000_student_advisor_auto_resolution.sql
--
-- 1. Allows students to SELECT their own assigned advisor from advisor_profiles
--    (via active advisor_assignments).
-- 2. Adds diu_id_in_rule_range() + resolve_student_advisor_from_rules(p_semester_id)
--    so when a student logs in / enters their DIU ID during onboarding or visits
--    /dashboard, they are automatically matched to their advisor from
--    advisor_assignment_rules (individual_student -> id_range -> entire_batch).
-- ============================================================================

-- 1. Allow students to view their assigned advisor's profile details
DROP POLICY IF EXISTS "Students can view their assigned advisor profile" ON public.advisor_profiles;
CREATE POLICY "Students can view their assigned advisor profile"
    ON public.advisor_profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.advisor_assignments aa
            WHERE aa.advisor_profile_id = advisor_profiles.id
              AND aa.student_id = public.get_current_profile_id()
              AND aa.is_active = true
        )
    );

-- 2. Inclusive DIU Student ID range matcher
CREATE OR REPLACE FUNCTION public.diu_id_in_rule_range(
    p_diu_id TEXT,
    p_start_id TEXT,
    p_end_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_id TEXT := LOWER(TRIM(COALESCE(p_diu_id, '')));
    v_start TEXT := LOWER(TRIM(COALESCE(p_start_id, '')));
    v_end TEXT := LOWER(TRIM(COALESCE(p_end_id, '')));
    v_id_parts TEXT[];
    v_start_parts TEXT[];
    v_end_parts TEXT[];
    v_id_prefix TEXT;
    v_start_prefix TEXT;
    v_end_prefix TEXT;
    v_id_num BIGINT;
    v_start_num BIGINT;
    v_end_num BIGINT;
BEGIN
    IF v_id = '' OR v_start = '' OR v_end = '' THEN
        RETURN false;
    END IF;

    IF v_id = v_start OR v_id = v_end THEN
        RETURN true;
    END IF;

    -- Hyphenated DIU ID format: e.g. 262-15-595 to 262-15-659
    IF position('-' IN v_id) > 0 AND position('-' IN v_start) > 0 AND position('-' IN v_end) > 0 THEN
        v_id_parts := string_to_array(v_id, '-');
        v_start_parts := string_to_array(v_start, '-');
        v_end_parts := string_to_array(v_end, '-');

        IF array_length(v_id_parts, 1) = 3
           AND array_length(v_start_parts, 1) = 3
           AND array_length(v_end_parts, 1) = 3 THEN
            v_id_prefix := v_id_parts[1] || '-' || v_id_parts[2];
            v_start_prefix := v_start_parts[1] || '-' || v_start_parts[2];
            v_end_prefix := v_end_parts[1] || '-' || v_end_parts[2];

            IF v_id_prefix = v_start_prefix AND v_id_prefix = v_end_prefix THEN
                IF v_id_parts[3] ~ '^\d+$'
                   AND v_start_parts[3] ~ '^\d+$'
                   AND v_end_parts[3] ~ '^\d+$' THEN
                    v_id_num := v_id_parts[3]::BIGINT;
                    v_start_num := v_start_parts[3]::BIGINT;
                    v_end_num := v_end_parts[3]::BIGINT;
                    RETURN v_id_num >= LEAST(v_start_num, v_end_num)
                       AND v_id_num <= GREATEST(v_start_num, v_end_num);
                END IF;
            END IF;
        END IF;
    END IF;

    -- Unhyphenated long numeric ID format: e.g. 0242310005101001 to 0242310005101065
    IF v_id ~ '^\d+$' AND v_start ~ '^\d+$' AND v_end ~ '^\d+$' AND length(v_id) = length(v_start) AND length(v_id) = length(v_end) THEN
        RETURN v_id >= LEAST(v_start, v_end) AND v_id <= GREATEST(v_start, v_end);
    END IF;

    RETURN false;
END;
$$;

-- 3. Resolve & persist the current student's advisor from active rules
CREATE OR REPLACE FUNCTION public.resolve_student_advisor_from_rules(
    p_semester_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_diu_id TEXT;
    v_batch TEXT;
    v_semester_id UUID;
    v_existing_adv_profile_id UUID;
    v_matched_rule RECORD;
    v_advisor_user_id UUID;
BEGIN
    v_student_id := public.get_current_profile_id();
    IF v_student_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT p.diu_id, p.batch
    INTO v_diu_id, v_batch
    FROM public.profiles p
    WHERE p.id = v_student_id;

    IF v_diu_id IS NULL OR TRIM(v_diu_id) = '' THEN
        RETURN NULL;
    END IF;

    v_semester_id := COALESCE(
        p_semester_id,
        (SELECT s.id FROM public.semesters s WHERE s.is_active = true ORDER BY s.created_at DESC LIMIT 1)
    );

    IF v_semester_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Keep existing active assignment if already assigned for this semester
    SELECT aa.advisor_profile_id
    INTO v_existing_adv_profile_id
    FROM public.advisor_assignments aa
    WHERE aa.student_id = v_student_id
      AND aa.semester_id = v_semester_id
      AND aa.is_active = true
    LIMIT 1;

    IF v_existing_adv_profile_id IS NOT NULL THEN
        RETURN v_existing_adv_profile_id;
    END IF;

    -- Priority 1: individual_student
    SELECT r.advisor_profile_id, r.assignment_type, r.start_student_id, r.end_student_id
    INTO v_matched_rule
    FROM public.advisor_assignment_rules r
    JOIN public.advisor_profiles ap ON ap.id = r.advisor_profile_id
    WHERE r.semester_id = v_semester_id
      AND r.is_active = true
      AND ap.is_active = true
      AND r.assignment_type = 'individual_student'
      AND (
          r.student_id = v_student_id
          OR LOWER(TRIM(COALESCE(r.start_student_id, ''))) = LOWER(TRIM(v_diu_id))
      )
    ORDER BY r.created_at DESC
    LIMIT 1;

    -- Priority 2: id_range
    IF NOT FOUND THEN
        SELECT r.advisor_profile_id, r.assignment_type, r.start_student_id, r.end_student_id
        INTO v_matched_rule
        FROM public.advisor_assignment_rules r
        JOIN public.advisor_profiles ap ON ap.id = r.advisor_profile_id
        WHERE r.semester_id = v_semester_id
          AND r.is_active = true
          AND ap.is_active = true
          AND r.assignment_type = 'id_range'
          AND public.diu_id_in_rule_range(v_diu_id, r.start_student_id, r.end_student_id)
        ORDER BY r.created_at DESC
        LIMIT 1;
    END IF;

    -- Priority 3: entire_batch
    IF NOT FOUND AND v_batch IS NOT NULL AND TRIM(v_batch) <> '' THEN
        SELECT r.advisor_profile_id, r.assignment_type, r.start_student_id, r.end_student_id
        INTO v_matched_rule
        FROM public.advisor_assignment_rules r
        JOIN public.advisor_profiles ap ON ap.id = r.advisor_profile_id
        WHERE r.semester_id = v_semester_id
          AND r.is_active = true
          AND ap.is_active = true
          AND r.assignment_type = 'entire_batch'
          AND (
              LOWER(TRIM(r.batch)) = LOWER(TRIM(v_batch))
              OR LOWER(TRIM(v_batch)) ~ ('^' || LOWER(TRIM(r.batch)) || '(\s|st|nd|rd|th|$)')
          )
        ORDER BY r.created_at DESC
        LIMIT 1;
    END IF;

    IF NOT FOUND OR v_matched_rule.advisor_profile_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT ap.profile_id
    INTO v_advisor_user_id
    FROM public.advisor_profiles ap
    WHERE ap.id = v_matched_rule.advisor_profile_id;

    INSERT INTO public.advisor_assignments (
        student_id,
        advisor_id,
        advisor_profile_id,
        semester_id,
        is_active,
        assignment_source,
        assignment_rule_type,
        source_range_raw
    )
    VALUES (
        v_student_id,
        v_advisor_user_id,
        v_matched_rule.advisor_profile_id,
        v_semester_id,
        true,
        'rule_auto_match',
        CASE
            WHEN v_matched_rule.assignment_type = 'id_range' THEN 'range'
            WHEN v_matched_rule.assignment_type = 'entire_batch' THEN 'batch'
            ELSE 'individual'
        END,
        CASE
            WHEN v_matched_rule.start_student_id IS NOT NULL AND v_matched_rule.end_student_id IS NOT NULL
                THEN v_matched_rule.start_student_id || ' to ' || v_matched_rule.end_student_id
            ELSE NULL
        END
    )
    ON CONFLICT (student_id, semester_id) DO UPDATE SET
        advisor_id = EXCLUDED.advisor_id,
        advisor_profile_id = EXCLUDED.advisor_profile_id,
        is_active = true,
        assignment_source = EXCLUDED.assignment_source,
        assignment_rule_type = EXCLUDED.assignment_rule_type,
        source_range_raw = EXCLUDED.source_range_raw
    WHERE public.advisor_assignments.is_active = false;

    RETURN v_matched_rule.advisor_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_student_advisor_from_rules(UUID) TO authenticated;
