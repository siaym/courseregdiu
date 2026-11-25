import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin;

  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const cookieNext = cookieStore.get("diu_auth_next")?.value;
  const rawNext = requestUrl.searchParams.get("next") ?? (cookieNext ? decodeURIComponent(cookieNext) : null);
  const safeNext = validateSafeRedirect(rawNext);

  const redirectWithCleanup = (targetUrl: URL) => {
    const res = NextResponse.redirect(targetUrl);
    if (cookieNext !== undefined) {
      res.cookies.set("diu_auth_next", "", { path: "/", maxAge: 0 });
    }
    return res;
  };

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
        const unauthorizedRedirect = new URL("/login", origin);
        unauthorizedRedirect.searchParams.set("error", "oauth_failed");
        return redirectWithCleanup(unauthorizedRedirect);
      }

      const authResult = await resolveEmailAuthorization(user.email);
      if (!authResult.authorized) {
        // Immediately terminate unauthorized or deactivated session
        await supabase.auth.signOut();
        const unauthorizedRedirect = new URL("/login", origin);
        const errParam = authResult.reason === "DEACTIVATED" ? "email_revoked" : "unauthorized_email";
        unauthorizedRedirect.searchParams.set("error", errParam);
        return redirectWithCleanup(unauthorizedRedirect);
      }

      // 2. Resolve canonical profile (both DIU and alternative emails resolve to the same profile)
      const targetProfileId = authResult.profileId || user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetProfileId)
        .maybeSingle();

      if (profile && (profile as { role?: string; onboarding_completed?: boolean }).role === "student" && !(profile as { onboarding_completed?: boolean }).onboarding_completed) {
        return redirectWithCleanup(new URL("/onboarding", origin));
      }

      // 3. Admin default landing route
      if (profile && (profile as { role?: string }).role === "admin" && safeNext === "/dashboard") {
        return redirectWithCleanup(new URL("/admin/emails", origin));
      }

      // 4. Safe internal redirect
      return redirectWithCleanup(new URL(safeNext, origin));
    }
  }

  // Return to login with error parameter if code exchange failed
  const errorRedirect = new URL("/login", origin);
  errorRedirect.searchParams.set("error", "oauth_failed");
  return redirectWithCleanup(errorRedirect);
}
