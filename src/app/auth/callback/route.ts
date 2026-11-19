import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isDIUEmail } from "@/lib/auth/roles";

/**
 * Validates that the requested redirect destination is a safe relative internal route.
 * Rejects external URLs, protocol-relative prefixes ('//'), backslashes, and unwhitelisted destinations.
 */
export function validateSafeRedirect(target: string | null | undefined): string {
  if (!target) return "/dashboard";

  const trimmed = target.trim();

  // Reject protocol-relative, backslash-prefixed, or absolute URLs
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://") ||
    trimmed.includes("\r") ||
    trimmed.includes("\n")
  ) {
    return "/dashboard";
  }

  // Whitelist of valid internal path prefixes
  const allowedPrefixes = [
    "/dashboard",
    "/courses",
    "/student",
    "/schedule",
    "/advisor",
    "/onboarding",
  ];

  const isWhitelisted = allowedPrefixes.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`) || trimmed.startsWith(`${prefix}?`)
  );

  return isWhitelisted ? trimmed : "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const safeNext = validateSafeRedirect(rawNext);

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionError) {
      // 1. Authoritative server-side domain verification
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email || !isDIUEmail(user.email)) {
        // Immediately terminate unauthorized non-DIU session
        await supabase.auth.signOut();
        const unauthorizedRedirect = new URL("/login", requestUrl.origin);
        unauthorizedRedirect.searchParams.set("error", "invalid_domain");
        return NextResponse.redirect(unauthorizedRedirect);
      }

      // 2. Check profile onboarding state to direct new students to /onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && (profile as { role?: string; onboarding_completed?: boolean }).role === "student" && !(profile as { onboarding_completed?: boolean }).onboarding_completed) {
        return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
      }

      // 3. Safe internal redirect
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  // Return to login with error parameter if code exchange failed
  const errorRedirect = new URL("/login", requestUrl.origin);
  errorRedirect.searchParams.set("error", "oauth_failed");
  return NextResponse.redirect(errorRedirect);
}
