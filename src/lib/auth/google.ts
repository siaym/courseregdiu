import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface GoogleAuthOptions {
  redirectTo?: string;
}

/**
 * Initiates Google OAuth authentication flow.
 * Note: Configured exclusively with institutional DIU domain hint (hd: diu.edu.bd)
 * and prompt to select account.
 */
export async function signInWithGoogle(options?: GoogleAuthOptions) {
  const supabase = getSupabaseBrowserClient();
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", origin);

  // Store post-login redirect target in a short-lived cookie instead of query params
  // so `redirectTo` remains an exact URL match in Supabase's Redirect URLs allowlist.
  if (typeof document !== "undefined") {
    if (options?.redirectTo) {
      document.cookie = `diu_auth_next=${encodeURIComponent(options.redirectTo)}; path=/; max-age=300; SameSite=Lax`;
    } else {
      document.cookie = "diu_auth_next=; path=/; max-age=0; SameSite=Lax";
    }
  }

  const allowedDomain = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd").trim();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
        hd: allowedDomain,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
