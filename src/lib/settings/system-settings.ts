/**
 * System Settings & Feature Flags Service
 *
 * Provides runtime configuration for:
 * 1. Email-based login (OTP/password) alongside Google OAuth (@diu.edu.bd).
 * 2. Faculty presentation demo mode bypass in development.
 *
 * Persists to Supabase `system_settings` table when available,
 * with synchronized in-memory caching and resilient failover.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

// In-memory cache for ultra-fast middleware/SSR lookup and offline dev testing
interface CachedSettings {
  emailAuthEnabled: boolean;
  demoBypassEnabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

const globalForSystemSettings = globalThis as unknown as {
  __diu_system_settings_cache?: CachedSettings;
};

if (!globalForSystemSettings.__diu_system_settings_cache) {
  globalForSystemSettings.__diu_system_settings_cache = {
    emailAuthEnabled: true, // Default ON so users can test immediately, toggleable anytime
    demoBypassEnabled: true, // Default ON in dev presentation mode
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  };
}

const SETTINGS_CACHE = globalForSystemSettings.__diu_system_settings_cache;

/**
 * Returns whether email-based authentication is enabled by the administrator.
 */
export async function isEmailAuthEnabled(): Promise<boolean> {
  // If Supabase is configured, attempt authoritative check
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "email_auth_enabled")
        .maybeSingle();

      if (!error && data?.value !== undefined) {
        const val = typeof data.value === "boolean" ? data.value : Boolean(data.value);
        SETTINGS_CACHE.emailAuthEnabled = val;
        return val;
      }
    } catch {
      // Fall through to cached setting
    }
  }

  return SETTINGS_CACHE.emailAuthEnabled;
}

/**
 * Updates the email authentication feature flag.
 * Must be gated by requireAdmin() in calling server action.
 */
export async function setEmailAuthEnabled(
  enabled: boolean,
  adminId?: string
): Promise<{ success: boolean; enabled: boolean; error?: string }> {
  SETTINGS_CACHE.emailAuthEnabled = enabled;
  SETTINGS_CACHE.updatedAt = new Date().toISOString();
  if (adminId) SETTINGS_CACHE.updatedBy = adminId;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const row: Database["public"]["Tables"]["system_settings"]["Insert"] = {
        key: "email_auth_enabled",
        value: enabled,
        description: "Toggle email-based login (OTP/password) alongside Google OAuth (@diu.edu.bd)",
        updated_at: SETTINGS_CACHE.updatedAt,
        updated_by: adminId || null,
      };

      const { error } = await supabase.from("system_settings").upsert(row);
      if (error && process.env.NODE_ENV === "production") {
        return { success: false, enabled: !enabled, error: error.message };
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        return {
          success: false,
          enabled: !enabled,
          error: err instanceof Error ? err.message : "Database write failed",
        };
      }
    }
  }

  return { success: true, enabled };
}

/**
 * Returns whether demo mode bypass is currently active.
 * HARD-DISABLED in production (always false).
 */
export async function isDemoBypassEnabled(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "demo_bypass_enabled")
        .maybeSingle();

      if (!error && data?.value !== undefined) {
        const val = typeof data.value === "boolean" ? data.value : Boolean(data.value);
        SETTINGS_CACHE.demoBypassEnabled = val;
        return val;
      }
    } catch {
      // Fall through to cached setting
    }
  }

  return SETTINGS_CACHE.demoBypassEnabled;
}

/**
 * Updates the demo mode bypass setting in development.
 * Prohibited in production.
 */
export async function setDemoBypassEnabled(
  enabled: boolean,
  adminId?: string
): Promise<{ success: boolean; enabled: boolean; error?: string }> {
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      enabled: false,
      error: "Demo mode bypass is prohibited in production.",
    };
  }

  SETTINGS_CACHE.demoBypassEnabled = enabled;
  SETTINGS_CACHE.updatedAt = new Date().toISOString();
  if (adminId) SETTINGS_CACHE.updatedBy = adminId;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const row: Database["public"]["Tables"]["system_settings"]["Insert"] = {
        key: "demo_bypass_enabled",
        value: enabled,
        description: "Toggle presentation demo mode bypass in development",
        updated_at: SETTINGS_CACHE.updatedAt,
        updated_by: adminId || null,
      };

      await supabase.from("system_settings").upsert(row);
    } catch {
      // Non-production fallback
    }
  }

  return { success: true, enabled };
}

/**
 * Retrieves all current system settings.
 */
export async function getAllSystemSettings(): Promise<CachedSettings> {
  const emailAuth = await isEmailAuthEnabled();
  const demoBypass = await isDemoBypassEnabled();

  return {
    emailAuthEnabled: emailAuth,
    demoBypassEnabled: demoBypass,
    updatedAt: SETTINGS_CACHE.updatedAt,
    updatedBy: SETTINGS_CACHE.updatedBy,
  };
}
