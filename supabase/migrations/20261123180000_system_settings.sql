-- ====================================================================
-- Migration: System Settings Table for Runtime Feature Flags & Auth Controls
-- Date: November 2026
-- Description:
--   Creates the public.system_settings table to persist runtime toggles,
--   including email-based login (alongside Google OAuth) and presentation demo bypass.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read so middleware, login page, and server actions can inspect feature flags
CREATE POLICY "Allow public read system_settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

-- Allow admins full management of system_settings
CREATE POLICY "Allow admins to manage system_settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed default settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('email_auth_enabled', 'true'::jsonb, 'Toggle email-based login (OTP/password) alongside Google OAuth (@diu.edu.bd)'),
  ('demo_bypass_enabled', 'true'::jsonb, 'Toggle presentation demo mode bypass in development')
ON CONFLICT (key) DO NOTHING;
