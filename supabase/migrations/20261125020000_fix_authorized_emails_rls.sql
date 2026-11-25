-- Fix authorized_emails SELECT RLS so linked personal emails (auth_user_id / jwt email)
-- can read their own authorization row on callback, middleware, and login checks.
DROP POLICY IF EXISTS "Users can view own authorized emails or admins all" ON public.authorized_emails;
CREATE POLICY "Users can view own authorized emails or admins all"
    ON public.authorized_emails FOR SELECT
    TO authenticated
    USING (
        profile_id = auth.uid()
        OR auth_user_id = auth.uid()
        OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        OR public.get_current_user_role() = 'admin'
    );
