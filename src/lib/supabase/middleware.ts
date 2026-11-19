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
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  // If using default placeholders, bypass network calls gracefully in dev/test
  if (supabaseUrl.includes("placeholder-project") || supabaseKey.includes("placeholder-anon")) {
    return response;
  }

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
    data: { user },
  } = await supabase.auth.getUser();

  // Institutional domain enforcement check for Google OAuth users
  const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd";
  if (user && user.email) {
    const emailDomain = user.email.split("@")[1]?.toLowerCase();
    // In production, reject non-DIU accounts if domain enforcement is active
    if (process.env.NODE_ENV === "production" && emailDomain !== allowedDomain) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "invalid_domain");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Route protection rules:
  // In Phase 1 interactive prototype mode, allow direct access to student & advisor panels
  // without blocking users behind OAuth sign-in. Production enforcement will activate in Phase 2.
  const isProtectedPath =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_AUTH_GUARD === "true" &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/student") ||
      request.nextUrl.pathname.startsWith("/advisor") ||
      request.nextUrl.pathname.startsWith("/admin"));

  if (isProtectedPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // - Authenticated users visiting /login are redirected to /dashboard
  if (request.nextUrl.pathname === "/login" && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
