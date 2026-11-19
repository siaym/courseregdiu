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
  const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  const callbackUrl = new URL("/auth/callback", origin);

  if (options?.redirectTo) {
    callbackUrl.searchParams.set("next", options.redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
        hd: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd",
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
