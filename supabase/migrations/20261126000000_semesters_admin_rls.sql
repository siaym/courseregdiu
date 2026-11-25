-- ============================================================================
-- DIU Course Registration Platform — Admin RLS Policy for Semesters
-- Migration ID: 20261126000000_semesters_admin_rls.sql
--
-- Allows authenticated admins to INSERT, UPDATE, and DELETE semesters
-- from the Admin Panel (/admin/semesters).
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage semesters" ON public.semesters;
CREATE POLICY "Admins can manage semesters"
    ON public.semesters FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.semesters TO authenticated;
