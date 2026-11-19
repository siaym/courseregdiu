import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveEmailAuthorization } from "@/lib/auth/email-authorization";

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
    "/admin",
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
      // 1. Authoritative multi-email identity & authorization verification
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        await supabase.auth.signOut();
        const unauthorizedRedirect = new URL("/login", requestUrl.origin);
        unauthorizedRedirect.searchParams.set("error", "oauth_failed");
        return NextResponse.redirect(unauthorizedRedirect);
      }

      const authResult = await resolveEmailAuthorization(user.email);
      if (!authResult.authorized) {
        // Immediately terminate unauthorized or deactivated session
        await supabase.auth.signOut();
        const unauthorizedRedirect = new URL("/login", requestUrl.origin);
        const errParam = authResult.reason === "DEACTIVATED" ? "email_revoked" : "unauthorized_email";
        unauthorizedRedirect.searchParams.set("error", errParam);
        return NextResponse.redirect(unauthorizedRedirect);
      }

      // 2. Resolve canonical profile (both DIU and alternative emails resolve to the same profile)
      const targetProfileId = authResult.profileId || user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetProfileId)
        .maybeSingle();

      if (profile && (profile as { role?: string; onboarding_completed?: boolean }).role === "student" && !(profile as { onboarding_completed?: boolean }).onboarding_completed) {
        return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
      }

      // 3. Admin default landing route
      if (profile && (profile as { role?: string }).role === "admin" && safeNext === "/dashboard") {
        return NextResponse.redirect(new URL("/admin/emails", requestUrl.origin));
      }

      // 4. Safe internal redirect
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  // Return to login with error parameter if code exchange failed
  const errorRedirect = new URL("/login", requestUrl.origin);
  errorRedirect.searchParams.set("error", "oauth_failed");
  return NextResponse.redirect(errorRedirect);
}
