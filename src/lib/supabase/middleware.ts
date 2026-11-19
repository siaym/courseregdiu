import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  let user = null;

  // Attempt to resolve real user session from Supabase if not using placeholders
  if (!supabaseUrl.includes("placeholder-project") && !supabaseKey.includes("placeholder-anon")) {
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

    // Strict Institutional Domain Enforcement (@diu.edu.bd)
    const allowedDomain = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd").toLowerCase();
    if (user && user.email) {
      const emailDomain = user.email.split("@")[1]?.toLowerCase();
      if (emailDomain !== allowedDomain) {
        await supabase.auth.signOut();
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "invalid_domain");
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

  // 2. Only admins can access /admin
  if (pathname.startsWith("/admin")) {
    if (devSessionRole !== "admin") {
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

  // 3. Un-onboarded first-time students are strictly redirected to /onboarding
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

  // 4. Authenticated users visiting /login are redirected to their authorized workspace
  if (pathname === "/login" && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    if (devSessionRole === "advisor") {
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
