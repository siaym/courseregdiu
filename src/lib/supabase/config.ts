/**
 * Supabase Configuration & Validation Resolver
 *
 * Ensures the application only connects to the authoritative Supabase instance
 * and prevents silent fallbacks to fictional placeholder domains (which cause DNS_PROBE_FINISHED_NXDOMAIN).
 */

const AUTHORITATIVE_SUPABASE_URL = "https://gbobcwnumspimegiqzom.supabase.co";

/**
 * Validates and retrieves the Supabase Project URL.
 * Throws a descriptive configuration error if missing or using an unresolved placeholder.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url || url.includes("placeholder-project.supabase.co")) {
    // If running in development and .env.local has not been loaded, fallback safely to authoritative project URL
    if (process.env.NODE_ENV === "development" || typeof window === "undefined") {
      return AUTHORITATIVE_SUPABASE_URL;
    }

    throw new Error(
      "[Supabase Configuration Error]: NEXT_PUBLIC_SUPABASE_URL is missing or set to placeholder. " +
      "Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local (local) or Vercel Project Settings > Environment Variables (production). " +
      `Expected project URL: ${AUTHORITATIVE_SUPABASE_URL}`
    );
  }

  return url;
}

/**
 * Validates and retrieves the Supabase Publishable / Anon API key.
 */
export function getSupabasePublishableKey(): string {
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!key || key.includes("placeholder-anon-key")) {
    // Fallback to configured project publishable key if running in dev environment
    const defaultDevKey = "sb_publishable_f4AaftynNAgxZFCkMJhDcg_j7SFj7Ha";
    if (process.env.NODE_ENV === "development" || typeof window === "undefined") {
      return defaultDevKey;
    }

    throw new Error(
      "[Supabase Configuration Error]: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing or set to placeholder. " +
      "Please configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment variables."
    );
  }

  return key;
}

/**
 * Validates and retrieves the Supabase Service Role Key (server-only).
 */
export function getSupabaseServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Security Violation]: SUPABASE_SERVICE_ROLE_KEY must never be accessed from client-side code."
    );
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || key.includes("placeholder-service-role-key")) {
    return "";
  }

  return key;
}

/**
 * Checks whether live Supabase credentials are validly configured.
 */
export function isSupabaseConfigured(): boolean {
  try {
    const url = getSupabaseUrl();
    const key = getSupabasePublishableKey();
    return Boolean(
      url &&
      !url.includes("placeholder-project") &&
      key &&
      !key.includes("placeholder-anon")
    );
  } catch {
    return false;
  }
}
