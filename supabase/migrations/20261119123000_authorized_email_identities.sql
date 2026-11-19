-- ====================================================================
-- DIU Course Registration Platform - Authorized Email Identities Migration
-- Migration ID: 20261119123000_authorized_email_identities.sql
-- Implements:
--  1. Dedicated public.authorized_emails table supporting multi-email identities
--  2. Normalization, uniqueness, and active state enforcement
--  3. Dedicated public.email_authorization_audit table
--  4. Profile resolution function by normalized email
--  5. Row-Level Security policies restricting management exclusively to Admins
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. AUTHORIZED EMAILS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authorized_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    email_type VARCHAR(30) NOT NULL DEFAULT 'alternative_personal',
    is_active BOOLEAN NOT NULL DEFAULT true,
    authorized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_email_normalized CHECK (email = lower(trim(email))),
    CONSTRAINT check_email_type CHECK (email_type IN ('primary_diu', 'alternative_personal', 'advisor_authorized', 'admin_authorized')),
    CONSTRAINT unique_authorized_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_authorized_emails_lookup ON public.authorized_emails (email, is_active);
CREATE INDEX IF NOT EXISTS idx_authorized_emails_profile ON public.authorized_emails (profile_id);

-- Enable RLS
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

-- 1.1 Users can view their own profile's authorized emails; Admins can view all
CREATE POLICY "Users can view own authorized emails or admins all"
    ON public.authorized_emails FOR SELECT
    USING (
        profile_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
    );

-- 1.2 Only Admins can insert authorized emails
CREATE POLICY "Admins can insert authorized emails"
    ON public.authorized_emails FOR INSERT
    WITH CHECK (
        public.get_current_user_role() = 'admin'
        OR current_user = 'service_role'
    );

-- 1.3 Only Admins can update authorized emails
CREATE POLICY "Admins can update authorized emails"
    ON public.authorized_emails FOR UPDATE
    USING (
        public.get_current_user_role() = 'admin'
        OR current_user = 'service_role'
    )
    WITH CHECK (
        public.get_current_user_role() = 'admin'
        OR current_user = 'service_role'
    );

-- 1.4 Only Admins can delete authorized emails
CREATE POLICY "Admins can delete authorized emails"
    ON public.authorized_emails FOR DELETE
    USING (
        public.get_current_user_role() = 'admin'
        OR current_user = 'service_role'
    );

-- --------------------------------------------------------------------
-- 2. EMAIL AUTHORIZATION AUDIT LOG
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_authorization_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorized_email_id UUID REFERENCES public.authorized_emails(id) ON DELETE SET NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    action VARCHAR(30) NOT NULL, -- 'AUTHORIZED', 'MODIFIED', 'DEACTIVATED', 'REACTIVATED', 'REVOKED'
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_audit_profile ON public.email_authorization_audit (profile_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_created ON public.email_authorization_audit (created_at DESC);

-- Enable RLS
ALTER TABLE public.email_authorization_audit ENABLE ROW LEVEL SECURITY;

-- 2.1 Only Admins can view email authorization audit logs
CREATE POLICY "Admins can view email authorization audit"
    ON public.email_authorization_audit FOR SELECT
    USING (
        public.get_current_user_role() = 'admin'
    );

-- 2.2 Only Admins and service role can insert email audit logs
CREATE POLICY "Admins and service role can insert email audit"
    ON public.email_authorization_audit FOR INSERT
    WITH CHECK (
        public.get_current_user_role() = 'admin'
        OR current_user = 'service_role'
    );

-- --------------------------------------------------------------------
-- 3. PROFILE RESOLUTION & AUTHORIZATION FUNCTION
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_profile_by_email(p_email TEXT)
RETURNS TABLE (
    profile_id UUID,
    full_name TEXT,
    diu_id VARCHAR(30),
    role public.user_role,
    email_type VARCHAR(30),
    is_authorized BOOLEAN,
    deactivation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_norm_email TEXT;
    v_auth_record public.authorized_emails%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
BEGIN
    v_norm_email := lower(trim(p_email));

    -- Step 1: Check explicit authorized_emails table
    SELECT * INTO v_auth_record
    FROM public.authorized_emails
    WHERE email = v_norm_email;

    IF FOUND THEN
        -- If found in table, fetch associated profile
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_auth_record.profile_id;

        IF NOT FOUND THEN
            -- Orphaned authorization entry
            RETURN QUERY SELECT
                NULL::UUID, NULL::TEXT, NULL::VARCHAR(30), NULL::public.user_role,
                v_auth_record.email_type, false, 'PROFILE_NOT_FOUND'::TEXT;
            RETURN;
        END IF;

        IF v_auth_record.is_active = false THEN
            -- Email was revoked or deactivated
            RETURN QUERY SELECT
                v_profile.id, v_profile.full_name, v_profile.diu_id, v_profile.role,
                v_auth_record.email_type, false, 'EMAIL_DEACTIVATED'::TEXT;
            RETURN;
        END IF;

        -- Active authorized email
        RETURN QUERY SELECT
            v_profile.id, v_profile.full_name, v_profile.diu_id, v_profile.role,
            v_auth_record.email_type, true, NULL::TEXT;
        RETURN;
    END IF;

    -- Step 2: Fallback for default student eligibility (@diu.edu.bd)
    IF v_norm_email LIKE '%@diu.edu.bd' THEN
        -- Check if profile already exists for this DIU email
        SELECT * INTO v_profile FROM public.profiles WHERE email = v_norm_email;

        IF FOUND THEN
            -- Default student eligibility allows access as student
            -- (Unless the profile has an explicit role that requires prior authorization)
            RETURN QUERY SELECT
                v_profile.id, v_profile.full_name, v_profile.diu_id, v_profile.role,
                'primary_diu'::VARCHAR(30), true, NULL::TEXT;
            RETURN;
        ELSE
            -- New student with DIU email: eligible to create student profile during onboarding
            RETURN QUERY SELECT
                NULL::UUID, NULL::TEXT, NULL::VARCHAR(30), 'student'::public.user_role,
                'primary_diu'::VARCHAR(30), true, NULL::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Step 3: Unregistered personal email -> Unauthorized
    RETURN QUERY SELECT
        NULL::UUID, NULL::TEXT, NULL::VARCHAR(30), NULL::public.user_role,
        'unregistered_personal'::VARCHAR(30), false, 'UNAUTHORIZED_PERSONAL_EMAIL'::TEXT;
    RETURN;
END;
$$;
