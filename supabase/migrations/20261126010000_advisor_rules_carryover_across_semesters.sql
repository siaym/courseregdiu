-- ============================================================================
-- DIU Course Registration Platform — Standing Advisor Rules Across Semesters
-- Migration ID: 20261126010000_advisor_rules_carryover_across_semesters.sql
--
-- Updates resolve_student_advisor_from_rules(p_semester_id) so that:
--   1. Active rules in the target semester (p_semester_id) take top priority.
--   2. If a new semester has no semester-specific rule yet, the most recently
--      updated active rule across semesters automatically applies.
-- ============================================================================

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

    -- Priority 1: individual_student (current semester first, then standing rule)
    SELECT r.advisor_profile_id, r.assignment_type, r.start_student_id, r.end_student_id
    INTO v_matched_rule
    FROM public.advisor_assignment_rules r
    JOIN public.advisor_profiles ap ON ap.id = r.advisor_profile_id
    WHERE r.is_active = true
      AND ap.is_active = true
      AND r.assignment_type = 'individual_student'
      AND (
          r.student_id = v_student_id
          OR LOWER(TRIM(COALESCE(r.start_student_id, ''))) = LOWER(TRIM(v_diu_id))
      )
    ORDER BY (r.semester_id = v_semester_id) DESC, r.updated_at DESC, r.created_at DESC
    LIMIT 1;

    -- Priority 2: id_range (current semester first, then standing rule)
    IF NOT FOUND THEN
        SELECT r.advisor_profile_id, r.assignment_type, r.start_student_id, r.end_student_id
        INTO v_matched_rule
        FROM public.advisor_assignment_rules r
        JOIN public.advisor_profiles ap ON ap.id = r.advisor_profile_id
        WHERE r.is_active = true
          AND ap.is_active = true
          AND r.assignment_type = 'id_range'
          AND public.diu_id_in_rule_range(v_diu_id, r.start_student_id, r.end_student_id)
        ORDER BY (r.semester_id = v_semester_id) DESC, r.updated_at DESC, r.created_at DESC
        LIMIT 1;
    END IF;

    -- Priority 3: entire_batch (current semester first, then standing rule)
    IF NOT FOUND AND v_batch IS NOT NULL AND TRIM(v_batch) <> '' THEN
        SELECT r.advisor_profile_id, r.assignment_type, r.start_student_id, r.end_student_id
        INTO v_matched_rule
        FROM public.advisor_assignment_rules r
        JOIN public.advisor_profiles ap ON ap.id = r.advisor_profile_id
        WHERE r.is_active = true
          AND ap.is_active = true
          AND r.assignment_type = 'entire_batch'
          AND (
              LOWER(TRIM(r.batch)) = LOWER(TRIM(v_batch))
              OR LOWER(TRIM(v_batch)) ~ ('^' || LOWER(TRIM(r.batch)) || '(\s|st|nd|rd|th|$)')
          )
        ORDER BY (r.semester_id = v_semester_id) DESC, r.updated_at DESC, r.created_at DESC
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
