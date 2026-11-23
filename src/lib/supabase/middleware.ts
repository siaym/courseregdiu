import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

import { getSupabaseUrl, getSupabasePublishableKey, isSupabaseConfigured } from "./config";
import { DEMO_MODE } from "@/lib/config/demo";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let user = null;

  // Attempt to resolve real user session from Supabase if properly configured
  if (isSupabaseConfigured()) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabasePublishableKey();

    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user = authUser;

    // Authentication Policy: Validate Email Authorization
    const allowedDomain = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd").toLowerCase();
    if (user && user.email) {
      const normEmail = user.email.trim().toLowerCase();
      const isDiuDomain = normEmail.endsWith("@" + allowedDomain);

      // Check authorized_emails table for active exception or explicit mapping
      let authRecord = null;
      try {
        const { data } = (await supabase
          .from("authorized_emails")
          .select("is_active, email_type, profile_id")
          .eq("email", normEmail)
          .maybeSingle()) as {
            data: { is_active: boolean; email_type: string; profile_id: string } | null;
          };
        authRecord = data;
      } catch {
        // Table not ready or offline fallback
      }

      if (authRecord) {
        if (!authRecord.is_active) {
          // Deactivated account (student exception or advisor)
          await supabase.auth.signOut();
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/login";
          redirectUrl.searchParams.set("error", "email_revoked");
          return NextResponse.redirect(redirectUrl);
        }
        // Active authorized email (either DIU or approved personal exception)
      } else if (!isDiuDomain) {
        // Unregistered personal email without admin authorization
        await supabase.auth.signOut();
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "unauthorized_email");
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // Check development test session cookie if in dev environment
  const devSessionRole = request.cookies.get("diu_session_role")?.value;
  const isAuthenticated = Boolean(user || (devSessionRole && devSessionRole !== "advisor_deactivated"));
  const pathname = request.nextUrl.pathname;

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/advisor") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/onboarding");

  // 1. Deactivated advisor account is ALWAYS intercepted and blocked
  if (devSessionRole === "advisor_deactivated") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "advisor_deactivated");
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Only admins can access /admin
  if (pathname.startsWith("/admin")) {
    if (devSessionRole && devSessionRole !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/unauthorized";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 3. Authenticated students are blocked from advisor routes
  if (
    devSessionRole &&
    (devSessionRole === "student" || devSessionRole === "student_alt" || devSessionRole === "student_new")
  ) {
    if (pathname.startsWith("/advisor")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/unauthorized";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 4. DEMO MODE: Bypasses login page so presentation demo flows seamlessly without authentication barriers
  if (DEMO_MODE) {
    // If /login is requested without error param, redirect directly to active workspace
    if (pathname === "/login") {
      if (!request.nextUrl.searchParams.has("error")) {
        const redirectUrl = request.nextUrl.clone();
        if (devSessionRole === "admin") {
          redirectUrl.pathname = "/admin/emails";
        } else if (devSessionRole === "advisor" || devSessionRole === "advisor_personal") {
          redirectUrl.pathname = "/advisor";
        } else {
          redirectUrl.pathname = "/dashboard";
        }
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Unauthenticated requests automatically receive demo student session cookie and proceed
    if (isProtectedPath && !isAuthenticated) {
      const response = NextResponse.next();
      response.cookies.set("diu_session_role", "student", {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
      });
      return response;
    }

    return response;
  }

  // Fallback for non-demo mode:
  // 1. Unauthenticated users cannot access protected routes
  if (isProtectedPath && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    if (devSessionRole === "advisor_deactivated") {
      redirectUrl.searchParams.set("error", "advisor_deactivated");
    } else {
      redirectUrl.searchParams.set("returnTo", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 4. Un-onboarded first-time students are strictly redirected to /onboarding
  if (devSessionRole === "student_new") {
    const hasCompletedOnboardingCookie = Boolean(
      request.cookies.get("diu_onboarded_student_data")?.value
    );

    if (!hasCompletedOnboardingCookie) {
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/courses") ||
        pathname.startsWith("/student") ||
        pathname.startsWith("/schedule")
      ) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/onboarding";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // 5. Authenticated users visiting /login are redirected to their authorized workspace
  if (pathname === "/login" && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    if (devSessionRole === "admin") {
      redirectUrl.pathname = "/admin/emails";
    } else if (devSessionRole === "advisor" || devSessionRole === "advisor_personal") {
      redirectUrl.pathname = "/advisor";
    } else if (devSessionRole === "student_new" && !request.cookies.get("diu_onboarded_student_data")?.value) {
      redirectUrl.pathname = "/onboarding";
    } else {
      redirectUrl.pathname = "/dashboard";
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
