-- ==============================================================================
-- Migration: 20261119230000_diu_section_capacity_rules.sql
-- Description: Enforces Daffodil International University (DIU) Section Capacity Rules
--   - Laboratory Courses: 25 seats fixed
--   - Theory / Lecture Courses: 50 seats fixed
-- ==============================================================================

-- 1. Function to determine expected DIU capacity for a given course
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

-- 2. Trigger function to auto-assign fixed capacity on section insertion/update if unspecified or invalid
CREATE OR REPLACE FUNCTION public.enforce_diu_section_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_expected_capacity INTEGER;
BEGIN
    v_expected_capacity := public.get_diu_section_capacity(NEW.course_id);
    
    -- Enforce exact institutional capacity
    NEW.capacity := v_expected_capacity;

    -- Ensure enrolled count does not violate the fixed capacity
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

-- 3. Retroactively adjust existing section records
UPDATE public.sections s
SET capacity = public.get_diu_section_capacity(s.course_id);
